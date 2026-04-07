'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight, Filter, Grid, List, RefreshCw, Minus, X, Minimize2, Maximize2 } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ProductListItem from '@/components/ProductListItem';
import { productService, GroupedProduct, GroupedProductVariant, GroupedProductsResponse } from '@/services/productService';
import categoryService, { Category } from '@/services/categoryService';
import { vendorService, Vendor } from '@/services/vendorService';
import Toast from '@/components/Toast';
import { FALLBACK_IMAGE_URL, ProductGroup, ProductVariant } from '@/types/product';

// ─── Types ────────────────────────────────────────────────────────────────

interface SocialQueueItem {
  id: number;
  name: string;
  sku: string;
  image?: string | null;
  qty: number;
  ts: number;
}

// Adapt backend GroupedProduct → ProductGroup (typed shape expected by ProductListItem)
function toProductGroup(g: GroupedProduct): ProductGroup {
  const variants: ProductVariant[] = g.variants.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku ?? '',
    color: v.custom_fields?.find((cf) => cf.field_title?.toLowerCase() === 'color')?.value,
    size:  v.custom_fields?.find((cf) => cf.field_title?.toLowerCase() === 'size')?.value,
    image: v.image,
  }));

  return {
    sku: g.sku ?? '',
    baseName: g.base_name,
    totalVariants: g.total_variants,
    variants,
    primaryImage: g.primary_image,
    categoryPath: g.category_path,
    category_id: g.category_id,
    hasVariations: g.has_variations,
    vendorId: g.vendor_id ?? undefined,
    vendorName: g.vendor_name ?? null,
    sellingPrice: g.selling_price,
    inStock: g.in_stock,
    stockQuantity: g.total_stock,
    stockByStore: g.stock_per_store ?? [],
  };
}

// ─── Page-cache map  key→page data (simple flooding cache) ──────────────────

const ITEMS_PER_PAGE = 20;
const SOCIAL_COMMERCE_QUEUE_KEY = 'socialCommerceSelectionQueueV1';

