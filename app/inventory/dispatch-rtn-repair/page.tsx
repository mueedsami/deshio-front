'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TerminalSquare,
  X,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import dispatchRtnRepairService, {
  type DispatchRtnBarcodeRow,
  type DispatchRtnMismatchRow,
  type DispatchRtnRepairSummaryResponse,
  type DispatchRtnBatchRow,
  type FullyReceivedDispatchRow,
} from '@/services/dispatchRtnRepairService';

type ToastState = { id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' };

type RunMode = 'dry-current' | 'apply-current' | 'dry-products' | 'apply-products' | null;

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const yesNo = (value: unknown) => (value ? 'Yes' : 'No');

function StatCard({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
      : tone === 'warning'
        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
        : tone === 'success'
          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide font-bold opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {helper && <div className="mt-1 text-xs opacity-70">{helper}</div>}
    </div>
  );
}

function ToastStack({ toasts, removeToast }: { toasts: ToastState[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[80] space-y-2 w-[calc(100vw-2rem)] max-w-md">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : ShieldAlert;
        const cls = isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : isWarning
            ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
            : 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';

        return (
          <div key={toast.id} className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${cls}`}>
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-semibold flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EmptyRows({ label }: { label: string }) {
  return <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{label}</div>;
}

export default function DispatchRtnRepairPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const [days, setDays] = useState('3');
  const [productId, setProductId] = useState('');
  const [batch, setBatch] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const [summary, setSummary] = useState<DispatchRtnRepairSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>(null);
  const [commandOutput, setCommandOutput] = useState('No command run yet.');

  const addToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 6000);
  }, []);

  const removeToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await dispatchRtnRepairService.getSummary({
        days: days || '3',
        product_id: productId.trim() || undefined,
        batch: batch.trim() || undefined,
      });
      setSummary(data);
      addToast(data.message || 'Dispatch RTN summary loaded.', 'success');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load dispatch RTN repair summary.';
      addToast(message, 'error');
    } finally {
      setLoadingSummary(false);
    }
  }, [addToast, batch, days, productId]);

  const affectedProductIds = useMemo(() => {
    const ids = new Set<number>();
    (summary?.rtn_batches || []).forEach((row) => {
      if (row.product_id) ids.add(Number(row.product_id));
    });
    return Array.from(ids).sort((a, b) => a - b);
  }, [summary]);

  const hasScopedFilter = Boolean(productId.trim() || batch.trim());

  const runCurrentScope = async (apply: boolean) => {
    if (apply && !hasScopedFilter && confirmText.trim() !== 'REPAIR ALL') {
      addToast('For global apply, type REPAIR ALL exactly. Safer option: load summary and use Apply products shown.', 'warning');
      return;
    }

    const mode: RunMode = apply ? 'apply-current' : 'dry-current';
    setRunMode(mode);
    try {
      const data = await dispatchRtnRepairService.runRepair({
        apply,
        product_id: productId.trim() || undefined,
        batch: batch.trim() || undefined,
        confirm: confirmText.trim() || undefined,
      });
      setCommandOutput([
        data.command || 'php artisan inventory:repair-dispatch-rtn',
        `Executed at: ${data.executed_at || '—'}`,
        `Applied: ${data.applied ? 'yes' : 'no'}`,
        '',
        data.output || 'No command output returned.',
      ].join('\n'));
      addToast(data.message || (apply ? 'Repair applied.' : 'Dry run finished.'), data.success ? 'success' : 'error');
      await loadSummary();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Repair command failed.';
      setCommandOutput((prev) => `${prev}\n\nERROR:\n${message}`);
      addToast(message, 'error');
    } finally {
      setRunMode(null);
    }
  };

  const runProductsShown = async (apply: boolean) => {
    if (!affectedProductIds.length) {
      addToast('Load summary first. No affected product IDs are available yet.', 'warning');
      return;
    }

    const mode: RunMode = apply ? 'apply-products' : 'dry-products';
    setRunMode(mode);
    const outputs: string[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of affectedProductIds) {
        try {
          const data = await dispatchRtnRepairService.runRepair({ apply, product_id: id });
          if (data.success) successCount += 1;
          else failCount += 1;
          outputs.push([
            `========== PRODUCT ${id} ==========`,
            data.command || `php artisan inventory:repair-dispatch-rtn --product_id=${id}`,
            `Executed at: ${data.executed_at || '—'}`,
            `Applied: ${data.applied ? 'yes' : 'no'}`,
            '',
            data.output || 'No command output returned.',
          ].join('\n'));
        } catch (error: any) {
          failCount += 1;
          const message = error?.response?.data?.message || error?.message || 'Repair command failed.';
          outputs.push([`========== PRODUCT ${id} ==========`, 'ERROR:', message].join('\n'));
        }
      }

      setCommandOutput(outputs.join('\n\n'));
      addToast(
        `${apply ? 'Apply' : 'Dry run'} finished for ${affectedProductIds.length} product(s). Success: ${successCount}, Failed: ${failCount}.`,
        failCount ? 'warning' : 'success'
      );
      await loadSummary();
    } finally {
      setRunMode(null);
    }
  };

  const resetFilters = () => {
    setDays('3');
    setProductId('');
    setBatch('');
    setConfirmText('');
  };

  const summaryCounts = summary?.summary;
  const isBusy = loadingSummary || runMode !== null;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <ToastStack toasts={toasts} removeToast={removeToast} />
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 min-w-0 flex flex-col">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 lg:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-3">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Admin stock repair tool
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <RotateCcw className="w-8 h-8" />
                      Dispatch RTN Repair Panel
                    </h1>
                    <p className="mt-2 max-w-4xl text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Use this after the broken dispatch flow created <span className="font-semibold text-gray-900 dark:text-gray-100">RTN-RESTORE-P...</span> rows or left barcode/batch quantities out of sync. Start with summary and dry run, then apply either product-wise or globally.
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/20 p-4 max-w-md">
                    <div className="flex items-start gap-3">
                      <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5" />
                      <div>
                        <h2 className="text-sm font-bold text-blue-900 dark:text-blue-100">Recommended client-safe flow</h2>
                        <p className="text-xs text-blue-800/80 dark:text-blue-200/80 mt-1 leading-relaxed">
                          Keep days as 3, load summary, run dry run for products shown, then apply products shown. This avoids global repair unless you intentionally type REPAIR ALL.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Summary time window</span>
                    <select
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="1">Last 1 day</option>
                      <option value="3">Last 3 days</option>
                      <option value="7">Last 7 days</option>
                      <option value="14">Last 14 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="0">All time</option>
                    </select>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">Only affects summary/product list.</p>
                  </label>

                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Product ID</span>
                    <input
                      value={productId}
                      onChange={(e) => setProductId(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 8811"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <label className="xl:col-span-2">
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Exact RTN batch / batch ID</span>
                    <input
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="RTN-RESTORE-P8811-S1 or batch ID"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={loadSummary}
                      disabled={isBusy}
                      className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold"
                    >
                      {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Load Summary
                    </button>
                    <button
                      onClick={resetFilters}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
                <StatCard label="RTN batches" value={summaryCounts?.rtn_restore_batch_count ?? '—'} helper="RTN-RESTORE rows" tone={(summaryCounts?.rtn_restore_batch_count || 0) > 0 ? 'warning' : 'success'} />
                <StatCard label="Affected products" value={summaryCounts?.affected_product_count ?? '—'} helper="unique product IDs" />
                <StatCard label="RTN physical qty" value={summaryCounts?.rtn_restore_physical_quantity ?? '—'} helper="old batch qty total" tone={(summaryCounts?.rtn_restore_physical_quantity || 0) > 0 ? 'danger' : 'success'} />
                <StatCard label="Barcodes in RTN" value={summaryCounts?.barcodes_still_inside_rtn_batches ?? '—'} helper="needs relink" tone={(summaryCounts?.barcodes_still_inside_rtn_batches || 0) > 0 ? 'danger' : 'success'} />
                <StatCard label="Qty mismatches" value={summaryCounts?.batch_quantity_mismatch_count_shown ?? '—'} helper="qty/active/barcode ptr" tone={(summaryCounts?.batch_quantity_mismatch_count_shown || 0) > 0 ? 'warning' : 'success'} />
                <StatCard label="Barcode ptr issues" value={summaryCounts?.batch_barcode_pointer_mismatch_count_shown ?? '—'} helper="stale batch barcode_id" tone={(summaryCounts?.batch_barcode_pointer_mismatch_count_shown || 0) > 0 ? 'warning' : 'success'} />
                <StatCard label="Ready dispatches" value={summaryCounts?.fully_received_in_transit_dispatches_shown ?? '—'} helper="received but not finalized" tone={(summaryCounts?.fully_received_in_transit_dispatches_shown || 0) > 0 ? 'warning' : 'success'} />
              </section>

              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:p-5 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-end gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <TerminalSquare className="w-5 h-5" />
                      Repair Actions
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Dry run is safe. Apply writes the database. The safer bulk option applies product-by-product from the loaded summary list.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">Products shown: {affectedProductIds.length ? affectedProductIds.join(', ') : 'none loaded'}</span>
                      <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">Current scope: {hasScopedFilter ? 'product/batch filtered' : 'global'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full xl:w-auto">
                    <button
                      onClick={() => runCurrentScope(false)}
                      disabled={isBusy}
                      className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                    >
                      {runMode === 'dry-current' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageSearch className="w-4 h-4" />}
                      Dry run scope
                    </button>
                    <button
                      onClick={() => runProductsShown(false)}
                      disabled={isBusy || !affectedProductIds.length}
                      className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-800 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-60"
                    >
                      {runMode === 'dry-products' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
                      Dry run products shown
                    </button>
                    <button
                      onClick={() => runProductsShown(true)}
                      disabled={isBusy || !affectedProductIds.length}
                      className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold"
                    >
                      {runMode === 'apply-products' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Apply products shown
                    </button>
                    <button
                      onClick={() => runCurrentScope(true)}
                      disabled={isBusy}
                      className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold"
                    >
                      {runMode === 'apply-current' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                      Apply current scope
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-4">
                  <label>
                    <span className="block text-xs font-bold text-red-800 dark:text-red-300 mb-1">Global apply confirmation</span>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type REPAIR ALL only if you want global repair"
                      className="w-full max-w-md px-3 py-2 rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </label>
                  <p className="text-xs text-red-700 dark:text-red-300/90 mt-2">
                    This is only needed when Product ID and Batch are both empty and you click Apply current scope. Apply products shown does not need this because it repairs only affected products from the loaded summary.
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DataPanel title="RTN Restore Batches" subtitle="Rows matching RTN-RESTORE-P... from the selected summary window.">
                  <RtnBatchTable rows={summary?.rtn_batches || []} />
                </DataPanel>

                <DataPanel title="Problems Detected" subtitle="Barcodes still inside RTN batches, stale batch barcode_id pointers, and quantity mismatch rows.">
                  <ProblemsTable
                    barcodes={summary?.barcodes_still_inside_rtn_batches || []}
                    mismatches={summary?.batch_quantity_mismatches || []}
                  />
                </DataPanel>
              </section>

              <DataPanel title="Fully Received In-Transit Dispatches" subtitle="These are dispatches where all scanned barcodes look received, but the dispatch may still need finalization/repair.">
                <ReadyDispatchTable rows={summary?.fully_received_in_transit_dispatches || []} />
              </DataPanel>

              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-950 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <TerminalSquare className="w-4 h-4" />
                      Command Output
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Copy this output if anything looks strange.</p>
                  </div>
                  <button
                    onClick={() => setCommandOutput('No command run yet.')}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200"
                  >
                    Clear
                  </button>
                </div>
                <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-relaxed text-gray-100 whitespace-pre-wrap font-mono">
                  {commandOutput}
                </pre>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function DataPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function RtnBatchTable({ rows }: { rows: DispatchRtnBatchRow[] }) {
  if (!rows.length) return <EmptyRows label="No RTN-RESTORE batches found for this filter." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left">Batch</th>
            <th className="px-4 py-3 text-left">Product</th>
            <th className="px-4 py-3 text-left">Store</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Barcodes</th>
            <th className="px-4 py-3 text-left">Active</th>
            <th className="px-4 py-3 text-left">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.batch_id} className="text-gray-700 dark:text-gray-200">
              <td className="px-4 py-3 align-top">
                <div className="font-mono text-xs font-semibold max-w-[320px] break-all">{row.batch_number}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-500">ID: {row.batch_id}</div>
              </td>
              <td className="px-4 py-3 align-top font-semibold">{row.product_id}</td>
              <td className="px-4 py-3 align-top">{row.store_id}</td>
              <td className="px-4 py-3 align-top text-right font-bold">{row.quantity}</td>
              <td className="px-4 py-3 align-top text-right font-bold">{row.barcode_count}</td>
              <td className="px-4 py-3 align-top">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {yesNo(row.is_active)}
                </span>
              </td>
              <td className="px-4 py-3 align-top text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProblemsTable({ barcodes, mismatches }: { barcodes: DispatchRtnBarcodeRow[]; mismatches: DispatchRtnMismatchRow[] }) {
  const rows = [
    ...barcodes.map((row) => ({
      id: `barcode-${row.barcode_id}`,
      problem: 'Barcode inside RTN',
      product_id: row.product_id,
      batch: row.batch_number,
      store: row.batch_store_id ?? '—',
      barcode_store: row.barcode_store_id ?? '—',
      barcode: row.barcode,
      detail: row.status || '—',
    })),
    ...mismatches.map((row) => ({
      id: `mismatch-${row.batch_id}`,
      problem: row.barcode_pointer_mismatch && row.old_quantity === row.barcode_quantity ? 'Barcode ptr stale' : 'Batch mismatch',
      product_id: row.product_id,
      batch: row.batch_number,
      store: row.store_id,
      barcode_store: '—',
      barcode: row.old_barcode_id ? String(row.old_barcode_id) : '—',
      detail: [
        `qty ${row.old_quantity} → ${row.barcode_quantity}`,
        row.barcode_pointer_mismatch ? `barcode_id ${row.old_barcode_id ?? 'null'} → ${row.new_barcode_id ?? 'null'}` : null,
      ].filter(Boolean).join(' | '),
    })),
  ];

  if (!rows.length) return <EmptyRows label="No stuck RTN barcode, stale barcode pointer, or quantity mismatch rows found." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left">Problem</th>
            <th className="px-4 py-3 text-left">Product</th>
            <th className="px-4 py-3 text-left">Barcode</th>
            <th className="px-4 py-3 text-left">Batch</th>
            <th className="px-4 py-3 text-left">Store</th>
            <th className="px-4 py-3 text-left">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.id} className="text-gray-700 dark:text-gray-200">
              <td className="px-4 py-3 align-top">
                <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-1 text-xs font-bold">
                  {row.problem}
                </span>
              </td>
              <td className="px-4 py-3 align-top font-semibold">{row.product_id}</td>
              <td className="px-4 py-3 align-top font-mono text-xs">{row.barcode}</td>
              <td className="px-4 py-3 align-top font-mono text-xs max-w-[320px] break-all">{row.batch}</td>
              <td className="px-4 py-3 align-top text-xs">
                batch: {row.store}<br />barcode: {row.barcode_store}
              </td>
              <td className="px-4 py-3 align-top text-xs">{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReadyDispatchTable({ rows }: { rows: FullyReceivedDispatchRow[] }) {
  if (!rows.length) return <EmptyRows label="No fully received in-transit dispatches found for affected products." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left">Dispatch</th>
            <th className="px-4 py-3 text-left">From → To</th>
            <th className="px-4 py-3 text-right">Items</th>
            <th className="px-4 py-3 text-right">Scanned</th>
            <th className="px-4 py-3 text-right">Received</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.dispatch_id} className="text-gray-700 dark:text-gray-200">
              <td className="px-4 py-3 align-top font-mono text-xs font-bold">{row.dispatch_number}</td>
              <td className="px-4 py-3 align-top">{row.source_store_id} → {row.destination_store_id}</td>
              <td className="px-4 py-3 align-top text-right font-bold">{row.items}</td>
              <td className="px-4 py-3 align-top text-right font-bold">{row.scanned}</td>
              <td className="px-4 py-3 align-top text-right font-bold">{row.received}</td>
              <td className="px-4 py-3 align-top">
                <span className="rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-1 text-xs font-bold">
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 align-top text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
