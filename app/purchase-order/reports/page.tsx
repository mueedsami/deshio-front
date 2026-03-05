'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, RotateCcw, Download } from 'lucide-react';
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

  // PDF filter state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [vendorId, setVendorId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [status, setStatus] = useState<Status>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('');

  // PO CSV export state
  const [csvPoId, setCsvPoId] = useState('');
  const [csvPoDetailBusy, setCsvPoDetailBusy] = useState(false);
  const [csvPoBarcodeBusy, setCsvPoBarcodeBusy] = useState(false);
  const [csvError, setCsvError] = useState('');

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
        // silent
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    })();
    return () => { mounted = false; };
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

  const openInNewTab = (url: string) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
  const openPreview = () => {
    if (!reportUrl) return;
    const url = reportUrl.includes('?') ? `${reportUrl}&inline=true` : `${reportUrl}?inline=true`;
    openInNewTab(url);
  };
  const downloadPdf = () => { if (reportUrl) openInNewTab(reportUrl); };
  const resetFilters = () => { setFromDate(''); setToDate(''); setVendorId(''); setStoreId(''); setStatus(''); setPaymentStatus(''); };

  const downloadPoCsv = async (type: 'detail' | 'barcodes') => {
    setCsvError('');
    if (!csvPoId.trim()) { setCsvError('Please enter a Purchase Order ID.'); return; }
    const api = getApiUrlBase();
    if (!api) { setCsvError('API URL not configured (NEXT_PUBLIC_API_URL missing).'); return; }
    const setBusy = type === 'detail' ? setCsvPoDetailBusy : setCsvPoBarcodeBusy;
    setBusy(true);
    try {
      const endpoint = type === 'detail'
        ? `${api}/purchase-orders/${csvPoId.trim()}/csv`
        : `${api}/purchase-orders/${csvPoId.trim()}/barcodes/csv`;
      const filename = type === 'detail' ? `PO-${csvPoId.trim()}-detail.csv` : `PO-${csvPoId.trim()}-barcodes.csv`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : '';
      const res = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to download');
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const m = cd.match(/filename="?([^";]+)"?/i);
      const fname = m?.[1] || filename;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setCsvError(e?.message || 'Failed to download CSV');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Purchase Order Reports</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate the PO summary PDF, or export individual PO data as CSV (detail or barcodes).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={resetFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm" title="Reset filters">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={openPreview} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm">
                <FileText className="w-4 h-4" /> Preview PDF
              </button>
              <button onClick={downloadPdf} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm">
                <FileText className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>

          {/* PDF filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">PDF Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
                <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">All vendors</option>
                  {vendors.map((v) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                </select>
                {loadingMeta && vendors.length === 0 && <p className="text-xs text-gray-500 mt-1">Loading vendors…</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store / Warehouse</label>
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">All stores</option>
                  {stores.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
                {loadingMeta && stores.length === 0 && <p className="text-xs text-gray-500 mt-1">Loading stores…</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
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
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
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
                <button onClick={() => openInNewTab(reportUrl)} disabled={!reportUrl} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm disabled:opacity-50" title="Open raw URL">
                  <ExternalLink className="w-4 h-4" /> Open
                </button>
              </div>
            </div>
          </div>

          {/* PO CSV Exports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide flex items-center gap-2">
              <Download className="w-4 h-4" /> Purchase Order CSV Exports
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select a single PO by ID to export its full detail or barcode list as CSV.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Order ID <span className="text-red-500">*</span>
              </label>
              <input
                value={csvPoId}
                onChange={(e) => { setCsvPoId(e.target.value); setCsvError(''); }}
                placeholder="Enter PO ID (e.g. 123)"
                className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {csvError && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                {csvError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">PO Detail CSV</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  50+ columns: vendor info, store, employee tracking (created/approved/received by),
                  item-by-item pricing, batch info, and financial summary (subtotal, tax, discount, paid, outstanding).
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  One row per line item. PO summary columns repeat on each row for easy Excel filtering.
                </p>
                <div className="mt-3">
                  <button disabled={csvPoDetailBusy} onClick={() => downloadPoCsv('detail')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">
                    <Download className="w-4 h-4" /> {csvPoDetailBusy ? 'Preparing…' : 'Download Detail CSV'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">PO Barcodes CSV</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Atomic barcode list — one row per physical unit. Product name/SKU, category, batch number,
                  barcode string/type, active/defective flags, current location and status.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Items not yet received show "NO BARCODES" placeholder. Ideal for receiving, audits, and label printing.
                </p>
                <div className="mt-3">
                  <button disabled={csvPoBarcodeBusy} onClick={() => downloadPoCsv('barcodes')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">
                    <Download className="w-4 h-4" /> {csvPoBarcodeBusy ? 'Preparing…' : 'Download Barcodes CSV'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