export default function ProductPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const isUpdatingUrlRef = useRef(false);

  // ── URL-sourced state ────────────────────────────────────────────────────
  const [selectMode, setSelectMode]     = useState(false);
  const [redirectPath, setRedirectPath] = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode]         = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [viewMode, setViewMode]         = useState<'list' | 'grid'>('list');
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // ── Filter / search state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVendor, setSelectedVendor]     = useState('');
  const [minPrice, setMinPrice]               = useState('');
  const [maxPrice, setMaxPrice]               = useState('');
  const [showFilters, setShowFilters]         = useState(false);

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [groups, setGroups]       = useState<GroupedProduct[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [isLoading, setIsLoading]     = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false); // spinner for subsequent pages

  // ── Filter dropdown data ─────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);

  // ── "Flooding" prefetch cache ─────────────────────────────────────────────
  // key = JSON.stringify({ page, q, category, vendor, minPrice, maxPrice })
  const pageCache = useRef<Map<string, GroupedProduct[]>>(new Map());
  const prefetchController = useRef<AbortController | null>(null);

  // ── Social commerce queue state ──────────────────────────────────────────
  const [queuedForSocialCount, setQueuedForSocialCount] = useState(0);
  const [queuedForSocialItems, setQueuedForSocialItems] = useState<SocialQueueItem[]>([]);
  const [socialQueueMinimized, setSocialQueueMinimized] = useState(false);

  const isSocialQueueMode = selectMode && /social-commerce/i.test(redirectPath);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) params.delete(key);
        else params.set(key, value);
      });
      const qs = params.toString();
      isUpdatingUrlRef.current = true;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const goToPage = useCallback(
    (page: number) => {
      const safe = Math.max(1, page);
      setCurrentPage(safe);
      updateQueryParams({ page: String(safe) });
    },
    [updateQueryParams]
  );

  // ─── Social queue helpers ───────────────────────────────────────────────

  const normalizeSocialSelectionQueue = (items: any[]): SocialQueueItem[] => {
    const list = Array.isArray(items) ? items : [];
    const byId = new Map<number, SocialQueueItem>();
    for (const raw of list) {
      const id = Number(raw?.id || 0);
      if (!Number.isFinite(id) || id <= 0) continue;
      const qtyRaw = Number(raw?.qty);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
      const existing = byId.get(id);
      if (existing) {
        existing.qty += qty;
        existing.ts = Math.max(existing.ts || 0, Number(raw?.ts || 0) || Date.now());
        if (!existing.image && raw?.image) existing.image = String(raw.image);
        if (!existing.sku && raw?.sku) existing.sku = String(raw.sku);
        if (!existing.name && raw?.name) existing.name = String(raw.name);
      } else {
        byId.set(id, {
          id,
          name: String(raw?.name || ''),
          sku: String(raw?.sku || ''),
          image: raw?.image ? String(raw.image) : null,
          qty,
          ts: Number(raw?.ts || 0) || Date.now(),
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  };

  const getQueuedUnitsCount = (items: SocialQueueItem[]) =>
    items.reduce((sum, item) => sum + Math.max(1, Number(item?.qty) || 1), 0);

  const readSocialSelectionQueue = (): SocialQueueItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem(SOCIAL_COMMERCE_QUEUE_KEY);
      return normalizeSocialSelectionQueue(raw ? JSON.parse(raw) : []);
    } catch { return []; }
  };

  const writeSocialSelectionQueue = (items: SocialQueueItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      const normalized = normalizeSocialSelectionQueue(items);
      if (!normalized.length) sessionStorage.removeItem(SOCIAL_COMMERCE_QUEUE_KEY);
      else sessionStorage.setItem(SOCIAL_COMMERCE_QUEUE_KEY, JSON.stringify(normalized));
      setQueuedForSocialItems(normalized);
      setQueuedForSocialCount(getQueuedUnitsCount(normalized));
    } catch (e) { console.warn('Failed to update social commerce selection queue', e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────

  const buildCacheKey = (page: number, q: string, cat: string, ven: string, minP: string, maxP: string) =>
    JSON.stringify({ page, q, cat, ven, minP, maxP });

  const fetchPage = useCallback(async (
    page: number,
    q: string,
    cat: string,
    ven: string,
    minP: string,
    maxP: string,
    { silent = false } = {}
  ): Promise<GroupedProductsResponse | null> => {
    const cacheKey = buildCacheKey(page, q, cat, ven, minP, maxP);

    if (pageCache.current.has(cacheKey)) {
      // Return a fake response wrapping the cached data so callers don't need to branch
      return {
        data: pageCache.current.get(cacheKey)!,
        pagination: { total: totalGroups, per_page: ITEMS_PER_PAGE, current_page: page, last_page: totalPages, from: null, to: null },
        total_groups: totalGroups,
      };
    }

    try {
      const res = await productService.getGroupedProducts({
        page,
        per_page: ITEMS_PER_PAGE,
        q: q || undefined,
        category_id: cat || undefined,
        vendor_id: ven || undefined,
        min_price: minP || undefined,
        max_price: maxP || undefined,
        is_archived: false,
      });

      pageCache.current.set(cacheKey, res.data);
      return res;
    } catch (err) {
      console.error('fetchPage error', err);
      return null;
    }
  }, [totalGroups, totalPages]);

  // Main loader — called whenever page / filters change
  const loadPage = useCallback(async (
    page: number,
    q: string,
    cat: string,
    ven: string,
    minP: string,
    maxP: string,
    firstLoad = false
  ) => {
    const cacheKey = buildCacheKey(page, q, cat, ven, minP, maxP);
    const cached   = pageCache.current.get(cacheKey);

    if (cached) {
      setGroups(cached);
      setIsLoading(false);
      setIsPageLoading(false);
    } else {
      if (firstLoad) setIsLoading(true);
      else setIsPageLoading(true);

      const res: any = await fetchPage(page, q, cat, ven, minP, maxP);

      if (res) {
        // res is the full GroupedProductsResponse on first call
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setGroups(list);
        if (res.pagination) {
          setTotalGroups(res.pagination.total ?? 0);
          setTotalPages(res.pagination.last_page ?? 1);
        }
      }

      setIsLoading(false);
      setIsPageLoading(false);
    }

    // ── Flood: prefetch next page in the background ───────────────────────
    const nextCacheKey = buildCacheKey(page + 1, q, cat, ven, minP, maxP);
    if (!pageCache.current.has(nextCacheKey)) {
      // Cancel any in-flight prefetch
      prefetchController.current?.abort();
      prefetchController.current = new AbortController();

      // Slight delay so we don't race with the current page's render
      setTimeout(() => {
        fetchPage(page + 1, q, cat, ven, minP, maxP, { silent: true }).catch(() => {});
      }, 600);
    }
  }, [fetchPage]);

  // ─── Load filter dropdowns once on mount ────────────────────────────────

  useEffect(() => {
    Promise.all([categoryService.getTree(true), vendorService.getAll()])
      .then(([cats, vens]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        const vendorsArr: Vendor[] = Array.isArray(vens) ? vens : [];
        setVendorsList(
          vendorsArr
            .filter((v) => v && v.is_active)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        );
      })
      .catch(console.error);
  }, []);

  // ─── Sync state from URL (supports back/forward navigation) ─────────────
  useEffect(() => {
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }
    const q   = searchParams.get('q') ?? '';
    const cat = searchParams.get('category') ?? '';
    const ven = searchParams.get('vendor') ?? '';
    const minP = searchParams.get('minPrice') ?? '';
    const maxP = searchParams.get('maxPrice') ?? '';
    const pageRaw = Number(searchParams.get('page') ?? '1');
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedVendor(ven);
    setMinPrice(minP);
    setMaxPrice(maxP);
    setCurrentPage(page);
    setSelectMode(searchParams.get('selectMode') === 'true');
    setRedirectPath(searchParams.get('redirect') || '');
  }, [searchParams]);

  // ─── Debounced search re-fetch ────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear page cache whenever filters change (different query = different data)
    pageCache.current.clear();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadPage(currentPage, searchQuery, selectedCategory, selectedVendor, minPrice, maxPrice, true);
    }, searchQuery ? 350 : 0);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, selectedCategory, selectedVendor, minPrice, maxPrice]);

  // ─── Social queue sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isSocialQueueMode) {
      setQueuedForSocialCount(0);
      setQueuedForSocialItems([]);
      setSocialQueueMinimized(false);
      return;
    }
    const queue = readSocialSelectionQueue();
    setQueuedForSocialItems(queue);
    setQueuedForSocialCount(getQueuedUnitsCount(queue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSocialQueueMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    pageCache.current.clear();
    loadPage(currentPage, searchQuery, selectedCategory, selectedVendor, minPrice, maxPrice, true);
    setToast({ message: 'Products refreshed', type: 'success' });
  };

  const handleDelete = async (id: number) => {
    try {
      await productService.delete(id);
      setToast({ message: 'Product deleted successfully', type: 'success' });
      pageCache.current.clear();
      loadPage(currentPage, searchQuery, selectedCategory, selectedVendor, minPrice, maxPrice, true);
    } catch {
      setToast({ message: 'Failed to delete product', type: 'error' });
    }
  };

  const handleEdit = (id: number) => {
    ['editProductId', 'productMode', 'baseSku', 'baseName', 'categoryId'].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    sessionStorage.setItem('editProductId', id.toString());
    sessionStorage.setItem('productMode', 'edit');
    router.push('/product/add');
  };

  const handleView = (id: number) => router.push(`/product/${id}`);

  const handleAdd = () => {
    ['editProductId', 'productMode', 'baseSku', 'baseName', 'categoryId'].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    router.push('/product/add');
  };

  const handleAddVariation = (group: ReturnType<typeof toProductGroup>) => {
    ['editProductId', 'productMode', 'baseSku', 'baseName', 'categoryId'].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    sessionStorage.setItem('productMode', 'addVariation');
    sessionStorage.setItem('baseSku', group.sku);
    sessionStorage.setItem('baseName', group.baseName);
    sessionStorage.setItem('categoryId', group.category_id.toString());
    router.push('/product/add');
  };

  const handleReturnToSocialCommerce = () => {
    if (!redirectPath) return;
    router.push(redirectPath);
  };

  const handleClearSocialQueue = () => {
    writeSocialSelectionQueue([]);
    setToast({ message: 'Selection queue cleared', type: 'warning' });
  };

  const handleQueueQtyChange = (productId: number, nextQtyInput: number) => {
    const nextQty = Math.max(1, Math.floor(Number(nextQtyInput) || 1));
    const updated = readSocialSelectionQueue().map((item) =>
      Number(item?.id) === productId ? { ...item, qty: nextQty, ts: Date.now() } : item
    );
    writeSocialSelectionQueue(updated);
  };

  const handleRemoveQueuedItem = (productId: number) => {
    writeSocialSelectionQueue(readSocialSelectionQueue().filter((item) => Number(item?.id) !== productId));
  };

  const handleSelect = (variant: ProductVariant) => {
    if (!selectMode || !redirectPath) return;

    if (isSocialQueueMode) {
      const queue = readSocialSelectionQueue();
      const pid = Number(variant.id);
      const existingIndex = queue.findIndex((item) => Number(item?.id) === pid);

      if (existingIndex >= 0) {
        const ex = queue[existingIndex];
        queue[existingIndex] = {
          ...ex,
          qty: Math.max(1, Number(ex?.qty) || 1) + 1,
          ts: Date.now(),
        };
      } else {
        queue.push({
          id: pid,
          name: String(variant.name || ''),
          sku: String(variant.sku || ''),
          image: variant.image || null,
          qty: 1,
          ts: Date.now(),
        });
      }
      writeSocialSelectionQueue(queue);
      const totalUnits = getQueuedUnitsCount(queue);
      setToast({ message: `${variant.name} added (${totalUnits} item${totalUnits > 1 ? 's' : ''})`, type: 'success' });
      return;
    }

    const separator = redirectPath.includes('?') ? '&' : '?';
    router.push(`${redirectPath}${separator}productId=${variant.id}&productName=${encodeURIComponent(variant.name)}&productSku=${encodeURIComponent(variant.sku ?? '')}`);
  };

  // ── Flatten categories for the dropdown ─────────────────────────────────
  const flatCategories: { id: string; label: string; depth: number }[] = [];
  const flattenCats = (cats: Category[], depth = 0) => {
    cats.forEach((cat) => {
      flatCategories.push({ id: String(cat.id), label: `${'  '.repeat(depth)}${cat.title}`, depth });
      const children = cat.children || (cat as any).all_children || [];
      if (children.length) flattenCats(children, depth + 1);
    });
  };
  flattenCats(categories);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedVendor('');
    setMinPrice('');
    setMaxPrice('');
    setCurrentPage(1);
    updateQueryParams({ q: null, category: null, vendor: null, minPrice: null, maxPrice: null, page: '1' });
  };

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedVendor || minPrice || maxPrice);
  const productGroups   = groups.map(toProductGroup);
  const loading         = isLoading || isPageLoading;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <main className={`flex-1 overflow-y-auto p-6 ${isSocialQueueMode ? 'pb-72 md:pb-56' : ''}`}>
            <div className="max-w-7xl mx-auto">

              {/* ── Header ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectMode ? 'Select a Product' : 'Products'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectMode
                        ? (isSocialQueueMode
                          ? 'Click products to queue them, then adjust quantities from the queue drawer'
                          : 'Select a product to return to the previous page')
                        : `Manage your store's product catalog`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSocialQueueMode && redirectPath && (
                      <>
                        <button onClick={handleClearSocialQueue} type="button" className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm">
                          Clear Queue
                        </button>
                        <button onClick={handleReturnToSocialCommerce} type="button" className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm">
                          Back to Social Commerce ({queuedForSocialCount})
                        </button>
                      </>
                    )}
                    <button onClick={handleRefresh} disabled={loading} className="p-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50" title="Refresh products">
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {!selectMode && (
                      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`} title="List view"><List className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`} title="Grid view"><Grid className="w-4 h-4" /></button>
                      </div>
                    )}
                    {!selectMode && (
                      <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium shadow-sm">
                        <Plus className="w-5 h-5" />Add Product
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGroups}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Page</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">With Variations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.filter((g) => g.has_variations).length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Categories</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{flatCategories.length}</p>
                  </div>
                </div>

                {/* ── Search bar ── */}
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, SKU, or category…"
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        setCurrentPage(1);
                        updateQueryParams({ q: val || null, page: '1' });
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm shadow-sm"
                    />
                    {isPageLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors shadow-sm ${showFilters || hasActiveFilters ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <Filter className="w-5 h-5" />
                    <span className="font-medium">Filters</span>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-full">
                        {(searchQuery ? 1 : 0) + (selectedCategory ? 1 : 0) + (selectedVendor ? 1 : 0) + (minPrice || maxPrice ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </div>

                {/* ── Filter panel ── */}
                {showFilters && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Clear all</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedCategory(val);
                            setCurrentPage(1);
                            updateQueryParams({ category: val || null, page: '1' });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                        >
                          <option value="">All Categories</option>
                          {flatCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Vendor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor</label>
                        <select
                          value={selectedVendor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedVendor(val);
                            setCurrentPage(1);
                            updateQueryParams({ vendor: val || null, page: '1' });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                        >
                          <option value="">All Vendors</option>
                          {vendorsList.map((v) => (<option key={v.id} value={String(v.id)}>{v.name}</option>))}
                        </select>
                      </div>

                      {/* Price range */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selling Price (৳)</label>
                        <div className="flex gap-3">
                          <input type="number" inputMode="numeric" placeholder="Min" value={minPrice}
                            onChange={(e) => { const v = e.target.value; setMinPrice(v); setCurrentPage(1); updateQueryParams({ minPrice: v || null, page: '1' }); }}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                          />
                          <input type="number" inputMode="numeric" placeholder="Max" value={maxPrice}
                            onChange={(e) => { const v = e.target.value; setMaxPrice(v); setCurrentPage(1); updateQueryParams({ maxPrice: v || null, page: '1' }); }}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                          />
                        </div>
                        {(minPrice || maxPrice) && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Showing only items whose selling price is within the selected range.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Content ── */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading products…</p>
                  </div>
                </div>
              ) : productGroups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {hasActiveFilters ? 'No products found' : 'No products yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {hasActiveFilters ? 'Try adjusting your filters or search terms' : 'Get started by adding your first product'}
                  </p>
                  {hasActiveFilters ? (
                    <button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium">Clear Filters</button>
                  ) : !selectMode && (
                    <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium">
                      <Plus className="w-4 h-4" />Add First Product
                    </button>
                  )}
                </div>
              ) : (
                <div className={`relative ${isPageLoading ? 'opacity-60 pointer-events-none' : ''} transition-opacity duration-200 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}`}>
                  {productGroups.map((group) => (
                    <ProductListItem
                      key={`${group.sku}-${group.variants[0]?.id}`}
                      productGroup={group}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onView={handleView}
                      onAddVariation={handleAddVariation}
                      {...(selectMode && { onSelect: handleSelect })}
                      selectable={selectMode}
                    />
                  ))}
                </div>
              )}

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>{' '}
                    to <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, totalGroups)}</span>{' '}
                    of <span className="font-medium text-gray-900 dark:text-white">{totalGroups}</span> groups
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-900 dark:text-white shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5)           page = i + 1;
                      else if (currentPage <= 3)     page = i + 1;
                      else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                      else                            page = currentPage - 2 + i;
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors font-medium shadow-sm ${
                            currentPage === page
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-900 dark:text-white shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Social Commerce Queue Drawer ── */}
      {isSocialQueueMode && redirectPath && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-auto z-40 ${socialQueueMinimized ? 'md:w-[300px]' : 'md:w-[430px]'}`}>
          {socialQueueMinimized ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Social Commerce Queue</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {queuedForSocialItems.length} product{queuedForSocialItems.length !== 1 ? 's' : ''} • {queuedForSocialCount} total item{queuedForSocialCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setSocialQueueMinimized(false)} type="button" className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" title="Expand queue">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleReturnToSocialCommerce} type="button" disabled={queuedForSocialItems.length === 0} className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
                    Back ({queuedForSocialCount})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Social Commerce Queue</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {queuedForSocialItems.length} product{queuedForSocialItems.length !== 1 ? 's' : ''} • {queuedForSocialCount} total item{queuedForSocialCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSocialQueueMinimized(true)} type="button" className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" title="Minimize queue">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleClearSocialQueue} type="button" className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                {queuedForSocialItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">No products queued yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click "Select" on products to add them here.</p>
                  </div>
                ) : (
                  queuedForSocialItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2.5">
                      <div className="flex items-center gap-2">
                        <img src={item.image || FALLBACK_IMAGE_URL} alt={item.name || `#${item.id}`} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE_URL; }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name || `#${item.id}`}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.sku || `ID: ${item.id}`}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveQueuedItem(Number(item.id))} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800" title="Remove from queue">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleQueueQtyChange(Number(item.id), Math.max(1, Number(item.qty || 1) - 1))} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200">
                          <Minus className="w-4 h-4" />
                        </button>
                        <input type="number" min={1} value={Math.max(1, Number(item.qty) || 1)} onChange={(e) => handleQueueQtyChange(Number(item.id), Number(e.target.value))} className="w-16 h-8 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white" />
                        <button type="button" onClick={() => handleQueueQtyChange(Number(item.id), Math.max(1, Number(item.qty || 1) + 1))} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold">
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button onClick={handleReturnToSocialCommerce} type="button" disabled={queuedForSocialItems.length === 0} className="w-full px-3 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
                  Back to Social Commerce ({queuedForSocialCount})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}