'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import catalogService, { CatalogCategory } from '@/services/catalogService';

interface CategoryData {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  color?: string;
  icon?: string;
  productCount: number;
}

export default function OurCategories() {
  const [categories, setCategoriesData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories using the PUBLIC catalog service (no auth required)
        const categoriesData = await catalogService.getCategories();

        // Flatten all categories and subcategories
        const allCategories: CategoryData[] = [];

        const flattenCategories = (cats: CatalogCategory[]) => {
          cats.forEach(cat => {
            allCategories.push({
              id: cat.id,
              name: cat.name,
              description: cat.description,
              image_url: cat.image_url,
              color: cat.color,
              icon: cat.icon,
              productCount: cat.product_count || 0,
            });

            if (cat.children && cat.children.length > 0) {
              flattenCategories(cat.children);
            }
          });
        };

        flattenCategories(categoriesData);

        setCategoriesData(allCategories);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">No categories available</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Categories</h2>
          <p className="text-lg text-gray-600">Browse through our curated collections</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="group text-center cursor-pointer"
              onClick={() => router.push(`e-commerce/${encodeURIComponent(cat.name)}`)}
            >
              {/* Category Image */}
              <div className="relative aspect-square rounded-full overflow-hidden mb-5 border-4 border-gray-100 group-hover:border-red-700 transition-all duration-300 shadow-lg group-hover:shadow-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                {cat.image_url ? (
                  <>
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                  </>
                ) : (
                  <>
                    {/* Fallback to first letter if no image */}
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-bold text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                  </>
                )}
              </div>

              {/* Category Info */}
              <h3 className="font-bold text-gray-900 mb-1 text-lg group-hover:text-red-700 transition-colors">
                {cat.name}
              </h3>
              <p className="text-sm text-gray-500">{cat.productCount} Products</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}