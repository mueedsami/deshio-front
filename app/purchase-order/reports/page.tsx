'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, RotateCcw } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import storeService, { Store } from '@/services/storeService';
import { vendorService, Vendor } from '@/services/vendorService';

const getApiUrlBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  return raw.replace(/\/$/, '');
};

type Status = 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled' | '';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | '';

export default function PurchaseOrderReportsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [vendorId, setVendorId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [status, setStatus] = useState<Status>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingMeta(true);
      try {
        const [v, s] = await Promise.all([
          vendorService.getAll({ per_page: 1000, is_active: true }),
          storeService.getStores({ per_page: 1000, is_active: true }),
        ]);

        const storeList: any[] = Array.isArray(s)
          ? s
          : Array.isArray((s as any)?.data)
            ? (s as any).data
            : Array.isArray((s as any)?.data?.data)
              ? (s as any).data.data
              : [];

        if (mounted) {
          setVendors(Array.isArray(v) ? v : []);
          setStores(storeList as Store[]);
        }
      } catch {
        // silent: report page still works without dropdown data
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const reportUrl = useMemo(() => {
    const api = getApiUrlBase();
    if (!api) return '';

    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (vendorId) params.append('vendor_id', vendorId);
    if (storeId) params.append('store_id', storeId);
    if (status) params.append('status', status);
    if (paymentStatus) params.append('payment_status', paymentStatus);

    const qs = params.toString();
    return `${api}/purchase-orders/report/pdf${qs ? `?${qs}` : ''}`;
  }, [fromDate, toDate, vendorId, storeId, status, paymentStatus]);

  const openInNewTab = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openPreview = () => {
    if (!reportUrl) return;
    const url = reportUrl.includes('?') ? `${reportUrl}&inline=true` : `${reportUrl}?inline=true`;
    openInNewTab(url);
  };

  const downloadPdf = () => {
    if (!reportUrl) return;
    openInNewTab(reportUrl);
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setVendorId('');
    setStoreId('');
    setStatus('');
    setPaymentStatus('');
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Purchase Order Reports (PDF)</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate the PO summary PDF using the backend API. Use <b>Preview</b> to open in browser or <b>Download</b> to save.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                title="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>

              <button
                onClick={openPreview}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm"
              >
                <FileText className="w-4 h-4" />
                Preview
              </button>

              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm"
              >
                <FileText className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All vendors</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {loadingMeta && vendors.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Loading vendors…</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store / Warehouse</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All stores</option>
                  {stores.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {loadingMeta && stores.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Loading stores…</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="partially_received">Partially received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Generated URL</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-100 break-all">
                  {reportUrl || 'Set NEXT_PUBLIC_API_URL to enable'}
                </code>
                <button
                  onClick={() => openInNewTab(reportUrl)}
                  disabled={!reportUrl}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm disabled:opacity-50"
                  title="Open raw URL"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
