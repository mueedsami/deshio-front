'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Package, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import inventoryService, { type GlobalInventoryItem, type Store as StoreBreakdown } from '@/services/inventoryService';
import { productService, type Product } from '@/services/productService';
import defectiveProductService, { type DefectiveProduct, type DefectiveStatus } from '@/services/defectiveProductService';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';

interface ProductVariation {
  productId: number;
  productName: string;
  variationSuffix?: string;
  quantity: number;
  stores: StoreBreakdown[];
  categoryId?: number;
  categoryName?: string;
  imageUrl?: string;
  color?: string;
  size?: string;
}

interface GroupedProduct {
  groupKey: string;
  sku: string;
  productName: string;
  totalStock: number;
  variations: ProductVariation[];
  expanded: boolean;
  productIds: number[];
  categoryId?: number;
  categoryName?: string;
  imageUrl?: string;
  extraDefective: number;
  extraUsed: number;
  extraEmployeeUse: number;
}

type ExtraCounts = { defective: number; used: number; employeeUse: number };
type RateLimitState = { active: boolean; message?: string };
type InventorySnapshot = { quantity: number; stores: StoreBreakdown[]; categoryId?: number; categoryName?: string };

const ACTIVE_EXTRA_STATUSES: DefectiveStatus[] = [
  'identified',
  'inspected',
  'available_for_sale',
];

const SERVER_PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 500;

function unwrapArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function unwrapInventory(payload: any): GlobalInventoryItem[] {
  return unwrapArray<GlobalInventoryItem>(payload);
}

function isEmployeeUseItem(item: DefectiveProduct): boolean {
  const desc = String(item.defect_description || '').toUpperCase();
  const barcodeStatus = String((item as any)?.barcode?.current_status || '').toLowerCase();
  return desc.includes('EMPLOYEE_USE') || barcodeStatus === 'employee_use';
}

function isUsedItem(item: DefectiveProduct): boolean {
  const desc = String(item.defect_description || '').toUpperCase();
  return desc.includes('USED_ITEM');
}

function normalizeStockNumber(value: any): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProductPayload(item: any) {
  return item?.product || item?.product_data || item?.product_detail || item?.product_info || null;
}

