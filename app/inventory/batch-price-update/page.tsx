'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

import productService, { Product as FullProduct } from '@/services/productService';
import batchService, { Batch } from '@/services/batchService';

type ProductPick = {
  id: number;
  name: string;
  sku?: string;
};

type UpdateRow = {
  batch_id: number;
  batch_number: string | null;
  store: string;
  old_price: string;
  new_price: string;
};

export default function BatchPriceUpdatePage() {
  // Layout states (required by your Header/Sidebar)
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Product search/select
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [products, setProducts] = useState<ProductPick[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductPick | null>(null);

  // Batches
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Update price
  const [sellPrice, setSellPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // UI messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);

  // Debounced product search
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);

    const q = search.trim();
    if (q.length < 2) {
      setProducts([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);

        const res = await productService.getAll({
          search: q,
          per_page: 10,
        });

        // productService already normalizes to array
        const list = (res?.data || []) as FullProduct[];
        const mapped: ProductPick[] = list.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
        }));

        setProducts(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to search products.');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [search]);

  // Load batches when product selected
  useEffect(() => {
    const load = async () => {
      if (!selectedProduct?.id) {
        setBatches([]);
        setUpdates([]);
        setSellPrice('');
        return;
      }

      try {
        setIsLoadingBatches(true);
        setError(null);
        setSuccessMsg(null);
        setUpdates([]);

        const list = await batchService.getBatchesArray({
          product_id: selectedProduct.id,
          per_page: 200,
        });

        setBatches(list);

        // Prefill price if all batches have same sell_price
        const prices = list
          .map((b) => (b.sell_price ?? '').toString().trim())
          .filter(Boolean);

        const unique = Array.from(new Set(prices));
        if (unique.length === 1) setSellPrice(unique[0]);
        else setSellPrice('');
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load batches.');
        setBatches([]);
      } finally {
        setIsLoadingBatches(false);
      }
    };

    load();
  }, [selectedProduct?.id]);

  const summary = useMemo(() => {
    if (!batches.length) return null;

    const prices = batches
      .map((b) => Number(b.sell_price))
      .filter((n) => !Number.isNaN(n));

    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;

    const totalQty = batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

    return {
      count: batches.length,
      totalQty,
      min,
      max,
    };
  }, [batches]);

  const onSelectProduct = (p: ProductPick) => {
    setSelectedProduct(p);
    setProducts([]);
    setSearch(`${p.name}${p.sku ? ` (${p.sku})` : ''}`);
  };

  const onApply = async () => {
    setError(null);
    setSuccessMsg(null);
    setUpdates([]);

    if (!selectedProduct?.id) {
      setError('Select a product first.');
      return;
    }

    const priceNum = Number(sellPrice);
    if (!sellPrice || Number.isNaN(priceNum) || priceNum < 0) {
      setError('Enter a valid selling price (0 or greater).');
      return;
    }

    try {
      setIsSaving(true);

      // ✅ This method must exist in your batchService.ts
      const res = await batchService.updateAllBatchPrices(selectedProduct.id, priceNum);

      if (!res?.success) {
        setError(res?.message || 'Failed to update batch prices.');
        return;
      }

      setSuccessMsg(res?.message || 'Updated selling price for all batches.');
      setUpdates((res.data?.updates || []) as UpdateRow[]);

      // Reload batches
      const list = await batchService.getBatchesArray({
        product_id: selectedProduct.id,
        per_page: 200,
      });
      setBatches(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update batch prices.');
    } finally {
      setIsSaving(false);
    }
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

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Bulk Batch Selling Price Update
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Update <span className="font-semibold">sell_price</span> for every batch of a selected product.
                This impacts Ecommerce + Social Commerce + POS wherever batch pricing is used.
              </p>

              {/* Alerts */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="text-red-700 dark:text-red-200">{error}</div>
                </div>
              )}
              {successMsg && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 mt-0.5" />
                  <div className="text-emerald-800 dark:text-emerald-200">{successMsg}</div>
                </div>
              )}

              {/* Product Search */}
              <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedProduct(null);
                    }}
                    placeholder="Search product by name / SKU (type 2+ chars)..."
                    className="w-full rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-gray-900 dark:text-gray-100"
                  />
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>

                {/* Search Results */}
                {products.length > 0 && (
                  <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSelectProduct(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {p.id} {p.sku ? `• SKU: ${p.sku}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Product + Summary */}
                {selectedProduct && (
                  <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Selected product</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {selectedProduct.name}{' '}
                          {selectedProduct.sku ? (
                            <span className="text-gray-500 dark:text-gray-400">({selectedProduct.sku})</span>
                          ) : null}
                        </div>
                      </div>

                      {isLoadingBatches ? (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading batches...
                        </div>
                      ) : summary ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <div>
                            Batches: <span className="font-semibold">{summary.count}</span>
                          </div>
                          <div>
                            Total Qty: <span className="font-semibold">{summary.totalQty}</span>
                          </div>
                          <div>
                            Price Range:{' '}
                            <span className="font-semibold">
                              {summary.min !== null ? summary.min.toFixed(2) : 'N/A'} -{' '}
                              {summary.max !== null ? summary.max.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-400">No batch data found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Update Price */}
              <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Set new selling price</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Applies to all batches of the selected product.
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Selling Price (BDT)
                    </label>
                    <input
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 1299.00"
                      className="w-full rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-gray-900 dark:text-gray-100"
                      disabled={!selectedProduct || isSaving}
                    />
                  </div>

                  <button
                    onClick={onApply}
                    disabled={!selectedProduct || isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 font-semibold text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Apply to all batches
                  </button>
                </div>
              </div>

              {/* Updated list */}
              {updates.length > 0 && (
                <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Updated batches</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Backend response: per-batch old → new prices.
                  </p>

                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr className="text-left">
                          <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Batch ID</th>
                          <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Batch No</th>
                          <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Store</th>
                          <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Old</th>
                          <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updates.map((u) => (
                          <tr key={u.batch_id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{u.batch_id}</td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{u.batch_number || '-'}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{u.store}</td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{u.old_price}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{u.new_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
