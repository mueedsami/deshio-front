'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import AccessDenied from '@/components/AccessDenied';
import Toast from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { productService, Product } from '@/services/productService';
import productImageService, { ProductImage } from '@/services/productImageService';
import { toAbsoluteAssetUrl } from '@/lib/urlUtils';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ImageIcon,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 500;

function imageUrlFor(image: Partial<ProductImage> | null | undefined): string {
  if (!image) return '/placeholder-product.svg';

  const raw = image?.image_url || image?.image_path || '';
  if (!raw) return '/placeholder-product.svg';

  if (raw.startsWith('/storage/')) return toAbsoluteAssetUrl(raw);
  if (/^(https?:)?\/\//i.test(raw)) return raw;

  // Try to determine if it's a raw filename or a path
  if (raw.includes('/')) return toAbsoluteAssetUrl(`/storage/${raw}`);
  return toAbsoluteAssetUrl(`/storage/product-images/${raw}`);
}

function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images]
    .filter((img) => img?.is_active !== false)
    .sort((a, b) => {
      if (!!a.is_primary !== !!b.is_primary) return a.is_primary ? -1 : 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
}

type ProductRow = {
  product: Product;
  images: ProductImage[];
  selectedImageId: number | null;
  originalPrimaryId: number | null;
  loadingImages: boolean;
  saving: boolean;
};

export default function PrimaryImageFixPage() {
  const { hasAnyPermission, permissionsResolved } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const router = useRouter();

  const canAccess = hasAnyPermission(['products.view', 'products.edit', 'products.manage_images']);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Focus ref for search
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(1);
      setSearchTerm(searchInput.trim());
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getAll({
        page: currentPage,
        per_page: PAGE_SIZE,
        search: searchTerm || undefined,
        sort_by: 'updated_at',
        sort_direction: 'desc',
      });

      const baseRows: ProductRow[] = (response.data || []).map((product) => {
        // Prepare initial state from display_images or images returned in list
        const initialImages = (product.display_images as ProductImage[]) || (product.images as ProductImage[]) || [];
        const merged = sortImages(initialImages);
        const currentPrimary = merged.find((img) => img.is_primary) || merged[0] || null;

        return {
          product,
          images: merged,
          selectedImageId: currentPrimary?.id ?? null,
          originalPrimaryId: currentPrimary?.id ?? null,
          loadingImages: true, // We will refresh them immediately for fresh status
          saving: false,
        };
      });

      setRows(baseRows);
      setTotalProducts(response.total || 0);
      setLastPage(response.last_page || 1);

      // Fetch fresh image data for each product to ensure we have all available images
      baseRows.forEach(async (row) => {
        try {
          const fetchedImages = sortImages(await productImageService.getProductImages(row.product.id));
          const currentPrimary = fetchedImages.find((img) => img.is_primary) || null;

          setRows((prev) =>
            prev.map((item) =>
              item.product.id === row.product.id
                ? {
                  ...item,
                  images: fetchedImages,
                  selectedImageId: currentPrimary?.id ?? (fetchedImages.length > 0 ? fetchedImages[0].id : null),
                  originalPrimaryId: currentPrimary?.id ?? null,
                  loadingImages: false,
                }
                : item
            )
          );
        } catch (error) {
          console.error(`Failed to fetch images for product ${row.product.id}:`, error);
          setRows((prev) =>
            prev.map((item) =>
              item.product.id === row.product.id
                ? { ...item, loadingImages: false }
                : item
            )
          );
        }
      });
    } catch (error) {
      console.error('Failed to load products for primary image fix:', error);
      setRows([]);
      setToast({ message: 'Failed to load products list.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (!permissionsResolved || !canAccess) return;
    loadProducts();
  }, [canAccess, permissionsResolved, loadProducts, refreshTick]);

  const dirtyCount = useMemo(
    () => rows.filter((row) => row.selectedImageId && row.selectedImageId !== row.originalPrimaryId).length,
    [rows]
  );

  const handlePickAndSave = async (productId: number, imageId: number) => {
    const row = rows.find((r) => r.product.id === productId);
    if (!row || imageId === row.originalPrimaryId || row.saving) return;

    // Optimistically update selection and show loading state
    setRows((prev) =>
      prev.map((r) =>
        r.product.id === productId ? { ...r, selectedImageId: imageId, saving: true } : r
      )
    );

    try {
      await productImageService.makePrimary(imageId);
      // Refresh only this product row to sync status
      const fetchedImages = sortImages(await productImageService.getProductImages(productId));
      const currentPrimary = fetchedImages.find((img) => img.is_primary) || null;

      setRows((prev) =>
        prev.map((r) =>
          r.product.id === productId
            ? {
              ...r,
              images: fetchedImages,
              selectedImageId: currentPrimary?.id ?? (fetchedImages.length > 0 ? fetchedImages[0].id : null),
              originalPrimaryId: currentPrimary?.id ?? null,
              loadingImages: false,
              saving: false,
            }
            : r
        )
      );
      setToast({ message: `Primary image updated`, type: 'success' });
    } catch (error: any) {
      console.error('Failed to save primary image:', error);
      setRows((prev) => prev.map((r) => (r.product.id === productId ? { ...r, saving: false } : r)));
      setToast({ message: error?.message || 'Failed to update primary image.', type: 'error' });
    }
  };

  const refreshOne = async (productId: number) => {
    setRows((prev) => prev.map((row) => (row.product.id === productId ? { ...row, loadingImages: true } : row)));
    try {
      const fetchedImages = sortImages(await productImageService.getProductImages(productId));
      const currentPrimary = fetchedImages.find((img) => img.is_primary) || null;

      setRows((prev) =>
        prev.map((row) =>
          row.product.id === productId
            ? {
              ...row,
              images: fetchedImages,
              selectedImageId: currentPrimary?.id ?? (fetchedImages.length > 0 ? fetchedImages[0].id : null),
              originalPrimaryId: currentPrimary?.id ?? null,
              loadingImages: false,
              saving: false,
            }
            : row
        )
      );
    } catch (error) {
      console.error('Failed to refresh product images:', error);
      setRows((prev) => prev.map((row) => (row.product.id === productId ? { ...row, loadingImages: false, saving: false } : row)));
      setToast({ message: 'Could not refresh images.', type: 'error' });
    }
  };



  if (!isMounted) return null;

  if (permissionsResolved && !canAccess) {
    return <AccessDenied />;
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 overflow-hidden`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 scrollbar-hide">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

          {/* Intro Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Primary Image Fixer</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                  Quickly correct primary product images across your catalog. Use the search below to find specific products or SKUs requiring fixes.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRefreshTick(v => v + 1)}
                  disabled={loading}
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh products"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Seach by name, SKU or ID..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Primary images are used as thumbnails in catalogs and orders.</span>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-blue-600/10 dark:bg-blue-400/10"></div>
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Syncing product catalog...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-20 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-400">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No products found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search terms or filters.</p>
              </div>
              <button
                onClick={() => setSearchInput('')}
                className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Pagination */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center justify-between transition-all">
                <button
                  onClick={() => {
                    const nextP = Math.max(1, currentPage - 1);
                    setCurrentPage(nextP);
                  }}
                  disabled={currentPage === 1 || loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-30 transition-all font-mono"
                >
                  <ChevronLeft className="w-4 h-4" />
                  BACK
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Page</span>
                  <div className="px-4 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {currentPage} <span className="text-gray-400">/</span> {Math.max(lastPage, 1)}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextP = Math.min(lastPage, currentPage + 1);
                    setCurrentPage(nextP);
                  }}
                  disabled={currentPage === lastPage || loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-30 transition-all font-mono"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {rows.map((row, index) => {
                const isDirty = !!row.selectedImageId && row.selectedImageId !== row.originalPrimaryId;

                return (
                  <div
                    key={row.product.id}
                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Item Header */}
                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 dark:text-gray-600 font-mono text-xs font-bold border border-gray-100 dark:border-gray-800">
                          #{row.product.id}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {row.product.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono">SKU: {row.product.sku || 'N/A'}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span>{row.images.length} Active Images</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {row.saving ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Auto-Saving...
                          </div>
                        ) : isDirty ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                            <Save className="w-3.5 h-3.5" />
                            Primary Image Changed
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Primary Correct
                          </div>
                        )}

                        <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
                      </div>
                    </div>

                    {/* Image Scroller/Grid */}
                    <div className="p-6 bg-gray-50/30 dark:bg-gray-900/10">
                      {row.loadingImages ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-gray-400 dark:text-gray-600">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm font-medium">Fetching fresh asset status...</span>
                        </div>
                      ) : row.images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                          <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                          <p className="text-sm text-gray-500 dark:text-gray-500">No active assets found for this product.</p>
                          <Link
                            href={`/product/add?id=${row.product.id}`}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Upload Images
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {row.images.map((image) => {
                            const isSelected = row.selectedImageId === image.id;
                            const isOriginal = row.originalPrimaryId === image.id;
                            const isJustChanged = isSelected && !isOriginal;

                            return (
                              <button
                                key={image.id}
                                onClick={() => handlePickAndSave(row.product.id, image.id)}
                                disabled={row.saving || row.loadingImages}
                                className={`relative group/img flex flex-col p-2.5 rounded-2xl border-2 text-left transition-all duration-300 disabled:opacity-70 ${isSelected
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-4 ring-blue-500/10 shadow-md'
                                    : 'border-white dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
                                  }`}
                              >
                                <div className="aspect-square rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 relative">
                                  <img
                                    src={imageUrlFor(image)}
                                    alt="Product asset"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg';
                                    }}
                                  />

                                  {isOriginal && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900/90 text-[9px] font-bold text-white shadow-xl backdrop-blur-sm">
                                      Primary
                                    </div>
                                  )}

                                  {isJustChanged && (
                                    <div className="absolute top-2 right-2 p-1 rounded-full bg-blue-600 text-white shadow-lg animate-bounce">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 px-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">ID: #{image.id}</span>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Pos: {image.sort_order}</span>
                                  </div>
                                  <div className={`text-[11px] font-bold truncate transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {isSelected ? (isOriginal ? 'Active Primary' : 'New Selection') : 'Inactive Primary'}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Pagination */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center justify-between transition-all">
                <button
                  onClick={() => {
                    const nextP = Math.max(1, currentPage - 1);
                    setCurrentPage(nextP);
                  }}
                  disabled={currentPage === 1 || loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-30 transition-all font-mono"
                >
                  <ChevronLeft className="w-4 h-4" />
                  BACK
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Page</span>
                  <div className="px-4 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {currentPage} <span className="text-gray-400">/</span> {Math.max(lastPage, 1)}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const nextP = Math.min(lastPage, currentPage + 1);
                    setCurrentPage(nextP);
                  }}
                  disabled={currentPage === lastPage || loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-30 transition-all font-mono"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="text-center py-4">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Info className="w-3 h-3" />
              SYSTEM UTILITY - USE WITH CAUTION
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
