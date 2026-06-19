'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import ProductCard from '@/components/ProductCard';
import { productService, Product } from '@/services/productService';
import categoryService, { Category } from '@/services/categoryService';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4=';

export default function ArchivedProductsPage() {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'price_asc' | 'price_desc'>('default');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const SERVER_PAGE_SIZE = 60;

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  const runSearchNow = () => {
    setDebouncedSearchQuery(searchQuery.trim());
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    categoryService.getAll({ per_page: 500 })
      .then((categoriesRes: any) => {
        const cats = Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.data;
        setCategories(cats || []);
      })
      .catch((e) => {
        console.error(e);
        setCategories([]);
      });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let apiSortBy: string | undefined;
      let apiSortDir: 'asc' | 'desc' | undefined;

      if (sortBy === 'newest') {
        apiSortBy = 'created_at';
        apiSortDir = 'desc';
      } else if (sortBy === 'oldest') {
        apiSortBy = 'created_at';
        apiSortDir = 'asc';
      } else if (sortBy === 'price_asc') {
        apiSortBy = 'price';
        apiSortDir = 'asc';
      } else if (sortBy === 'price_desc') {
        apiSortBy = 'price';
        apiSortDir = 'desc';
      }

      const productsRes = await productService.getAll({
        is_archived: true,
        group_by_sku: true,
        page: currentPage,
        per_page: SERVER_PAGE_SIZE,
        search: debouncedSearchQuery || undefined,
        sort_by: apiSortBy,
        sort_direction: apiSortDir,
      });

      setProducts(productsRes.data || []);
      setTotalProducts(Number(productsRes.total || 0));
      setLastPage(Math.max(1, Number(productsRes.last_page || 1)));
    } catch (e) {
      console.error(e);
      showToast('Failed to load archived products', 'error');
      setProducts([]);
      setTotalProducts(0);
      setLastPage(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>();
    const walk = (nodes: Category[]) => {
      nodes.forEach((c: any) => {
        map.set(c.id, c);
        walk(c.children || c.all_children || []);
      });
    };
    walk(categories);
    return map;
  }, [categories]);

  const getCategoryPath = (categoryId: number | null | undefined) => {
    if (!categoryId) return 'Uncategorized';
    const parts: string[] = [];
    let current = categoryMap.get(categoryId) as any;
    while (current) {
      parts.unshift(current.title);
      const parentId = current.parent_id as number | null | undefined;
      if (!parentId) break;
      current = categoryMap.get(parentId);
    }
    return parts.join(' → ') || 'Uncategorized';
  };

  const getProductImage = (product: Product) => {
    const imgs = product.display_images?.length ? product.display_images : (product.images || []);
    const active = imgs.filter((i) => i.is_active !== false);
    const list = active.length ? active : imgs;
    const primary = list.find((i) => i.is_primary) || list[0];
    if (!primary?.image_path) return ERROR_IMG_SRC;
    if (primary.image_path.startsWith('http')) return primary.image_path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseUrl}/storage/${primary.image_path}`;
  };

  const handleRestore = async (id: number) => {
    if (!confirm('Restore this product? It will appear again in the product list.')) return;
    try {
      await productService.restore(id);
      showToast('Product restored successfully', 'success');
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Failed to restore product', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product permanently? This action cannot be undone.')) return;
    try {
      await productService.delete(id);
      showToast('Product deleted successfully', 'success');
      await loadData();
    } catch (e) {
      console.error(e);
      showToast('Failed to delete product', 'error');
    }
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < lastPage;

  return (
    <div className={`${darkMode ? 'dark' : ''} flex h-screen`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/product/list')}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Product List
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archived Products</h1>
              </div>

              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runSearchNow();
                }}
                className="flex flex-col md:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search archived products by name, SKU, category, vendor, color, or size..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
                {searchQuery || debouncedSearchQuery ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Clear
                  </button>
                ) : null}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as typeof sortBy);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                >
                  <option value="default">Default order</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </form>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Showing {products.length} of {totalProducts} archived product group{totalProducts === 1 ? '' : 's'} using the same `/products` search pipeline as Product List.
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
                <p className="text-gray-600 dark:text-gray-300">No archived products found.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      image={getProductImage(product)}
                      categoryPath={getCategoryPath(product.category_id)}
                      onDelete={handleDelete}
                      onEdit={(p) => {
                        sessionStorage.setItem('editProduct', JSON.stringify(p));
                        router.push(`/product/add?id=${p.id}`);
                      }}
                      onView={(p) => router.push(`/product/${p.id}`)}
                      onRestore={handleRestore}
                    />
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <button
                    onClick={() => canGoPrev && setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {lastPage}</span>
                  <button
                    onClick={() => canGoNext && setCurrentPage((p) => Math.min(lastPage, p + 1))}
                    disabled={!canGoNext}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
