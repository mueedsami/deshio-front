// lib/receiptModal.ts
// Centralized modal trigger for receipt preview.

export type ReceiptTemplate = 'receipt' | 'pos_receipt' | 'social_invoice';

export type ReceiptModalPayload = {
  orders: any[];
  startIndex?: number;
  title?: string;
  template?: ReceiptTemplate;
};

export const RECEIPT_MODAL_EVENT = 'errum:receipt-modal';

function dispatch(payload: ReceiptModalPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(RECEIPT_MODAL_EVENT, { detail: payload }));
}

export function openReceiptModal(order: any, opts?: { title?: string; template?: ReceiptTemplate }) {
  dispatch({
    orders: [order],
    startIndex: 0,
    title: opts?.title || 'Receipt',
    template: opts?.template || 'receipt',
  });
}

export function openBulkReceiptModal(
  orders: any[],
  opts?: { title?: string; template?: ReceiptTemplate }
) {
  dispatch({
    orders: orders || [],
    startIndex: 0,
    title: opts?.title || 'Bulk Receipts',
    template: opts?.template || 'receipt',
  });
}
