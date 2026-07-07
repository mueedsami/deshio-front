'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Printer, RefreshCw, RotateCcw, Search } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import purchaseOrderService, { PurchaseOrder } from '@/services/purchase-order.service';
import storeService, { Store } from '@/services/storeService';
import { vendorService, Vendor } from '@/services/vendorService';
import {
  buildPurchaseOrderSummaryPrintHtml,
  buildSinglePurchaseOrderPrintHtml,
  openPurchaseOrderPrintWindow,
  purchaseOrdersToCsv,
} from '@/lib/purchaseOrderReportHtml';

type Status = 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled' | '';
type PaymentStatus = 'unpaid' | 'partial' | 'partially_paid' | 'paid' | '';

const unwrapVendors = (value: any): Vendor[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const unwrapStores = (value: any): Store[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const fmtMoney = (value: any) => {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const fmtDate = (value: any) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const orderedQty = (po: any) => (po?.items || []).reduce((sum: number, item: any) => sum + Number(item?.quantity_ordered || 0), 0);
const receivedQty = (po: any) => (po?.items || []).reduce((sum: number, item: any) => sum + Number(item?.quantity_received || 0), 0);
const poTotal = (po: any) => Number(po?.total_amount || 0);
const poPaid = (po: any) => Number(po?.paid_amount || 0);
const poOutstanding = (po: any) => Number(po?.outstanding_amount ?? (poTotal(po) - poPaid(po)));

export default function PurchaseOrderReportsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('');
  const [search, setSearch] = useState('');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<string>('');

  const [singlePoSearch, setSinglePoSearch] = useState('');
  const [singlePoBusy, setSinglePoBusy] = useState(false);
  const [singlePoError, setSinglePoError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingMeta(true);
      try {
        const [v, s] = await Promise.all([
          vendorService.getAll({ per_page: 1000, is_active: true }),
          storeService.getStores({ per_page: 1000, is_active: true }),
        ]);
        if (!mounted) return;
        setVendors(unwrapVendors(v));
        setStores(unwrapStores(s));
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filterLabels = useMemo(() => {
    const vendorName = vendors.find((v: any) => String(v.id) === String(vendorId))?.name || '';
    const storeName = stores.find((s: any) => String(s.id) === String(storeId))?.name || '';
    return {
      from_date: fromDate,
      to_date: toDate,
      vendor: vendorName || vendorId,
      store: storeName || storeId,
      status,
      payment_status: paymentStatus,
      search,
    };
  }, [fromDate, toDate, vendorId, storeId, status, paymentStatus, search, vendors, stores]);

  const totals = useMemo(() => orders.reduce((acc, po) => {
    acc.count += 1;
    acc.ordered += orderedQty(po);
    acc.received += receivedQty(po);
    acc.total += poTotal(po);
    acc.paid += poPaid(po);
    acc.outstanding += poOutstanding(po);
    return acc;
  }, { count: 0, ordered: 0, received: 0, total: 0, paid: 0, outstanding: 0 }), [orders]);

  const loadReport = async () => {
    setLoadingReport(true);
    setReportError('');
    try {
      const response = await purchaseOrderService.getAll({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        vendor_id: vendorId ? Number(vendorId) : undefined,
        store_id: storeId ? Number(storeId) : undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        search: search || undefined,
        per_page: 500,
        page: 1,
        sort_by: 'created_at',
        sort_direction: 'desc',
      });
      const rows = Array.isArray((response as any)?.data?.data) ? (response as any).data.data : [];
      setOrders(rows);
      setLastLoadedAt(new Date().toLocaleString());
    } catch (error: any) {
      setReportError(error?.response?.data?.message || error?.message || 'Failed to load purchase orders');
      setOrders([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => { loadReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setVendorId('');
    setStoreId('');
    setStatus('');
    setPaymentStatus('');
    setSearch('');
  };

  const printSummary = () => {
    openPurchaseOrderPrintWindow(buildPurchaseOrderSummaryPrintHtml(orders, filterLabels));
  };

  const downloadSummaryCsv = () => {
    const blob = new Blob([purchaseOrdersToCsv(orders)], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-order-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const fetchExactPo = async (query: string): Promise<PurchaseOrder> => {
    const trimmed = query.trim();
    if (!trimmed) throw new Error('Enter a PO ID or PO number.');

    if (/^\d+$/.test(trimmed)) {
      const direct = await purchaseOrderService.getById(Number(trimmed));
      const po = (direct as any)?.data;
      if (!po) throw new Error('Purchase order not found.');
      return po;
    }

    const found = await purchaseOrderService.getAll({ search: trimmed, per_page: 10, page: 1 });
    const matches = Array.isArray((found as any)?.data?.data) ? (found as any).data.data : [];
    const exact = matches.find((po: any) => String(po?.po_number).toLowerCase() === trimmed.toLowerCase()) || matches[0];
    if (!exact?.id) throw new Error('Purchase order not found.');
    const detail = await purchaseOrderService.getById(Number(exact.id));
    const po = (detail as any)?.data;
    if (!po) throw new Error('Purchase order details not found.');
    return po;
  };

  const printSinglePo = async (query: string = singlePoSearch) => {
    setSinglePoBusy(true);
    setSinglePoError('');
    try {
      const po = await fetchExactPo(query);
      openPurchaseOrderPrintWindow(buildSinglePurchaseOrderPrintHtml(po));
    } catch (error: any) {
      setSinglePoError(error?.response?.data?.message || error?.message || 'Failed to open PO report');
    } finally {
      setSinglePoBusy(false);
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
                Frontend report from live PO API data. No backend PDF redirect, so the report matches the PO list/details data.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={resetFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={loadReport} disabled={loadingReport} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${loadingReport ? 'animate-spin' : ''}`} /> Load Report
              </button>
              <button onClick={printSummary} disabled={!orders.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button onClick={downloadSummaryCsv} disabled={!orders.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60">
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  {vendors.map((v: any) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                </select>
                {loadingMeta && vendors.length === 0 && <p className="text-xs text-gray-500 mt-1">Loading vendors…</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store / Warehouse</label>
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="">All stores</option>
                  {stores.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
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
                  <option value="partially_paid">Partially paid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search PO number</label>
                <div className="flex gap-2">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PO-2026..." className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <button onClick={loadReport} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"><Search className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">PO Count</p><p className="text-xl font-bold">{totals.count}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">Ordered Qty</p><p className="text-xl font-bold">{totals.ordered}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">Received Qty</p><p className="text-xl font-bold">{totals.received}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">৳{fmtMoney(totals.total)}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">Paid</p><p className="text-xl font-bold">৳{fmtMoney(totals.paid)}</p></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"><p className="text-xs text-gray-500">Outstanding</p><p className="text-xl font-bold">৳{fmtMoney(totals.outstanding)}</p></div>
          </div>

          {reportError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{reportError}</div>}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between gap-3 items-center">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Loaded Purchase Orders</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{lastLoadedAt ? `Last loaded: ${lastLoadedAt}` : 'Not loaded yet'}</p>
              </div>
              {loadingReport && <span className="text-sm text-gray-500">Loading…</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-2 text-left">PO</th>
                    <th className="px-4 py-2 text-left">Vendor</th>
                    <th className="px-4 py-2 text-left">Store</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Outstanding</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && !loadingReport ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No purchase orders found.</td></tr>
                  ) : orders.map((po: any) => (
                    <tr key={po.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{po.po_number}<div className="text-xs text-gray-500">ID: {po.id}</div></td>
                      <td className="px-4 py-2">{po.vendor?.name || '—'}</td>
                      <td className="px-4 py-2">{po.store?.name || '—'}</td>
                      <td className="px-4 py-2">{fmtDate(po.order_date || po.created_at)}</td>
                      <td className="px-4 py-2"><span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium">{po.status}</span></td>
                      <td className="px-4 py-2 text-right">৳{fmtMoney(po.total_amount)}</td>
                      <td className="px-4 py-2 text-right">৳{fmtMoney(poOutstanding(po))}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => printSinglePo(String(po.id))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs">
                          <Eye className="w-3 h-3" /> Exact Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" /> Single PO Exact Report
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter PO number or PO ID. This fetches the single PO details first, then opens a frontend print report.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input value={singlePoSearch} onChange={(e) => { setSinglePoSearch(e.target.value); setSinglePoError(''); }} placeholder="PO-20260604-000006 or 123" className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              <button disabled={singlePoBusy} onClick={() => printSinglePo()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">
                <Printer className="w-4 h-4" /> {singlePoBusy ? 'Opening…' : 'Open Exact Report'}
              </button>
            </div>
            {singlePoError && <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{singlePoError}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