function getCustomFieldValue(product: any, titles: string[]): string | undefined {
  const list = Array.isArray(product?.custom_fields) ? product.custom_fields : [];
  const lowerTitles = titles.map(t => t.toLowerCase());
  const found = list.find((field: any) => lowerTitles.includes(String(field?.field_title || field?.title || field?.name || '').toLowerCase()));
  const value = found?.value ?? found?.raw_value;
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function getProductColorSize(product: any) {
  const color =
    product?.color ||
    product?.colour ||
    product?.variant_color ||
    product?.attributes?.color ||
    product?.attributes?.colour ||
    getCustomFieldValue(product, ['color', 'colour']);

  const size =
    product?.size ||
    product?.variant_size ||
    product?.attributes?.size ||
    getCustomFieldValue(product, ['size']);

  return {
    color: color && String(color) !== 'Default' ? String(color) : undefined,
    size: size && String(size) !== 'One Size' ? String(size) : undefined,
  };
}

function getCategoryNameFromProduct(product: any): string | undefined {
  const category = product?.category;
  const name =
    product?.category_path ||
    product?.category_name ||
    product?.category_title ||
    category?.full_name ||
    category?.title ||
    category?.name;

  return name ? String(name) : undefined;
}

function getCategoryIdFromProduct(product: any): number | undefined {
  const raw = product?.category_id ?? product?.category?.id;
  const categoryId = Number(raw || 0);
  return categoryId > 0 ? categoryId : undefined;
}

function pickImageFromAny(source: any): string | undefined {
  if (!source) return undefined;

  const customFieldImage = getCustomFieldValue(source, ['image', 'thumbnail', 'photo']);
  if (customFieldImage) return customFieldImage;

  const direct =
    source?.thumbnail_url ||
    source?.thumbnailUrl ||
    source?.thumbnail ||
    source?.product_thumbnail ||
    source?.product_image ||
    source?.image_url ||
    source?.imageUrl ||
    source?.image_path ||
    source?.image ||
    source?.photo ||
    source?.picture;
  if (direct) return String(direct);

  const primaryImage = source?.primary_image || source?.primaryImage;
  const primaryImageUrl = primaryImage?.url || primaryImage?.image_url || primaryImage?.imageUrl || primaryImage?.image_path || primaryImage?.path;
  if (primaryImageUrl) return String(primaryImageUrl);

  const displayImages = Array.isArray(source?.display_images) ? source.display_images : [];
  const productImages = Array.isArray(source?.product_images) ? source.product_images : [];
  const images = displayImages.length > 0
    ? displayImages
    : productImages.length > 0
      ? productImages
      : (Array.isArray(source?.images) ? source.images : []);

  if (images.length > 0) {
    const activeImages = images.filter((image: any) => image?.is_active !== false);
    activeImages.sort((a: any, b: any) => {
      if (a?.is_primary && !b?.is_primary) return -1;
      if (!a?.is_primary && b?.is_primary) return 1;
      return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
    });
    const imageUrl = activeImages[0]?.thumbnail_url || activeImages[0]?.image_url || activeImages[0]?.imageUrl || activeImages[0]?.image_path || activeImages[0]?.url || activeImages[0]?.path;
    if (imageUrl) return String(imageUrl);
  }

  return undefined;
}

function normalizeImageUrl(url?: string | null) {
  const normalized = toAbsoluteAssetUrl(url);
  return normalized || '/placeholder-image.jpg';
}

function flattenInventoryItems(inventoryItems: GlobalInventoryItem[]): any[] {
  const rows: any[] = [];

  for (const rawItem of inventoryItems) {
    const item: any = rawItem;
    const productId = item?.product_id ?? item?.product?.id;
    const variants = Array.isArray(item?.products)
      ? item.products
      : Array.isArray(item?.variants)
        ? item.variants
        : [];

    if (!productId && variants.length > 0) {
      for (const variant of variants) {
        rows.push({
          ...item,
          ...variant,
          product: variant,
          sku: item?.sku || variant?.sku,
          base_name: item?.base_name || variant?.base_name,
          category_id: variant?.category_id ?? item?.category_id,
          category: variant?.category ?? item?.category,
          stores: variant?.stores || item?.stores || [],
          total_quantity: variant?.total_quantity ?? variant?.stock_quantity ?? variant?.quantity ?? 0,
        });
      }
    } else {
      rows.push(item);
    }
  }

  return rows;
}

function buildInventoryMap(inventoryItems: GlobalInventoryItem[]): Map<number, InventorySnapshot> {
  const map = new Map<number, InventorySnapshot>();

  for (const rawItem of flattenInventoryItems(inventoryItems)) {
    const item: any = rawItem;
    const product = getProductPayload(item);
    const productId = Number(item?.product_id ?? product?.id ?? item?.id ?? 0);
    if (!productId) continue;

    const current = map.get(productId) || { quantity: 0, stores: [] };
    current.quantity += normalizeStockNumber(item?.total_quantity ?? item?.quantity ?? item?.stock_quantity);

    const stores = Array.isArray(item?.stores) ? item.stores : [];
    for (const store of stores) {
      const existingStore = current.stores.find(currentStore => Number(currentStore.store_id) === Number(store.store_id));
      if (existingStore) {
        existingStore.quantity = normalizeStockNumber(existingStore.quantity) + normalizeStockNumber(store.quantity);
        existingStore.batches_count = normalizeStockNumber(existingStore.batches_count) + normalizeStockNumber(store.batches_count);
      } else {
        current.stores.push({ ...store });
      }
    }

    const categoryId = getCategoryIdFromProduct(item) || getCategoryIdFromProduct(product);
    const categoryName = getCategoryNameFromProduct(item) || getCategoryNameFromProduct(product);
    if (!current.categoryId && categoryId) current.categoryId = categoryId;
    if (!current.categoryName && categoryName) current.categoryName = categoryName;

    map.set(productId, current);
  }

  return map;
}

function getAllSkuGroupProducts(groupProduct: Product): any[] {
  const variants = Array.isArray((groupProduct as any)?.variants) ? (groupProduct as any).variants : [];
  const all = [groupProduct as any, ...variants];
  const seen = new Set<number>();

  return all.filter(product => {
    const id = Number(product?.id || 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildGroupsFromBackendProducts(products: Product[], inventoryMap: Map<number, InventorySnapshot>): GroupedProduct[] {
  return products.map((groupProduct: any) => {
    const variants = getAllSkuGroupProducts(groupProduct);
    const sku = String(groupProduct?.sku || '').trim() || 'NO-SKU';
    const categoryId = getCategoryIdFromProduct(groupProduct);
    const categoryName = getCategoryNameFromProduct(groupProduct);
    const groupImage = pickImageFromAny(groupProduct);

    const variations: ProductVariation[] = variants.map((product) => {
      const productId = Number(product?.id || 0);
      const inventory = inventoryMap.get(productId);
      const imageUrl = pickImageFromAny(product) || groupImage;
      const { color, size } = getProductColorSize(product);
      const productCategoryId = getCategoryIdFromProduct(product) || inventory?.categoryId || categoryId;
      const productCategoryName = getCategoryNameFromProduct(product) || inventory?.categoryName || categoryName;

      return {
        productId,
        productName: String(product?.name || product?.base_name || groupProduct?.name || 'Unnamed Product'),
        variationSuffix: product?.variation_suffix ? String(product.variation_suffix) : undefined,
        quantity: inventory ? inventory.quantity : normalizeStockNumber(product?.stock_quantity ?? product?.total_quantity),
        stores: inventory?.stores || [],
        categoryId: productCategoryId,
        categoryName: productCategoryName,
        imageUrl: imageUrl ? normalizeImageUrl(imageUrl) : undefined,
        color,
        size,
      };
    });

    const productIds = variations.map(variation => variation.productId).filter(Boolean);
    const firstVariationCategory = variations.find(variation => variation.categoryName || variation.categoryId);
    const firstVariationImage = variations.find(variation => variation.imageUrl);

    return {
      groupKey: `SKU-${sku}`,
      sku,
      productName: String(groupProduct?.base_name || groupProduct?.name || sku),
      totalStock: variations.reduce((sum, variation) => sum + normalizeStockNumber(variation.quantity), 0),
      variations,
      expanded: false,
      productIds,
      categoryId: categoryId || firstVariationCategory?.categoryId,
      categoryName: categoryName || firstVariationCategory?.categoryName,
      imageUrl: groupImage ? normalizeImageUrl(groupImage) : firstVariationImage?.imageUrl,
      extraDefective: 0,
      extraUsed: 0,
      extraEmployeeUse: 0,
    };
  });
}

export default function ViewInventoryPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [extraMap, setExtraMap] = useState<Map<number, ExtraCounts>>(new Map());
  const [rateLimit] = useState<RateLimitState>({ active: false });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const getCategoryForGroup = (group: GroupedProduct) => {
    if (group.categoryName) return group.categoryName;

    for (const variation of group.variations) {
      if (variation.categoryName) return variation.categoryName;
    }

    return 'Uncategorized';
  };

  const getHeroImageForGroup = (group: GroupedProduct) => {
    if (group.imageUrl) return normalizeImageUrl(group.imageUrl);

    const variationWithImage = group.variations.find(variation => variation.imageUrl);
    if (variationWithImage?.imageUrl) return normalizeImageUrl(variationWithImage.imageUrl);

    return '/placeholder-image.jpg';
  };

  const fetchAllActiveExtraItems = async (): Promise<DefectiveProduct[]> => {
    const all: DefectiveProduct[] = [];
    const perPage = 200;

    for (const status of ACTIVE_EXTRA_STATUSES) {
      let page = 1;

      while (true) {
        const response = await defectiveProductService.getAll({ status, per_page: perPage, page });
        const root = response?.data;
        const rows: DefectiveProduct[] = Array.isArray(root) ? root : (root?.data || []);
        all.push(...rows);

        if (Array.isArray(root)) break;

        const currentRootPage = Number(root?.current_page || page);
        const rootLastPage = Number(root?.last_page || currentRootPage);
        if (rows.length === 0 || currentRootPage >= rootLastPage) break;

        page += 1;
      }
    }

    return all;
  };

  const buildExtraMapByProduct = (items: DefectiveProduct[]) => {
    const map = new Map<number, ExtraCounts>();

    for (const item of items) {
      const productId = Number(item.product_id || 0);
      if (!productId) continue;

      const entry = map.get(productId) || { defective: 0, used: 0, employeeUse: 0 };
      if (isEmployeeUseItem(item)) entry.employeeUse += 1;
      else if (isUsedItem(item)) entry.used += 1;
      else entry.defective += 1;

      map.set(productId, entry);
    }

    return map;
  };

  const fetchProducts = useCallback(async (page = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const [productsResponse, inventoryResponse] = await Promise.all([
        productService.getAll({
          page,
          per_page: SERVER_PAGE_SIZE,
          search: debouncedSearchTerm || undefined,
          group_by_sku: true,
          sort_by: 'created_at',
          sort_direction: 'desc',
        }),
        inventoryService.getGlobalInventory({ skipStoreScope: true }),
      ]);

      const inventoryMap = buildInventoryMap(unwrapInventory(inventoryResponse));
      const nextGroups = buildGroupsFromBackendProducts(productsResponse.data || [], inventoryMap);

      setGroupedProducts(prev => append ? [...prev, ...nextGroups] : nextGroups);
      setCurrentPage(Number(productsResponse.current_page || page));
      setLastPage(Math.max(1, Number(productsResponse.last_page || 1)));
      setTotalGroups(Number(productsResponse.total || nextGroups.length));
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      if (!append) setGroupedProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchProducts(1, false);
  }, [fetchProducts]);

  useEffect(() => {
    const loadExtras = async () => {
      try {
        const extraItems = await fetchAllActiveExtraItems();
        setExtraMap(buildExtraMapByProduct(extraItems));
      } catch (error) {
        console.warn('Failed to load defective/used/employee-use counts', error);
      }
    };

    loadExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = (groupKey: string) => {
    setGroupedProducts(prev => prev.map(item => (
      item.groupKey === groupKey ? { ...item, expanded: !item.expanded } : item
    )));
  };

  const groupsWithExtras = useMemo(() => {
    if (extraMap.size === 0) return groupedProducts;

    return groupedProducts.map(group => {
      let defective = 0;
      let used = 0;
      let employeeUse = 0;

      for (const productId of group.productIds) {
        const counts = extraMap.get(productId);
        if (!counts) continue;
        defective += counts.defective;
        used += counts.used;
        employeeUse += counts.employeeUse;
      }

      return {
        ...group,
        extraDefective: defective,
        extraUsed: used,
        extraEmployeeUse: employeeUse,
      };
    });
  }, [groupedProducts, extraMap]);

  const renderFallbackImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied) return;
    image.dataset.fallbackApplied = '1';
    image.src = '/placeholder-image.jpg';
  };

  if (loading) {
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
            <main className="flex-1 overflow-auto p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Loading inventory...</p>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Inventory Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all products and their stock levels across outlets
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by product name, SKU or category"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Search is sent to the backend and products are grouped by backend SKU groups.
              </p>
            </div>

            {rateLimit.active && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Rate limit detected</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {rateLimit.message || 'Too many requests. Slowing down requests and retrying automatically.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {groupsWithExtras.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No inventory items found</p>
                </div>
              ) : (
                <>
                  {groupsWithExtras.map((item) => {
                    const categoryLabel = getCategoryForGroup(item);
                    const heroImage = getHeroImageForGroup(item);

                    return (
                      <div
                        key={item.groupKey}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              <img
                                src={heroImage}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                                onError={renderFallbackImage}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {item.productName}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">SKU:</span>
                                  <span className="font-mono">{item.sku}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Category:</span>
                                  <span>{categoryLabel}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Items:</span>
                                  <span>{item.variations.length}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                  {item.totalStock}
                                </p>

                                {(item.extraDefective > 0 || item.extraUsed > 0 || item.extraEmployeeUse > 0) && (
                                  <div className="mt-2 flex flex-col items-end gap-1">
                                    {item.extraDefective > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                                        Def: {item.extraDefective}
                                      </span>
                                    )}
                                    {item.extraUsed > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
                                        Used: {item.extraUsed}
                                      </span>
                                    )}
                                    {item.extraEmployeeUse > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                        Emp: {item.extraEmployeeUse}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleExpand(item.groupKey)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                {item.expanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {item.expanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <div className="p-4">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Items & Stock Distribution
                              </h4>
                              <div className="space-y-4">
                                {item.variations.map((variation) => {
                                  const productId = variation.productId;
                                  const image = variation.imageUrl ? normalizeImageUrl(variation.imageUrl) : '/placeholder-image.jpg';
                                  const color = variation.color;
                                  const size = variation.size;

                                  return (
                                    <div
                                      key={productId}
                                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                                    >
                                      <div className="flex items-center gap-4 mb-3">
                                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                          <img
                                            src={image}
                                            alt={variation.productName}
                                            className="w-full h-full object-cover"
                                            onError={renderFallbackImage}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                                            {variation.productName}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {color ? (
                                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                                                Color: {color}
                                              </span>
                                            ) : null}
                                            {size ? (
                                              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded-full">
                                                Size: {size}
                                              </span>
                                            ) : null}
                                            {!color && !size ? (
                                              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-full">
                                                Product ID: {productId}
                                              </span>
                                            ) : null}
                                          </div>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Total:{' '}
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                              {variation.quantity}
                                            </span>{' '}
                                            units
                                          </p>
                                        </div>
                                      </div>

                                      {variation.stores.length > 0 && (
                                        <div className="overflow-x-auto">
                                          <table className="w-full">
                                            <thead>
                                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                  Store
                                                </th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                  Quantity
                                                </th>
                                                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                  Batches
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {variation.stores.map((store, storeIndex) => (
                                                <tr
                                                  key={`${store.store_id}-${storeIndex}`}
                                                  className="border-b border-gray-200 dark:border-gray-700 last:border-0"
                                                >
                                                  <td className="py-2 px-3 text-sm text-gray-900 dark:text-white font-medium">
                                                    {store.store_name || `Store #${store.store_id}`}
                                                  </td>
                                                  <td className="py-2 px-3 text-center">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                                                      {store.quantity}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                                    {store.batches_count || 0}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {currentPage < lastPage && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => fetchProducts(currentPage + 1, true)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loadingMore ? 'Loading more...' : `Load more (${Math.max(totalGroups - groupsWithExtras.length, 0)} remaining)`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
