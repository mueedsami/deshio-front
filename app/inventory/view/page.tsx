'use client';

import { useState, useEffect } from 'react';
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import inventoryService, { GlobalInventoryItem, Store as StoreBreakdown } from '@/services/inventoryService';
import productService from '@/services/productService';
import categoryService from '@/services/groupInventory';
import productImageService from '@/services/productImageService';
import defectiveProductService, { type DefectiveProduct } from '@/services/defectiveProductService';

interface Category {
  id: number;
  title: string;
  name?: string;
  slug?: string;
  parent_id?: number;
}

interface ProductVariation {
  color?: string;
  size?: string;
  image?: string;
  quantity: number;
  stores: StoreBreakdown[];
}

interface GroupedProduct {
  sku: string;
  productName: string;
  category: string;
  totalStock: number;
  variations: ProductVariation[];
  expanded: boolean;

  // Extra panel counts (defective/used) merged client-side
  extraTotal: number;
  extraDefective: number;
  extraUsed: number;
  productIds: number[];
}

export default function ViewInventoryPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // --- Same approach as GalleryPage: normalize image paths to absolute URLs ---
  const getBaseUrl = () => {
    // Example: NEXT_PUBLIC_API_URL = https://backend.errumbd.com/api
    // We need base = https://backend.errumbd.com
    const api = process.env.NEXT_PUBLIC_API_URL || '';
    return api ? api.replace(/\/api\/?$/, '') : '';
  };

  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return '/placeholder-image.jpg';

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;

    const baseUrl = getBaseUrl();

    // backend often returns /storage/....
    if (url.startsWith('/storage')) return `${baseUrl}${url}`;

    // if it already starts with "/", treat as site-relative
    if (url.startsWith('/')) return url;

    // otherwise treat as filename stored in product-images
    if (!baseUrl) return `/storage/product-images/${url}`; // best-effort fallback
    return `${baseUrl}/storage/product-images/${url}`;
  };

  const getCategoryName = (categoryId: number, cats: Category[]): string => {
    const category = cats.find(c => c.id === categoryId);
    if (!category) return 'Uncategorized';

    if (category.parent_id) {
      const parent = cats.find(c => c.id === category.parent_id);
      return parent ? `${parent.title} / ${category.title}` : category.title;
    }

    return category.title;
  };

  // Fetch primary image per product_id using the same logic as GalleryPage
  const fetchPrimaryImagesMap = async (productIds: number[]) => {
    const baseUrl = getBaseUrl();
    const unique = Array.from(new Set(productIds.filter(Boolean)));

    const pairs = await Promise.all(
      unique.map(async (pid) => {
        try {
          const imgs = await productImageService.getProductImages(pid);

          const urls = (imgs || [])
            .filter((img: any) => img?.is_active)
            .sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return (a.sort_order || 0) - (b.sort_order || 0);
            })
            .map((img: any) => {
              const u = img.image_url || img.image_path;
              if (!u) return null;

              if (u.startsWith('http')) return u;
              if (u.startsWith('/storage')) return `${baseUrl}${u}`;
              return `${baseUrl}/storage/product-images/${u}`;
            })
            .filter(Boolean) as string[];

          return [pid, urls[0] || '/placeholder-image.jpg'] as const;
        } catch (e) {
          console.warn(`Failed to load images for product ${pid}`, e);
          return [pid, '/placeholder-image.jpg'] as const;
        }
      })
    );

    return new Map<number, string>(pairs);
  };

  type ExtraCounts = { total: number; used: number; defective: number };

  const ACTIVE_EXTRA_STATUSES: Array<DefectiveProduct['status']> = [
    'identified',
    'inspected',
    'available_for_sale',
  ];

  // Make USED_ITEM detection resilient to casing/extra text
  const isUsedItem = (desc?: string) => (desc || '').toUpperCase().includes('USED_ITEM');

  const fetchAllActiveExtraItems = async (): Promise<DefectiveProduct[]> => {
    const per_page = 200;
    const all: DefectiveProduct[] = [];

    for (const status of ACTIVE_EXTRA_STATUSES) {
      let page = 1;
      while (true) {
        const res = await defectiveProductService.getAll({ status, per_page, page });

        // Expected response: { success: true, data: paginator }
        // Axios response shape => res.data = { success, data: paginator }
        const paginator = (res as any)?.data?.data;
        const rows: DefectiveProduct[] = paginator?.data || [];

        all.push(...rows);

        const current = paginator?.current_page ?? page;
        const last = paginator?.last_page ?? page;
        if (current >= last || rows.length === 0) break;
        page += 1;
      }
    }

    return all;
  };

  const buildExtraMapByProduct = (items: DefectiveProduct[]) => {
    const map = new Map<number, ExtraCounts>();

    for (const d of items) {
      const pid = d.product_id;
      if (!pid) continue;

      const entry = map.get(pid) || { total: 0, used: 0, defective: 0 };
      entry.total += 1;

      if (isUsedItem(d.defect_description)) entry.used += 1;
      else entry.defective += 1;

      map.set(pid, entry);
    }

    return map;
  };

  const groupInventoryBySKU = (
    inventoryItems: GlobalInventoryItem[],
    products: any[],
    cats: Category[],
    primaryImageMap: Map<number, string>,
    extraMap: Map<number, ExtraCounts>
  ): GroupedProduct[] => {
    const skuGroups: { [sku: string]: GroupedProduct } = {};

    inventoryItems.forEach((item) => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      const sku = product.sku || item.sku || 'NO-SKU';

      const colorField = product.custom_fields?.find((f: any) =>
        f.field_title?.toLowerCase() === 'color' || f.field_title?.toLowerCase() === 'colour'
      );
      const sizeField = product.custom_fields?.find((f: any) =>
        f.field_title?.toLowerCase() === 'size'
      );
      const imageField = product.custom_fields?.find((f: any) =>
        f.field_title?.toLowerCase() === 'image'
      );

      const color = colorField?.value || 'Default';
      const size = sizeField?.value || 'One Size';

      // Priority:
      // 1) custom field image (if it exists)
      // 2) productImageService primary image
      // 3) product.images[0].image_path (normalized)
      // 4) placeholder
      const cfImage = imageField?.value ? normalizeImageUrl(imageField.value) : '';
      const apiPrimary = primaryImageMap.get(item.product_id) || '';
      const productImagesFallback = product.images?.[0]?.image_path
        ? normalizeImageUrl(product.images?.[0]?.image_path)
        : '';

      const image = cfImage || apiPrimary || productImagesFallback || '/placeholder-image.jpg';

      if (!skuGroups[sku]) {
        const categoryName = getCategoryName(product.category_id, cats);

        skuGroups[sku] = {
          sku,
          productName: product.name,
          category: categoryName,
          totalStock: 0,
          variations: [],
          expanded: false,
          extraTotal: 0,
          extraDefective: 0,
          extraUsed: 0,
          productIds: []
        };
      }

      if (!skuGroups[sku].productIds.includes(item.product_id)) {
        skuGroups[sku].productIds.push(item.product_id);
      }

      // group by color (your original behavior)
      let variation = skuGroups[sku].variations.find(v => v.color === color);

      if (!variation) {
        variation = {
          color,
          size,
          image,
          quantity: 0,
          stores: []
        };
        skuGroups[sku].variations.push(variation);
      } else {
        // if same color but different size, append size
        if (size !== 'One Size' && !variation.size?.includes(size)) {
          variation.size = variation.size === 'One Size'
            ? size
            : `${variation.size}, ${size}`;
        }
        // keep a valid image if it was missing earlier
        if (!variation.image || variation.image === '/placeholder-image.jpg') {
          variation.image = image;
        }
      }

      variation.quantity += item.total_quantity;

      item.stores.forEach(store => {
        const existingStore = variation!.stores.find(s => s.store_id === store.store_id);
        if (existingStore) existingStore.quantity += store.quantity;
        else variation!.stores.push({ ...store });
      });

      skuGroups[sku].totalStock += item.total_quantity;
    });

    // Merge extra (defective/used) counts into SKU groups
    Object.values(skuGroups).forEach((g) => {
      let total = 0;
      let used = 0;
      let defective = 0;

      for (const pid of g.productIds) {
        const ex = extraMap.get(pid);
        if (!ex) continue;
        total += ex.total;
        used += ex.used;
        defective += ex.defective;
      }

      g.extraTotal = total;
      g.extraUsed = used;
      g.extraDefective = defective;
    });

    // Include products that have NO normal stock but exist in Extra panel
    for (const [pid, ex] of extraMap.entries()) {
      const alreadyIncluded = Object.values(skuGroups).some((g) => g.productIds.includes(pid));
      if (alreadyIncluded) continue;

      const product = products.find((p) => p.id === pid);
      if (!product) continue;

      const sku = product.sku || 'NO-SKU';
      const categoryName = getCategoryName(product.category_id, cats);

      const colorField = product.custom_fields?.find((f: any) =>
        f.field_title?.toLowerCase() === 'color' || f.field_title?.toLowerCase() === 'colour'
      );
      const sizeField = product.custom_fields?.find((f: any) => f.field_title?.toLowerCase() === 'size');
      const imageField = product.custom_fields?.find((f: any) => f.field_title?.toLowerCase() === 'image');

      const color = colorField?.value || 'Default';
      const size = sizeField?.value || 'One Size';

      const cfImage = imageField?.value ? normalizeImageUrl(imageField.value) : '';
      const apiPrimary = primaryImageMap.get(pid) || '';
      const productImagesFallback = product.images?.[0]?.image_path
        ? normalizeImageUrl(product.images?.[0]?.image_path)
        : '';
      const image = cfImage || apiPrimary || productImagesFallback || '/placeholder-image.jpg';

      if (!skuGroups[sku]) {
        skuGroups[sku] = {
          sku,
          productName: product.name,
          category: categoryName,
          totalStock: 0,
          variations: [],
          expanded: false,
          extraTotal: 0,
          extraDefective: 0,
          extraUsed: 0,
          productIds: [],
        };
      }

      if (!skuGroups[sku].productIds.includes(pid)) {
        skuGroups[sku].productIds.push(pid);
      }

      skuGroups[sku].extraTotal += ex.total;
      skuGroups[sku].extraUsed += ex.used;
      skuGroups[sku].extraDefective += ex.defective;

      skuGroups[sku].variations.push({
        color,
        size,
        image,
        quantity: 0,
        stores: [],
      });
    }

    return Object.values(skuGroups);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const categoriesResponse = await categoryService.getCategories();
      const categoriesData = categoriesResponse.data.data || categoriesResponse.data || [];
      setCategories(categoriesData);

      const inventoryResponse = await inventoryService.getGlobalInventory();
      const inventoryData = inventoryResponse.data || [];

      const productsResponse = await productService.getAll({ per_page: 1000 });
      const productsData = productsResponse.data || [];

      // Fetch active Extra-panel items (defective/used) and build counts map
      const extraItems = await fetchAllActiveExtraItems();
      const extraMap = buildExtraMapByProduct(extraItems);

      // Build images map from productImageService (like GalleryPage)
      const invProductIds = inventoryData.map((x: any) => x.product_id).filter(Boolean);
      const extraProductIds = Array.from(extraMap.keys());
      const productIds = [...invProductIds, ...extraProductIds];
      const primaryImageMap = await fetchPrimaryImagesMap(productIds);

      const grouped = groupInventoryBySKU(inventoryData, productsData, categoriesData, primaryImageMap, extraMap);
      setGroupedProducts(grouped);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (sku: string) => {
    setGroupedProducts(prev =>
      prev.map(item =>
        item.sku === sku ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  const filteredProducts = groupedProducts.filter(item =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4"></div>
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

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by product name, SKU or category"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No inventory items found
                  </p>
                </div>
              ) : (
                filteredProducts.map((item) => (
                  <div
                    key={item.sku}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={normalizeImageUrl(item.variations[0]?.image)}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallbackApplied) return;
                              img.dataset.fallbackApplied = '1';
                              img.src = '/placeholder-image.jpg';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {item.productName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">SKU:</span>
                              <span className="font-mono">{item.sku}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Category:</span>
                              <span>{item.category}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Variations:</span>
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

                            {(item.extraDefective > 0 || item.extraUsed > 0) && (
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
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => toggleExpand(item.sku)}
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
                            Variations & Stock Distribution
                          </h4>
                          <div className="space-y-4">
                            {item.variations.map((variation, idx) => (
                              <div
                                key={idx}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                              >
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                    <img
                                      src={normalizeImageUrl(variation.image)}
                                      alt={`${variation.color || 'Variation'}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        if (img.dataset.fallbackApplied) return;
                                        img.dataset.fallbackApplied = '1';
                                        img.src = '/placeholder-image.jpg';
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                      {variation.color && variation.color !== 'Default' && (
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                                          Color: {variation.color}
                                        </span>
                                      )}
                                      {variation.size && variation.size !== 'One Size' && (
                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded-full">
                                          Size: {variation.size}
                                        </span>
                                      )}
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
                                        {variation.stores.map((store, storeIdx) => (
                                          <tr
                                            key={storeIdx}
                                            className="border-b border-gray-200 dark:border-gray-700 last:border-0"
                                          >
                                            <td className="py-2 px-3 text-sm text-gray-900 dark:text-white font-medium">
                                              {store.store_name}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                                                {store.quantity}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                              {store.batches_count}
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
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
