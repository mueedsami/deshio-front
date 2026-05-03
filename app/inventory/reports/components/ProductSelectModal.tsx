'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { productService, Product } from '@/services/productService';
import categoryService, { Category } from '@/services/categoryService';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

interface ProductGroup {
  sku: string;
  baseName: string;
  primaryImage: string | null;
  categoryPath: string;
  totalVariants: number;
}

interface ProductSelectModalProps {
  onSelect: (sku: string) => void;
  onClose: () => void;
}

export default function ProductSelectModal({ onSelect, onClose }: ProductSelectModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchData = useCallback(async (page = currentPage, q = searchQuery, cat = selectedCategory) => {
    setLoading(true);
    try {
      const response = await productService.getAll({
        page,
        per_page: 20,
        search: q || undefined,
        category_id: cat ? Number(cat) : undefined,
        group_by_sku: true,
      });

      setProducts(response.data || []);
      setTotalProducts(response.total || 0);
      setServerLastPage(response.last_page || 1);
    } catch (error) {
      console.error('Failed to fetch products for modal:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    categoryService.getTree(true).then(res => {
      setCategories(Array.isArray(res) ? res : []);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, fetchData]);

  // Flatten categories for dropdown
  const flatCategories = useMemo(() => {
    const flatten = (cats: Category[], depth = 0): { id: string; label: string }[] => {
      return cats.reduce((acc: any[], cat) => {
        acc.push({ id: String(cat.id), label: `${'  '.repeat(depth)}${cat.title}` });
        const children = cat.children || cat.all_children || [];
        if (children.length > 0) {
          acc.push(...flatten(children, depth + 1));
        }
        return acc;
      }, []);
    };
    return flatten(categories);
  }, [categories]);

  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseUrl}/storage/${imagePath}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Select Product by SKU
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a base product to analyze its across-store performance.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none dark:text-white min-w-[180px]"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {flatCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-gray-500 font-medium">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">No products found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {products.map((p) => {
                const primaryImage = p.images?.find((img: any) => img.is_primary) || p.images?.[0];
                return (
                  <button
                    key={p.sku || p.id}
                    onClick={() => onSelect(p.sku)}
                    className="w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all flex items-center gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shrink-0">
                      <ImageWithFallback 
                        src={getImageUrl(primaryImage?.image_path)} 
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {p.base_name || p.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-wider">{p.sku}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500">
                          {p.variants?.length > 0 ? `${p.variants.length + 1} Variants` : 'Single Item'}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">
                          {p.category?.title}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right">
                      <div className="text-sm font-black text-gray-900 dark:text-white">
                        {p.variants?.length > 0 ? 'Group View' : 'Base SKU'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 uppercase">Click to Select</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950">
          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="text-gray-900 dark:text-white">{products.length}</span> of <span className="text-gray-900 dark:text-white">{totalProducts}</span> products
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white px-2">
              {currentPage} / {serverLastPage}
            </span>
            <button 
              disabled={currentPage === serverLastPage || loading}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
