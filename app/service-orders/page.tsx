'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import orderService, { type Order as BackendOrder } from '@/services/orderService';
import storeService, { type Store } from '@/services/storeService';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

type OrderTypeFilter = 'all' | 'counter' | 'social_commerce' | 'ecommerce';

type ServiceOrderListRow = BackendOrder & {
  service_items_count?: number;
  has_service_items?: boolean;
};

const toNumber = (v: any) => {
  const n = Number(String(v ?? '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (v: any) => toNumber(v).toFixed(2);

const titleCase = (value: any) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getTodayFilterValue = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ServiceOrdersPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [loading, setLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [orders, setOrders] = useState<ServiceOrderListRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState<number | 'all'>('all');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [orderType, setOrderType] = useState<OrderTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'order_date' | 'updated_at'>('order_date');
  const [dateFilter, setDateFilter] = useState(() => getTodayFilterValue());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const loadStores = async () => {
    try {
      const allStores = await storeService.getAllStores();
      setStores(Array.isArray(allStores) ? allStores : []);
    } catch (e) {
      console.error('Failed to load stores', e);
    }
  };

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const activeSearch = debouncedSearch.trim();
      const isSearching = activeSearch.length > 0;
      const exactOrderNumber = /^#?\s*ORD[-A-Z0-9]+/i.test(activeSearch)
        ? activeSearch.replace(/^#/, '').trim()
        : undefined;

      const params: any = {
        has_service_items: true,
        per_page: 50,
        page: targetPage,
        sort_by: dateFilterType === 'updated_at' ? 'updated_at' : 'order_date',
        sort_order: 'desc',
        date_filter_type: dateFilterType,
        search: isSearching ? activeSearch : undefined,
        order_number: exactOrderNumber,
        date_from: isSearching ? undefined : (startDate || dateFilter || undefined),
        date_to: isSearching ? undefined : (endDate || dateFilter || undefined),
      };

      if (orderType === 'all') {
        params.order_types = ['counter', 'social_commerce', 'ecommerce'];
      } else {
        params.order_type = orderType;
      }
      if (storeFilter !== 'all') params.store_id = storeFilter;
      if (status !== 'all') params.status = status;
      if (paymentStatus !== 'all') params.payment_status = paymentStatus;

      const res = await orderService.getAll(params);
      setOrders((res.data || []) as ServiceOrderListRow[]);
      setPage(res.current_page || targetPage);
      setLastPage(res.last_page || 1);
      setTotal(res.total || 0);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load service orders', 'error');
      setOrders([]);
      setTotal(0);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  };

  const viewOrder = async (orderId: number) => {
    setViewLoading(true);
    try {
      const order = await orderService.getById(orderId, true);
      setSelectedOrder(order);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load order details', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, storeFilter, status, paymentStatus, orderType, dateFilterType, dateFilter, startDate, endDate]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    load(1);
  };

  const clearFilters = () => {
    setStoreFilter('all');
    setStatus('all');
    setPaymentStatus('all');
    setOrderType('all');
    setSearch('');
    setDebouncedSearch('');
    setDateFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const stats = useMemo(() => {
    const totalAmount = orders.reduce((s, o) => s + toNumber(o.total_amount), 0);
    const paid = orders.reduce((s, o) => s + toNumber(o.paid_amount), 0);
    const due = orders.reduce((s, o) => s + toNumber(o.outstanding_amount), 0);
    const serviceItems = orders.reduce((s, o) => s + Number(o.service_items_count || 0), 0);
    return { totalAmount, paid, due, count: total, serviceItems };
  }, [orders, total]);

  const selectedServices = selectedOrder?.services || [];
  const selectedItems = selectedOrder?.items || [];

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-auto p-6">
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  className={`px-4 py-3 rounded-lg shadow border text-sm font-medium ${
                    t.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                      : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                  }`}
                >
                  {t.message}
                </div>
              ))}
            </div>

            <div className="max-w-7xl mx-auto">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Service Orders</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    POS and online orders that contain at least one service item
                  </p>
                </div>
                <button
                  onClick={() => load(page)}
                  className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Orders</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.count}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Service Items</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.serviceItems}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">৳{fmtMoney(stats.totalAmount)}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Outstanding</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">৳{fmtMoney(stats.due)}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['confirmed', 'Confirmed'],
                    ['completed', 'Completed'],
                    ['cancelled', 'Cancelled'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setStatus(value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        status === value
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Search</label>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Order no, customer name, phone…"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Store</label>
                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="all">All Stores</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Payment</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="all">All Payment</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Type</label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as OrderTypeFilter)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="all">POS + Online</option>
                      <option value="counter">POS</option>
                      <option value="social_commerce">Social Commerce</option>
                      <option value="ecommerce">E-Commerce</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setShowMoreFilters((v) => !v)}
                    className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {showMoreFilters ? 'Hide More Filters' : 'More Filters'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      Clear
                    </button>
                    <button
                      onClick={applyFilters}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
                      disabled={loading}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {showMoreFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Date Based On</label>
                      <select
                        value={dateFilterType}
                        onChange={(e) => setDateFilterType(e.target.value as 'order_date' | 'updated_at')}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="order_date">Order Placed</option>
                        <option value="updated_at">Last Updated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Date</label>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => {
                          setDateFilter(e.target.value);
                          if (e.target.value) {
                            setStartDate('');
                            setEndDate('');
                          }
                        }}
                        disabled={!!startDate || !!endDate}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={!!dateFilter}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={!!dateFilter}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Order</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Service</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Payment</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Total</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {orders.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={9}>
                            {loading ? 'Loading…' : 'No orders with service items found'}
                          </td>
                        </tr>
                      ) : (
                        orders.map((o) => (
                          <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900 dark:text-white">{o.order_number}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{o.store?.name || 'Online / unassigned'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900 dark:text-white">{o.customer?.name || '-'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{o.customer?.phone || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{o.order_type === 'counter' ? 'POS' : o.order_type === 'social_commerce' ? 'Social Commerce' : 'E-Commerce'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                {Number(o.service_items_count || 0)} service item{Number(o.service_items_count || 0) === 1 ? '' : 's'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                {titleCase(o.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                {titleCase(o.payment_status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900 dark:text-white">৳{fmtMoney(o.total_amount)}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{String(o.order_date || o.created_at || '').slice(0, 10)}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => viewOrder(o.id)}
                                className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                                disabled={viewLoading}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    Page {page} of {lastPage} · {total} order{total === 1 ? '' : 's'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                      disabled={page >= lastPage || loading}
                      className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedOrder.order_number}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedOrder.customer?.name} · {selectedOrder.customer?.phone} · {selectedOrder.order_type === 'counter' ? 'POS' : selectedOrder.order_type === 'social_commerce' ? 'Social Commerce' : 'E-Commerce'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{titleCase(selectedOrder.status)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500">Payment</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{titleCase(selectedOrder.payment_status)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-semibold text-gray-900 dark:text-white">৳{fmtMoney(selectedOrder.total_amount)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500">Due</div>
                  <div className="font-semibold text-red-600 dark:text-red-400">৳{fmtMoney(selectedOrder.outstanding_amount)}</div>
                </div>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Service Part</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white">Highlighted</span>
                </div>
                <div className="space-y-2">
                  {selectedServices.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4">
                      No service items found in the detailed response.
                    </div>
                  ) : (
                    selectedServices.map((s) => (
                      <div key={s.id} className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="font-semibold text-blue-900 dark:text-blue-100">{s.service_name}</div>
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              {s.service_code || 'Service'} {s.category ? `· ${s.category}` : ''} {s.status ? `· ${titleCase(s.status)}` : ''}
                            </div>
                          </div>
                          <div className="text-sm text-blue-900 dark:text-blue-100">
                            Qty {s.quantity} × ৳{fmtMoney(s.unit_price)} = ৳{fmtMoney(s.total_price)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Product Items</h3>
                <div className="space-y-2">
                  {selectedItems.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4">
                      No product items in this order.
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.product_sku} {item.barcode ? `· ${item.barcode}` : ''}</div>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            Qty {item.quantity} × ৳{fmtMoney(item.unit_price)} = ৳{fmtMoney(item.total_amount)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
