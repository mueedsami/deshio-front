'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GripHorizontal,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  X,
} from 'lucide-react';
import { barcodeTransferService, storeService, type Store } from '@/services';

export type OpenOrderLockDetection = {
  barcode: string;
  message?: string;
  source?: string;
  signal?: number;
};

export const isOpenOrderLockMessage = (message?: string | null) => {
  const text = String(message || '').toLowerCase();
  if (!text) return false;

  return (
    (text.includes('barcode') && text.includes('open order')) ||
    text.includes('assigned to an open order') ||
    text.includes('attached to another open order') ||
    text.includes('already attached to another order') ||
    text.includes('locked by an order') ||
    text.includes('order lock') ||
    text.includes('open-order locked')
  );
};

export const readOpenOrderLockError = (error: any, fallbackBarcode?: string): OpenOrderLockDetection | null => {
  const data = error?.response?.data || error?.data || error || {};
  const message =
    data?.message ||
    data?.error ||
    data?.errors?.barcode?.[0] ||
    data?.errors?.product_barcode_id?.[0] ||
    error?.message ||
    '';

  if (!isOpenOrderLockMessage(message)) return null;

  const barcode =
    data?.barcode ||
    data?.data?.barcode ||
    data?.data?.product_barcode?.barcode ||
    data?.product_barcode?.barcode ||
    fallbackBarcode ||
    '';

  return {
    barcode: String(barcode || fallbackBarcode || '').trim(),
    message: String(message || 'Barcode is assigned to an open order.'),
  };
};

type RescueLog = {
  id: string;
  barcode: string;
  ok: boolean;
  message: string;
  productName?: string;
  toStore?: string;
  releasedLinks?: number;
  at: string;
};

type Position = { x: number; y: number };

type Props = {
  contextLabel?: string;
  selectedStoreId?: string | number | null;
  detectedBarcode?: string | null;
  detectedMessage?: string | null;
  triggerKey?: string | number | null;
  onRevived?: (barcode: string, result: any) => void;
};

const STORAGE_KEY = 'deshio-open-order-lock-rescue-widget-position';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeStoreList = (res: any): Store[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res)) return res;
  return [];
};

