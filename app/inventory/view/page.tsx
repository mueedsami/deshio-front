'use client';

import { useState, useEffect } from 'react';
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import inventoryService, { GlobalInventoryItem, StoreBreakdown } from '@/services/inventoryService';
import productService from '@/services/productService';
import categoryService from '@/services/groupInventory';

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

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const categoriesResponse = await categoryService.getCategories();
      const categoriesData = categoriesResponse.data.data || categoriesResponse.data || [];
      setCategories(categoriesData);

      // Fetch global inventory
      const inventoryResponse = await inventoryService.getGlobalInventory();
      const inventoryData = inventoryResponse.data || [];

      // Fetch all products to get custom fields
      const productsResponse = await productService.getAll({ per_page: 1000 });
      const productsData = productsResponse.data || [];

      // Group inventory by SKU and variations
      const grouped = groupInventoryBySKU(inventoryData, productsData, categoriesData);
      setGroupedProducts(grouped);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: number, categories: Category[]): string => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'Uncategorized';

    if (category.parent_id) {
      const parent = categories.find(c => c.id === category.parent_id);
      return parent ? `${parent.title} / ${category.title}` : category.title;
    }

    return category.title;
  };

  const groupInventoryBySKU = (
    inventoryItems: GlobalInventoryItem[],
    products: any[],
    categories: Category[]
  ): GroupedProduct[] => {
    const skuGroups: { [sku: string]: GroupedProduct } = {};

    inventoryItems.forEach((item) => {
      // Find product details
      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      const sku = product.sku || item.sku || 'NO-SKU';

      // Get color and size from custom fields
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
      const image = imageField?.value || product.images?.[0]?.image_path || '/placeholder-product.png';

      // Initialize SKU group if not exists
      if (!skuGroups[sku]) {
        const categoryName = getCategoryName(product.category_id, categories);

        skuGroups[sku] = {
          sku,
          productName: product.name,
          category: categoryName,
          totalStock: 0,
          variations: [],
          expanded: false
        };
      }

      // Find or create variation (grouped by color)
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
        // If same color but different size, append size
        if (size !== 'One Size' && !variation.size?.includes(size)) {
          variation.size = variation.size === 'One Size' 
            ? size 
            : `${variation.size}, ${size}`;
        }
      }

      // Add quantity and stores
      variation.quantity += item.total_quantity;
      item.stores.forEach(store => {
        const existingStore = variation!.stores.find(s => s.store_id === store.store_id);
        if (existingStore) {
          existingStore.quantity += store.quantity;
        } else {
          variation!.stores.push({ ...store });
        }
      });

      // Update total stock
      skuGroups[sku].totalStock += item.total_quantity;
    });

    return Object.values(skuGroups);
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
            {/* Header Section */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Inventory Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all products and their stock levels across outlets
              </p>
            </div>

            {/* Search Bar */}
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

            {/* Inventory List */}
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
                    {/* Product Header */}
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Product Image - Show first variation's image */}
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={item.variations[0]?.image || '/placeholder-product.png'}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.png';
                            }}
                          />
                        </div>

                        {/* Product Info */}
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

                        {/* Stock Summary */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Stock</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {item.totalStock}
                            </p>
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

                    {/* Expanded Variations Details */}
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
                                {/* Variation Header */}
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                    <img
                                      src={variation.image || '/placeholder-product.png'}
                                      alt={`${variation.color}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-product.png';
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
                                      Total: <span className="font-semibold text-gray-900 dark:text-white">{variation.quantity}</span> units
                                    </p>
                                  </div>
                                </div>

                                {/* Store Distribution */}
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