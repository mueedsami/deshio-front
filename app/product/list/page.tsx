'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight, Filter, Grid, List, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ProductListItem from '@/components/ProductListItem';
import { productService, Product } from '@/services/productService';
import categoryService, { Category } from '@/services/categoryService';
import Toast from '@/components/Toast';

import {
  ProductVariant,
  ProductGroup,
} from '@/types/product';

export default function ProductPage() {
  const router = useRouter();
  
  // Read URL parameters
  const [selectMode, setSelectMode] = useState(false);
  const [redirectPath, setRedirectPath] = useState('');
  
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  // Read URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSelectMode(params.get('selectMode') === 'true');
      setRedirectPath(params.get('redirect') || '');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        productService.getAll({ per_page: 1000 }),
        categoryService.getTree(),
      ]);

      setProducts(Array.isArray(productsData.data) ? productsData.data : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setToast({ message: 'Failed to load products', type: 'error' });
      setProducts([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData();
    setToast({ message: 'Products refreshed successfully', type: 'success' });
  };

  const getCategoryPath = (categoryId: number): string => {
    const findPath = (cats: Category[], id: number, path: string[] = []): string[] | null => {
      for (const cat of cats) {
        const newPath = [...path, cat.title];
        if (String(cat.id) === String(id)) {
          return newPath;
        }
        const childCategories = cat.children || cat.all_children || [];
        if (childCategories.length > 0) {
          const found = findPath(childCategories, id, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(categories, categoryId);
    return path ? path.join(' > ') : 'Uncategorized';
  };

  const getColorAndSize = (product: Product): { color?: string; size?: string } => {
    const colorField = product.custom_fields?.find(cf => 
      cf.field_title?.toLowerCase() === 'color'
    );
    const sizeField = product.custom_fields?.find(cf => 
      cf.field_title?.toLowerCase() === 'size'
    );
    return {
      color: colorField?.value,
      size: sizeField?.value,
    };
  };

  const getBaseName = (product: Product): string => {
    const { color, size } = getColorAndSize(product);
    let name = product.name;
    
    if (color && size) {
      const pattern = new RegExp(`\\s*-\\s*${color}\\s*-\\s*${size}$`, 'i');
      name = name.replace(pattern, '');
    } else if (color) {
      const pattern = new RegExp(`\\s*-\\s*${color}$`, 'i');
      name = name.replace(pattern, '');
    } else if (size) {
      const pattern = new RegExp(`\\s*-\\s*${size}$`, 'i');
      name = name.replace(pattern, '');
    }
    
    return name.trim();
  };

  // Enhanced image URL processing
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it's a storage path, construct the full URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseUrl}/storage/${imagePath}`;
  };

  // Group products with better image handling
  const productGroups = useMemo((): ProductGroup[] => {
    const groups = new Map<string, ProductGroup>();

    products.forEach((product) => {
      const sku = product.sku;
      const { color, size } = getColorAndSize(product);
      const baseName = getBaseName(product);
      
      // Find primary image or use first active image
      const primaryImage = product.images?.find(img => img.is_primary && img.is_active) || 
                          product.images?.find(img => img.is_active) ||
                          product.images?.[0];
      
      const imageUrl = primaryImage ? getImageUrl(primaryImage.image_path) : null;

      // Determine grouping key
      const groupKey = color ? `${sku}-color` : size ? `${sku}-${size}` : sku;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          sku: sku,
          baseName,
          totalVariants: 0,
          variants: [],
          primaryImage: imageUrl,
          categoryPath: getCategoryPath(product.category_id),
          category_id: product.category_id,
          hasVariations: false,
        });
      }

      const group = groups.get(groupKey)!;
      
      // Get variant-specific image
      const variantPrimaryImage = product.images?.find(img => img.is_primary && img.is_active) ||
                                  product.images?.find(img => img.is_active) ||
                                  product.images?.[0];
      const variantImageUrl = variantPrimaryImage ? getImageUrl(variantPrimaryImage.image_path) : null;

      group.variants.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        color,
        size,
        image: variantImageUrl,
      });
    });

    // Calculate variants and mark groups with variations
    groups.forEach(group => {
      const hasColors = group.variants.some(v => v.color);
      if (hasColors) {
        const uniqueColors = new Set(group.variants.map(v => v.color).filter(Boolean));
        group.totalVariants = uniqueColors.size;
        group.hasVariations = uniqueColors.size > 1;
      } else {
        group.totalVariants = group.variants.length;
        group.hasVariations = false;
      }
    });

    return Array.from(groups.values());
  }, [products, categories]);

  // Enhanced filtering with category support
  const filteredGroups = useMemo(() => {
    let filtered = productGroups;

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(group => 
        String(group.category_id) === selectedCategory
      );
    }

    // Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter((group) => {
        const nameMatch = group.baseName.toLowerCase().includes(q);
        const skuMatch = group.sku.toLowerCase().includes(q);
        const categoryMatch = group.categoryPath.toLowerCase().includes(q);
        const colorMatch = group.variants.some(v => v.color?.toLowerCase().includes(q));
        const sizeMatch = group.variants.some(v => v.size?.toLowerCase().includes(q));
        
        return nameMatch || skuMatch || categoryMatch || colorMatch || sizeMatch;
      });
    }

    return filtered;
  }, [productGroups, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: number) => {
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: 'Product deleted successfully', type: 'success' });
      
      // Refresh data to update counts
      await fetchData();
    } catch (err) {
      console.error('Error deleting product:', err);
      setToast({ message: 'Failed to delete product', type: 'error' });
    }
  };

  const handleEdit = (id: number) => {
    // Clear any existing session data
    sessionStorage.removeItem('editProductId');
    sessionStorage.removeItem('productMode');
    sessionStorage.removeItem('baseSku');
    sessionStorage.removeItem('baseName');
    sessionStorage.removeItem('categoryId');
    
    // Store edit data in sessionStorage
    sessionStorage.setItem('editProductId', id.toString());
    sessionStorage.setItem('productMode', 'edit');
    
    router.push('/product/add');
  };

  const handleView = (id: number) => {
    router.push(`/product/${id}`);
  };

  const handleAdd = () => {
    // Clear any stored data to ensure create mode
    sessionStorage.removeItem('editProductId');
    sessionStorage.removeItem('productMode');
    sessionStorage.removeItem('baseSku');
    sessionStorage.removeItem('baseName');
    sessionStorage.removeItem('categoryId');
    
    router.push('/product/add');
  };

  const handleAddVariation = (group: ProductGroup) => {
    // Clear any existing session data
    sessionStorage.removeItem('editProductId');
    sessionStorage.removeItem('productMode');
    sessionStorage.removeItem('baseSku');
    sessionStorage.removeItem('baseName');
    sessionStorage.removeItem('categoryId');
    
    // Store variation data in sessionStorage
    sessionStorage.setItem('productMode', 'addVariation');
    sessionStorage.setItem('baseSku', group.sku);
    sessionStorage.setItem('baseName', group.baseName);
    sessionStorage.setItem('categoryId', group.category_id.toString());
    
    router.push('/product/add');
  };

  const handleSelect = (variant: ProductVariant) => {
    if (selectMode && redirectPath) {
      const url = `${redirectPath}?productId=${variant.id}&productName=${encodeURIComponent(variant.name)}&productSku=${encodeURIComponent(variant.sku)}`;
      router.push(url);
    }
  };

  // Flatten categories for filter dropdown
  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[], depth = 0): { id: string; label: string; depth: number }[] => {
      return cats.reduce((acc: { id: string; label: string; depth: number }[], cat) => {
        const prefix = '  '.repeat(depth);
        acc.push({ id: String(cat.id), label: `${prefix}${cat.title}`, depth });
        const childCategories = cat.children || cat.all_children || [];
        if (childCategories.length > 0) {
          acc.push(...flatten(childCategories, depth + 1));
        }
        return acc;
      }, []);
    };
    return flatten(categories);
  }, [categories]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory;

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

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectMode ? 'Select a Product' : 'Products'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectMode 
                        ? 'Choose a product variant to add to your operation' 
                        : `Manage your store's product catalog`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Refresh Button */}
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="p-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                      title="Refresh products"
                    >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* View Mode Toggle */}
                    {!selectMode && (
                      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded transition-colors ${
                            viewMode === 'list'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                          title="List view"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded transition-colors ${
                            viewMode === 'grid'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                          title="Grid view"
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Add Product Button */}
                    {!selectMode && (
                      <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                        Add Product
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Product Groups</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{productGroups.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">With Variations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {productGroups.filter(g => g.hasVariations).length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Categories</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{flatCategories.length}</p>
                  </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="flex gap-3 mb-4">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, SKU, category, color, or size..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm shadow-sm"
                    />
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors shadow-sm ${
                      showFilters || hasActiveFilters
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    <span className="font-medium">Filters</span>
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-full">
                        {(searchQuery ? 1 : 0) + (selectedCategory ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                        >
                          <option value="">All Categories</option>
                          {flatCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading products...</p>
                  </div>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {hasActiveFilters ? 'No products found' : 'No products yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters or search terms' 
                      : 'Get started by adding your first product'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
                    >
                      Clear Filters
                    </button>
                  ) : !selectMode && (
                    <button
                      onClick={handleAdd}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Product
                    </button>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {paginatedGroups.map((group) => (
                    <ProductListItem
                      key={`${group.sku}-${group.variants[0].id}`}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredGroups.length)}</span> of <span className="font-medium text-gray-900 dark:text-white">{filteredGroups.length}</span> groups
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-10 w-10 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-900 dark:text-white shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}