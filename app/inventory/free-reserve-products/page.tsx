'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import orderService, { type Order } from '@/services/orderService';
import { productService, type Product } from '@/services/productService';
import { useTheme } from '@/contexts/ThemeContext';

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;

const PRODUCT_SEARCH_PAGE_SIZE = 60;
const PRODUCT_SEARCH_DEBOUNCE_MS = 1000;

type SelectableProduct = {
  id: number;
  name: string;
  sku: string;
  baseName?: string;
  variationSuffix?: string | null;
  image?: string | null;
  stockQuantity?: number;
  onlineStockQuantity?: number;
  reservedStockQuantity?: number;
};

const formatMoney = (value: any): string => {
  const n = Number(String(value ?? 0).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const getImageUrl = (imagePath?: string | null): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  return `${baseUrl}/storage/${imagePath}`;
};

const normalizeVariant = (product: any, group?: Product): SelectableProduct => {
  const image = product?.image
    ?? product?.images?.find?.((img: any) => img?.is_primary && img?.is_active)?.image_path
    ?? product?.images?.find?.((img: any) => img?.is_active)?.image_path
    ?? product?.images?.[0]?.image_path
    ?? group?.images?.find?.((img: any) => img?.is_primary && img?.is_active)?.image_path
    ?? group?.images?.find?.((img: any) => img?.is_active)?.image_path
    ?? group?.images?.[0]?.image_path
    ?? null;

  return {
    id: Number(product.id),
    name: String(product.name || group?.name || 'Unnamed product'),
    sku: String(product.sku || group?.sku || ''),
    baseName: product.base_name || group?.base_name || group?.name || product.name,
    variationSuffix: product.variation_suffix ?? null,
    image: getImageUrl(image),
    stockQuantity: Number(product.stock_quantity ?? product.stockQuantity ?? 0),
    onlineStockQuantity: Number(product.online_stock_quantity ?? product.onlineStockQuantity ?? 0),
    reservedStockQuantity: Number(product.reserved_stock_quantity ?? product.reservedStockQuantity ?? 0),
  };
};

const orderStatusBadge = (status: string) => {
  const normalized = (status || '').toLowerCase();
  const cls = normalized === 'pending_assignment'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    : normalized === 'pending'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${cls}`}>
      {status || '-'}
    </span>
  );
};

const orderTypeBadge = (type: string) => {
  const isSocial = type === 'social_commerce';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      isSocial
        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    }`}>
      <ShoppingBag className="w-3 h-3" />
      {isSocial ? 'Social' : type || 'Order'}
    </span>
  );
};

