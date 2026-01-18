"use client";

import React, { useMemo, useState } from "react";
import MultiBarcodePrinter, { MultiBarcodePrintItem } from "./MultiBarcodePrinter";
import { barcodeTrackingService } from "@/services/barcodeTrackingService";

export type BatchBarcodeSource = {
  batchId: number;
  productName: string;
  price: number;
  // Used if the batch has no per-unit barcodes (fallback to primary)
  fallbackCode?: string;
};

function dedupeByCode(items: MultiBarcodePrintItem[]) {
  const seen = new Set<string>();
  const out: MultiBarcodePrintItem[] = [];
  for (const it of items) {
    if (!it.code) continue;
    if (seen.has(it.code)) continue;
    seen.add(it.code);
    out.push(it);
  }
  return out;
}

export default function GroupedAllBarcodesPrinter({
  sources,
  buttonLabel = "Print ALL (unit barcodes)",
  title = "Print all barcodes",
  softLimit = 400,
}: {
  sources: BatchBarcodeSource[];
  buttonLabel?: string;
  title?: string;
  // If barcode count is higher than this, show a confirm to prevent accidental mega-prints.
  softLimit?: number;
}) {
  const [items, setItems] = useState<MultiBarcodePrintItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoOpenToken, setAutoOpenToken] = useState<number | undefined>(undefined);

  const totalSources = sources.length;

  const prepare = async () => {
    try {
      setLoading(true);
      setError(null);

      const collected: MultiBarcodePrintItem[] = [];

      // Fetch in sequence to avoid spamming the API and to keep the UI responsive.
      for (const s of sources) {
        try {
          const res = await barcodeTrackingService.getBatchBarcodes(s.batchId);
          const codes = (res.data?.barcodes || [])
            .filter((b) => b.is_active)
            .map((b) => b.barcode)
            .filter(Boolean);

          if (codes.length === 0 && s.fallbackCode) {
            collected.push({ code: s.fallbackCode, productName: s.productName, price: s.price, qty: 1 });
            continue;
          }

          for (const code of codes) {
            collected.push({ code, productName: s.productName, price: s.price, qty: 1 });
          }
        } catch (e: any) {
          // If one batch fails, keep going (still print what we can).
          console.error("Failed to fetch barcodes for batch", s.batchId, e);
          if (s.fallbackCode) {
            collected.push({ code: s.fallbackCode, productName: s.productName, price: s.price, qty: 1 });
          }
        }
      }

      const deduped = dedupeByCode(collected);
      if (deduped.length === 0) {
        alert("No barcodes found to print.");
        return;
      }

      if (deduped.length > softLimit) {
        const ok = confirm(
          `You are about to print ${deduped.length} labels from ${totalSources} variation(s).\n\nThis can take time and paper. Continue?`
        );
        if (!ok) return;
      }

      setItems(deduped);
      // Use a changing token to auto-open exactly once per preparation.
      setAutoOpenToken(Date.now());
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to prepare barcodes");
      alert(e?.message || "Failed to prepare barcodes");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || sources.length === 0;

  return (
    <>
      <button
        onClick={prepare}
        disabled={disabled}
        className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={sources.length ? "Print all unit-level barcodes" : "No variations"}
      >
        {loading ? "Preparing..." : buttonLabel}
      </button>

      {/* Hidden trigger printer that auto-opens after preparation */}
      <MultiBarcodePrinter
        items={items}
        hideButton
        autoOpenToken={autoOpenToken}
        title={title}
        buttonLabel=""
      />

      {error ? (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : null}
    </>
  );
}
