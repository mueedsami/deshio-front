'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Barcode,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PackageX,
  RefreshCw,
  Search,
  Store as StoreIcon,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import batchService, {
  type DeletedBatchReportResponse,
  type DeletedBatchReportRow,
} from '@/services/batchService';
import storeService, { type Store } from '@/services/storeService';
import { useTheme } from '@/contexts/ThemeContext';

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
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

const csvCell = (value: any): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export default function DeletedBatchReportPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [report, setReport] = useState<DeletedBatchReportResponse | null>(null);

  const rows = report?.data || [];
  const summary = report?.summary;

  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const data = await storeService.getAllStores();
      setStores(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setToast({ message: error?.response?.data?.message || error?.message || 'Failed to load stores.', type: 'error' });
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await batchService.getDeletedBatchReport({
        search: search.trim() || undefined,
        store_id: storeId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        per_page: perPage,
        barcode_limit: 1000,
      });
      setReport(res.data);
    } catch (error: any) {
      setReport(null);
      setToast({ message: error?.response?.data?.message || error?.message || 'Failed to load deleted batch report.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, perPage, search, storeId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totalDeletedStockOnPage = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.deleted_stock || 0), 0),
    [rows]
  );

  const exportCurrentPageCsv = () => {
    if (!rows.length) {
      setToast({ message: 'No report data to export.', type: 'warning' });
      return;
    }

    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Deleted Batch ID',
      'Deleted Batch Number',
      'Deleted Stock',
      'Logged Barcodes',
      'Store',
      'Purchase Order',
      'Barcode',
      'Barcode Status',
      'Barcode Active',
      'Barcode Defective',
      'Deleted At',
    ];

    const lines = [headers.map(csvCell).join(',')];
    rows.forEach((row) => {
      const barcodes = row.barcodes?.length ? row.barcodes : [null];
      barcodes.forEach((barcode) => {
        lines.push([
          row.product.id,
          row.product.name,
          row.product.sku,
          row.deleted_batch.id,
          row.deleted_batch.batch_number,
          row.deleted_stock,
          row.barcodes_logged,
          row.store.name,
          row.purchase_order.number,
          barcode?.barcode,
          barcode?.current_status,
          barcode ? (barcode.is_active ? 'Yes' : 'No') : '',
          barcode ? (barcode.is_defective ? 'Yes' : 'No') : '',
          barcode?.deleted_at || row.last_deleted_at,
        ].map(csvCell).join(','));
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-batch-report-page-${report?.current_page || 1}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch('');
    setStoreId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 min-w-0 flex flex-col">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <PackageX className="w-8 h-8" />
                    Deleted Batch Report
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-3xl">
                    Track products whose batches were deleted, the deleted stock count, and every old barcode preserved in the deleted-batch safety table.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportCurrentPageCsv}
                    disabled={!rows.length}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                  >
                    <Download className="w-4 h-4" />
                    Export current page
                  </button>
                  <button
                    onClick={loadReport}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-sm font-semibold text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4 lg:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                  <label className="xl:col-span-2">
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Search product / SKU / barcode / batch</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="e.g. SKU, barcode, product name"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Store</span>
                    <select
                      value={storeId}
                      onChange={(e) => { setStoreId(e.target.value); setPage(1); }}
                      disabled={storesLoading}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    >
                      <option value="">All stores</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Rows</span>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    >
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => { setPage(1); loadReport(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-sm font-semibold text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Apply filters
                  </button>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Reset
                  </button>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard icon={<PackageX className="w-5 h-5" />} label="Deleted products" value={summary?.total_products ?? 0} />
                <SummaryCard icon={<CalendarDays className="w-5 h-5" />} label="Deleted batches" value={summary?.total_deleted_batches ?? 0} />
                <SummaryCard icon={<Barcode className="w-5 h-5" />} label="Deleted barcodes" value={summary?.total_deleted_barcodes ?? 0} />
                <SummaryCard icon={<StoreIcon className="w-5 h-5" />} label="Stock on this page" value={totalDeletedStockOnPage} />
              </section>

              <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 lg:px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deleted batch groups</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Showing {report?.from ?? 0}-{report?.to ?? 0} of {report?.total ?? 0} grouped deleted-batch records.
                    </p>
                  </div>
                  {summary?.stock_rule && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2 rounded-lg max-w-xl">
                      {summary.stock_rule}
                    </p>
                  )}
                </div>

                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    Loading deleted batch report...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-center px-4">
                    <PackageX className="w-10 h-10 mb-3" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200">No deleted batch records found.</p>
                    <p className="text-sm mt-1">Try clearing filters, or delete a batch first to generate records in batch_deleted_barcodes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {rows.map((row, index) => (
                      <DeletedBatchRow key={`${row.deleted_batch.id || 'batch'}-${row.product.id || 'product'}-${index}`} row={row} />
                    ))}
                  </div>
                )}

                <div className="px-4 lg:px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {report?.current_page ?? page} of {report?.last_page ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={loading || (report?.current_page ?? page) <= 1}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-semibold text-gray-800 dark:text-gray-200 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(report?.last_page ?? p, p + 1))}
                      disabled={loading || (report?.current_page ?? page) >= (report?.last_page ?? 1)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-semibold text-gray-800 dark:text-gray-200 disabled:opacity-50"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.type === 'error' || toast.type === 'warning' ? 6500 : 3500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(value || 0).toLocaleString('en-BD')}</p>
        </div>
      </div>
    </div>
  );
}

function DeletedBatchRow({ row }: { row: DeletedBatchReportRow }) {
  return (
    <article className="p-4 lg:p-5 hover:bg-gray-50 dark:hover:bg-gray-950/60 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4">
          <p className="text-base font-semibold text-gray-900 dark:text-white">{row.product.name}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge>SKU: {row.product.sku || '-'}</Badge>
            <Badge>Product ID: {row.product.id || '-'}</Badge>
          </div>
        </div>

        <div className="xl:col-span-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <p><span className="font-semibold">Deleted batch:</span> {row.deleted_batch.batch_number || row.deleted_batch.id || '-'}</p>
          <p><span className="font-semibold">Store:</span> {row.store.name || '-'}</p>
          <p><span className="font-semibold">PO:</span> {row.purchase_order.number || '-'}</p>
        </div>

        <div className="xl:col-span-3 grid grid-cols-2 gap-3">
          <Metric label="Deleted stock" value={row.deleted_stock} />
          <Metric label="Barcodes" value={row.barcodes_logged} />
        </div>

        <div className="xl:col-span-2 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold text-gray-800 dark:text-gray-200">Last deleted</p>
          <p>{formatDateTime(row.last_deleted_at)}</p>
        </div>
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
          <Barcode className="w-4 h-4" />
          Show preserved barcodes ({row.barcodes_returned}/{row.barcodes_logged})
        </summary>
        <div className="mt-3 overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Barcode</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="text-left px-3 py-2 font-semibold">Active</th>
                <th className="text-left px-3 py-2 font-semibold">Defective</th>
                <th className="text-left px-3 py-2 font-semibold">Deleted at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
              {row.barcodes.map((barcode) => (
                <tr key={barcode.deleted_record_id}>
                  <td className="px-3 py-2 font-mono">{barcode.barcode || '-'}</td>
                  <td className="px-3 py-2">{barcode.current_status || '-'}</td>
                  <td className="px-3 py-2">{barcode.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{barcode.is_defective ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{formatDateTime(barcode.deleted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{Number(value || 0).toLocaleString('en-BD')}</p>
    </div>
  );
}
