'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import enhancedCatalogService from '@/services/enhancedCatalogService';
import type { GroupedProduct } from '@/lib/productGrouping';
import { getAvailableColors, getAvailableSizes, sortSizes } from '@/lib/productGrouping';

/**
 * UPDATED Products Page with Product Grouping
 * 
 * This page now shows:
 * - ONE product card per base product (e.g., "Nike Air Force")
 * - Size/color options visible on hover or in the product card
 * - Proper variation handling
 */

export default function ProductsPage() {
  const [products, setProducts] = useState<GroupedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await enhancedCatalogService.getGroupedProducts({
        per_page: 20,
        page: 1
      });
      setProducts(response.products);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-10">Loading products...</div>;
  if (error) return <div className="text-center py-10 text-rose-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

/**
 * Product Card Component
 * Shows a single product with its variations
 */
function ProductCard({ product }: { product: GroupedProduct }) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id);
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  
  const colors = getAvailableColors(product.variants);
  const sizes = sortSizes(getAvailableSizes(product.variants));
  
  // Get image from selected variant or fallback to product images
  const imageUrl = selectedVariant?.images?.[0]?.url || product.images[0]?.url || '/placeholder.png';
  
  // Price display
  const priceDisplay = product.min_price === product.max_price
    ? `৳${product.min_price.toFixed(2)}`
    : `৳${product.min_price.toFixed(2)} - ৳${product.max_price.toFixed(2)}`;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden group">
      {/* Product Image */}
      <Link href={`/e-commerce/product/${selectedVariant.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {!product.in_stock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Details */}
      <div className="p-4">
        <Link href={`/e-commerce/product/${selectedVariant.id}`}>
          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-lg font-bold text-gray-900 mt-2">
          {priceDisplay}
        </p>

        {/* Color Options */}
        {colors.length > 1 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">Colors: {colors.length}</p>
            <div className="flex gap-2 flex-wrap">
              {colors.slice(0, 5).map(color => {
                const variant = product.variants.find(v => v.color === color);
                if (!variant) return null;
                
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      selectedVariant?.color === color 
                        ? 'border-blue-600 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ 
                      backgroundColor: getColorHex(color || '')
                    }}
                    title={color}
                  />
                );
              })}
              {colors.length > 5 && (
                <span className="text-xs text-gray-500 self-center">+{colors.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* Size Options */}
        {sizes.length > 1 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">Available Sizes:</p>
            <div className="flex gap-1 flex-wrap">
              {sizes.slice(0, 6).map(size => {
                const variant = product.variants.find(v => v.size === size);
                if (!variant) return null;
                
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={!variant.in_stock}
                    className={`px-2 py-1 text-xs border rounded transition-all ${
                      selectedVariant?.size === size
                        ? 'bg-blue-600 text-white border-blue-600'
                        : variant.in_stock
                        ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
              {sizes.length > 6 && (
                <span className="text-xs text-gray-500 self-center">+{sizes.length - 6}</span>
              )}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <Link href={`/e-commerce/product/${selectedVariant.id}`}>
          <button 
            className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              selectedVariant?.in_stock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!selectedVariant?.in_stock}
          >
            {selectedVariant?.in_stock ? 'View Details' : 'Out of Stock'}
          </button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Helper function to get color hex codes
 * You can expand this mapping based on your color names
 */
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#DC2626',
    'blue': '#2563EB',
    'green': '#16A34A',
    'yellow': '#EAB308',
    'purple': '#9333EA',
    'pink': '#EC4899',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'brown': '#92400E',
    'orange': '#EA580C',
    'navy': '#1E3A8A',
  };
  
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#E5E7EB'; // Default gray
}
