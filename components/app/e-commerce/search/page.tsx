'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';

import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import catalogService from '@/services/catalogService';
import cartService from '@/services/cartService';

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
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ShoppingBag />
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="font-semibold text-gray-900 line-clamp-2">{product.name}</p>
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

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const qParam = params.get('q') || '';

  const [query, setQuery] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const q = useMemo(() => qParam.trim(), [qParam]);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data: any = await catalogService.searchProducts({ q, page: 1, per_page: 24 });
        setResults(data.products || []);
      } catch (err: any) {
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/e-commerce/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Search</h1>
              <p className="text-gray-600 mt-1">Find products quickly by name</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Search className="text-red-700" />
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <button className="bg-red-700 hover:bg-red-800 text-white font-semibold px-6 py-3 rounded-lg">Search</button>
          </form>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-red-700 mx-auto mb-3" />
            <p className="text-gray-600">Searching...</p>
          </div>
        ) : q ? (
          <div className="mt-6">
            <p className="text-gray-700 mb-4">
              Results for <span className="font-semibold">“{q}”</span>: {results.length}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {results.length === 0 && <p className="text-gray-600 mt-6">No products found.</p>}
          </div>
        ) : (
          <div className="mt-6 text-gray-600">Type a search keyword to see results.</div>
        )}
      </div>

      <Footer />
    </div>
  );
}
