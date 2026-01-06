'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import catalogService from '@/services/catalogService';
import cartService from '@/services/cartService';
import { getBaseProductName } from '@/lib/productNameUtils';

function ProductCard({ product }: { product: any }) {
  const primary = product.images?.find((i: any) => i.is_primary) || product.images?.[0];
  const imageUrl = primary?.url || primary?.image_url;

  const add = async () => {
    try {
      await cartService.addToCart({ product_id: product.id, quantity: 1 });
      window.dispatchEvent(new Event('cart-updated'));
      alert('Added to cart!');
    } catch (err) {
      console.error('Add to cart failed:', err);
      alert('Failed to add to cart');
    }
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden hover:shadow-sm transition">
      <Link href={`/e-commerce/product/${product.id}`} className="block">
        <div className="aspect-square bg-gray-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={getBaseProductName(product.name)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ShoppingBag />
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="font-semibold text-gray-900 line-clamp-2">{getBaseProductName(product.name)}</p>
          <p className="text-red-700 font-bold mt-2">৳{Number(product.selling_price ?? product.price ?? 0).toFixed(0)}</p>
        </div>
      </Link>
      <div className="p-4 pt-0">
        <button onClick={add} className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 rounded-lg">
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data: any = await catalogService.getProducts({ page, per_page: 24 });
        setProducts(data.products || []);
        setPagination(data.pagination || null);
      } catch (err: any) {
        console.error('Failed to fetch products:', err);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const canPrev = page > 1;
  const canNext = pagination?.has_next_page ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
            <p className="text-gray-600 mt-1">Browse our full catalog</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-red-700 mx-auto mb-3" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                <ChevronLeft size={18} /> Prev
              </button>
              <div className="text-sm text-gray-600">Page {page}</div>
              <button
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}