// lib/receiptModal.ts
// Centralized modal trigger for receipt preview.

export type ReceiptModalPayload = {
  orders: any[];
  startIndex?: number;
  title?: string;
};

export const RECEIPT_MODAL_EVENT = 'errum:receipt-modal';

function dispatch(payload: ReceiptModalPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(RECEIPT_MODAL_EVENT, { detail: payload }));
}

export function openReceiptModal(order: any) {
  dispatch({ orders: [order], startIndex: 0, title: 'Receipt' });
}

export function openBulkReceiptModal(orders: any[]) {
  dispatch({ orders: orders || [], startIndex: 0, title: 'Bulk Receipts' });
}
