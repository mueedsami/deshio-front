'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { RECEIPT_MODAL_EVENT, type ReceiptModalPayload } from '@/lib/receiptModal';
import { receiptHtml, receiptBulkHtml } from '@/lib/receiptHtml';
import { posReceiptHtml, posReceiptBulkHtml } from '@/lib/posReceiptHtml';
import { socialInvoiceHtml, socialInvoiceBulkHtml } from '@/lib/socialInvoiceHtml';
import { normalizeOrderForReceipt } from '@/lib/receipt';

type ViewMode = 'single' | 'bulk';

export default function ReceiptPreviewModalHost() {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [title, setTitle] = useState('Receipt');
  const [template, setTemplate] = useState<'receipt' | 'pos_receipt' | 'social_invoice'>('receipt');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<ReceiptModalPayload>;
      const payload = ev.detail;
      const list = Array.isArray(payload?.orders) ? payload.orders : [];
      setOrders(list);
      setIdx(Math.max(0, Math.min(payload?.startIndex ?? 0, Math.max(0, list.length - 1))));
      setTitle(payload?.title || (list.length > 1 ? 'Bulk Receipts' : 'Receipt'));
      setTemplate((payload as any)?.template || 'receipt');
      setOpen(true);
    };
    window.addEventListener(RECEIPT_MODAL_EVENT, handler as any);
    return () => window.removeEventListener(RECEIPT_MODAL_EVENT, handler as any);
  }, []);

  const mode: ViewMode = orders.length > 1 ? 'bulk' : 'single';

  const currentOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders[Math.max(0, Math.min(idx, orders.length - 1))];
  }, [orders, idx]);

  const html = useMemo(() => {
    if (!open) return '';
    if (mode === 'bulk') {
      if (template === 'pos_receipt') return posReceiptBulkHtml(orders, { embed: true });
      if (template === 'social_invoice') return socialInvoiceBulkHtml(orders, { embed: true });
      return receiptBulkHtml(orders, { embed: true });
    }
    if (!currentOrder) return '<p>No order</p>';
    if (template === 'pos_receipt') return posReceiptHtml(currentOrder, { embed: true });
    if (template === 'social_invoice') return socialInvoiceHtml(currentOrder, { embed: true });
    return receiptHtml(currentOrder, { embed: true });
  }, [open, mode, orders, currentOrder, template]);

  const headerLabel = useMemo(() => {
    if (mode === 'bulk') return `${title} (${orders.length})`;
    const r = currentOrder ? normalizeOrderForReceipt(currentOrder) : null;
    if (!r?.orderNo) return title;

    if (template === 'social_invoice') {
      const inv = String(r.orderNo).replace(/^ORD[-\s]?/i, '').trim() || r.orderNo;
      return `Invoice #${inv}`;
    }

    if (template === 'pos_receipt') return `POS Receipt #${r.orderNo}`;
    return `Receipt #${r.orderNo}`;
  }, [mode, title, orders.length, currentOrder, template]);

  const close = () => {
    setOpen(false);
    setOrders([]);
    setIdx(0);
  };

  const print = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };

  const prev = () => setIdx((v) => Math.max(0, v - 1));
  const next = () => setIdx((v) => Math.min(orders.length - 1, v + 1));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{headerLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Print dialog → "Save as PDF" (works without QZ Tray)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'single' && orders.length > 1 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {idx + 1}/{orders.length}
              </span>
            )}

            {mode === 'single' && orders.length > 1 && (
              <>
                <button
                  onClick={prev}
                  disabled={idx <= 0}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                  title="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={next}
                  disabled={idx >= orders.length - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                  title="Next"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </>
            )}

            <button
              onClick={print}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              title="Print / Save PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm font-medium">Print</span>
            </button>

            <button
              onClick={close}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>

        <div className="h-[80vh] bg-gray-50 dark:bg-gray-950">
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            srcDoc={html}
            title="Receipt Preview"
          />
        </div>
      </div>
    </div>
  );
}
