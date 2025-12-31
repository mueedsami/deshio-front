'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Grid3X3, Loader2, AlertCircle } from 'lucide-react';

import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import catalogService, { Category } from '@/services/catalogService';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await catalogService.getCategories();
        setCategories(data.categories || []);
      } catch (err: any) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Browse products by category</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <Grid3X3 className="text-red-700" />
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
            <p className="text-gray-600">Loading categories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/e-commerce/${encodeURIComponent(cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'))}`}
                className="bg-white rounded-xl border hover:border-red-200 hover:shadow-sm transition p-4"
              >
                <div className="text-gray-900 font-semibold">{cat.name}</div>
                <div className="text-xs text-gray-500 mt-1">Explore →</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
