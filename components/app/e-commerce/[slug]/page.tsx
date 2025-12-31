'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import catalogService, { Product, PaginationMeta, CatalogCategory } from '@/services/catalogService';
import { ShoppingCart, Heart, Eye, ArrowLeft } from 'lucide-react';
import CategorySidebar from '@/components/ecommerce/category/CategorySidebar';
import Navigation from '@/components/ecommerce/Navigation';

// Types for product grouping
interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  image: string | null;
  selling_price: string;
  in_stock: boolean;
  stock_quantity: number;
}

interface ProductGroup {
  sku: string;
  baseName: string;
  totalVariants: number;
  variants: ProductVariant[];
  primaryImage: string | null;
  category?: {
    id: number;
    name: string;
  };
  hasVariations: boolean;
  lowestPrice: number;
  highestPrice: number;
}

export default function CategoryProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract category from pathname (e.g., /category/electronics -> electronics)
  const categorySlug = pathname?.split('/').pop() || '';
  const categoryName = decodeURIComponent(categorySlug);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when category or filters change
  useEffect(() => {
    if (categoryName) {
      fetchProducts();
    }
  }, [categoryName, sortBy, sortOrder, currentPage]);

  const fetchCategories = async () => {
    try {
      const categoriesData = await catalogService.getCategories();
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await catalogService.getProducts({
        category: categoryName,
        sort_by: sortBy as any,
        sort_order: sortOrder,
        page: currentPage,
        per_page: 100, // Fetch more to properly group
      });

      setProducts(response.products);
      setPagination(response.pagination);
      
    } catch (err: any) {
      console.error('❌ Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getBaseName = (product: Product): string => {
    // Extract base name by removing color/size suffix
    // Pattern: "Product Name - Color" or "Product Name - Color - Size"
    let name = product.name || '';
    
    // Try to remove common color/size patterns from the end of the name
    const match = name.match(/^(.+?)\s*-\s*([A-Za-z\s]+)$/);
    
    if (match) {
      // Return the base name without color/size suffix
      return match[1].trim();
    }
    
    return name.trim();
  };

  const extractColorFromName = (name: string): string | undefined => {
    // Extract color from pattern "Name - Color"
    const match = name.match(/\s*-\s*([A-Za-z\s]+)$/);
    return match ? match[1].trim() : undefined;
  };

  // Group products with variation logic
  const productGroups = useMemo((): ProductGroup[] => {
    const groups = new Map<string, ProductGroup>();

    products.forEach((product) => {
      const sku = product.sku || `product-${product.id}`;
      const baseName = getBaseName(product);
      const extractedColor = extractColorFromName(product.name);
      
      // Find primary image or use first image
      const images = product.images || [];
      const primaryImage = images.find(img => img.is_primary) || images[0];
      const imageUrl = primaryImage?.url || null;

      // Group by SKU only - products with same SKU are variations
      const groupKey = sku;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          sku: sku,
          baseName,
          totalVariants: 0,
          variants: [],
          primaryImage: imageUrl,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name
          } : undefined,
          hasVariations: false,
          lowestPrice: Number(product.selling_price) || 0,
          highestPrice: Number(product.selling_price) || 0,
        });
      }

      const group = groups.get(groupKey)!;
      
      // Get variant-specific image
      const variantPrimaryImage = images.find(img => img.is_primary) || images[0];
      const variantImageUrl = variantPrimaryImage?.url || null;

      const price = Number(product.selling_price) || 0;
      group.lowestPrice = Math.min(group.lowestPrice, price);
      group.highestPrice = Math.max(group.highestPrice, price);

      group.variants.push({
        id: product.id,
        name: product.name,
        sku: product.sku || `product-${product.id}`,
        color: extractedColor,
        size: undefined,
        image: variantImageUrl,
        selling_price: String(product.selling_price || 0),
        in_stock: product.in_stock || false,
        stock_quantity: product.stock_quantity || 0,
      });
    });

    // Calculate variants and mark groups with variations
    groups.forEach(group => {
      const uniqueColors = new Set(group.variants.map(v => v.color).filter(Boolean));
      
      // If we have colors, count unique colors
      if (uniqueColors.size > 0) {
        group.totalVariants = uniqueColors.size;
        group.hasVariations = uniqueColors.size > 1;
      }
      // Otherwise just count total variants
      else {
        group.totalVariants = group.variants.length;
        group.hasVariations = group.variants.length > 1;
      }
    });

    return Array.from(groups.values());
  }, [products]);

  const handleToggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [newSortBy, newSortOrder] = value.split('-');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder as 'asc' | 'desc');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductClick = (productId: number) => {
    router.push(`/e-commerce/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 text-red-800 hover:text-red-1000"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (    
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {categoryName}
              </h1>
              <p className="mt-2 text-gray-600">
                {productGroups.length} product {productGroups.length === 1 ? 'group' : 'groups'} found
                {products.length !== productGroups.length && ` (${products.length} total variants)`}
              </p>
            </div>

            {/* Sort Dropdown */}
            <div className="mt-4 md:mt-0">
              <label htmlFor="sort" className="mr-2 text-sm text-gray-600">
                Sort by:
              </label>
              <select
                id="sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={handleSortChange}
                className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-800"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-8">
          {/* Sidebar */}
          <CategorySidebar
            categories={categories}
            expandedCategories={expandedCategories}
            onToggleCategory={handleToggleCategory}
            activeCategoryName={categoryName}
          />

          {/* Products Grid */}
          <div className="flex-1">
            {productGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-2">No products found in this category</p>
                <p className="text-sm text-gray-500 mb-4">
                  Category searched: "{categoryName}"
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 text-red-800 hover:text-red-900 font-medium"
                >
                  Browse All Categories
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {productGroups.map((group) => {
                    // Get the first variant for display
                    const firstVariant = group.variants[0];
                    
                    return (
                      <div
                        key={`${group.sku}-${firstVariant.id}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                        onClick={() => {
                          // Find first variant that's in stock, or fall back to first variant
                          const availableVariant = group.variants.find(v => v.in_stock) || firstVariant;
                          handleProductClick(availableVariant.id);
                        }}
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <img
                            src={group.primaryImage || '/placeholder-product.jpg'}
                            alt={group.baseName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />

                          {/* Variation Badge */}
                          {group.hasVariations && (
                            <div className="absolute top-2 left-2 bg-red-800 text-white px-2 py-1 rounded-md text-xs font-semibold">
                              {group.totalVariants} Colors
                            </div>
                          )}
                          {/* Color Swatches for variations */}
                          {group.hasVariations && group.variants.length > 1 && (
                            <div className="absolute bottom-2 left-2 flex gap-1">
                              {group.variants.slice(0, 5).map((variant, idx) => (
                                <div
                                  key={idx}
                                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm overflow-hidden"
                                  title={variant.color}
                                >
                                  {variant.image ? (
                                    <img 
                                      src={variant.image} 
                                      alt={variant.color || ''} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-300"></div>
                                  )}
                                </div>
                              ))}
                              {group.variants.length > 5 && (
                                <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                  +{group.variants.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Product Title */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[1rem]">
                      {group.baseName}
                    </h3>
                    
                    {/* Category */}
                    {group.category && (
                      <p className="text-xs text-gray-500 mb-2">
                        {group.category.name}
                      </p>
                    )}
                    
                    {/* Price */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-3">
                        {group.hasVariations && group.lowestPrice !== group.highestPrice ? (
                          <span className="text-lg font-bold text-gray-900">
                            ৳{group.lowestPrice.toFixed(2)} - ৳{group.highestPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            ৳{Number(firstVariant.selling_price).toFixed(2)}
                          </span>
                        )}

                        {group.hasVariations && (
                          <span className="text-xs font-medium text-blue-600">
                            {group.totalVariants} variations available
                          </span>
                        )}
                      </div>

                      {!group.hasVariations && (
                        <span className={`text-xs font-medium ${
                          group.variants.some(v => v.in_stock) ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {group.variants.some(v => v.in_stock) 
                            ? `In Stock (${group.variants.reduce((sum, v) => sum + v.stock_quantity, 0)})` 
                            : 'Out of Stock'}
                        </span>
                      )}
                    </div>
                    {/* View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find first variant that's in stock, or fall back to first variant
                        const availableVariant = group.variants.find(v => v.in_stock) || firstVariant;
                        handleProductClick(availableVariant.id);
                      }}
                      disabled={group.variants.every(v => !v.in_stock)}
                      className={`w-full text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${
                        group.variants.every(v => !v.in_stock)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-800 hover:bg-red-900'
                      }`}
                    >
                      {group.variants.every(v => !v.in_stock) ? 'Out of Stock' : 'Go To Product Details'}
                    </button>
                  </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
                        let page;
                        if (pagination.last_page <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= pagination.last_page - 2) {
                          page = pagination.last_page - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-4 py-2 border rounded-md text-sm font-medium ${
                              currentPage === page
                                ? 'bg-red-800 text-white border-red-1000'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.last_page}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}