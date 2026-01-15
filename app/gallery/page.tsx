'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Lightbox from '@/components/Lightbox';
import { Copy, Check, Image as ImageIcon, Eye } from 'lucide-react';
import inventoryService, { GlobalInventoryItem } from '@/services/inventoryService';
import productImageService from '@/services/productImageService';
import storeService from '@/services/storeService';
import batchService from '@/services/batchService';

interface ProductWithInventory {
  product_id: number;
  product_name: string;
  sku: string;
  sell_price: number | null;
  total_quantity: number;
  online_quantity: number;
  offline_quantity: number;
  warehouse_quantity: number;
  stores_count: number;
  is_available_online: boolean;
  images: string[];
  stores: Array<{
    store_id: number;
    store_name: string;
    store_code: string;
    quantity: number;
    is_warehouse: boolean;
    is_online: boolean;
  }>;
}

export default function GalleryPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxProductName, setLightboxProductName] = useState('');
  const [allLightboxImages, setAllLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [copyType, setCopyType] = useState<'image' | 'link' | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline' | 'not-online'>('all');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Helper function to get proxied image URL
  const getProxiedImageUrl = (imageUrl: string): string => {
    return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  };

const fetchInventoryData = async () => {
  try {
    setLoading(true);

    const [inventoryResponse, storesResponse] = await Promise.all([
      inventoryService.getGlobalInventory(),
      storeService.getStores({ per_page: 1000 })
    ]);

    if (!inventoryResponse.success || !inventoryResponse.data) {
      setError('Failed to load inventory data');
      return;
    }

    const inventoryItems = inventoryResponse.data;

    // Build store map for online/offline detection
    const storeMap = new Map<number, { is_online: boolean; is_warehouse: boolean }>();
    if (storesResponse.success && storesResponse.data) {
      const stores = Array.isArray(storesResponse.data)
        ? storesResponse.data
        : storesResponse.data.data || [];

      stores.forEach((store: any) => {
        storeMap.set(store.id, {
          is_online: !!store.is_online,
          is_warehouse: !!store.is_warehouse,
        });
      });
    }

    // Filter products with stock > 0 (or remove this filter if you want to show out-of-stock too)
    const productsWithStock = inventoryItems.filter(item => item.total_quantity > 0);

    if (productsWithStock.length === 0) {
      setProducts([]);
      setError(null);
      return;
    }

    // Parallel fetch images only for products that have stock
    const processedProducts = await Promise.all(
      productsWithStock.map(async (item: GlobalInventoryItem) => {
        let imageUrls: string[] = [];

        try {
          const images = await productImageService.getProductImages(item.product_id);

          const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

          imageUrls = images
            .filter(img => img.is_active)
            .sort((a, b) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return (a.sort_order || 0) - (b.sort_order || 0);
            })
            .map(img => {
              const url = img.image_url || img.image_path;
              if (!url) return null;

              if (url.startsWith('http')) return url;
              if (url.startsWith('/storage')) return `${baseUrl}${url}`;
              return `${baseUrl}/storage/product-images/${url}`;
            })
            .filter(Boolean) as string[];

          // Fallback: if no active images, use placeholder
          if (imageUrls.length === 0) {
            imageUrls = ['/placeholder-image.jpg'];
          }
        } catch (err) {
          console.warn(`Failed to load images for product ${item.product_id} (${item.sku})`, err);
          imageUrls = ['/placeholder-image.jpg']; // Graceful fallback
        }

        // Calculate online/offline quantities
        let online_quantity = 0;
        let offline_quantity = 0;
        let is_available_online = false;

        item.stores.forEach(store => {
          const storeInfo = storeMap.get(store.store_id);
          if (storeInfo?.is_online) {
            online_quantity += store.quantity;
            if (store.quantity > 0) is_available_online = true;
          } else {
            offline_quantity += store.quantity;
          }
        });


        // Fetch selling price (use the maximum sell_price among batches for this product)
        let sell_price: number | null = null;
        try {
          const productBatches = await batchService.getBatchesArray({ product_id: item.product_id, per_page: 200 });
          const prices = (productBatches || [])
            .map((b: any) => Number(String(b?.sell_price ?? b?.selling_price ?? '').replace(/[^0-9.-]/g, '')))
            .filter((n: number) => Number.isFinite(n) && n > 0);
          sell_price = prices.length ? Math.max(...prices) : null;
        } catch (e) {
          sell_price = null;
        }

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          sell_price,
          total_quantity: item.total_quantity,
          online_quantity,
          offline_quantity,
          warehouse_quantity: 0, // You can enhance this later if needed
          stores_count: item.stores_count,
          is_available_online,
          images: imageUrls,
          stores: item.stores,
        };
      })
    );

    setProducts(processedProducts);
    setError(null);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    setError(err instanceof Error ? err.message : 'Failed to load gallery data');
  } finally {
    setLoading(false);
  }
};

  const openLightbox = (image: string, productName: string, images: string[], index: number) => {
    setLightboxImage(image);
    setLightboxProductName(productName);
    setAllLightboxImages(images);
    setCurrentImageIndex(index);
  };

  const closeLightbox = () => setLightboxImage(null);

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'next'
        ? (currentImageIndex + 1) % allLightboxImages.length
        : (currentImageIndex - 1 + allLightboxImages.length) % allLightboxImages.length;
    setCurrentImageIndex(newIndex);
    setLightboxImage(allLightboxImages[newIndex]);
  };

  const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

  const loadImageWithCORS = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('✅ Image loaded successfully');
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.error('❌ Image load error:', e);
        reject(new Error('Failed to load image'));
      };
      
      console.log('📥 Loading image from:', url);
      img.src = url;
    });
  };

  const imageToBlob = (img: HTMLImageElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      
      try {
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('✅ Blob created:', blob.type, blob.size, 'bytes');
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image to blob'));
            }
          },
          'image/png'
        );
      } catch (err) {
        console.error('❌ Canvas error:', err);
        reject(new Error('Canvas is tainted - CORS issue'));
      }
    });
  };

  const copyImageToClipboard = async (imagePath: string) => {
    try {
      console.log('🚀 Starting copy process...');
      console.log('Original image path:', imagePath);
      
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard API not supported');
      }

      // Use proxied URL to bypass CORS
      const proxiedUrl = getProxiedImageUrl(imagePath);
      console.log('🔄 Using proxied URL:', proxiedUrl);

      // Load image through proxy
      const img = await loadImageWithCORS(proxiedUrl);

      // Convert to blob
      const blob = await imageToBlob(img);

      // Copy to clipboard
      console.log('📋 Writing to clipboard...');
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      console.log('✅ Successfully copied image to clipboard!');
      setCopyType('image');
      setCopiedImage(imagePath);
      setTimeout(() => {
        setCopiedImage(null);
        setCopyType(null);
      }, 2000);
    } catch (err) {
      console.error('❌ Image copy failed:', err);
      
      try {
        console.log('🔗 Falling back to copying link...');
        await navigator.clipboard.writeText(imagePath);
        setCopyType('link');
        setCopiedImage(imagePath);
        setTimeout(() => {
          setCopiedImage(null);
          setCopyType(null);
        }, 2000);
      } catch (textErr) {
        console.error('❌ Failed to copy link:', textErr);
        alert('Failed to copy. Please try again.');
      }
    }
  };

  const saveImage = (imagePath: string) => {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = imagePath.split('/').pop() || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedImage(imagePath);
    setCopyType('image');
    setTimeout(() => {
      setCopiedImage(null);
      setCopyType(null);
    }, 2000);
  };

  const handleCopyOrSave = async (
    e: React.MouseEvent | React.TouchEvent,
    imagePath: string
  ) => {
    e.stopPropagation();
    if (isIOS()) saveImage(imagePath);
    else await copyImageToClipboard(imagePath);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const min = minPrice ? Number(String(minPrice).replace(/[^0-9.-]/g, '')) : null;
    const max = maxPrice ? Number(String(maxPrice).replace(/[^0-9.-]/g, '')) : null;
    const price = p.sell_price ?? null;

    if (min !== null && Number.isFinite(min) && (price === null || price < min)) return false;
    if (max !== null && Number.isFinite(max) && (price === null || price > max)) return false;

    switch (filterMode) {
      case 'online':
        return p.online_quantity > 0;
      case 'offline':
        return p.offline_quantity > 0;
      case 'not-online':
        return !p.is_available_online;
      default:
        return true;
    }
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Product Gallery
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredProducts.length} products • Total: {filteredProducts.reduce((sum, p) => sum + p.total_quantity, 0)} units
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min ৳"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full sm:w-28 px-4 py-2 rounded-lg bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max ৳"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full sm:w-28 px-4 py-2 rounded-lg bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterMode === 'all'
                      ? 'bg-gray-900 dark:bg-gray-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('online')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterMode === 'online'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setFilterMode('offline')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterMode === 'offline'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Offline
                </button>
                <button
                  onClick={() => setFilterMode('not-online')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterMode === 'not-online'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Not Online
                </button>
              </div>
            </div>

          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading products...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-3 text-gray-400" />
              No products found
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {filteredProducts.map((product) =>
                product.images.map((image, imageIndex) => (
                  <div
                    key={`${product.product_id}-${imageIndex}`}
                    className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 group shadow-md hover:shadow-xl break-inside-avoid mb-4 bg-white dark:bg-gray-800"
                  >
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => openLightbox(image, product.product_name, product.images, imageIndex)}
                    >
                      <img
                        src={image}
                        alt={`${product.product_name} - Image ${imageIndex + 1}`}
                        className="w-full h-auto object-contain"
                      />

                      {!product.is_available_online && (
                        <div className="absolute top-2 left-2 px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full shadow-md">
                          Not Available Online
                        </div>
                      )}

                      <button
                        onClick={(e) => handleCopyOrSave(e, image)}
                        onTouchEnd={(e) => handleCopyOrSave(e, image)}
                        className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md z-10 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        title={isMobile() ? 'Copy/Save image' : 'Copy image'}
                      >
                        {copiedImage === image ? (
                          <Check className="w-4 h-4 text-gray-900" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        )}
                      </button>

                      {copiedImage === image && (
                        <div
                          className={`absolute top-12 right-2 px-3 py-1.5 rounded-md shadow-md text-white text-xs z-10 ${
                            copyType === 'image' ? 'bg-gray-900' : 'bg-blue-600'
                          }`}
                        >
                          {isIOS()
                            ? 'Saved to device'
                            : copyType === 'image'
                            ? 'Image copied'
                            : 'Link copied'}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-2 line-clamp-2">
                        {product.product_name}
                      </h3>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          SKU: {product.sku}
                        </p>

                        {/* Product details shortcut (same destination as Product List -> View Details) */}
                        <Link
                          href={`/product/${product.product_id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                          title="View product details"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </Link>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Price</span>
                        <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                          {product.sell_price !== null ? `৳${product.sell_price.toFixed(2)}` : '—'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            Total Stock
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {product.total_quantity} units
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Online</span>
                          {product.online_quantity > 0 ? (
                            <span className="text-gray-900 dark:text-gray-400 font-semibold">
                              {product.online_quantity} units
                            </span>
                          ) : (
                            <span className="text-gray-900 dark:text-gray-400 font-semibold">
                              Not Available
                            </span>
                          )}
                        </div>

                        {product.offline_quantity > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Offline</span>
                            <span className="text-gray-900 dark:text-gray-400 font-semibold">
                              {product.offline_quantity} units
                            </span>
                          </div>
                        )}

                        {product.warehouse_quantity > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {product.warehouse_quantity} units
                            </span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-gray-500 dark:text-gray-400">
                            Available in {product.stores_count} store{product.stores_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          productName={lightboxProductName}
          allImages={allLightboxImages}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}
    </div>
  );
}