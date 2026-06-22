'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clipboard,
  Loader,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Store as StoreIcon,
  XCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import orderManagementService, {
  AssignmentBlockerResponse,
  AssignmentBlockerStore,
  PendingAssignmentOrder,
  ProductAssignmentDiagnosticsResponse,
} from '@/services/orderManagementService';
import storeService from '@/services/storeService';

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const statusClass = (status?: string) => {
  const s = String(status || '').toLowerCase();
  if (['assigned_to_store', 'picking', 'processing', 'ready_for_pickup', 'ready_for_shipment'].includes(s)) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
  if (['pending', 'pending_assignment'].includes(s)) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
};

const issueLabel = (issue?: string) => {
  switch (issue) {
    case 'held_by_open_orders':
      return 'Held by open orders';
    case 'no_physical_stock':
      return 'No store stock';
    case 'global_reservation_limit':
      return 'Global reservation blocked';
    case 'insufficient_free_stock':
      return 'Low free stock';
    default:
      return 'OK';
  }
};

export default function AssignmentBlockersPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [stores, setStores] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingAssignmentOrder[]>([]);
  const [diagnostic, setDiagnostic] = useState<AssignmentBlockerResponse | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productDiagnostic, setProductDiagnostic] = useState<ProductAssignmentDiagnosticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const boot = async () => {
      setIsBootLoading(true);
      try {
        const [ordersResp, storesResp] = await Promise.allSettled([
          orderManagementService.getPendingAssignment({ per_page: 100, status: 'pending_assignment', sort_order: 'asc' }),
          storeService.getAllStores(),
        ]);

        if (ordersResp.status === 'fulfilled') {
          setPendingOrders(Array.isArray(ordersResp.value.orders) ? ordersResp.value.orders : []);
        }
        if (storesResp.status === 'fulfilled') {
          setStores(Array.isArray(storesResp.value) ? storesResp.value : []);
        }

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const urlOrder = params.get('order');
          const urlStoreId = params.get('store_id');
          const numericStoreId = urlStoreId ? Number(urlStoreId) : null;

          if (numericStoreId) {
            setSelectedStoreId(numericStoreId);
          }
          if (urlOrder) {
            setOrderQuery(urlOrder);
            setIsLoading(true);
            try {
              const data = await orderManagementService.getAssignmentBlockers(urlOrder, numericStoreId || null);
              setDiagnostic(data);
            } catch (error: any) {
              showToast(error?.message || 'Failed to load diagnostics from link.', 'error');
            } finally {
              setIsLoading(false);
            }
          }
        }
      } finally {
        setIsBootLoading(false);
      }
    };

    boot();
  }, []);

  const visibleStores = useMemo(() => {
    const rows = diagnostic?.stores || [];
    if (!showOnlyBlocked) return rows;
    return rows.filter((store) => toNumber((store as any).blocked_product_count) > 0 || !store.can_fulfill_entire_order);
  }, [diagnostic, showOnlyBlocked]);

  const runDiagnostics = async (orderValue = orderQuery) => {
    const cleaned = String(orderValue || '').trim();
    if (!cleaned) {
      showToast('Enter an order number like ORD-S-7474 or select a pending order.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const data = await orderManagementService.getAssignmentBlockers(
        cleaned,
        selectedStoreId === '' ? null : Number(selectedStoreId)
      );
      setDiagnostic(data);
      setOrderQuery(data?.order?.order_number || cleaned);
      showToast('Assignment blockers loaded.', 'success');
    } catch (error: any) {
      setDiagnostic(null);
      showToast(error?.message || 'Failed to load diagnostics.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const runProductDiagnostics = async (productValue = productQuery) => {
    const cleaned = String(productValue || '').trim();
    if (!cleaned) {
      showToast('Enter a product ID, SKU, or product name.', 'warning');
      return;
    }

    setIsProductLoading(true);
    try {
      const data = await orderManagementService.getProductAssignmentDiagnostics(
        cleaned,
        selectedStoreId === '' ? null : Number(selectedStoreId)
      );
      setProductDiagnostic(data);
      setProductQuery(data?.search || cleaned);
      showToast('Product diagnostics loaded.', 'success');
    } catch (error: any) {
      setProductDiagnostic(null);
      showToast(error?.message || 'Failed to load product diagnostics.', 'error');
    } finally {
      setIsProductLoading(false);
    }
  };

  const copyOrderNumbers = async (store: AssignmentBlockerStore) => {
    const orderNumbers = Array.from(
      new Set(
        (store.inventory_details || [])
          .flatMap((detail) => detail.blocking_orders || [])
          .map((order) => order.order_number)
          .filter(Boolean)
      )
    );

    if (!orderNumbers.length) {
      showToast('No blocking orders to copy for this store.', 'info');
      return;
    }

    await navigator.clipboard.writeText(orderNumbers.join('\n'));
    showToast('Blocking order numbers copied.', 'success');
  };

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

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <ShieldAlert className="h-8 w-8 text-red-500" />
                    Assignment Blocker Panel
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    See exactly which products are stuck and which open orders are holding their store stock.
                  </p>
                </div>
                <Link
                  href="/store-assignment"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back to Store Assignment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-5 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Order number / ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') runDiagnostics();
                        }}
                        placeholder="Example: ORD-S-7474"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Store filter
                    </label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">All active stores</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name} {store.is_warehouse ? '(Warehouse)' : store.is_online ? '(Online)' : '(Store)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3 flex items-end gap-2">
                    <button
                      onClick={() => runDiagnostics()}
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                      Diagnose
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick pending orders:</span>
                  {isBootLoading ? (
                    <span className="text-xs text-gray-500">Loading...</span>
                  ) : pendingOrders.length ? (
                    pendingOrders.slice(0, 12).map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setOrderQuery(order.order_number);
                          runDiagnostics(order.order_number);
                        }}
                        className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                      >
                        {order.order_number}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No pending-assignment order found.</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-900/10 p-4 md:p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Product Diagnostic Search
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Search a product to see reserved_products values, store availability, and open orders that still have no barcode.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 w-fit">
                    Uses same availability math as assignment
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-9">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Product ID / SKU / name
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') runProductDiagnostics();
                        }}
                        placeholder="Example: 4527, DF-3PS-A4-1150, or DESHIO BLOCK"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex items-end">
                    <button
                      onClick={() => runProductDiagnostics()}
                      disabled={isProductLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProductLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search Product
                    </button>
                  </div>
                </div>
              </div>

              {productDiagnostic && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Product Matches</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{productDiagnostic.summary.product_matches}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Stores Checked</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{productDiagnostic.summary.stores_checked}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No-barcode Open Orders</p>
                      <p className="text-3xl font-bold text-amber-600 mt-1">{productDiagnostic.summary.open_no_barcode_orders}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Qty {productDiagnostic.summary.open_no_barcode_quantity}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Shipped No Barcode</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">{productDiagnostic.summary.shipped_without_barcode_orders}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invalid state to fix</p>
                    </div>
                  </div>

                  {productDiagnostic.products.map((productRow) => (
                    <div key={productRow.product.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                      <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{productRow.product.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Product ID: {productRow.product.id} • SKU: {productRow.product.sku || '—'} {productRow.product.is_archived ? '• Archived' : ''}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[420px]">
                          {[
                            ['Reserved total', productRow.reserved_product.total_inventory],
                            ['Reserved held', productRow.reserved_product.reserved_inventory],
                            ['Reserved free', productRow.reserved_product.available_inventory],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-2 text-center">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 md:p-5 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                          {[
                            ['Total orders', productRow.order_summary.total_order_count],
                            ['Total qty ordered', productRow.order_summary.total_order_quantity],
                            ['Open orders', productRow.order_summary.open_order_count],
                            ['Open qty', productRow.order_summary.open_order_quantity],
                            ['No barcode', productRow.order_summary.open_no_barcode_order_count],
                            ['Shipped no barcode', productRow.order_summary.shipped_without_barcode_count],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{String(value)}</p>
                            </div>
                          ))}
                        </div>

                        {productRow.stores.map((store) => (
                          <div key={`${productRow.product.id}-${store.store_id}`} className={`rounded-xl border p-4 ${store.available_quantity > 0 ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10' : 'border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-900/10'}`}>
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <StoreIcon className="h-4 w-4 text-gray-500" />
                                  <h4 className="font-bold text-gray-900 dark:text-white">{store.store_name}</h4>
                                  <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    {store.store_type || 'store'}
                                  </span>
                                  {store.no_barcode_order_count > 0 && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                      {store.no_barcode_order_count} no-barcode orders
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{store.store_address || 'No address'}</p>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 min-w-full lg:min-w-[620px]">
                                {[
                                  ['Physical', store.physical_quantity],
                                  ['Sellable BC', store.sellable_barcode_quantity],
                                  ['Held no BC', store.unbarcoded_assigned_quantity],
                                  ['Available', store.available_quantity],
                                  ['Open qty', store.open_order_quantity],
                                  ['Shipped no BC', store.shipped_without_barcode_count],
                                ].map(([label, value]) => (
                                  <div key={String(label)} className="rounded-lg bg-white/70 dark:bg-black/20 border border-white dark:border-gray-700 px-2 py-2 text-center">
                                    <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{String(value)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {store.no_barcode_orders.length > 0 && (
                              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                  <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Order</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Inventory deducted?</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Customer</th>
                                      <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Created</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {store.no_barcode_orders.map((order) => (
                                      <tr key={`${order.order_id}-${order.order_item_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                                          <Link href={`/orders?search=${encodeURIComponent(order.order_number)}`} className="hover:underline">
                                            {order.order_number}
                                          </Link>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className={`text-xs px-2 py-1 rounded-full ${statusClass(order.status)}`}>{order.status}</span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{order.quantity}</td>
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{order.is_inventory_deducted ? 'Yes' : 'No'}</td>
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                          {order.customer_name || '—'} {order.customer_phone ? `(${order.customer_phone})` : ''}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                          {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {diagnostic && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Order</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{diagnostic.order.order_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {diagnostic.order.customer_name || 'No customer'} • {diagnostic.order.status}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Stores Checked</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{diagnostic.summary.stores_checked}</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Blocked Products</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">{diagnostic.summary.blocked_products}</p>
                      {typeof diagnostic.summary.blocked_store_products === 'number' && diagnostic.summary.blocked_store_products !== diagnostic.summary.blocked_products && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {diagnostic.summary.blocked_store_products} store-product rows
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Actually Blocking Orders</p>
                      <p className="text-3xl font-bold text-amber-600 mt-1">{diagnostic.summary.blocking_orders}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only rows reducing assignable stock</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Store-wise diagnosis</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Free stock = physical/sellable stock minus effective open holds. Barcoded shipped rows are not shown as blockers.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={showOnlyBlocked}
                        onChange={(e) => setShowOnlyBlocked(e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      Show only blocked stores/products
                    </label>
                  </div>

                  <div className="space-y-5">
                    {visibleStores.map((store) => {
                      const blockedDetails = (store.inventory_details || []).filter((detail) => !detail.can_fulfill);
                      const detailsToShow = showOnlyBlocked ? blockedDetails : store.inventory_details || [];

                      return (
                        <div
                          key={store.store_id}
                          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
                        >
                          <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${store.can_fulfill_entire_order ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <StoreIcon className={`h-5 w-5 ${store.can_fulfill_entire_order ? 'text-green-600' : 'text-red-600'}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{store.store_name}</h3>
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                    {(store as any).store_type || 'store'}
                                  </span>
                                  {store.can_fulfill_entire_order ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                      <CheckCircle className="h-3 w-3" /> Can assign
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                      <XCircle className="h-3 w-3" /> Blocked
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{store.store_address || 'No address'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Fulfillment</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{store.fulfillment_percentage}%</p>
                              </div>
                              <button
                                onClick={() => copyOrderNumbers(store)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Clipboard className="h-4 w-4" />
                                Copy blockers
                              </button>
                            </div>
                          </div>

                          <div className="p-4 md:p-5 space-y-4">
                            {detailsToShow.length === 0 ? (
                              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                                No blocked products in this store.
                              </div>
                            ) : (
                              detailsToShow.map((detail) => (
                                <div
                                  key={`${store.store_id}-${detail.product_id}`}
                                  className={`rounded-xl border p-4 ${
                                    detail.can_fulfill
                                      ? 'border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-900/10'
                                      : 'border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-900/10'
                                  }`}
                                >
                                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Package className="h-4 w-4 text-gray-500" />
                                        <h4 className="font-bold text-gray-900 dark:text-white">{detail.product_name}</h4>
                                        <span className={`text-xs px-2 py-1 rounded-full ${detail.can_fulfill ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                          {issueLabel(detail.issue_type)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Product ID: {detail.product_id} • SKU: {detail.product_sku || '—'} • Source: {detail.stock_source || '—'}
                                      </p>
                                      {detail.issue_message && (
                                        <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">{detail.issue_message}</p>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 min-w-full lg:min-w-[560px]">
                                      {[
                                        ['Required', detail.required_quantity],
                                        ['Physical', detail.physical_quantity ?? 0],
                                        ['Sellable BC', detail.sellable_barcode_quantity ?? 0],
                                        ['Held', detail.assigned_quantity_subtracted ?? 0],
                                        ['Free', detail.available_quantity ?? 0],
                                        ['Short', detail.shortage_quantity ?? 0],
                                      ].map(([label, value]) => (
                                        <div key={String(label)} className="rounded-lg bg-white/70 dark:bg-black/20 border border-white dark:border-gray-700 px-2 py-2 text-center">
                                          <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                                          <p className="text-lg font-bold text-gray-900 dark:text-white">{String(value)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {detail.related_open_order_count && detail.related_open_order_count > (detail.blocking_order_count || 0) && (
                                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                      {detail.related_open_order_count} related open rows exist for this product/store, but only {(detail.blocking_order_count || 0)} are actual assignment blockers.
                                    </div>
                                  )}

                                  {(detail.blocking_orders || []).length > 0 && (
                                    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                          <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Blocking order</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Barcode</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Customer</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Created</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                          {(detail.blocking_orders || []).map((order) => (
                                            <tr key={`${order.order_id}-${order.order_item_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                              <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                                                <Link href={`/orders?search=${encodeURIComponent(order.order_number)}`} className="hover:underline">
                                                  {order.order_number}
                                                </Link>
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${statusClass(order.status)}`}>
                                                  {order.status}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{order.quantity}</td>
                                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                {order.has_locked_barcode ? order.locked_barcode || 'Locked' : 'Not scanned yet'}
                                              </td>
                                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                {order.customer_name || '—'} {order.customer_phone ? `(${order.customer_phone})` : ''}
                                              </td>
                                              <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                                {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
