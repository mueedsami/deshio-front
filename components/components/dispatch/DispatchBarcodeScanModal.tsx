'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Scan, RefreshCw, CheckCircle, AlertTriangle, Package, Truck } from 'lucide-react';
import dispatchService, {
  ProductDispatch,
  ScannedBarcodesResponse,
  ReceivedBarcodesResponse,
} from '@/services/dispatchService';

export type DispatchScanMode = 'send' | 'receive';

interface Props {
  dispatch: ProductDispatch | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful scan (send/receive) */
  onComplete?: () => void;
  /** If provided, a "Complete Delivery" button is shown in receive mode */
  onMarkDelivered?: (dispatchId: number) => Promise<void>;
  mode: DispatchScanMode;
}

type AnyProgress =
  | ({ kind: 'send' } & ScannedBarcodesResponse)
  | ({ kind: 'receive' } & ReceivedBarcodesResponse);

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function DispatchBarcodeScanModal({
  dispatch,
  isOpen,
  onClose,
  onComplete,
  onMarkDelivered,
  mode,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<AnyProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overall, setOverall] = useState<{ allComplete: boolean; pending: number } | null>(null);
  const [checkingOverall, setCheckingOverall] = useState(false);

  const items = dispatch?.items || [];

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  const header = mode === 'send' ? '🔵 Scan Items to Send' : '🟢 Scan Items Received';

  const canCompleteCurrentItem = useMemo(() => {
    if (!progress) return false;
    if (progress.kind === 'send') return progress.remaining_count === 0;
    return progress.pending_count === 0;
  }, [progress]);

  const stats = useMemo(() => {
    if (!progress) return null;
    if (progress.kind === 'send') {
      const total = progress.required_quantity || 0;
      const done = progress.scanned_count || 0;
      const remaining = progress.remaining_count || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { total, done, remaining, pct };
    }
    const total = progress.total_sent || 0;
    const done = progress.received_count || 0;
    const remaining = progress.pending_count || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, remaining, pct };
  }, [progress]);

  // When opening: pick first item and focus input
  useEffect(() => {
    if (!isOpen || !dispatch) return;
    if (!items.length) {
      setSelectedItemId(null);
      setProgress(null);
      return;
    }
    setSelectedItemId(items[0].id);
    setBarcode('');
    setError(null);
    setOverall(null);
    // focus after paint
    setTimeout(() => inputRef.current?.focus(), 50);

    // In receive mode, auto-check overall progress so the "Complete Delivery" button
    // can become available as soon as all items are received.
    if (mode === 'receive') {
      setTimeout(() => {
        void checkOverallProgress();
      }, 100);
    }
  }, [isOpen, dispatch, items]);

  // Fetch progress when item changes
  useEffect(() => {
    if (!isOpen || !dispatch || !selectedItemId) return;
    void fetchProgress(selectedItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dispatch?.id, selectedItemId, mode]);

  const fetchProgress = async (itemId: number) => {
    if (!dispatch) return;
    setError(null);
    try {
      if (mode === 'send') {
        const res = await dispatchService.getScannedBarcodes(dispatch.id, itemId);
        setProgress({ kind: 'send', ...res.data } as AnyProgress);
      } else {
        const res = await dispatchService.getReceivedBarcodes(dispatch.id, itemId);
        setProgress({ kind: 'receive', ...res.data } as AnyProgress);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load barcode progress');
      setProgress(null);
    }
  };

  const checkOverallProgress = async () => {
    if (!dispatch?.items?.length) return;
    if (mode !== 'receive') return;
    setCheckingOverall(true);
    setError(null);
    try {
      const results = await Promise.all(
        dispatch.items.map((it) => dispatchService.getReceivedBarcodes(dispatch.id, it.id))
      );
      const pending = results.reduce((sum, r) => sum + (r.data?.pending_count ?? 0), 0);
      setOverall({ allComplete: pending === 0, pending });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to check overall progress');
    } finally {
      setCheckingOverall(false);
    }
  };

  const handleScan = async () => {
    if (!dispatch || !selectedItemId) return;
    const value = barcode.trim();
    if (!value) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'send') {
        await dispatchService.scanBarcode(dispatch.id, selectedItemId, value);
      } else {
        await dispatchService.receiveBarcode(dispatch.id, selectedItemId, value);
      }

      setBarcode('');
      await fetchProgress(selectedItemId);
      onComplete?.();

      // Keep focus for fast scanning
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Scan failed');
      // keep barcode text to let user re-check
      setTimeout(() => inputRef.current?.select(), 0);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!dispatch || !onMarkDelivered) return;
    setLoading(true);
    setError(null);
    try {
      await onMarkDelivered(dispatch.id);
      onClose();
    } catch (e: any) {
      // surfacing backend's structured error message is useful for staff
      setError(e?.response?.data?.message || 'Failed to complete delivery');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{header}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Dispatch <span className="font-medium text-gray-900 dark:text-white">{dispatch.dispatch_number}</span> •{' '}
              {dispatch.source_store.name} → {dispatch.destination_store.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left: Items */}
          <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-3">
                <Package className="w-4 h-4" /> Items
              </div>
              {items.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No items found in this dispatch.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => {
                    const active = it.id === selectedItemId;
                    const hint = mode === 'send'
                      ? it.barcode_scanning
                        ? `${it.barcode_scanning.scanned_count}/${it.barcode_scanning.required_quantity}`
                        : `${it.quantity} planned`
                      : `${it.received_quantity ?? 0}/${it.quantity}`;

                    return (
                      <button
                        key={it.id}
                        onClick={() => setSelectedItemId(it.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                              {it.product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              SKU: {it.product.sku} • Qty: {it.quantity}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap mt-0.5">
                            {hint}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {mode === 'receive' && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Truck className="w-4 h-4" /> Overall receipt
                    </div>
                    <button
                      onClick={checkOverallProgress}
                      disabled={checkingOverall}
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingOverall ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {overall ? (
                    <div className="mt-2 text-sm">
                      {overall.allComplete ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" /> All items received. Ready to complete delivery.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4" /> {overall.pending} unit(s) still pending receipt.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Click refresh to check if all items are fully received.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Scanner + List */}
          <div className="lg:col-span-2 p-6">
            {!selectedItem ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Select an item to start scanning.</div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedItem.product.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      SKU: {selectedItem.product.sku} • Batch: {selectedItem.batch.batch_number}
                    </div>
                  </div>

                  {stats && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {stats.done}/{stats.total}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{stats.pct}%</div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {stats && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${mode === 'send' ? 'bg-blue-600' : 'bg-green-600'}`}
                        style={{ width: `${stats.pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {mode === 'send' ? 'Scanned' : 'Received'}: <span className="font-medium">{stats.done}</span>
                      </span>
                      <span>
                        Remaining: <span className="font-medium">{stats.remaining}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Scanner */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <div className="relative">
                    <Scan className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={inputRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleScan();
                        }
                      }}
                      placeholder={mode === 'send' ? 'Scan barcode to send…' : 'Scan received barcode…'}
                      className="w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading || (stats ? stats.remaining <= 0 : false)}
                    />
                  </div>
                  <button
                    onClick={handleScan}
                    disabled={loading || !barcode.trim() || (stats ? stats.remaining <= 0 : false)}
                    className={`px-4 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      mode === 'send' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                    {mode === 'send' ? 'Add Scan' : 'Receive'}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    ❌ {error}
                  </div>
                )}

                {/* Barcode list */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {mode === 'send' ? 'Scanned Barcodes' : 'Received Barcodes'}
                    </h4>
                    <button
                      onClick={() => selectedItemId && fetchProgress(selectedItemId)}
                      className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {progress && ((progress.kind === 'send' && progress.scanned_barcodes.length === 0) ||
                        (progress.kind === 'receive' && progress.received_barcodes.length === 0)) ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          No barcodes scanned yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {progress?.kind === 'send' &&
                            progress.scanned_barcodes.map((b, idx) => (
                              <div key={b.id} className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6">{idx + 1}.</span>
                                  <span className="text-sm font-mono text-gray-900 dark:text-white">{b.barcode}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {fmtTime(b.scanned_at)} • {b.scanned_by}
                                </div>
                              </div>
                            ))}

                          {progress?.kind === 'receive' &&
                            progress.received_barcodes.map((b, idx) => (
                              <div key={b.id} className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6">{idx + 1}.</span>
                                  <span className="text-sm font-mono text-gray-900 dark:text-white">{b.barcode}</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {fmtTime(b.received_at)}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complete delivery button (receive mode only) */}
                {mode === 'receive' && onMarkDelivered && (
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {canCompleteCurrentItem
                        ? 'This item is fully received.'
                        : 'Finish receiving all items, then complete delivery.'}
                    </div>
                    <button
                      onClick={handleCompleteDelivery}
                      disabled={loading || !(overall?.allComplete)}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Complete Delivery
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
