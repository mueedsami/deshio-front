'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import cartService, { CartItem, Cart } from '@/services/cartService';

export default function CartPage() {
  const router = useRouter();
  
  // State
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Set<number>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Check for both token types
  const isAuthenticated = () => {
    const token = localStorage.getItem('customer_token') || localStorage.getItem('auth_token');
    return !!token;
  };

  // Fetch cart on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/e-commerce/login');
      return;
    }

    fetchCart();
  }, []);

  // Select all items by default when cart items change
  useEffect(() => {
    if (cart?.cart_items && cart.cart_items.length > 0) {
      setSelectedItems(new Set(cart.cart_items.map(item => item.id)));
    }
  }, [cart?.cart_items?.length]);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const cartData = await cartService.getCart();
      setCart(cartData);
    } catch (err: any) {
      console.error('❌ Error fetching cart:', err);
      setError(err.message || 'Failed to load cart');
      
      if (err.message?.includes('401') || err.message?.includes('Unauthenticated')) {
        router.push('/e-commerce/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (!cart?.cart_items) return;
    
    if (selectedItems.size === cart.cart_items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cart.cart_items.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleUpdateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setIsUpdating(prev => new Set(prev).add(cartItemId));
    
    try {
      await cartService.updateQuantity(cartItemId, { quantity: newQuantity });
      await fetchCart();
    } catch (err: any) {
      console.error('❌ Error updating quantity:', err);
      alert(err.message || 'Failed to update quantity');
    } finally {
      setIsUpdating(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (cartItemId: number) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    setIsUpdating(prev => new Set(prev).add(cartItemId));
    
    try {
      await cartService.removeFromCart(cartItemId);
      
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
      
      await fetchCart();
    } catch (err: any) {
      console.error('❌ Error removing item:', err);
      alert(err.message || 'Failed to remove item');
    } finally {
      setIsUpdating(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Are you sure you want to remove ${selectedItems.size} item(s)?`)) return;

    const itemsToDelete = Array.from(selectedItems);
    setIsUpdating(new Set(itemsToDelete));
    
    try {
      await Promise.all(itemsToDelete.map(id => cartService.removeFromCart(id)));
      setSelectedItems(new Set());
      await fetchCart();
    } catch (err: any) {
      console.error('❌ Error deleting items:', err);
      alert(err.message || 'Failed to delete items');
    } finally {
      setIsUpdating(new Set());
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Are you sure you want to clear your entire cart?')) return;

    setIsLoading(true);
    try {
      await cartService.clearCart();
      setSelectedItems(new Set());
      await fetchCart();
    } catch (err: any) {
      console.error('❌ Error clearing cart:', err);
      alert(err.message || 'Failed to clear cart');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedTotal = (): number => {
    if (!cart?.cart_items) return 0;
    
    return cart.cart_items
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => {
        const itemTotal = typeof item.total_price === 'string' 
          ? parseFloat(item.total_price) 
          : item.total_price;
        return total + itemTotal;
      }, 0);
  };

  // Calculate totals
  const subtotal = getSelectedTotal();
  const freeShippingThreshold = 5000;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const shippingFee = subtotal >= freeShippingThreshold ? 0 : 60;
  const total = subtotal + shippingFee;

  // ✅ CRITICAL FIX: Synchronous localStorage save before navigation
  const handleProceedToCheckout = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to checkout');
      return;
    }

    try {
      // Validate cart before checkout
      const validation = await cartService.validateCart();
      
      if (!validation.is_valid) {
        const issues = validation.issues.map(issue => issue.issue).join('\n');
        alert(`Cart validation failed:\n${issues}`);
        await fetchCart();
        return;
      }

      // ✅ CRITICAL: Save to localStorage SYNCHRONOUSLY before ANY navigation
      const selectedItemsArray = Array.from(selectedItems);
      localStorage.setItem('checkout-selected-items', JSON.stringify(selectedItemsArray));
      
      // ✅ Force a small delay to ensure localStorage write completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify save succeeded
      const saved = localStorage.getItem('checkout-selected-items');
      if (!saved) {
        throw new Error('Failed to save checkout data');
      }

      // Now navigate
      router.push('/e-commerce/checkout');

    } catch (err: any) {
      console.error('❌ Error during checkout:', err);
      alert(err.message || 'Failed to proceed to checkout. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-red-700 mx-auto mb-4" />
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <AlertCircle className="h-24 w-24 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Cart</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={fetchCart}
              className="bg-red-700 text-white px-8 py-3 rounded font-semibold hover:bg-red-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.cart_items || cart.cart_items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Add some products to get started!</p>
            <button
              onClick={() => router.push('/e-commerce')}
              className="bg-red-700 text-white px-8 py-3 rounded font-semibold hover:bg-red-800 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Free Shipping Progress */}
        {remaining > 0 && (
          <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-700 mb-3">
              Add <span className="font-bold text-red-700">৳{remaining.toFixed(2)}</span> to cart and get free shipping!
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-700 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-1">
            {/* Select All & Delete */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.size === cart.cart_items.length && cart.cart_items.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 cursor-pointer accent-red-700"
                />
                <span className="text-gray-700 font-medium">
                  SELECT ALL ({cart.cart_items.length} ITEM{cart.cart_items.length !== 1 ? 'S' : ''})
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedItems.size === 0 || isUpdating.size > 0}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isUpdating.size > 0 ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <X size={18} />
                  )}
                  <span className="text-sm font-medium">DELETE SELECTED</span>
                </button>
                <button
                  onClick={handleClearCart}
                  disabled={isUpdating.size > 0}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-4"
                >
                  <X size={18} />
                  <span className="text-sm font-medium">CLEAR CART</span>
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b font-semibold text-gray-900">
              <div className="col-span-1"></div>
              <div className="col-span-5">PRODUCT</div>
              <div className="col-span-2 text-center">PRICE</div>
              <div className="col-span-2 text-center">QUANTITY</div>
              <div className="col-span-2 text-right">SUBTOTAL</div>
            </div>

            {/* Cart Items */}
            <div className="space-y-4 mt-6">
              {cart.cart_items.map((item: CartItem) => {
                const price = typeof item.unit_price === 'string' 
                  ? parseFloat(item.unit_price) 
                  : item.unit_price;
                const itemTotal = typeof item.total_price === 'string' 
                  ? parseFloat(item.total_price) 
                  : item.total_price;
                const isItemUpdating = isUpdating.has(item.id);
                const productImage = item.product.images?.[0]?.image_url || '/placeholder-product.jpg';

                return (
                  <div 
                    key={item.id} 
                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 py-6 border-b items-center transition-opacity ${
                      isItemUpdating ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="md:col-span-1 flex justify-end md:justify-start">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        disabled={isItemUpdating}
                        className="w-5 h-5 cursor-pointer accent-red-700 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="md:col-span-5 flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={productImage}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-product.jpg';
                          }}
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isItemUpdating}
                          className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isItemUpdating ? (
                            <Loader2 size={16} className="text-gray-500 animate-spin" />
                          ) : (
                            <X size={16} className="text-gray-500" />
                          )}
                        </button>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {item.product.name}
                        </h3>
                        
                        {item.variant_options && (
                          <div className="flex gap-2 mt-1">
                            {item.variant_options.color && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                Color: {item.variant_options.color}
                              </span>
                            )}
                            {item.variant_options.size && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                Size: {item.variant_options.size}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {item.product.category && (
                          <p className="text-sm text-gray-500 mt-1">
                            {typeof item.product.category === 'string' 
                              ? item.product.category 
                              : item.product.category}
                          </p>
                        )}
                        {!item.product.in_stock && (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            Out of Stock
                          </p>
                        )}
                        {item.product.in_stock && item.product.stock_quantity < 5 && (
                          <p className="text-sm text-orange-600 font-medium mt-1">
                            Only {item.product.stock_quantity} left in stock
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-1 italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2 text-left md:text-center">
                      <span className="md:hidden font-semibold mr-2">Price:</span>
                      <span className="text-gray-900">
                        ৳{price.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 flex justify-start md:justify-center">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={isItemUpdating || item.quantity <= 1}
                          className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val > 0 && val <= item.product.stock_quantity) {
                              handleUpdateQuantity(item.id, val);
                            }
                          }}
                          disabled={isItemUpdating}
                          className="w-16 text-center border-x border-gray-300 outline-none py-2 disabled:bg-gray-50"
                          min="1"
                          max={item.product.stock_quantity}
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={isItemUpdating || item.quantity >= item.product.stock_quantity}
                          className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="md:col-span-2 text-left md:text-right">
                      <span className="md:hidden font-semibold mr-2">Subtotal:</span>
                      <span className="font-bold text-red-700">
                        ৳{itemTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="flex-1 px-4 py-3 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-red-700"
              />
              <button 
                onClick={() => {
                  console.log('Apply coupon:', couponCode);
                  alert('Coupon functionality coming soon!');
                }}
                disabled={!couponCode.trim()}
                className="bg-red-700 text-white px-8 py-3 rounded font-semibold hover:bg-red-800 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                APPLY COUPON
              </button>
            </div>
          </div>

          {/* Cart Totals */}
          <div className="lg:w-96">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">CART TOTALS</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-700">Subtotal ({selectedItems.size} items)</span>
                  <span className="font-semibold text-gray-900">
                    ৳{subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="py-3 border-b">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">
                      ঢাকার ভিতরে: <span className="text-red-700 font-semibold">৳60.00</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Shipping</span>
                    <span className="font-semibold text-gray-900">
                      {shippingFee > 0 ? (
                        `৳${shippingFee.toFixed(2)}`
                      ) : (
                        <span className="text-green-600">Free shipping</span>
                      )}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      alert('Address change functionality coming soon!');
                    }}
                    className="text-sm text-red-700 hover:underline mt-2"
                  >
                    Change address
                  </button>
                </div>

                <div className="flex justify-between py-4">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-red-700">
                    ৳{total.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button 
                  onClick={handleProceedToCheckout}
                  disabled={selectedItems.size === 0 || isUpdating.size > 0}
                  className="w-full bg-red-700 text-white py-4 rounded font-bold text-lg hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating.size > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </span>
                  ) : (
                    `PROCEED TO CHECKOUT (${selectedItems.size})`
                  )}
                </button>

                <button
                  onClick={() => router.push('/e-commerce')}
                  className="w-full bg-white text-red-700 border-2 border-red-700 py-3 rounded font-semibold hover:bg-red-50 transition-colors mt-3"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}