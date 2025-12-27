'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Heart, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { wishlistUtils, WishlistItem } from '@/lib/wishlistUtils';
import { useCart } from '@/app/e-commerce/CartContext';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import CartSidebar from '@/components/ecommerce/cart/CartSidebar';

export default function WishlistPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [addingToCartId, setAddingToCartId] = useState<string | number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load wishlist items
  useEffect(() => {
    const loadWishlist = () => {
      setWishlistItems(wishlistUtils.getAll());
    };

    loadWishlist();

    // Listen for wishlist updates
    window.addEventListener('wishlist-updated', loadWishlist);
    return () => window.removeEventListener('wishlist-updated', loadWishlist);
  }, []);

  const handleAddToCart = (item: WishlistItem) => {
    setAddingToCartId(item.id);
    
    // Add to cart
    addToCart({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      sku: item.sku || '',
      quantity: 1,
    }, 1);

    setTimeout(() => {
      setAddingToCartId(null);
      setIsCartOpen(true); // Open cart sidebar after adding
    }, 1000);
  };

  const handleRemove = (id: string | number) => {
    wishlistUtils.remove(id);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your wishlist?')) {
      wishlistUtils.clear();
    }
  };

  const handleNavigateToProduct = (id: string | number) => {
    router.push(`/e-commerce/product/${id}`);
  };

  if (wishlistItems.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => router.push('/e-commerce')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Shopping</span>
            </button>

            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>
            
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart size={48} className="text-gray-300" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
                <p className="text-gray-600 mb-8">
                  Save your favorite items here to buy them later or share with friends
                </p>
                <button 
                  onClick={() => router.push('/e-commerce')}
                  className="bg-red-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/e-commerce')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Shopping</span>
          </button>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              My Wishlist ({wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'})
            </h1>
            <button
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group"
              >
                <div 
                  onClick={() => handleNavigateToProduct(item.id)}
                  className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f3f4f6" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3E' +
                        encodeURIComponent(item.name) +
                        '%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors z-10"
                    title="Remove from wishlist"
                  >
                    <X size={16} className="text-gray-700 hover:text-red-600" />
                  </button>
                </div>

                <div className="p-4">
                  <h3 
                    onClick={() => handleNavigateToProduct(item.id)}
                    className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] hover:text-red-600 cursor-pointer transition-colors"
                  >
                    {item.name}
                  </h3>
                  <p className="text-lg font-bold text-red-700 mb-4">
                    {item.price.toLocaleString()}.00৳
                  </p>
                  
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addingToCartId === item.id}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                      addingToCartId === item.id
                        ? 'bg-green-600 text-white'
                        : 'bg-red-700 text-white hover:bg-red-800'
                    }`}
                  >
                    {addingToCartId === item.id ? (
                      <>✓ Added</>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}