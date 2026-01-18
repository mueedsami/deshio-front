"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Batch } from "@/services/batchService";
import MultiBarcodePrinter, { MultiBarcodePrintItem } from "./MultiBarcodePrinter";
import GroupedAllBarcodesPrinter from "./GroupedAllBarcodesPrinter";

type VariantRow = {
  productId: number;
  name: string;
  color?: string;
  size?: string;
  totalQty: number;
  latestBatch: Batch;
  batches: Batch[];
};

export type BatchSkuGroup = {
  sku: string;
  baseName: string;
  totalQty: number;
  variants: VariantRow[];
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Same heuristic used in Product List to infer base/color/size from name
function parseVariantFromName(name: string): { base?: string; color?: string; size?: string } {
  const raw = (name || "").trim();
  if (!raw) return {};

  const parts = raw
    .split(/\s*-\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    const size = parts[parts.length - 1];
    const color = parts[parts.length - 2];
    const base = parts.slice(0, parts.length - 2).join(" - ").trim();
    return { base, color, size };
  }

  if (parts.length === 2) {
    const base = parts[0];
    const maybe = parts[1];
    const looksLikeSize = /^(\d{1,3}|xs|s|m|l|xl|xxl|xxxl)$/i.test(maybe);
    return looksLikeSize ? { base, size: maybe } : { base, color: maybe };
  }

  return { base: raw };
}

function getGroupBaseName(variants: { name: string }[], fallback: string) {
  const bases = variants
    .map((v) => (parseVariantFromName(v.name).base || "").trim())
    .filter(Boolean);
  if (!bases.length) return fallback;

  const counts = new Map<string, number>();
  const original = new Map<string, string>();
  for (const b of bases) {
    const key = b.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!original.has(key)) original.set(key, b);
  }

  let bestKey = "";
  let bestCount = 0;
  counts.forEach((c, k) => {
    if (c > bestCount) {
      bestCount = c;
      bestKey = k;
    }
  });
  return original.get(bestKey) || fallback;
}

