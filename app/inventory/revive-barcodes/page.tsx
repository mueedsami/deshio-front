'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { storeService, barcodeTransferService, type Store } from '@/services';
import {
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ScanLine,
  Trash2,
  Loader2,
  ListChecks,
  Plus,
  X,
} from 'lucide-react';

type Mode = 'single' | 'bulk';

type LogItem = {
  id: string;
  barcode: string;
  ok: boolean;
  message: string;
  productName?: string;
  sku?: string;
  fromStore?: string;
  toStore?: string;
  at: string;
};

const normalizeBarcodeList = (raw: string): string[] => {
  return raw
    .split(/[\s,;|\n\r\t]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

export default function ReviveBarcodesPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loadingStores, setLoadingStores] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');

  const [mode, setMode] = useState<Mode>('single');

  // Scanner input (used by both modes)
  const [barcode, setBarcode] = useState('');

  // Single mode
  const [submitting, setSubmitting] = useState(false);

  // Bulk mode
  const [pending, setPending] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({});

  // Shared
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [notice, setNotice] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bootstrap = async () => {
      setLoadingStores(true);
      try {
        const res = await storeService.getStores({ is_active: true, per_page: 200 });
        const arr: Store[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];
        setStores(arr);

        const localStoreId = Number(localStorage.getItem('storeId') || '');
        if (localStoreId && arr.some((s) => Number(s.id) === localStoreId)) {
          setSelectedStoreId(localStoreId);
        } else if (arr.length) {
          setSelectedStoreId(arr[0].id);
        }
      } catch (e: any) {
        setNotice(e?.response?.data?.message || 'Failed to load stores.');
      } finally {
        setLoadingStores(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    bootstrap();
  }, []);

  // Keep scanner focus when switching modes
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  const summary = useMemo(() => {
    const success = logs.filter((l) => l.ok).length;
    const failed = logs.length - success;
    return { success, failed, total: logs.length };
  }, [logs]);

  const pushLog = (item: Omit<LogItem, 'id' | 'at'>) => {
    setLogs((prev) =>
      [
        {
          ...item,
          id: `${Date.now()}-${Math.random()}`,
          at: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 50)
    );
  };

  const reviveOne = async (cleanBarcode: string) => {
    const res = await barcodeTransferService.transferToStore({
      barcode: cleanBarcode,
      store_id: Number(selectedStoreId),
    });
    return res;
  };

  const handleReviveSingle = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode || !selectedStoreId || submitting || bulkSubmitting) return;

    setSubmitting(true);
    setNotice('');
    try {
      const res = await reviveOne(cleanBarcode);

      if (res?.success) {
        pushLog({
          barcode: cleanBarcode,
          ok: true,
          message: res.message || 'Revived successfully',
          productName: res.data?.product?.name,
          sku: res.data?.product?.sku,
          fromStore: res.data?.from_store?.name,
          toStore: res.data?.to_store?.name,
        });
        setBarcode('');
      } else {
        pushLog({ barcode: cleanBarcode, ok: false, message: res?.message || 'Transfer failed' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Transfer failed';
      pushLog({ barcode: cleanBarcode, ok: false, message: msg });
    } finally {
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const addPending = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setPending((prev) => {
      if (prev.includes(clean)) return prev;
      return [...prev, clean];
    });
    setBulkErrors((prev) => {
      if (!prev[clean]) return prev;
      const { [clean]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAddPendingFromScan = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;
    if (!selectedStoreId) {
      setNotice('Please select a target store first.');
      return;
    }
    addPending(cleanBarcode);
    setBarcode('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAddPendingFromPaste = () => {
    const list = normalizeBarcodeList(bulkText);
    if (!list.length) return;
    if (!selectedStoreId) {
      setNotice('Please select a target store first.');
      return;
    }

    // Dedup while preserving order
    setPending((prev) => {
      const set = new Set(prev);
      const next = [...prev];
      for (const b of list) {
        if (!set.has(b)) {
          set.add(b);
          next.push(b);
        }
      }
      return next;
    });

    setBulkText('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleBulkRevive = async () => {
    if (!selectedStoreId || bulkSubmitting || submitting) return;
    if (!pending.length) return;

    setBulkSubmitting(true);
    setNotice('');
    setBulkProgress({ done: 0, total: pending.length });

    const startList = [...pending];
    const remaining: string[] = [];
    const nextErrors: Record<string, string> = {};

    try {
      let done = 0;
      for (const code of startList) {
        try {
          const res = await reviveOne(code);
          if (res?.success) {
            pushLog({
              barcode: code,
              ok: true,
              message: res.message || 'Revived successfully',
              productName: res.data?.product?.name,
              sku: res.data?.product?.sku,
              fromStore: res.data?.from_store?.name,
              toStore: res.data?.to_store?.name,
            });
          } else {
            const msg = res?.message || 'Transfer failed';
            pushLog({ barcode: code, ok: false, message: msg });
            remaining.push(code);
            nextErrors[code] = msg;
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Transfer failed';
          pushLog({ barcode: code, ok: false, message: msg });
          remaining.push(code);
          nextErrors[code] = msg;
        } finally {
          done += 1;
          setBulkProgress({ done, total: startList.length });
        }
      }
    } finally {
      setPending(remaining);
      setBulkErrors(nextErrors);
      setBulkSubmitting(false);
      setBulkProgress(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const removePending = (code: string) => {
    setPending((prev) => prev.filter((x) => x !== code));
    setBulkErrors((prev) => {
      if (!prev[code]) return prev;
      const { [code]: _, ...rest } = prev;
      return rest;
    });
  };

  const clearPending = () => {
    setPending([]);
    setBulkErrors({});
  };

  const disableInputs = loadingStores || submitting || bulkSubmitting;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dispatch Barcode Revive</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Scan stuck barcodes from cancelled dispatches and revive them back to any store inventory.
              </p>
            </div>

            {notice && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {notice}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      <h2 className="font-medium text-gray-900 dark:text-white">Revive Panel</h2>
                    </div>

                    {/* Mode Toggle */}
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMode('single')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          mode === 'single'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title="Revive immediately on each scan"
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('bulk')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          mode === 'bulk'
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title="Collect scans, then revive all"
                      >
                        Bulk
                      </button>
                    </div>
                  </div>

                  {/* Target store */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Target Store</label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : '')}
                      disabled={disableInputs}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="">Select store...</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scanner input (shared) */}
                  <form onSubmit={mode === 'single' ? handleReviveSingle : handleAddPendingFromScan} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        {mode === 'single' ? 'Scan Barcode (revive instantly)' : 'Scan Barcode (add to bulk list)'}
                      </label>
                      <div className="relative">
                        <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          ref={inputRef}
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          disabled={disableInputs}
                          placeholder={mode === 'single' ? 'Scan and press Enter' : 'Scan to add (Enter)'}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Scanner usually sends Enter automatically after scan.
                      </p>
                    </div>

                    {/* Primary action button */}
                    {mode === 'single' ? (
                      <button
                        type="submit"
                        disabled={!barcode.trim() || !selectedStoreId || submitting || bulkSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        {submitting ? 'Reviving...' : 'Revive Barcode'}
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!barcode.trim() || !selectedStoreId || disableInputs}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" /> Add to Bulk List
                      </button>
                    )}
                  </form>

                  {/* Bulk controls */}
                  {mode === 'bulk' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Paste barcodes (optional)
                        </label>
                        <textarea
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          disabled={disableInputs}
                          placeholder="Paste barcode list (newline / comma separated)"
                          className="w-full min-h-[80px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleAddPendingFromPaste}
                            disabled={!bulkText.trim() || !selectedStoreId || disableInputs}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" /> Add List
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkText('')}
                            disabled={!bulkText.trim() || disableInputs}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                            title="Clear pasted text"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-200">
                          Pending: <span className="font-semibold">{pending.length}</span>
                        </div>
                        {!!pending.length && (
                          <button
                            type="button"
                            onClick={clearPending}
                            disabled={disableInputs}
                            className="text-xs text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-50"
                          >
                            Clear pending
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkRevive}
                        disabled={!pending.length || !selectedStoreId || disableInputs}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                        {bulkSubmitting
                          ? `Reviving... ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? pending.length}`
                          : `Revive All (${pending.length})`}
                      </button>

                      {!!pending.length && (
                        <div className="max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          {pending.map((code) => (
                            <div
                              key={code}
                              className="flex items-start justify-between gap-2 px-3 py-2 text-sm border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="min-w-0">
                                <div className="font-mono text-gray-900 dark:text-white break-all">{code}</div>
                                {bulkErrors[code] && (
                                  <div className="text-[11px] text-red-600 dark:text-red-300">{bulkErrors[code]}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removePending(code)}
                                disabled={disableInputs}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Remove"
                              >
                                <X className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Tip: Failed barcodes stay in the pending list for quick retry.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Session Summary</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">{summary.total}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-300">Scanned</div>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                      <div className="text-lg font-semibold text-green-700 dark:text-green-300">{summary.success}</div>
                      <div className="text-[11px] text-green-700/80 dark:text-green-300">Success</div>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                      <div className="text-lg font-semibold text-red-700 dark:text-red-300">{summary.failed}</div>
                      <div className="text-[11px] text-red-700/80 dark:text-red-300">Failed</div>
                    </div>
                  </div>
                  {!!logs.length && (
                    <button
                      onClick={() => setLogs([])}
                      disabled={disableInputs}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" /> Clear Log
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium text-gray-900 dark:text-white">Recent Revive Activity</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Latest 50 actions</span>
                </div>

                {logs.length === 0 ? (
                  <div className="h-64 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No activity yet. Select a store and start scanning.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[65vh] overflow-auto pr-1">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`rounded-lg border p-3 ${
                          log.ok
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {log.ok ? (
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                              <span className="font-mono font-medium text-gray-900 dark:text-white">{log.barcode}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">• {log.at}</span>
                            </div>
                            <p
                              className={`text-sm ${
                                log.ok ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                              }`}
                            >
                              {log.message}
                            </p>
                            {(log.productName || log.fromStore || log.toStore) && (
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                                {log.productName && (
                                  <div>
                                    Product: {log.productName}
                                    {log.sku ? ` (${log.sku})` : ''}
                                  </div>
                                )}
                                {(log.fromStore || log.toStore) && (
                                  <div>
                                    {log.fromStore || '-'} → {log.toStore || '-'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
