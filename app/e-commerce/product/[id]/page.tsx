'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Share2, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '@/app/e-commerce/CartContext';
import Navigation from '@/components/ecommerce/Navigation';
import CartSidebar from '@/components/ecommerce/cart/CartSidebar';
import catalogService, { Product, ProductDetailResponse, SimpleProduct, ProductImage } from '@/services/catalogService';
import cartService from '@/services/cartService';
import { wishlistUtils } from '@/lib/wishlistUtils';

// Types for product variations
interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  selling_price: number;
  in_stock: boolean;
  stock_quantity: number;
  images: ProductImage[];
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
  
  // ✅ Suggested Products State
  const [suggestedProducts, setSuggestedProducts] = useState<SimpleProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  };

  // Helper functions
  const getBaseName = (name: string): string => {
    const match = name.match(/^(.+?)\s*-\s*([A-Za-z\s]+)$/);
    if (match) {
      return match[1].trim();
    }
    return name.trim();
  };

  const extractColorFromName = (name: string): string | undefined => {
    const match = name.match(/\s*-\s*([A-Za-z\s]+)$/);
    return match ? match[1].trim() : undefined;
  };

  const extractSizeFromName = (name: string): string | undefined => {
    const match = name.match(/\b(XS|S|M|L|XL|XXL|\d+)\b/i);
    return match ? match[0] : undefined;
  };

  // Fetch suggested products
  useEffect(() => {
    if (!productId) return;

    const fetchSuggestedProducts = async () => {
      try {
        setLoadingSuggestions(true);
        console.log('🔍 Fetching suggested products...');
        
        const response = await catalogService.getSuggestedProducts(4);
        
        console.log('📦 Suggested Products Response:', response);
        
        if (response.suggested_products && response.suggested_products.length > 0) {
          console.log('✅ Loaded', response.suggested_products.length, 'suggested products');
          setSuggestedProducts(response.suggested_products);
        } else {
          console.warn('⚠️ No suggested products returned');
          setSuggestedProducts([]);
        }
      } catch (err: any) {
        console.error('❌ Error fetching suggested products:', err);
        console.error('Error details:', err.response?.data || err.message);
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

        const variations = allProductsResponse.products
          .filter(p => p.sku === mainProduct.sku)
          .map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            color: extractColorFromName(p.name),
            size: extractSizeFromName(p.name),
            selling_price: p.selling_price,
            in_stock: p.in_stock,
            stock_quantity: p.stock_quantity,
            images: p.images,
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
      .filter((size): color is string => !!size);
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
    if (variant) {
      handleVariantChange(variant);
    }
  };

  const handleSizeSelect = (size: string) => {
    const variant = productVariants.find(v => v.size === size);
    if (variant) {
      handleVariantChange(variant);
    }
  };

  const handleToggleWishlist = () => {
    if (!selectedVariant) return;

    if (isInWishlist) {
      wishlistUtils.remove(selectedVariant.id);
    } else {
      wishlistUtils.add({
        id: selectedVariant.id,
        name: selectedVariant.name,
        image: selectedVariant.images[0]?.url || '',
        price: selectedVariant.selling_price,
        sku: selectedVariant.sku,
      });
    }
  };

  // ✅ FIXED: Added variant_options support
  const handleAddToCart = async () => {
    if (!selectedVariant || !selectedVariant.in_stock) return;

    // Check authentication
    if (!isAuthenticated()) {
      // Store product info for adding after login
      const pendingCartItem = {
        product_id: selectedVariant.id,
        quantity: quantity,
        name: selectedVariant.name,
        price: selectedVariant.selling_price,
        image: selectedVariant.images[0]?.url || '',
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        }
      };
      
      localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
      localStorage.setItem('cart-redirect', 'true');
      
      // Redirect to login
      router.push('/e-commerce/login');
      return;
    }

    setIsAdding(true);

    try {
      // ✅ Add to backend cart with variant_options
      await cartService.addToCart({
        product_id: selectedVariant.id,
        quantity: quantity,
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        },
        notes: undefined
      });

      // ✅ Refresh cart from backend to sync with CartContext
      await refreshCart();

      // Show success state briefly, then open cart sidebar
      setTimeout(() => {
        setIsAdding(false);
        setCartSidebarOpen(true);
      }, 800);
      
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setIsAdding(false);
      
      // Check if error is authentication related
      const errorMessage = error.message || '';
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('Unauthenticated') ||
                         errorMessage.includes('unauthorized');
      
      if (isAuthError) {
        // Store product info before redirecting
        const pendingCartItem = {
          product_id: selectedVariant.id,
          quantity: quantity,
          name: selectedVariant.name,
          price: selectedVariant.selling_price,
          image: selectedVariant.images[0]?.url || '',
          variant_options: {
            color: selectedVariant.color,
            size: selectedVariant.size,
          }
        };
        
        localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
        localStorage.setItem('cart-redirect', 'true');
        router.push('/e-commerce/login');
      } else {
        // Show user-friendly error message
        const displayMessage = errorMessage.includes('Insufficient stock')
          ? errorMessage
          : 'Failed to add item to cart. Please try again.';
        alert(displayMessage);
      }
    }
  };

  // ✅ FIXED: Added variant_options support for suggested products
  const handleAddSuggestedToCart = async (item: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!item.in_stock) return;

    // Check authentication
    if (!isAuthenticated()) {
      // Extract variant options from product name if available
      const color = extractColorFromName(item.name);
      const size = extractSizeFromName(item.name);
      
      const pendingCartItem = {
        product_id: item.id,
        quantity: 1,
        name: item.name,
        price: item.selling_price,
        image: item.images?.[0]?.url || '/placeholder-product.jpg',
        variant_options: {
          color: color,
          size: size,
        }
      };
      
      localStorage.setItem('pending-cart-item', JSON.stringify(pendingCartItem));
      localStorage.setItem('cart-redirect', 'true');
      
      // Redirect to login
      router.push('/e-commerce/login');
      return;
    }

    try {
      // Extract variant options from product name
      const color = extractColorFromName(item.name);
      const size = extractSizeFromName(item.name);
      
      // ✅ Add to backend cart with variant_options
      await cartService.addToCart({
        product_id: item.id,
        quantity: 1,
        variant_options: {
          color: color,
          size: size,
        },
        notes: undefined
      });

      // ✅ Refresh cart from backend to sync with CartContext
      await refreshCart();
      
      // Open cart sidebar to show added item
      setCartSidebarOpen(true);
      
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      // Check if error is authentication related
      const errorMessage = error.message || '';
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('Unauthenticated') ||
                         errorMessage.includes('unauthorized');
      
      if (isAuthError) {
        const color = extractColorFromName(item.name);
        const size = extractSizeFromName(item.name);
        
        const pendingCartItem = {
          product_id: item.id,
          quantity: 1,
          name: item.name,
          price: item.selling_price,
          image: item.images?.[0]?.url || '/placeholder-product.jpg',
          variant_options: {
            color: color,
            size: size,
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

  // ✅ Handler for toggling wishlist for suggested products
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
        price: item.selling_price,
        sku: item.sku,
      });
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant) return;
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= selectedVariant.stock_quantity) {
      setQuantity(newQuantity);
    }
  };

  const handlePrevImage = () => {
    if (!selectedVariant) return;
    setSelectedImageIndex((prev) => 
      prev === 0 ? selectedVariant.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!selectedVariant) return;
    setSelectedImageIndex((prev) => 
      prev === selectedVariant.images.length - 1 ? 0 : prev + 1
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const baseName = getBaseName(product.name);
  const currentImages = selectedVariant.images.length > 0 
    ? selectedVariant.images 
    : [{ id: 0, url: '/placeholder-product.jpg', is_primary: true, alt_text: 'Product' }];
  const primaryImage = currentImages[selectedImageIndex]?.url || currentImages[0]?.url;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <CartSidebar 
        isOpen={cartSidebarOpen} 
        onClose={() => setCartSidebarOpen(false)} 
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button onClick={() => router.push('/')} className="hover:text-gray-900">
              Home
            </button>
            <span>/</span>
            <button onClick={() => router.back()} className="hover:text-gray-900">
              {product.category?.name || 'Products'}
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{baseName}</span>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden group border border-gray-200">
              <img
                src={primaryImage}
                alt={selectedVariant.name}
                className="w-full h-full object-contain p-8"
              />
              
              {currentImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronLeft size={24} className="text-gray-800" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronRight size={24} className="text-gray-800" />
                  </button>
                </>
              )}

              {!selectedVariant.in_stock && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold">
                  OUT OF STOCK
                </div>
              )}

              {selectedVariant.in_stock && selectedVariant.stock_quantity < 5 && (
                <div className="absolute top-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-bold">
                  Only {selectedVariant.stock_quantity} left!
                </div>
              )}
            </div>

            {currentImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {currentImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all bg-white ${
                      selectedImageIndex === index
                        ? 'border-teal-600 ring-2 ring-teal-600 ring-offset-2'
                        : 'border-gray-200 hover:border-gray-300'
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

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{baseName}</h1>
              
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  BDT {selectedVariant.selling_price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </span>
                {product.cost_price > selectedVariant.selling_price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      BDT {product.cost_price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      Save {Math.round(((product.cost_price - selectedVariant.selling_price) / product.cost_price) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {selectedVariant.in_stock && (
                <div className="inline-flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                  <span className="text-teal-600 font-medium">In Stock ({selectedVariant.stock_quantity} available)</span>
                </div>
              )}
            </div>

            {selectedVariant.sku && (
              <div className="text-sm text-gray-600">
                SKU: <span className="font-medium text-gray-900">{selectedVariant.sku}</span>
              </div>
            )}

            {(product.short_description || product.description) && (
              <div className="border-t border-b py-4">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.short_description || product.description}
                </p>
              </div>
            )}

            {availableSizes.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Available Sizes
                  {selectedVariant.size && (
                    <span className="ml-2 font-normal text-gray-600">
                      ({selectedVariant.size})
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => {
                    const sizeVariant = productVariants.find(v => v.size === size);
                    const isSelected = selectedVariant.size === size;
                    const isAvailable = sizeVariant && sizeVariant.in_stock;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => handleSizeSelect(size)}
                        disabled={!isAvailable}
                        className={`px-4 py-2.5 border-2 rounded-lg font-medium transition-all text-sm ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-700'
                            : isAvailable
                            ? 'border-gray-300 hover:border-gray-400 text-gray-700'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {availableColors.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Available Colors
                  {selectedVariant.color && (
                    <span className="ml-2 font-normal text-gray-600">
                      ({selectedVariant.color})
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const colorVariant = productVariants.find(v => v.color === color);
                    const isSelected = selectedVariant.color === color;
                    const isAvailable = colorVariant && colorVariant.in_stock;
                    
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        disabled={!isAvailable}
                        className={`px-4 py-2.5 border-2 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-700'
                            : isAvailable
                            ? 'border-gray-300 hover:border-gray-400 text-gray-700'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-900">Quantity:</label>
                <div className="flex items-center border-2 border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="px-6 py-2 font-semibold text-lg min-w-[60px] text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= selectedVariant.stock_quantity}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant.in_stock || isAdding}
                  className={`
                    flex-1 py-4 rounded-lg font-bold text-lg
                    flex items-center justify-center gap-2 transition-all duration-300
                    ${isAdding 
                      ? 'bg-green-600 text-white' 
                      : 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                    }
                  `}
                >
                  {isAdding ? (
                    <>
                      <ShoppingCart size={20} />
                      ✓ ADDED
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} />
                      Add to Cart
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleToggleWishlist}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isInWishlist
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-300 hover:border-red-500 hover:text-red-600'
                  }`}
                >
                  <Heart 
                    size={24} 
                    className={isInWishlist ? 'fill-current' : ''} 
                  />
                </button>
                
                <button 
                  onClick={handleShare}
                  className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Share2 size={24} />
                </button>
              </div>
            </div>

            <div className="border-t pt-6 space-y-3 text-sm">
              {product.category && (
                <div className="flex">
                  <span className="font-semibold text-gray-900 w-32">Category:</span>
                  <span className="text-gray-700">{product.category.name}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-semibold text-gray-900 w-32">Availability:</span>
                <span className={`font-semibold ${selectedVariant.in_stock ? 'text-teal-600' : 'text-red-600'}`}>
                  {selectedVariant.in_stock ? `In Stock (${selectedVariant.stock_quantity})` : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ You May Also Like Section - Connected to Backend API */}
        {!loadingSuggestions && suggestedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">YOU MAY ALSO LIKE</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((item) => {
                const itemImage = item.images?.[0]?.url || '/placeholder-product.jpg';
                const isItemInWishlist = wishlistUtils.isInWishlist(item.id);
                
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                    onClick={() => router.push(`/e-commerce/product/${item.id}`)}
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={itemImage}
                        alt={item.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {!item.in_stock && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold">
                          OUT OF STOCK
                        </div>
                      )}
                      
                      <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => handleToggleSuggestedWishlist(item, e)}
                          className={`p-2 rounded-full shadow-md transition-colors ${
                            isItemInWishlist
                              ? 'bg-red-500 text-white'
                              : 'bg-white hover:bg-gray-100'
                          }`}
                          title={isItemInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          <Heart 
                            className={`h-4 w-4 ${isItemInWishlist ? 'fill-current' : 'text-gray-700'}`} 
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                        {item.name}
                      </h3>

                      {item.category && (
                        <p className="text-xs text-gray-500 mb-2">
                          {typeof item.category === 'string' ? item.category : item.category.name}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">
                          ৳{item.selling_price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </span>
                        
                        <button
                          onClick={(e) => handleAddSuggestedToCart(item, e)}
                          disabled={!item.in_stock}
                          className={`p-2 rounded-full ${
                            item.in_stock
                              ? 'bg-teal-600 text-white hover:bg-teal-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          } transition-colors`}
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
          </div>
        )}

        {/* Loading State */}
        {loadingSuggestions && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">YOU MAY ALSO LIKE</h2>
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loadingSuggestions && suggestedProducts.length === 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">YOU MAY ALSO LIKE</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No suggested products available at the moment.</p>
            </div>
          </div>
        )}

        {/* Additional Features */}
        <div className="mt-16 border-t pt-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Free Shipping</h3>
              <p className="text-gray-600 text-sm">Free shipping on all orders over ৳5,000</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Easy Returns</h3>
              <p className="text-gray-600 text-sm">30-day return policy for all products</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Secure Payment</h3>
              <p className="text-gray-600 text-sm">100% secure payment processing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}