export default function OpenOrderLockRescueWidget({
  contextLabel = 'Current page',
  selectedStoreId,
  detectedBarcode,
  detectedMessage,
  triggerKey,
  onRevived,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ dragging: boolean; dx: number; dy: number }>({ dragging: false, dx: 0, dy: 0 });
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeId, setStoreId] = useState<number | ''>('');
  const [barcode, setBarcode] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [logs, setLogs] = useState<RescueLog[]>([]);
  const [lastDetectedMessage, setLastDetectedMessage] = useState<string>('');

  const selectedStoreNum = useMemo(() => {
    const n = Number(selectedStoreId || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [selectedStoreId]);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    let next: Position = { x: Math.max(16, width - 420), y: Math.max(88, height - 250) };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') next = parsed;
      }
    } catch {
      // ignore invalid saved position
    }

    next = {
      x: clamp(next.x, 8, Math.max(8, width - 92)),
      y: clamp(next.y, 72, Math.max(72, height - 72)),
    };
    setPosition(next);
    setPositionReady(true);
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      setStoresLoading(true);
      try {
        const res = await storeService.getStores({ is_active: true, per_page: 200 } as any);
        const arr = normalizeStoreList(res);
        setStores(arr);

        const localStoreId = Number(localStorage.getItem('storeId') || '');
        if (selectedStoreNum && arr.some((s) => Number(s.id) === selectedStoreNum)) {
          setStoreId(selectedStoreNum);
        } else if (localStoreId && arr.some((s) => Number(s.id) === localStoreId)) {
          setStoreId(localStoreId);
        } else if (arr.length) {
          setStoreId(Number(arr[0].id));
        }
      } catch (e: any) {
        setNotice(e?.response?.data?.message || e?.message || 'Could not load stores for rescue panel.');
      } finally {
        setStoresLoading(false);
      }
    };

    fetchStores();
  }, []);

  useEffect(() => {
    if (!selectedStoreNum || !stores.length) return;
    if (stores.some((s) => Number(s.id) === selectedStoreNum)) setStoreId(selectedStoreNum);
  }, [selectedStoreNum, stores]);

  useEffect(() => {
    const clean = String(detectedBarcode || '').trim();
    if (!clean) return;

    setBarcode(clean);
    setLastDetectedMessage(detectedMessage || 'This barcode is blocked by an open order.');
    setNotice(detectedMessage || 'Open order lock detected. Review and revive from here.');
    setOpen(true);
    setMinimized(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 150);
  }, [detectedBarcode, detectedMessage, triggerKey]);

  const savePosition = (next: Position) => {
    setPosition(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failure
    }
  };

  const startDrag = (e: PointerEvent) => {
    if (!positionReady) return;
    const target = e.target as HTMLElement;
    if (target.closest('button,input,select,label,textarea')) return;

    dragStateRef.current = {
      dragging: true,
      dx: e.clientX - position.x,
      dy: e.clientY - position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onDrag = (e: PointerEvent) => {
    if (!dragStateRef.current.dragging) return;
    const panel = panelRef.current;
    const width = panel?.offsetWidth || (minimized ? 76 : 384);
    const height = panel?.offsetHeight || (minimized ? 64 : 440);
    const next = {
      x: clamp(e.clientX - dragStateRef.current.dx, 8, Math.max(8, window.innerWidth - width - 8)),
      y: clamp(e.clientY - dragStateRef.current.dy, 72, Math.max(72, window.innerHeight - height - 8)),
    };
    setPosition(next);
  };

  const stopDrag = (e: PointerEvent) => {
    if (!dragStateRef.current.dragging) return;
    dragStateRef.current.dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    savePosition(position);
  };

  const pushLog = (log: Omit<RescueLog, 'id' | 'at'>) => {
    setLogs((prev) => [
      {
        ...log,
        id: `${Date.now()}-${Math.random()}`,
        at: new Date().toLocaleTimeString(),
      },
      ...prev,
    ].slice(0, 8));
  };

  const handleRevive = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = barcode.trim();

    if (!clean) {
      setNotice('Scan or type the stuck barcode first.');
      return;
    }
    if (!storeId) {
      setNotice('Select the store where the physical product is available now.');
      return;
    }

    setSubmitting(true);
    setNotice('');
    try {
      const res = await barcodeTransferService.reviveOrderLock({
        barcode: clean,
        store_id: Number(storeId),
        status: 'available',
        restore_stock: restoreStock,
      });

      if (res?.success) {
        const productName = res.data?.product?.name;
        const toStore = res.data?.to_store?.name;
        const releasedLinks = res.data?.released_order_links_count || 0;
        const msg = res.message || 'Barcode revived successfully.';
        pushLog({ barcode: clean, ok: true, message: msg, productName, toStore, releasedLinks });
        setNotice('Done. Scan the barcode again in this page.');
        setBarcode('');
        onRevived?.(clean, res);
      } else {
        const msg = res?.message || 'Revive failed.';
        pushLog({ barcode: clean, ok: false, message: msg });
        setNotice(msg);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Revive failed.';
      pushLog({ barcode: clean, ok: false, message: msg });
      setNotice(msg);
    } finally {
      setSubmitting(false);
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  };

  const panelStyle = positionReady
    ? ({ left: position.x, top: position.y } as CSSProperties)
    : ({ right: 24, bottom: 24 } as CSSProperties);

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className="fixed z-[70] select-none"
      onPointerMove={onDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {minimized ? (
        <button
          type="button"
          onPointerDown={startDrag}
          onClick={() => {
            setOpen(true);
            setMinimized(false);
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
          }}
          className="group relative flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-200 bg-white text-orange-600 shadow-2xl shadow-orange-500/20 transition hover:scale-105 hover:bg-orange-50 dark:border-orange-900 dark:bg-gray-950 dark:text-orange-300 dark:hover:bg-orange-950/40"
          title="Open barcode lock rescue"
        >
          <ShieldAlert className="h-7 w-7" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            !
          </span>
          <span className="absolute right-16 top-2 hidden w-48 rounded-xl bg-black px-3 py-2 text-left text-xs text-white shadow-xl group-hover:block">
            Barcode Rescue — drag me, click to open
          </span>
        </button>
      ) : (
        <div className="w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-2xl shadow-orange-500/20 dark:border-orange-900/80 dark:bg-gray-950">
          <div
            onPointerDown={startDrag}
            className="cursor-move bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 px-4 py-3 text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <p className="truncate text-sm font-semibold">Open Order Lock Rescue</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-orange-50">
                  {contextLabel} • revive without leaving this page
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <GripHorizontal className="h-4 w-4 opacity-80" />
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="rounded-lg p-1 hover:bg-white/15"
                  title={open ? 'Collapse panel' : 'Expand panel'}
                >
                  {open ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="rounded-lg p-1 hover:bg-white/15"
                  title="Minimize floating button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {open && (
            <div className="p-4">
              <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-100">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">Use only when the physical product is in your hand.</p>
                    <p className="mt-0.5 break-words text-orange-800 dark:text-orange-200">
                      {lastDetectedMessage || 'This releases stale order-item barcode links and makes the barcode available again.'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRevive} className="space-y-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    <ScanLine className="h-3.5 w-3.5" /> Stuck barcode
                  </label>
                  <input
                    ref={barcodeInputRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-200">Return to store</label>
                    <select
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : '')}
                      disabled={storesLoading || submitting}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">Select store...</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex min-w-[116px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100 sm:self-end">
                    <input
                      type="checkbox"
                      checked={restoreStock}
                      onChange={(e) => setRestoreStock(e.target.checked)}
                      disabled={submitting}
                    />
                    Restore stock
                  </label>
                </div>

                {notice && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {notice}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={!barcode.trim() || !storeId || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {submitting ? 'Reviving...' : 'Revive now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBarcode('');
                      setNotice('');
                      setTimeout(() => barcodeInputRef.current?.focus(), 80);
                    }}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {logs.length > 0 && (
                <div className="mt-4 max-h-44 space-y-2 overflow-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-2 text-xs ${
                        log.ok
                          ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100'
                          : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {log.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="font-mono font-semibold">{log.barcode}</span>
                            <span className="opacity-70">{log.at}</span>
                          </div>
                          <p className="break-words">{log.message}</p>
                          {(log.productName || log.toStore || log.releasedLinks !== undefined) && (
                            <p className="mt-0.5 opacity-80">
                              {log.productName || 'Product'} {log.toStore ? `→ ${log.toStore}` : ''}
                              {log.releasedLinks !== undefined ? ` • links released: ${log.releasedLinks}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <Move className="h-3 w-3" /> Drag from the colored header. Minimize after use.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
