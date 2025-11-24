'use client';

import React, { useEffect, useState } from 'react';
import catalogService, { SimpleProduct } from '@/services/catalogService';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';

export default function FeaturedProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const data = await catalogService.getFeaturedProducts(8);
        console.log('Featured Products Response:', data);
        console.log('First Product:', data.featured_products[0]);
        console.log('First Product Images:', data.featured_products[0]?.images);
        setProducts(data.featured_products);
      } catch (err: any) {
        console.error('Error fetching featured products:', err);
        setError(err.message || 'Failed to load featured products');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const handleProductClick = (productId: number) => {
    router.push(`/products/${productId}`);
  };

  if (loading) {
    return (
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-6 w-6 text-red-800 fill-red-800" />
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Products
            </h2>
          </div>
          <p className="text-gray-600">
            Handpicked favorites loved by our customers
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            // Better image handling
            const imagesArray = Array.isArray(product.images) ? product.images : [];
            const primaryImage = imagesArray.find(img => img.is_primary) || imagesArray[0];
            const imageUrl = primaryImage?.url || '/placeholder-product.jpg';
            
            const categoryName = typeof product.category === 'string' 
              ? product.category 
              : product.category?.name;
            
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                onClick={() => handleProductClick(product.id)}
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-product.jpg';
                    }}
                  />

                  {/* Featured Badge */}
                  <div className="absolute top-2 left-2 bg-red-800 text-white px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" />
                    Featured
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add to wishlist logic
                      }}
                      className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                    >
                      <Heart className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product.id);
                      }}
                      className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4 text-gray-700" />
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>

                  {/* Category */}
                  {categoryName && (
                    <p className="text-xs text-gray-500 mb-2">
                      {categoryName}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      ৳{Number(product.selling_price).toFixed(2)}
                    </span>
                  </div>

                  {/* Stock Status and Cart Button */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${product.in_stock ? 'text-red-800' : 'text-red-600'}`}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add to cart logic
                      }}
                      disabled={!product.in_stock}
                      className={`p-2 rounded-full ${
                        product.in_stock
                          ? 'bg-red-800 text-white hover:bg-red-900'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      } transition-colors`}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}