// lib/qz-tray.ts
// PDF/Browser-print implementation (no QZ Tray required).
//
// We keep the same exported function names so existing pages (Orders, POS, etc.)
// don't need refactoring.
//
// Behavior:
// - printReceipt(...) opens a receipt preview modal. From there user clicks Print → Save as PDF.
// - printBulkReceipts(...) opens a combined preview (all receipts in one print job).

import { openReceiptModal, openBulkReceiptModal } from '@/lib/receiptModal';

// --- QZ stubs (kept for compatibility)
export async function connectQZ(): Promise<boolean> {
  return false;
}

export async function disconnectQZ(): Promise<void> {
  return;
}

export async function getPrinters(): Promise<string[]> {
  return [];
}

export async function getDefaultPrinter(): Promise<string | null> {
  return null;
}

export async function getPreferredPrinter(): Promise<string | null> {
  return null;
}

export function savePreferredPrinter(_printerName: string) {
  // no-op
}

export async function printReceipt(order: any, _printerName?: string): Promise<boolean> {
  try {
    openReceiptModal(order);
    return true;
  } catch (e) {
    console.error('❌ Failed to open receipt modal:', e);
    return false;
  }
}

export async function printBulkReceipts(
  orders: any[],
  _printerName?: string
): Promise<{ successCount: number; failCount: number }> {
  try {
    openBulkReceiptModal(orders);
    return { successCount: 0, failCount: 0 };
  } catch (e) {
    console.error('❌ Failed to open bulk receipt modal:', e);
    return { successCount: 0, failCount: Array.isArray(orders) ? orders.length : 0 };
  }
}

export async function checkQZStatus(): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  return {
    connected: false,
    error: 'QZ disabled (using Print → Save as PDF)',
  };
}
