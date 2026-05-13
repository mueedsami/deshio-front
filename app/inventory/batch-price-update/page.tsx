'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Save, CheckCircle2, AlertCircle, Pencil, X, Check, Printer } from 'lucide-react';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

import productService, { Product as FullProduct } from '@/services/productService';
import catalogService from '@/services/catalogService';
import batchService, { Batch } from '@/services/batchService';
import GroupedAllBarcodesPrinter, { BatchBarcodeSource } from '@/components/GroupedAllBarcodesPrinter';

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
  const [searchLimit, setSearchLimit] = useState<number>(10);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductPick | null>(null);

  // Variations with same SKU (so you can apply price to multiple variations without backend changes)
  const [skuGroupProducts, setSkuGroupProducts] = useState<ProductPick[]>([]);
  const [selectedVariationIds, setSelectedVariationIds] = useState<number[]>([]);
  const [variationVisible, setVariationVisible] = useState<number>(20);

  // Batches
  const [batches, setBatches] = useState<Batch[]>([]);

  // Per-batch cost price editing
  const [costEditBatchId, setCostEditBatchId] = useState<number | null>(null);
  const [costEditValue, setCostEditValue] = useState('');
  const [costSavingBatchId, setCostSavingBatchId] = useState<number | null>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Update price
  const [sellPrice, setSellPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // UI messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  
  // Barcode printing (reuse PO barcode-center logic)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeSources, setBarcodeSources] = useState<BatchBarcodeSource[]>([]);
  const [isPreparingBarcodes, setIsPreparingBarcodes] = useState(false);
  const [barcodePrepError, setBarcodePrepError] = useState<string | null>(null);

  const prepareBarcodeSources = async () => {
    setBarcodePrepError(null);

    if (!selectedProduct?.id) {
      setBarcodePrepError('Select a product first.');
      return;
    }

    try {
      setIsPreparingBarcodes(true);

      // Same target selection logic as bulk price apply
      const targetIdsRaw = selectedVariationIds.length ? selectedVariationIds : [selectedProduct.id];
      const targetIds = Array.from(new Set(targetIdsRaw)).filter(Boolean);

      const toNumber = (v: any) => {
        if (v === null || v === undefined || v === '') return 0;
        const n = typeof v === 'string' ? Number(String(v).replace(/,/g, '')) : Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      // Prefer the current input (new price), otherwise fallback to each batch sell_price
      const desiredPrice = (() => {
        const n = Number(sellPrice);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })();

      const out: BatchBarcodeSource[] = [];

      for (const pid of targetIds) {
        // Use getBatchesAll to avoid silent per_page caps
        const list = await batchService.getBatchesAll({ product_id: Number(pid) }, { per_page: 100, max_items: 10000 });
        for (const b of list) {
          const productName = String(b?.product?.name || selectedProduct.name || 'Product');
          const price = desiredPrice !== null ? desiredPrice : toNumber((b as any)?.sell_price ?? 0);
          const fallbackCode = b?.barcode?.barcode || (b as any)?.primary_barcode || b?.batch_number;
          out.push({
            batchId: Number(b.id),
            productName,
            price,
            fallbackCode: fallbackCode ? String(fallbackCode) : undefined,
          });
        }
      }

      // Dedupe by batchId
      const seen = new Set<number>();
      const deduped = out.filter((s) => {
        if (!s.batchId) return false;
        if (seen.has(s.batchId)) return false;
        seen.add(s.batchId);
        return true;
      });

      if (deduped.length === 0) {
        setBarcodePrepError('No batches found to print barcodes for.');
        return;
      }

      setBarcodeSources(deduped);
      setShowBarcodeModal(true);
    } catch (e: any) {
      console.error('Failed to prepare barcode sources', e);
      setBarcodePrepError(e?.response?.data?.message || e?.message || 'Failed to prepare barcodes.');
    } finally {
      setIsPreparingBarcodes(false);
    }
  };

  const BarcodeModal = ({ isOpen, onClose, title, children }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    );
  };

  // Debounced product search
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);

    const q = search.trim();
    if (q.length < 2) {
      setProducts([]);
      setSearchHasMore(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);

        // Use catalogService.getProducts instead of productService search methods
        const res = await catalogService.getProducts({ 
          q, 
          per_page: searchLimit,
          group_by_sku: true 
        });

        // catalogService flattens variants into .products when group_by_sku is true
        const list = res.products || [];
        
        const mapped: ProductPick[] = list.map((p) => ({
          id: p.id as number,
          name: p.name,
          sku: p.sku,
        }));

        setProducts(mapped);

        // If we got a full page, assume there may be more
        setSearchHasMore(mapped.length >= searchLimit);
      } catch (e: any) {
        setError(e?.message || 'Failed to search products.');
        setSearchHasMore(false);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [search, searchLimit]);

  // Grouped products for search results
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductPick[]> = {};
    products.forEach((p) => {
      const sku = p.sku || 'No SKU';
      if (!groups[sku]) groups[sku] = [];
      groups[sku].push(p);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'No SKU') return 1;
      if (b[0] === 'No SKU') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [products]);

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

        const res = await productService.getEcommerceProduct(selectedProduct.id);
        if (!res?.success || !res?.data?.product) {
          throw new Error(res?.message || 'Product data not found in catalog.');
        }

        const productData = res.data.product;
        // Ensure batches have product context for consistency with Batch interface
        const list = (productData.batches || []).map((b: any) => ({
          ...b,
          product: b.product || {
            id: productData.id,
            name: productData.name,
            sku: productData.sku
          },
          store: b.store || { id: b.store_id, name: `Store #${b.store_id}` }
        }));

        setBatches(list);

        // Prefill selling price if all batches have same sell_price
        const sellPrices = list
          .map((b) => (b.sell_price ?? '').toString().trim())
          .filter(Boolean);

        const uniqueSell = Array.from(new Set(sellPrices));
        if (uniqueSell.length === 1) setSellPrice(uniqueSell[0]);
        else setSellPrice('');

        // Prefill cost price if all batches have same cost_price
        const costPrices = list
          .map((b) => (b.cost_price ?? '').toString().trim())
          .filter(Boolean);

        const uniqueCost = Array.from(new Set(costPrices));
        if (uniqueCost.length === 1) setCostPrice(uniqueCost[0]);
        else setCostPrice('');
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load batches.');
        setBatches([]);
      } finally {
        setIsLoadingBatches(false);
      }
    };

    load();
  }, [selectedProduct?.id]);


  // Load SKU-group variations when product selected (for bulk price update across variations)
  useEffect(() => {
    const loadSkuGroup = async () => {
      const sku = String(selectedProduct?.sku || '').trim();
      if (!sku) {
        setSkuGroupProducts([]);
        setSelectedVariationIds([]);
        return;
      }

      try {
        const list = await productService.advancedSearchAll(
        {
          query: sku,
          is_archived: false,
          enable_fuzzy: false,
          fuzzy_threshold: 100,
          search_fields: ['sku'],
          per_page: 200,
        },
        { max_items: 2000 }
      );
        const list2 = (list || []) as FullProduct[];
        const exact = list2
          .filter((p) => String(p.sku || '').trim() === sku)
          .map((p) => ({ id: p.id, name: p.name, sku: p.sku } as ProductPick));

        setSkuGroupProducts(exact);
        setSelectedVariationIds(exact.map((p) => p.id)); // default: select all, user can uncheck
        setVariationVisible(12); // default: select all, user can uncheck
      } catch (e) {
        console.error('Failed to load SKU group products', e);
        setSkuGroupProducts([]);
        setSelectedVariationIds([]);
      }
    };

    loadSkuGroup();
  }, [selectedProduct?.id, selectedProduct?.sku]);

  const startCostEdit = (batch: Batch) => {
    setError(null);
    setSuccessMsg(null);
    setCostEditBatchId(batch.id);
    setCostEditValue(String(batch.cost_price ?? ''));
  };

  const cancelCostEdit = () => {
    setCostEditBatchId(null);
    setCostEditValue('');
    setCostSavingBatchId(null);
  };

  const saveCostPrice = async (batch: Batch) => {
    const costNum = Number(costEditValue);
    if (!costEditValue || Number.isNaN(costNum) || costNum < 0) {
      setError('Enter a valid cost price (0 or greater).');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setCostSavingBatchId(batch.id);

    try {
      await batchService.updateBatch(batch.id, { cost_price: costNum });
      setBatches((prev) => prev.map((b) => (b.id === batch.id ? { ...b, cost_price: String(costNum) } : b)));
      setSuccessMsg(`Cost price updated for batch ${batch.batch_number}.`);
      cancelCostEdit();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to update cost price.');
      setCostSavingBatchId(null);
    }
  };

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


  const toggleVariationSelect = (id: number) => {
    setSelectedVariationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVariations = () => setSelectedVariationIds(skuGroupProducts.map((p) => p.id));
  const selectNoVariations = () => setSelectedVariationIds([]);

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
    const costNum = Number(costPrice);

    if (sellPrice && (Number.isNaN(priceNum) || priceNum < 0)) {
      setError('Enter a valid selling price (0 or greater).');
      return;
    }
    if (costPrice && (Number.isNaN(costNum) || costNum < 0)) {
      setError('Enter a valid cost price (0 or greater).');
      return;
    }

    if (!sellPrice && !costPrice) {
      setError('Enter at least one price (Selling or Cost) to update.');
      return;
    }

    try {
      setIsSaving(true);

      const targetIdsRaw = selectedVariationIds.length ? selectedVariationIds : [selectedProduct.id];
      const targetIds = Array.from(new Set(targetIdsRaw));

      let firstSuccess: any = null;

      const payload: any = {};
      if (sellPrice) payload.sell_price = priceNum;
      if (costPrice) payload.cost_price = costNum;

      for (const pid of targetIds) {
        const res = await batchService.updateAllBatchPrices(pid, payload);
        if (!res?.success) {
          throw new Error(res?.message || `Failed to update batch prices for product ${pid}.`);
        }
        if (!firstSuccess) firstSuccess = res;
      }

      let msg = '';
      if (sellPrice && costPrice) msg = 'selling and cost prices';
      else if (sellPrice) msg = 'selling price';
      else msg = 'cost price';

      setSuccessMsg(
        targetIds.length > 1
          ? `Updated ${msg} for all batches of ${targetIds.length} variations (same SKU).`
          : (firstSuccess?.message || `Updated ${msg} for all batches.`)
      );

      sessionStorage.setItem('product_list_refresh_needed', '1');
      // Show update rows from the first response
      setUpdates(((firstSuccess?.data?.updates || []) as UpdateRow[]) || []);

      // Reload batches for the currently selected product
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
                      setSearchLimit(10);
                      setSearchHasMore(false);
                      setSelectedProduct(null);
                    }}
                    placeholder="Search product by name / SKU (type 2+ chars)..."
                    className="w-full rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2 outline-none focus:border-gray-400 dark:focus:border-gray-500 text-gray-900 dark:text-gray-100"
                  />
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>

                {/* Search Results */}
                {groupedProducts.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {groupedProducts.map(([sku, group]) => (
                      <div key={sku} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 overflow-hidden">
                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <span>SKU: {sku}</span>
                          <span className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{group.length} {group.length === 1 ? 'variant' : 'variants'}</span>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {group.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => onSelectProduct(p)}
                              className="w-full text-left px-3 py-2.5 hover:bg-white dark:hover:bg-gray-700/40 transition-colors group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {p.name}
                                </div>
                                <div className="shrink-0 text-[10px] font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                  ID: {p.id}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {searchHasMore && !isSearching && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setSearchLimit((v) => v + 20)}
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          +More
                        </button>
                      </div>
                    )}
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


                {selectedProduct?.sku && skuGroupProducts.length > 1 && (
                  <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Apply price to multiple variations (same SKU)
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          SKU: <span className="font-medium">{selectedProduct.sku}</span> • Select which variations to update
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllVariations}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={selectNoVariations}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 transition-colors"
                        >
                          Select none
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
                      {skuGroupProducts.slice(0, variationVisible).map((vp) => (
                        <label
                          key={vp.id}
                          className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVariationIds.includes(vp.id)}
                            onChange={() => toggleVariationSelect(vp.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {vp.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {vp.id}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {skuGroupProducts.length > variationVisible && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVariationVisible((v) =>
                              Math.min(skuGroupProducts.length, v + Math.min(20, skuGroupProducts.length - v))
                            )
                          }
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          +{Math.min(20, skuGroupProducts.length - variationVisible)} more
                        </button>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Selected: <span className="font-semibold">{selectedVariationIds.length}</span> variation(s).
                      If you select none, the price update applies only to the currently selected product.
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-4">
                  <div className="w-full sm:flex-1 min-w-[180px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Selling Price (BDT)
                    </label>
                    <input
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 1299.00"
                      className="w-full rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-100 transition-all"
                      disabled={!selectedProduct || isSaving}
                    />
                  </div>

                  <div className="w-full sm:flex-1 min-w-[180px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Cost Price (BDT)
                    </label>
                    <input
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 850.00"
                      className="w-full rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 dark:text-gray-100 transition-all"
                      disabled={!selectedProduct || isSaving}
                    />
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 italic">
                      Updates all batches at once.
                    </p>
                  </div>

                  <div className="flex gap-2 w-full lg:w-auto">
                    <button
                      onClick={onApply}
                      disabled={!selectedProduct || isSaving}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 font-semibold shadow-sm transition-all"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Apply Changes
                    </button>
                    <button
                      onClick={prepareBarcodeSources}
                      disabled={!selectedProduct || isSaving || isPreparingBarcodes}
                      className="inline-flex items-center justify-center p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                      title="Open barcode printing"
                    >
                      {isPreparingBarcodes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {barcodePrepError ? (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400">{barcodePrepError}</div>
                ) : null}
              </div>

              <BarcodeModal
                isOpen={showBarcodeModal}
                onClose={() => setShowBarcodeModal(false)}
                title="Barcode Center"
              >
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Ready to print unit-level barcodes for{' '}
                    <span className="font-semibold">{barcodeSources.length}</span> batch(es).
                    {selectedProduct?.sku && selectedVariationIds.length > 1 ? (
                      <span className="block mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Note: This includes all selected variations (same SKU) and their batches.
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <GroupedAllBarcodesPrinter
                      sources={barcodeSources}
                      buttonLabel="Print ALL (unit barcodes)"
                      title="Print all barcodes"
                      softLimit={500}
                    />
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Uses QZ Tray + the same label rendering as Purchase Order printing.
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Tips</div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                      <li>Make sure QZ Tray is running and a default printer is selected.</li>
                      <li>If a batch has no per-unit barcodes, we print the primary barcode as fallback.</li>
                    </ul>
                  </div>
                </div>
              </BarcodeModal>

              {/* Per-batch cost price update */}
              {selectedProduct && (
                <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Update cost price (specific batch)
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Cost price changes only the selected batch. Selling price changes all batches using the button above.
                      </p>
                    </div>

                    {isLoadingBatches && (
                      <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading batches...
                      </div>
                    )}
                  </div>

                  {!isLoadingBatches && batches.length === 0 && (
                    <div className="mt-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
                      No batches found for this product.
                    </div>
                  )}

                  {!isLoadingBatches && batches.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/40">
                          <tr className="text-left">
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Batch No</th>
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Store</th>
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Qty</th>
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Cost Price</th>
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Sell Price</th>
                            <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map((b) => {
                            const isEditing = costEditBatchId === b.id;
                            const isRowSaving = costSavingBatchId === b.id;
                            return (
                              <tr key={b.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{b.batch_number || `#${b.id}`}</td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{b.store?.name || '-'}</td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{b.quantity ?? '-'}</td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <input
                                      value={costEditValue}
                                      onChange={(e) => setCostEditValue(e.target.value)}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="w-32 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-900 dark:text-white"
                                    />
                                  ) : (
                                    <span className="text-gray-900 dark:text-gray-100">{b.cost_price ?? '-'}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{b.sell_price ?? '-'}</td>
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => saveCostPrice(b)}
                                        disabled={isRowSaving}
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-2 py-1 font-semibold text-white"
                                      >
                                        {isRowSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelCostEdit}
                                        disabled={isRowSaving}
                                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-800 dark:text-gray-200"
                                      >
                                        <X className="h-4 w-4" /> Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startCostEdit(b)}
                                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-800 dark:text-gray-200"
                                    >
                                      <Pencil className="h-4 w-4" /> Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

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
