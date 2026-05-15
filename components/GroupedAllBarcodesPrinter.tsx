"use client";

import React, { useEffect, useMemo, useState } from "react";
import { renderBarcodeLabelBase64 } from "./MultiBarcodePrinter";
import { barcodeTrackingService } from "@/services/barcodeTrackingService";

export type BatchBarcodeSource = {
  batchId: number;
  productName: string;
  price: number;
  // Used if the batch has no per-unit barcodes (fallback to primary)
  fallbackCode?: string;
};

type PrintItem = {
  code: string;
  productName: string;
  price: number;
  qty: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dedupeItems(items: PrintItem[]): PrintItem[] {
  const seen = new Set<string>();
  const out: PrintItem[] = [];
  for (const it of items) {
    if (!it.code || seen.has(it.code)) continue;
    seen.add(it.code);
    out.push(it);
  }
  return out;
}

const LABEL_W_MM = 39;
const LABEL_H_MM = 25;
const DPI = 300;
const mmToIn = (mm: number) => mm / 25.4;

// Mirrors quickPrintSingleBarcode's connection approach exactly
async function getQZAndPrinter(): Promise<{ qz: any; printer: string }> {
  const qz = (window as any)?.qz;
  if (!qz) throw new Error("QZ Tray not available. Please start QZ Tray and refresh.");

  if (!(await qz.websocket.isActive())) {
    await qz.websocket.connect();
  }

  let printer: string | null = null;
  try {
    printer = await qz.printers.getDefault();
  } catch {
    const list = await qz.printers.find();
    if (Array.isArray(list) && list.length) printer = list[0];
  }
  if (!printer) throw new Error("No printer found. Set a default printer and try again.");

  return { qz, printer };
}

export default function GroupedAllBarcodesPrinter({
  sources,
  buttonLabel = "Print ALL (unit barcodes)",
  title = "Print all barcodes",
  softLimit = 400,
  availableOnly = false,
}: {
  sources: BatchBarcodeSource[];
  buttonLabel?: string;
  title?: string;
  softLimit?: number;
  availableOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [items, setItems] = useState<PrintItem[]>([]);
  const [qtyByCode, setQtyByCode] = useState<Record<string, number>>({});
  const [printerLabel, setPrinterLabel] = useState<string>("...");

  // When items change (after fetch), init quantities to 1 each
  useEffect(() => {
    if (items.length === 0) return;
    const next: Record<string, number> = {};
    items.forEach((it) => { next[it.code] = 1; });
    setQtyByCode(next);
  }, [items]);

  // Detect printer for display
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { printer } = await getQZAndPrinter();
        setPrinterLabel(printer);
      } catch (e: any) {
        setPrinterLabel(e?.message || "Not detected");
      }
    })();
  }, [isOpen]);

  const totalLabels = useMemo(
    () => items.reduce((sum, it) => sum + (qtyByCode[it.code] ?? 1), 0),
    [items, qtyByCode]
  );

  // ── Fetch barcodes then open modal ──────────────────────────────────────────
  const fetchAndOpen = async () => {
    if (sources.length === 0) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      const collected: PrintItem[] = [];

      for (const s of sources) {
        try {
          const res = await barcodeTrackingService.getBatchBarcodes(s.batchId);
          const codes = (res.data?.barcodes || [])
            .filter((b: any) => b.is_active)
            .map((b: any) => String(b.barcode))
            .filter(Boolean);

          if (codes.length === 0 && s.fallbackCode) {
            collected.push({ code: s.fallbackCode, productName: s.productName, price: s.price, qty: 1 });
            continue;
          }

          for (const code of codes) {
            collected.push({ code, productName: s.productName, price: s.price, qty: 1 });
          }
        } catch (e: any) {
          console.error("Failed to fetch barcodes for batch", s.batchId, e);
          if (s.fallbackCode) {
            collected.push({ code: s.fallbackCode, productName: s.productName, price: s.price, qty: 1 });
          }
        }
      }

      const deduped = dedupeItems(collected);

      if (deduped.length === 0) {
        alert("No barcodes found to print.");
        return;
      }

      if (deduped.length > softLimit) {
        const ok = confirm(
          `You are about to print ${deduped.length} labels from ${sources.length} batch(es).\n\nThis can take time and paper. Continue?`
        );
        if (!ok) return;
      }

      // Set items first, THEN open — no autoOpenToken race
      setItems(deduped);
      setIsOpen(true);
    } catch (e: any) {
      console.error(e);
      setFetchError(e?.message || "Failed to prepare barcodes");
    } finally {
      setIsFetching(false);
    }
  };

  // ── Print — mirrors quickPrintSingleBarcode exactly ──────────────────────────
  const print = async () => {
    if (!totalLabels) { alert("Nothing selected to print."); return; }

    const ok = confirm(`Print ${totalLabels} label(s) to "${printerLabel}"?`);
    if (!ok) return;

    setIsPrinting(true);
    try {
      const { qz, printer } = await getQZAndPrinter();

      const config = qz.configs.create(printer, {
        units: "in",
        size: { width: mmToIn(LABEL_W_MM), height: mmToIn(LABEL_H_MM) },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        density: DPI,
        colorType: "blackwhite",
        interpolation: "nearest-neighbor",
        scaleContent: false,
      });

      const data: any[] = [];
      for (const it of items) {
        const qty = qtyByCode[it.code] ?? 0;
        if (!qty) continue;
        for (let i = 0; i < qty; i++) {
          const base64 = await renderBarcodeLabelBase64({
            code: it.code,
            productName: it.productName,
            price: it.price,
            dpi: DPI,
          });
          data.push({ type: "pixel", format: "image", flavor: "base64", data: base64 });
        }
      }

      if (data.length === 0) { alert("Nothing to print after applying quantities."); return; }

      await qz.print(config, data);
      alert(`✅ ${data.length} label(s) sent to "${printer}" successfully!`);
      setIsOpen(false);
    } catch (err: any) {
      console.error("❌ Bulk barcode print error:", err);
      const msg = err?.message || "Unknown error";
      if (msg.includes("Unable to establish connection")) {
        alert("QZ Tray is not running. Please start QZ Tray and try again.\n\nDownload from: https://qz.io/download/");
      } else {
        alert(`Print failed: ${msg}`);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const close = () => {
    if (isPrinting) return;
    setIsOpen(false);
    setItems([]);
    setQtyByCode({});
    setFetchError(null);
  };

  const disabled = isFetching || isPrinting || sources.length === 0;

  return (
    <>
      <button
        onClick={fetchAndOpen}
        disabled={disabled}
        className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={sources.length ? "Print all unit-level barcodes" : "No batches available"}
      >
        {isFetching ? "Loading barcodes..." : buttonLabel}
      </button>

      {fetchError && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">{fetchError}</div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Printer: {printerLabel} &nbsp;•&nbsp; {items.length} unique barcode(s) &nbsp;•&nbsp; Total labels: {totalLabels}
                </div>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No barcodes to print.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.code}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-gray-900 dark:text-white truncate">{it.code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {it.productName} &nbsp;•&nbsp; ৳{Number(it.price || 0).toLocaleString("en-BD")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQtyByCode((p) => ({ ...p, [it.code]: clamp((p[it.code] ?? 1) - 1, 0, 100) }))}
                          disabled={isPrinting}
                          className="w-9 h-9 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 disabled:opacity-50"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={qtyByCode[it.code] ?? 1}
                          onChange={(e) =>
                            setQtyByCode((p) => ({
                              ...p,
                              [it.code]: clamp(parseInt(e.target.value || "0", 10) || 0, 0, 100),
                            }))
                          }
                          disabled={isPrinting}
                          className="w-20 px-2 py-2 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                        <button
                          onClick={() => setQtyByCode((p) => ({ ...p, [it.code]: clamp((p[it.code] ?? 1) + 1, 0, 100) }))}
                          disabled={isPrinting}
                          className="w-9 h-9 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 disabled:opacity-50"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Tip: set quantity to 0 to skip a barcode.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={close}
                  disabled={isPrinting}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={print}
                  disabled={isPrinting || items.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPrinting ? "Printing..." : `Print (${totalLabels})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
