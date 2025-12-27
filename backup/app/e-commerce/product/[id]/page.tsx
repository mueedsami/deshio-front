'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Heart,
  Share2,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useCart } from '@/app/e-commerce/CartContext';
import Navigation from '@/components/ecommerce/Navigation';
import CartSidebar from '@/components/ecommerce/cart/CartSidebar';
import catalogService, {
  Product,
  ProductDetailResponse,
  SimpleProduct,
  ProductImage
} from '@/services/catalogService';
import cartService from '@/services/cartService';
import { wishlistUtils } from '@/lib/wishlistUtils';

// Types for product variations
interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  selling_price: number | null; // ✅ allow null safely
  in_stock: boolean;
  stock_quantity: number | null; // ✅ allow null safely
  images: ProductImage[] | null; // ✅ allow null safely
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id ? parseInt(params.id as string) : null;

  const { refreshCart } = useCart();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<SimpleProduct[]>([]);

  // Suggested Products State
  const [suggestedProducts, setSuggestedProducts] = useState<SimpleProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // ✅ Safe price formatter (prevents toLocaleString crash)
  const formatBDT = (value: any) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '৳0.00';
    return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('customer_token') ||
      localStorage.getItem('token');
    return !!token;
  };

  // Helper functions
  const getBaseName = (name: string): string => {
    const match = name.match(/^(.+?)\s*-\s*([A-Za-z\s]+)$/);
    if (match) return match[1].trim();
    return name.trim();
  };

  const extractColorFromName = (name: string): string | undefined => {
    const match = name.match(/\s*-\s*([A-Za-z\s]+)$/);
    return match ? match[1].trim() : undefined;
  };

  const extractSizeFromName = (name: string): string | undefined => {
  const match = name.match(
    /\b(36|38|40|42|44|46|\d+)\b/i
  );
  return match ? match[0] : undefined;
};


  // Fetch suggested products
  useEffect(() => {
    if (!productId) return;

    const fetchSuggestedProducts = async () => {
      try {
        setLoadingSuggestions(true);
        const response = await catalogService.getSuggestedProducts(4);

        if (response.suggested_products && response.suggested_products.length > 0) {
          setSuggestedProducts(response.suggested_products);
        } else {
          setSuggestedProducts([]);
        }
      } catch (err: any) {
        console.error('❌ Error fetching suggested products:', err);
        setSuggestedProducts([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestedProducts();
  }, [productId]);

  // Fetch product data and variations
  useEffect(() => {
    if (!productId) {
      setError('Invalid product ID');
      setLoading(false);
      return;
    }

    const fetchProductAndVariations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: ProductDetailResponse = await catalogService.getProduct(productId);
        const mainProduct = response.product;

        setProduct(mainProduct);
        setRelatedProducts(response.related_products || []);

        const allProductsResponse = await catalogService.getProducts({
          per_page: 100,
        });

        setAllProducts(allProductsResponse.products);

        const variations: ProductVariant[] = allProductsResponse.products
          .filter(p => p.sku === mainProduct.sku)
          .map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            color: extractColorFromName(p.name),
            size: extractSizeFromName(p.name),
            selling_price: (p as any).selling_price ?? null,
            in_stock: !!p.in_stock,
            stock_quantity: (p as any).stock_quantity ?? 0,
            images: (p as any).images ?? [],
          }))
          .sort((a, b) => {
            const aColor = a.color || '';
            const bColor = b.color || '';
            const aSize = a.size || '';
            const bSize = b.size || '';
            if (aColor !== bColor) return aColor.localeCompare(bColor);
            return aSize.localeCompare(bSize);
          });

        setProductVariants(variations);

        const currentVariant = variations.find(v => v.id === productId);
        if (currentVariant) {
          setSelectedVariant(currentVariant);
        } else if (variations.length > 0) {
          setSelectedVariant(variations[0]);
        }

      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndVariations();
  }, [productId]);

  // Get unique colors and sizes from variants
  const availableColors = useMemo(() => {
    const colors = productVariants
      .map(v => v.color)
      .filter((color): color is string => !!color);
    return Array.from(new Set(colors));
  }, [productVariants]);

  const availableSizes = useMemo(() => {
    const sizes = productVariants
      .map(v => v.size)
      .filter((size): size is string => !!size);
    return Array.from(new Set(sizes));
  }, [productVariants]);

  // Listen for wishlist updates
  useEffect(() => {
    const updateWishlistStatus = () => {
      if (selectedVariant) {
        setIsInWishlist(wishlistUtils.isInWishlist(selectedVariant.id));
      }
    };
    updateWishlistStatus();
    window.addEventListener('wishlist-updated', updateWishlistStatus);
    return () => window.removeEventListener('wishlist-updated', updateWishlistStatus);
  }, [selectedVariant]);

  // Handlers
  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setSelectedImageIndex(0);
    setQuantity(1);
    router.push(`/e-commerce/product/${variant.id}`);
  };

  const handleColorSelect = (color: string) => {
    const variant = productVariants.find(v => v.color === color);
    if (variant) handleVariantChange(variant);
  };

  const handleSizeSelect = (size: string) => {
    const variant = productVariants.find(v => v.size === size);
    if (variant) handleVariantChange(variant);
  };

  const handleToggleWishlist = () => {
    if (!selectedVariant) return;

    if (isInWishlist) {
      wishlistUtils.remove(selectedVariant.id);
    } else {
      wishlistUtils.add({
        id: selectedVariant.id,
        name: selectedVariant.name,
        image: (selectedVariant.images && selectedVariant.images[0]?.url) || '',
        price: Number(selectedVariant.selling_price ?? 0),
        sku: selectedVariant.sku,
      });
    }
  };

  // Add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant || !selectedVariant.in_stock) return;

    const stockQty = Number(selectedVariant.stock_quantity ?? 0);
    if (stockQty <= 0) return;

    if (!isAuthenticated()) {
      const pendingCartItem = {
        product_id: selectedVariant.id,
        quantity: quantity,
        name: selectedVariant.name,
        price: Number(selectedVariant.selling_price ?? 0),
        image: (selectedVariant.images && selectedVariant.images[0]?.url) || '',
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        }
      };

      localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
      localStorage.setItem('cart-redirect', 'true');
      router.push('/e-commerce/login');
      return;
    }

    setIsAdding(true);

    try {
      await cartService.addToCart({
        product_id: selectedVariant.id,
        quantity: quantity,
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        },
        notes: undefined
      });

      await refreshCart();

      setTimeout(() => {
        setIsAdding(false);
        setCartSidebarOpen(true);
      }, 800);

    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setIsAdding(false);

      const errorMessage = error.message || '';
      const isAuthError =
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthenticated') ||
        errorMessage.includes('unauthorized');

      if (isAuthError) {
        const pendingCartItem = {
          product_id: selectedVariant.id,
          quantity: quantity,
          name: selectedVariant.name,
          price: Number(selectedVariant.selling_price ?? 0),
          image: (selectedVariant.images && selectedVariant.images[0]?.url) || '',
          variant_options: {
            color: selectedVariant.color,
            size: selectedVariant.size,
          }
        };

        localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
        localStorage.setItem('cart-redirect', 'true');
        router.push('/e-commerce/login');
      } else {
        const displayMessage = errorMessage.includes('Insufficient stock')
          ? errorMessage
          : 'Failed to add item to cart. Please try again.';
        alert(displayMessage);
      }
    }
  };

  const handleAddSuggestedToCart = async (item: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!item.in_stock) return;

    if (!isAuthenticated()) {
      const color = extractColorFromName(item.name);
      const size = extractSizeFromName(item.name);

      const pendingCartItem = {
        product_id: item.id,
        quantity: 1,
        name: item.name,
        price: Number((item as any).selling_price ?? 0),
        image: item.images?.[0]?.url || '/placeholder-product.jpg',
        variant_options: { color, size }
      };

      localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
      localStorage.setItem('cart-redirect', 'true');
      router.push('/e-commerce/login');
      return;
    }

    try {
      const color = extractColorFromName(item.name);
      const size = extractSizeFromName(item.name);

      await cartService.addToCart({
        product_id: item.id,
        quantity: 1,
        variant_options: { color, size },
        notes: undefined
      });

      await refreshCart();
      setCartSidebarOpen(true);

    } catch (error: any) {
      console.error('Error adding to cart:', error);

      const errorMessage = error.message || '';
      const isAuthError =
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthenticated') ||
        errorMessage.includes('unauthorized');

      if (isAuthError) {
        const color = extractColorFromName(item.name);
        const size = extractSizeFromName(item.name);

        const pendingCartItem = {
          product_id: item.id,
          quantity: 1,
          name: item.name,
          price: Number((item as any).selling_price ?? 0),
          image: item.images?.[0]?.url || '/placeholder-product.jpg',
          variant_options: { color, size }
        };

        localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
        localStorage.setItem('cart-redirect', 'true');
        router.push('/e-commerce/login');
      } else {
        const displayMessage = errorMessage.includes('Insufficient stock')
          ? errorMessage
          : 'Failed to add item to cart. Please try again.';
        alert(displayMessage);
      }
    }
  };

  const handleToggleSuggestedWishlist = (item: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();

    const isItemInWishlist = wishlistUtils.isInWishlist(item.id);

    if (isItemInWishlist) {
      wishlistUtils.remove(item.id);
    } else {
      wishlistUtils.add({
        id: item.id,
        name: item.name,
        image: item.images?.[0]?.url || '/placeholder-product.jpg',
        price: Number((item as any).selling_price ?? 0),
        sku: item.sku,
      });
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant) return;
    const stockQty = Number(selectedVariant.stock_quantity ?? 0);
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= stockQty) {
      setQuantity(newQuantity);
    }
  };

  const handlePrevImage = () => {
    if (!selectedVariant) return;
    const imgs = Array.isArray(selectedVariant.images) ? selectedVariant.images : [];
    if (imgs.length === 0) return;

    setSelectedImageIndex(prev =>
      prev === 0 ? imgs.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!selectedVariant) return;
    const imgs = Array.isArray(selectedVariant.images) ? selectedVariant.images : [];
    if (imgs.length === 0) return;

    setSelectedImageIndex(prev =>
      prev === imgs.length - 1 ? 0 : prev + 1
    );
  };

  const handleShare = () => {
    if (navigator.share && product) {
      navigator.share({
        title: product.name,
        text: product.short_description || product.description,
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // ---------------------------
  // Loading / Error
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Product Not Found
            </h1>
            <p className="text-gray-600 mb-6 text-sm">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white hover:bg-black transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Derived safe values
  // ---------------------------
  const baseName = getBaseName(product.name);

  const sellingPrice = Number(selectedVariant.selling_price ?? 0);
  const costPrice = Number((product as any).cost_price ?? 0);
  const stockQty = Number(selectedVariant.stock_quantity ?? 0);

  const safeImages =
    Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0
      ? selectedVariant.images
      : [{ id: 0, url: '/placeholder-product.jpg', is_primary: true, alt_text: 'Product' } as any];

  const primaryImage =
    safeImages[selectedImageIndex]?.url || safeImages[0]?.url;

  const discountPercent =
    costPrice > sellingPrice && costPrice > 0
      ? Math.round(((costPrice - sellingPrice) / costPrice) * 100)
      : 0;

  // ---------------------------
  // Premium UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <CartSidebar
        isOpen={cartSidebarOpen}
        onClose={() => setCartSidebarOpen(false)}
      />

      {/* Premium breadcrumb bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500">
            <button
              onClick={() => router.push('/e-commerce')}
              className="hover:text-gray-900 transition"
            >
              Home
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => router.back()}
              className="hover:text-gray-900 transition"
            >
              {product.category?.name || 'Products'}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">{baseName}</span>
          </div>
        </div>
      </div>

      {/* Luxury background wash */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-100/50 blur-3xl" />
          <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-red-100/40 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-white" />
        </div>

        {/* Product Details */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/60 to-transparent" />

                <img
                  src={primaryImage}
                  alt={selectedVariant.name}
                  className="relative w-full h-full object-contain p-8 md:p-10"
                />

                {safeImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2.5 md:p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                    >
                      <ChevronLeft size={22} className="text-gray-800" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-2.5 md:p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                    >
                      <ChevronRight size={22} className="text-gray-800" />
                    </button>
                  </>
                )}

                {!selectedVariant.in_stock && (
                  <div className="absolute top-4 left-4 rounded-xl bg-red-600 text-white px-3 py-1.5 text-[10px] sm:text-xs font-bold tracking-wide">
                    OUT OF STOCK
                  </div>
                )}

                {selectedVariant.in_stock && stockQty > 0 && stockQty < 5 && (
                  <div className="absolute top-4 left-4 rounded-xl bg-amber-500 text-white px-3 py-1.5 text-[10px] sm:text-xs font-bold tracking-wide">
                    Only {stockQty} left
                  </div>
                )}
              </div>

              {safeImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {safeImages.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square rounded-2xl overflow-hidden border bg-white transition-all ${
                        selectedImageIndex === index
                          ? 'border-gray-900 ring-1 ring-gray-900'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`View ${index + 1}`}
                        className="w-full h-full object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Buy Column (premium card) */}
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white shadow-sm p-6 sm:p-8">
                {/* Title */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400">
                    Errum Collection
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                    {baseName}
                  </h1>
                </div>

                {/* Price */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatBDT(sellingPrice)}
                  </span>

                  {costPrice > sellingPrice && sellingPrice > 0 && (
                    <>
                      <span className="text-sm sm:text-base text-gray-400 line-through">
                        {formatBDT(costPrice)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                        Save {discountPercent}%
                      </span>
                    </>
                  )}
                </div>

                {/* Stock micro status */}
                <div className="mt-3">
                  {selectedVariant.in_stock && stockQty > 0 ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span className="text-[10px] sm:text-xs font-medium text-emerald-700">
                        In stock • {stockQty} available
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-100 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                      <span className="text-[10px] sm:text-xs font-medium text-red-700">
                        Out of stock
                      </span>
                    </div>
                  )}
                </div>

                {/* SKU */}
                {selectedVariant.sku && (
                  <div className="mt-4 text-[11px] text-gray-500">
                    SKU: <span className="font-semibold text-gray-800">{selectedVariant.sku}</span>
                  </div>
                )}

                {/* Description */}
                {(product.short_description || product.description) && (
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <h3 className="text-xs font-semibold text-gray-900 tracking-wide uppercase">
                      Description
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                      {product.short_description || product.description}
                    </p>
                  </div>
                )}

                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
                      Sizes
                      {selectedVariant.size && (
                        <span className="ml-2 font-normal text-gray-500">
                          ({selectedVariant.size})
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => {
                        const sizeVariant = productVariants.find(v => v.size === size);
                        const isSelected = selectedVariant.size === size;
                        const isAvailable = !!(sizeVariant && sizeVariant.in_stock);

                        return (
                          <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            disabled={!isAvailable}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : isAvailable
                                ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {availableColors.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
                      Colors
                      {selectedVariant.color && (
                        <span className="ml-2 font-normal text-gray-500">
                          ({selectedVariant.color})
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((color) => {
                        const colorVariant = productVariants.find(v => v.color === color);
                        const isSelected = selectedVariant.color === color;
                        const isAvailable = !!(colorVariant && colorVariant.in_stock);

                        return (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            disabled={!isAvailable}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : isAvailable
                                ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity + Actions */}
                <div className="mt-7">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-semibold text-gray-900 tracking-wide uppercase">
                      Quantity
                    </label>
                    <div className="flex items-center rounded-xl border border-gray-200 bg-white">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-4 py-1 text-sm font-semibold min-w-[48px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= stockQty}
                        className="p-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={!selectedVariant.in_stock || isAdding || stockQty <= 0}
                      className={`
                        flex-1 rounded-xl py-3.5 text-sm font-semibold
                        flex items-center justify-center gap-2 transition-all
                        ${isAdding
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-900 text-white hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
                        }
                      `}
                    >
                      <ShoppingCart size={18} />
                      {isAdding ? 'Added' : 'Add to Cart'}
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`rounded-xl border px-3.5 py-3.5 transition-all ${
                        isInWishlist
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart size={18} className={isInWishlist ? 'fill-current' : ''} />
                    </button>

                    <button
                      onClick={handleShare}
                      className="rounded-xl border border-gray-200 bg-white px-3.5 py-3.5 text-gray-700 hover:bg-gray-50 transition"
                      aria-label="Share"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-6 border-t border-gray-100 pt-5 space-y-2 text-[11px] sm:text-xs">
                  {product.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category</span>
                      <span className="font-semibold text-gray-800">
                        {product.category.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Availability</span>
                    <span className={`font-semibold ${
                      selectedVariant.in_stock && stockQty > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {selectedVariant.in_stock && stockQty > 0
                        ? `In Stock (${stockQty})`
                        : 'Out of Stock'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtle trust strip */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 text-xs text-gray-600">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span>Premium selection</span>
                  <span>Authentic sourcing</span>
                  <span>In-store support</span>
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>
          </div>

          {/* YOU MAY ALSO LIKE */}
          <div className="mt-14 md:mt-20">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Curated for you
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  You may also like
                </h2>
              </div>
            </div>

            {loadingSuggestions && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
              </div>
            )}

            {!loadingSuggestions && suggestedProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <p className="text-gray-500 text-sm">
                  No suggested products available at the moment.
                </p>
              </div>
            )}

            {!loadingSuggestions && suggestedProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {suggestedProducts.map((item) => {
                  const itemImage = item.images?.[0]?.url || '/placeholder-product.jpg';
                  const isItemInWishlist = wishlistUtils.isInWishlist(item.id);
                  const sp = Number((item as any).selling_price ?? 0);

                  return (
                    <div
                      key={item.id}
                      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/e-commerce/product/${item.id}`)}
                    >
                      <div className="relative aspect-square bg-gray-50">
                        <img
                          src={itemImage}
                          alt={item.name}
                          className="w-full h-full object-contain p-5 group-hover:scale-[1.03] transition-transform duration-300"
                        />

                        {!item.in_stock && (
                          <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                            OUT OF STOCK
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleSuggestedWishlist(item, e)}
                            className={`p-2 rounded-full shadow-sm border transition ${
                              isItemInWishlist
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                            title={isItemInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                          >
                            <Heart
                              className={`h-4 w-4 ${isItemInWishlist ? 'fill-current' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
                          {item.name}
                        </h3>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-base font-bold text-gray-900">
                            {formatBDT(sp)}
                          </span>

                          <button
                            onClick={(e) => handleAddSuggestedToCart(item, e)}
                            disabled={!item.in_stock}
                            className={`p-2.5 rounded-full transition ${
                              item.in_stock
                                ? 'bg-gray-900 text-white hover:bg-black'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title={item.in_stock ? 'Add to cart' : 'Out of stock'}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="mt-14 md:mt-18 border-t border-gray-100 pt-10">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">
                  Free Shipping
                </h3>
                <p className="text-gray-600 text-sm">
                  Free shipping on all orders over ৳5,000
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">
                  Easy Returns
                </h3>
                <p className="text-gray-600 text-sm">
                  30-day return policy for all products
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">
                  Secure Payment
                </h3>
                <p className="text-gray-600 text-sm">
                  100% secure payment processing
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