function selectedProductQuantity(order: Order, productId: number): number {
  const backendReservedQty = Number((order as any).requested_product_reserved_quantity);
  if (Number.isFinite(backendReservedQty) && backendReservedQty >= 0) {
    return backendReservedQty;
  }

  return (order.items || [])
    .filter((item) => Number(item.product_id) === Number(productId))
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export default function FreeReserveProductsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const productFetchIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectableProduct | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [reservedUnitsTotal, setReservedUnitsTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLastPage, setOrdersLastPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const flattenedProducts = useMemo(() => {
    const rows: Array<{ group: Product; variants: SelectableProduct[] }> = [];

    for (const group of productResults) {
      const main = normalizeVariant(group, group);
      const variants = [main, ...((group.variants || []) as any[]).map((v) => normalizeVariant(v, group))]
        .filter((p) => Number.isFinite(p.id) && p.id > 0);

      rows.push({ group, variants });
    }

    return rows;
  }, [productResults]);

  const loadProducts = useCallback(async () => {
    const currentFetchId = ++productFetchIdRef.current;
    setProductLoading(true);
    try {
      const res = await productService.getAll({
        page: 1,
        per_page: PRODUCT_SEARCH_PAGE_SIZE,
        search: debouncedSearch || undefined,
        group_by_sku: true,
        sort_by: 'created_at',
        sort_direction: 'desc',
      });

      if (currentFetchId !== productFetchIdRef.current) return;

      setProductResults(res.data || []);
    } catch (err: any) {
      if (currentFetchId !== productFetchIdRef.current) return;

      setProductResults([]);
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not search products. Try again.',
      });
    } finally {
      if (currentFetchId === productFetchIdRef.current) {
        setProductLoading(false);
      }
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadOrders = useCallback(async (page = ordersPage) => {
    if (!selectedProduct) {
      setOrders([]);
      setOrdersTotal(0);
      setReservedUnitsTotal(0);
      setOrdersPage(1);
      setOrdersLastPage(1);
      return;
    }

    setOrdersLoading(true);
    try {
      const res = await orderService.getAll({
        product_id: selectedProduct.id,
        reserved_product_orders: true,
        per_page: 20,
        page,
        sort_by: 'updated_at',
        sort_order: 'desc',
        skipStoreScope: true,
      });
      setOrders(res.data || []);
      setOrdersTotal(Number(res.total || 0));
      setReservedUnitsTotal(Number(res.reservation_summary?.reserved_quantity_total ?? 0));
      setOrdersPage(Number(res.current_page || page));
      setOrdersLastPage(Math.max(1, Number(res.last_page || 1)));
    } catch (err: any) {
      setOrders([]);
      setOrdersTotal(0);
      setReservedUnitsTotal(0);
      setOrdersLastPage(1);
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not load reserved orders for this product.',
      });
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, selectedProduct]);

  useEffect(() => {
    setOrdersPage(1);
    loadOrders(1);
  }, [selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    if (!selectedProduct) return { units: 0, pending: 0, pendingAssignment: 0 };
    const pageTotals = orders.reduce(
      (acc, order) => {
        if (order.status === 'pending_assignment') acc.pendingAssignment += 1;
        if (order.status === 'pending') acc.pending += 1;
        return acc;
      },
      { units: 0, pending: 0, pendingAssignment: 0 }
    );

    return {
      ...pageTotals,
      units: reservedUnitsTotal,
    };
  }, [orders, reservedUnitsTotal, selectedProduct]);

  const selectProduct = (product: SelectableProduct) => {
    setSelectedProduct(product);
    setSelectedOrder(null);
    setToast({
      type: 'info',
      message: `Selected ${product.name}. Showing every live order still reserving this exact product.`,
    });
  };

  const cancelOrder = async (order: Order) => {
    if (!selectedProduct) return;

    const reservedQty = selectedProductQuantity(order, selectedProduct.id);
    const ok = window.confirm(
      `Cancel order ${order.order_number}?\n\nThis will release the reserved stock held by this order, including ${reservedQty} unit(s) of ${selectedProduct.name}.`
    );
    if (!ok) return;

    setCancelingOrderId(order.id);
    try {
      await orderService.cancel(
        order.id,
        `Cancelled from Free Reserved Products page to free reserved stock for product #${selectedProduct.id} (${selectedProduct.name})`
      );
      setToast({
        type: 'success',
        message: `Order ${order.order_number} cancelled. Reserved stock for ${selectedProduct.name} was released/recalculated.`,
      });
      setSelectedOrder(null);
      await loadOrders(ordersPage);
      await loadProducts();
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not cancel this order. Stock was not released.',
      });
    } finally {
      setCancelingOrderId(null);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

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
                      <Package className="w-8 h-8" />
                      Free Reserved Products
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-3xl">
                      Search a product exactly like Product List, select one exact product/variant, then find old pending orders that are holding reserved stock for it.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      loadProducts();
                      loadOrders(ordersPage);
                    }}
                    disabled={productLoading || ordersLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${(productLoading || ordersLoading) ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <section className="xl:col-span-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Search className="w-4 h-4" /> Product Search
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Choose the exact product variant. Uses the Product List search endpoint and loads up to 60 SKU groups per search.
                      </p>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by product name or SKU..."
                          className="w-full pl-10 pr-3 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        />
                      </div>

                      {selectedProduct && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                          <p className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300 mb-1">Selected Product</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedProduct.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">SKU: {selectedProduct.sku || '-'}</p>
                          <div className="mt-2 flex gap-2 flex-wrap text-[11px]">
                            <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                              Product ID #{selectedProduct.id}
                            </span>
                            <span className="px-2 py-1 rounded bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                              Reserved: {selectedProduct.reservedStockQuantity ?? 0}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                        {productLoading ? (
                          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            Searching products...
                          </div>
                        ) : flattenedProducts.length === 0 ? (
                          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                            <Box className="w-8 h-8 mx-auto mb-2" />
                            No products found
                          </div>
                        ) : (
                          flattenedProducts.map(({ group, variants }) => (
                            <div key={`${group.sku || group.id}-${group.id}`} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {group.base_name || group.name}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">SKU: {group.sku || '-'}</p>
                              </div>
                              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {variants.map((variant) => {
                                  const isSelected = selectedProduct?.id === variant.id;
                                  return (
                                    <button
                                      key={variant.id}
                                      onClick={() => selectProduct(variant)}
                                      className={`w-full p-3 text-left flex items-center gap-3 transition-colors ${
                                        isSelected
                                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                      }`}
                                    >
                                      <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                        {variant.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={variant.image} alt={variant.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <Package className="w-5 h-5 text-gray-400" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{variant.name}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">ID #{variant.id}</p>
                                        <div className="mt-1 flex gap-1 flex-wrap">
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                            Stock {variant.stockQuantity ?? 0}
                                          </span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                            Reserved {variant.reservedStockQuantity ?? 0}
                                          </span>
                                        </div>
                                      </div>
                                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="xl:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Matching Orders</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{ordersTotal}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Reserved Units Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.units}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Pending</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.pending}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Pending Assignment</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.pendingAssignment}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Orders Holding This Product</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            All live reservation-holding statuses are shown, using the same backend rule as Product List reserved qty. Actions are intentionally limited to View and Cancel.
                          </p>
                        </div>
                        {selectedProduct && (
                          <button
                            onClick={() => loadOrders(ordersPage)}
                            disabled={ordersLoading}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                            Refresh Orders
                          </button>
                        )}
                      </div>

                      {!selectedProduct ? (
                        <div className="p-12 text-center">
                          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="font-semibold text-gray-900 dark:text-white">Select a product first</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            After selecting a product, old/lost pending orders reserving that product will appear here.
                          </p>
                        </div>
                      ) : ordersLoading ? (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                          Loading orders...
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="p-12 text-center">
                          <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="font-semibold text-gray-900 dark:text-white">No reserved pending orders found</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            This exact product does not appear in any live reservation-holding order.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-800">
                            {orders.map((order) => (
                              <div key={order.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{order.order_number}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                      {order.customer?.name || 'Customer'} • {order.customer?.phone || '-'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {orderTypeBadge(order.order_type)}
                                      {orderStatusBadge(order.status)}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                      This product reserved: <b>{selectedProductQuantity(order, selectedProduct.id)}</b>
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white shrink-0">৳{formatMoney(order.total_amount)}</p>
                                </div>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    <Eye className="w-4 h-4" /> View
                                  </button>
                                  <button
                                    onClick={() => cancelOrder(order)}
                                    disabled={cancelingOrderId === order.id}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white disabled:opacity-60"
                                  >
                                    {cancelingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Order</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Customer</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Date</th>
                                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Status</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Reserved Qty</th>
                                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Amount</th>
                                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {orders.map((order) => (
                                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                      <p className="text-sm font-bold text-gray-900 dark:text-white">{order.order_number}</p>
                                      <p className="text-[10px] text-gray-400 font-mono">#{order.id}</p>
                                      <div className="mt-1">{orderTypeBadge(order.order_type)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                          <User className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{order.customer?.name || '-'}</p>
                                          <p className="text-[10px] text-gray-500 font-mono">{order.customer?.phone || '-'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(order.order_date || order.created_at)}</td>
                                    <td className="px-4 py-3">{orderStatusBadge(order.status)}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
                                        {selectedProductQuantity(order, selectedProduct.id)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">৳{formatMoney(order.total_amount)}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-center gap-2">
                                        <button
                                          onClick={() => setSelectedOrder(order)}
                                          className="p-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-lg transition-all"
                                          title="View Details"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => cancelOrder(order)}
                                          disabled={cancelingOrderId === order.id}
                                          className="p-1.5 hover:bg-red-600 hover:text-white rounded-lg transition-all text-red-600 disabled:opacity-60"
                                          title="Cancel Order"
                                        >
                                          {cancelingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Page {ordersPage} of {ordersLastPage} • {ordersTotal} matching orders
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => loadOrders(Math.max(1, ordersPage - 1))}
                                disabled={ordersPage <= 1 || ordersLoading}
                                className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => loadOrders(Math.min(ordersLastPage, ordersPage + 1))}
                                disabled={ordersPage >= ordersLastPage || ordersLoading}
                                className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {selectedOrder && selectedProduct && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Order {selectedOrder.order_number}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This order is reserving {selectedProductQuantity(selectedOrder, selectedProduct.id)} unit(s) of {selectedProduct.name}.
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-150px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 uppercase font-bold">Customer</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{selectedOrder.customer?.name || '-'}</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedOrder.customer?.phone || '-'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 uppercase font-bold">Status</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {orderStatusBadge(selectedOrder.status)}
                    {orderTypeBadge(selectedOrder.order_type)}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] text-gray-500 uppercase font-bold">Amount</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">৳{formatMoney(selectedOrder.total_amount)}</p>
                  <p className="text-xs text-red-500">Due: ৳{formatMoney(selectedOrder.outstanding_amount)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Order Items</p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {(selectedOrder.items || []).map((item) => {
                    const isTarget = Number(item.product_id) === Number(selectedProduct.id);
                    return (
                      <div key={item.id} className={`p-4 flex items-center justify-between gap-3 ${isTarget ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-500 font-mono">SKU: {item.product_sku || '-'} • Product ID #{item.product_id}</p>
                          {isTarget && <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold mt-1">Selected reserved product</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Qty {item.quantity}</p>
                          <p className="text-xs text-gray-500">৳{formatMoney(item.total_amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => cancelOrder(selectedOrder)}
                disabled={cancelingOrderId === selectedOrder.id}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2"
              >
                {cancelingOrderId === selectedOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={4500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