function parseMoney(value: any): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(String(value).replace(/,/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickPrimaryCode(b: Batch): string {
  const anyB: any = b as any;
  return (
    anyB?.barcode?.barcode ||
    anyB?.barcode ||
    anyB?.primary_barcode ||
    b.batch_number ||
    String(b.id)
  );
}

export default function GroupedBatchCard({ group }: { group: BatchSkuGroup }) {
  const [open, setOpen] = useState(false);

  const printablePrimaryItems: MultiBarcodePrintItem[] = useMemo(() => {
    // Default “easy mode”: print 1 label per variation (latest batch's primary barcode).
    return group.variants
      .map((v) => {
        const code = pickPrimaryCode(v.latestBatch);
        return {
          code,
          productName: v.name,
          price: parseMoney((v.latestBatch as any)?.sell_price),
          qty: 1,
        };
      })
      .filter((x) => !!x.code);
  }, [group.variants]);

  const printableAllBarcodeSources = useMemo(() => {
    // Print ALL active unit barcodes from the latest batch of each variation.
    return group.variants.map((v) => {
      const latest = v.latestBatch;
      return {
        batchId: latest.id,
        productName: v.name,
        price: parseMoney((latest as any)?.sell_price),
        fallbackCode: pickPrimaryCode(latest),
      };
    });
  }, [group.variants]);

  const colors = useMemo(() => {
    const set = new Set<string>();
    group.variants.forEach((v) => v.color && set.add(v.color));
    return Array.from(set);
  }, [group.variants]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    group.variants.forEach((v) => v.size && set.add(v.size));
    return Array.from(set);
  }, [group.variants]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-gray-500 dark:text-gray-400">SKU</div>
          <div className="font-semibold text-gray-900 dark:text-white text-lg truncate">
            {group.baseName || group.sku || "(No name)"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
            {group.sku || "(no sku)"}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
              {group.variants.length} variation{group.variants.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
              Total stock: {group.totalQty}
            </span>
            {colors.length > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                Colors: {colors.slice(0, 3).join(", ")}{colors.length > 3 ? "…" : ""}
              </span>
            )}
            {sizes.length > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                Sizes: {sizes.slice(0, 5).join(", ")}{sizes.length > 5 ? "…" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <GroupedAllBarcodesPrinter
            sources={printableAllBarcodeSources}
            buttonLabel="Print ALL (unit barcodes)"
            title={`Print all unit barcodes — ${group.baseName || group.sku}`}
          />

          <MultiBarcodePrinter
            items={printablePrimaryItems}
            buttonLabel="Print primary (all variants)"
            title={`Print primary barcodes — ${group.baseName || group.sku}`}
          />

          <button
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View variants
              </>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-3">Variant</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Latest batch</th>
                  <th className="py-2 pr-3">Store</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {group.variants.map((v) => {
                  const latest = v.latestBatch;
                  const price = parseMoney((latest as any)?.sell_price);
                  const code = pickPrimaryCode(latest);
                  const label = v.color || v.size ? `${v.color ? v.color : ""}${v.color && v.size ? " • " : ""}${v.size ? v.size : ""}` : v.name;
                  return (
                    <tr key={v.productId} className="text-gray-800 dark:text-gray-200">
                      <td className="py-3 pr-3 min-w-[220px]">
                        <div className="font-medium truncate">{label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.name}</div>
                      </td>
                      <td className="py-3 pr-3 font-semibold">{v.totalQty}</td>
                      <td className="py-3 pr-3 font-mono text-xs">{latest.batch_number || `#${latest.id}`}</td>
                      <td className="py-3 pr-3 text-xs">{latest.store?.name || "—"}</td>
                      <td className="py-3 pr-3">৳{price.toLocaleString("en-BD")}</td>
                      <td className="py-3">
                        <MultiBarcodePrinter
                          items={[{ code, productName: v.name, price, qty: 1 }]}
                          buttonLabel="Print"
                          title={`Print — ${v.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            This view groups everything by SKU (so all variations stay together). For unit-level labels, open a specific batch in flat view and use “Print Barcodes”.
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to build groups outside the component (exported for convenience)
export function buildSkuGroups(batches: Batch[]): BatchSkuGroup[] {
  const groups = new Map<string, { sku: string; variants: Map<number, VariantRow> }>();

  for (const b of batches) {
    const sku = String((b as any)?.product?.sku || "").trim();
    const key = sku || `product-${(b as any)?.product?.id || b.id}`;
    if (!groups.has(key)) {
      groups.set(key, { sku: sku, variants: new Map() });
    }
    const g = groups.get(key)!;
    const pid = (b as any)?.product?.id;
    if (!pid) continue;

    const name = String((b as any)?.product?.name || "Product");
    const parsed = parseVariantFromName(name);
    const row: VariantRow = g.variants.get(pid) || {
      productId: pid,
      name,
      color: parsed.color,
      size: parsed.size,
      totalQty: 0,
      latestBatch: b,
      batches: [],
    };

    row.totalQty += Number((b as any)?.quantity || 0) || 0;
    row.batches.push(b);

    // latest by created_at (fallback to id)
    const cur = row.latestBatch;
    const curT = cur?.created_at ? new Date(cur.created_at).getTime() : cur.id;
    const newT = b?.created_at ? new Date(b.created_at).getTime() : b.id;
    if (newT >= curT) row.latestBatch = b;

    g.variants.set(pid, row);
  }

  const out: BatchSkuGroup[] = [];
  groups.forEach((g, key) => {
    const variants = Array.from(g.variants.values());
    const baseName = getGroupBaseName(variants, variants[0]?.name || g.sku || key);
    const totalQty = variants.reduce((s, v) => s + (v.totalQty || 0), 0);
    // Sort variants by color then size then name
    variants.sort((a, b) => {
      const ac = (a.color || "").toLowerCase();
      const bc = (b.color || "").toLowerCase();
      if (ac !== bc) return ac.localeCompare(bc);
      const as = (a.size || "").toLowerCase();
      const bs = (b.size || "").toLowerCase();
      if (as !== bs) return as.localeCompare(bs);
      return (a.name || "").localeCompare(b.name || "");
    });

    out.push({ sku: g.sku || "", baseName, totalQty, variants });
  });

  // Sort by most stock then name
  out.sort((a, b) => {
    if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
    return (a.baseName || "").localeCompare(b.baseName || "");
  });
  return out;
}
