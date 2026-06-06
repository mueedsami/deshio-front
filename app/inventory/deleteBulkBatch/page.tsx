'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Box,
  CheckCircle2,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Store as StoreIcon,
  Trash2,
  XCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import BatchPrinter from '@/components/BatchPrinter';
import { productService, type Product } from '@/services/productService';
import batchService, {
  type BulkDeleteBatchConfirmData,
  type BulkDeleteBatchPreviewData,
} from '@/services/batchService';
import storeService, { type Store } from '@/services/storeService';
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

const money = (value: any): string => {
  const n = Number(String(value ?? 0).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
};

const sanitizePriceInput = (value: string): string => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...decimalParts] = cleaned.split('.');
  const decimal = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
};

const unwrapStores = (response: any): Store[] => {
  const root = response?.data ?? response;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.stores)) return root.stores;
  return [];
};

export default function DeleteBulkBatchPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const productFetchIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectableProduct | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [stockCount, setStockCount] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');

  const [preview, setPreview] = useState<BulkDeleteBatchPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<BulkDeleteBatchConfirmData | null>(null);
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

  const selectedStore = useMemo(
    () => stores.find((store) => Number(store.id) === Number(selectedStoreId)) || null,
    [stores, selectedStoreId]
  );

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

  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const response = await storeService.getStores({ is_active: true, per_page: 1000 }, { skipStoreScope: true } as any);
      const rows = unwrapStores(response);
      setStores(rows);
      if (!selectedStoreId && rows.length) {
        setSelectedStoreId(Number(rows[0].id));
      }
    } catch (err: any) {
      setStores([]);
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not load stores.',
      });
    } finally {
      setStoresLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const selectProduct = (product: SelectableProduct) => {
    setSelectedProduct(product);
    setPreview(null);
    setLastResult(null);
    setToast({
      type: 'info',
      message: `Selected ${product.name}. Enter quantity, store, cost price, and selling price before previewing the reset.`,
    });
  };

  const validateForm = (): { product_id: number; store_id: number; quantity: number; cost_price: number; sell_price: number } | null => {
    if (!selectedProduct) {
      setToast({ type: 'warning', message: 'Select one exact product first.' });
      return null;
    }

    const quantity = Number(stockCount);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setToast({ type: 'warning', message: 'Enter a valid stock count. Example: 25.' });
      return null;
    }

    if (!selectedStoreId) {
      setToast({ type: 'warning', message: 'Select the store where the fresh batch should be created.' });
      return null;
    }

    if (costPrice.trim() === '') {
      setToast({ type: 'warning', message: 'Enter the cost price for the fresh batch.' });
      return null;
    }

    if (sellingPrice.trim() === '') {
      setToast({ type: 'warning', message: 'Enter the selling price for the fresh batch.' });
      return null;
    }

    const parsedCostPrice = Number(costPrice);
    if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
      setToast({ type: 'warning', message: 'Enter a valid cost price. Example: 450 or 450.50.' });
      return null;
    }

    const parsedSellingPrice = Number(sellingPrice);
    if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
      setToast({ type: 'warning', message: 'Enter a valid selling price. Example: 650 or 650.50.' });
      return null;
    }

    return {
      product_id: selectedProduct.id,
      store_id: Number(selectedStoreId),
      quantity,
      cost_price: parsedCostPrice,
      sell_price: parsedSellingPrice,
    };
  };

  const previewUpdate = async () => {
    const payload = validateForm();
    if (!payload) return;

    setPreviewLoading(true);
    setPreview(null);
    setLastResult(null);
    try {
      const response = await batchService.previewBulkDeleteBatch(payload);
      setPreview(response.data);
      setToast({
        type: 'warning',
        message: `Preview ready: ${response.data.existing_batches} old batch(es), ${response.data.barcodes_to_block} old barcode(s) will be blocked.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Could not prepare stock update preview.',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmUpdate = async () => {
    const payload = validateForm();
    if (!payload || !preview) return;

    const ok = window.confirm(
      `Confirm stock reset for ${selectedProduct?.name}?\n\n` +
      `This will delete ${preview.existing_batches} old batch(es), block ${preview.barcodes_to_block} old barcode(s), and create ${payload.quantity} fresh barcode(s) in ${selectedStore?.name || 'the selected store'}.`
    );
    if (!ok) return;

    setConfirming(true);
    try {
      const response = await batchService.confirmBulkDeleteBatch(payload);
      setLastResult(response.data);
      setPreview(null);
      setToast({
        type: 'success',
        message: response.message || 'Stock updated successfully. You can now print the fresh batch barcodes.',
      });
      await loadProducts();
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Stock update failed. No confirmation was completed.',
      });
    } finally {
      setConfirming(false);
    }
  };

  const printBatchAdapter = lastResult ? {
    id: Number(lastResult.created_batch.id),
    productId: Number(lastResult.product.id),
    quantity: Number(lastResult.created_batch.quantity || lastResult.barcodes_generated || 0),
    costPrice: Number(String(lastResult.created_batch.cost_price ?? 0).replace(/[^0-9.-]/g, '')),
    sellingPrice: Number(String(lastResult.created_batch.sell_price ?? 0).replace(/[^0-9.-]/g, '')),
    baseCode: String(lastResult.created_batch.barcode?.barcode || lastResult.all_barcodes?.[0]?.barcode || ''),
  } : null;

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
                      <Trash2 className="w-8 h-8" />
                      Delete Bulk Batch
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-3xl">
                      Search a product, enter quantity, store, cost price, and selling price, preview the destructive reset, then create one fresh batch and print its barcodes.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      loadProducts();
                      loadStores();
                    }}
                    disabled={productLoading || storesLoading || previewLoading || confirming}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${(productLoading || storesLoading) ? 'animate-spin' : ''}`} />
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
                        Same search behavior as Free Reserved Products: SKU grouped, 60 groups, latest-response guard.
                      </p>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search exact product name or SKU..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div className="max-h-[620px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                        {productLoading ? (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            Searching products...
                          </div>
                        ) : flattenedProducts.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Box className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            No products found.
                          </div>
                        ) : (
                          flattenedProducts.map(({ group, variants }) => (
                            <div key={`${group.sku || group.id}-${group.id}`} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
                              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/70">
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                  {group.base_name || group.name || 'SKU Group'}
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
                                          ? 'bg-blue-50 dark:bg-blue-950/30'
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
                                      {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Selected Product</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">
                          {selectedProduct?.name || 'None selected'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-1">
                          {selectedProduct ? `ID #${selectedProduct.id} • SKU ${selectedProduct.sku || '-'}` : 'Search and choose one exact product.'}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Target Store</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">
                          {selectedStore?.name || 'No store selected'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                          Fresh batch will be created here.
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Fresh Stock Count</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stockCount || '0'}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Cost Price</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">৳{costPrice ? money(costPrice) : '0.00'}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Selling Price</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">৳{sellingPrice ? money(sellingPrice) : '0.00'}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4" /> Stock Reset Input
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Product, stock count, desired store, cost price, and selling price are all required before preview. Nothing is deleted until Confirm and Update.
                        </p>
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <label className="block">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Stock count</span>
                          <input
                            value={stockCount}
                            onChange={(e) => {
                              setStockCount(e.target.value.replace(/[^0-9]/g, ''));
                              setPreview(null);
                              setLastResult(null);
                            }}
                            placeholder="Example: 50"
                            inputMode="numeric"
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Desired store</span>
                          <select
                            value={selectedStoreId}
                            onChange={(e) => {
                              setSelectedStoreId(e.target.value ? Number(e.target.value) : '');
                              setPreview(null);
                              setLastResult(null);
                            }}
                            disabled={storesLoading}
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-60"
                          >
                            <option value="">Select store</option>
                            {stores.map((store) => (
                              <option key={store.id} value={store.id}>
                                {store.name}{store.is_warehouse ? ' — Warehouse' : store.is_online ? ' — Online' : ''}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Cost price</span>
                          <input
                            value={costPrice}
                            onChange={(e) => {
                              setCostPrice(sanitizePriceInput(e.target.value));
                              setPreview(null);
                              setLastResult(null);
                            }}
                            placeholder="Example: 450"
                            inputMode="decimal"
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Selling price</span>
                          <input
                            value={sellingPrice}
                            onChange={(e) => {
                              setSellingPrice(sanitizePriceInput(e.target.value));
                              setPreview(null);
                              setLastResult(null);
                            }}
                            placeholder="Example: 650"
                            inputMode="decimal"
                            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </label>

                        <div className="md:col-span-2 xl:col-span-4 flex flex-col sm:flex-row gap-3 justify-end">
                          <button
                            onClick={previewUpdate}
                            disabled={previewLoading || confirming}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60"
                          >
                            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            Update Stock
                          </button>
                        </div>
                      </div>
                    </div>

                    {preview && (
                      <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                          <h2 className="text-sm font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Preview Before Confirming
                          </h2>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            This is destructive. Old barcode identities are preserved but blocked from sale/packing.
                          </p>
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Old batches deleted</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{preview.existing_batches}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Old units removed</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{preview.existing_units}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Old barcodes blocked</p>
                              <p className="text-xl font-bold text-red-600 dark:text-red-300">{preview.barcodes_to_block}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Fresh barcodes created</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-300">{preview.new_stock_count}</p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                              New batch to create
                            </div>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <StoreIcon className="w-4 h-4" /> {preview.new_batch.store_name}
                              </div>
                              <div className="text-gray-700 dark:text-gray-300">Qty: <b>{preview.new_batch.quantity}</b></div>
                              <div className="text-gray-700 dark:text-gray-300">Cost: <b>৳{money(preview.new_batch.cost_price)}</b></div>
                              <div className="text-gray-700 dark:text-gray-300">Sell: <b>৳{money(preview.new_batch.sell_price)}</b></div>
                            </div>
                            <p className="px-3 pb-3 text-xs text-gray-500 dark:text-gray-400">
                              Price source: manual input from this page. No backend guessing or old-batch fallback is used.
                            </p>
                          </div>

                          {preview.old_batches.length > 0 && (
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                                Old batches that will be deleted
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Batch</th>
                                      <th className="px-3 py-2 text-left">Store</th>
                                      <th className="px-3 py-2 text-right">Qty</th>
                                      <th className="px-3 py-2 text-right">Sell</th>
                                      <th className="px-3 py-2 text-left">Created</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                                    {preview.old_batches.map((batch) => (
                                      <tr key={batch.id}>
                                        <td className="px-3 py-2 font-mono">{batch.batch_number}</td>
                                        <td className="px-3 py-2">{batch.store_name || '-'}</td>
                                        <td className="px-3 py-2 text-right font-bold">{batch.quantity}</td>
                                        <td className="px-3 py-2 text-right">৳{money(batch.sell_price)}</td>
                                        <td className="px-3 py-2">{batch.created_at || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">Dumb warning before you press confirm</p>
                            <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 list-disc ml-4">
                              {preview.warnings.map((warning, idx) => <li key={idx}>{warning}</li>)}
                            </ul>
                          </div>

                          <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                              onClick={() => setPreview(null)}
                              disabled={confirming}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
                            >
                              <XCircle className="w-4 h-4" /> Cancel Preview
                            </button>
                            <button
                              onClick={confirmUpdate}
                              disabled={confirming}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60"
                            >
                              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              Confirm and Update
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {lastResult && printBatchAdapter && (
                      <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                          <h2 className="text-sm font-bold text-green-900 dark:text-green-200 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Stock Updated Successfully
                          </h2>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Old batches are deleted and their barcodes are blocked. Print the fresh batch barcodes from here.
                          </p>
                        </div>

                        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">New batch</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{lastResult.created_batch.batch_number}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Store</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{lastResult.store.name}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Generated</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{lastResult.barcodes_generated}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Blocked old</p>
                              <p className="text-xl font-bold text-red-600 dark:text-red-300">{lastResult.blocked_barcodes}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950/50">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                              <Printer className="w-4 h-4" /> Print Fresh Batch Barcodes
                            </p>
                            <BatchPrinter
                              batch={printBatchAdapter}
                              product={{ id: lastResult.product.id, name: lastResult.product.name }}
                              barcodes={(lastResult.all_barcodes || []).map((b) => b.barcode)}
                            />
                            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 flex gap-2">
                              <Barcode className="w-3.5 h-3.5 shrink-0" />
                              Uses the same BatchPrinter/barcode label logic as Product &gt; Batch.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </main>
          </div>
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
