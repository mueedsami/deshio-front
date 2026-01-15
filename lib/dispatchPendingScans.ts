// Lightweight localStorage helper to persist barcode scans done during "Create Dispatch"
// so they can be synced AFTER the dispatch is marked "in_transit" (backend requirement).

export type PendingDispatchScanEntry = {
  barcode: string;
  batch_id: string;
  batch_number?: string;
  product_name?: string;
  scanned_at?: string;
};

export type PendingDispatchScansPayload = {
  version: 1;
  dispatch_id: number;
  source_store_id?: number;
  destination_store_id?: number;
  created_at: string;
  scans: PendingDispatchScanEntry[];
};

const KEY_PREFIX = 'dispatch_pending_scans_v1_';

function key(dispatchId: number) {
  return `${KEY_PREFIX}${dispatchId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePendingScans(dispatchId: number, payload: Omit<PendingDispatchScansPayload, 'version' | 'dispatch_id'>) {
  if (typeof window === 'undefined') return;
  const full: PendingDispatchScansPayload = {
    version: 1,
    dispatch_id: dispatchId,
    ...payload,
  };
  window.localStorage.setItem(key(dispatchId), JSON.stringify(full));
}

export function getPendingScans(dispatchId: number): PendingDispatchScansPayload | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeParse<PendingDispatchScansPayload>(window.localStorage.getItem(key(dispatchId)));
  if (!parsed) return null;
  if (parsed.version !== 1) return null;
  if (!Array.isArray(parsed.scans)) return null;
  return parsed;
}

export function getPendingScansCount(dispatchId: number): number {
  return getPendingScans(dispatchId)?.scans?.length || 0;
}

export function removePendingScans(dispatchId: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key(dispatchId));
}
