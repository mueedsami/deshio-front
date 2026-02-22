'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
import { useCart } from '../../../app/e-commerce/CartContext';
import { useRouter } from 'next/navigation';
import CartItem from './CartItem';
import campaignService from '@/services/campaignService';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cart, getTotalPrice, isLoading } = useCart();
  const router = useRouter();

  const [discountData, setDiscountData] = useState<{
    total_discount: number;
    campaigns_applied: { id: number; name: string; type: string; value: number }[];
  } | null>(null);

  // Fetch discount preview whenever cart changes and sidebar is open
  useEffect(() => {
    if (!isOpen || cart.length === 0) {
      setDiscountData(null);
      return;
    }
    const items = cart.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: Number(item.price) || 0,
    }));
    campaignService.calculateDiscount(items)
      .then(data => setDiscountData(data))
      .catch(() => setDiscountData(null));
  }, [isOpen, cart]);

  const subtotal = getTotalPrice();
  const automaticDiscount = discountData?.total_discount || 0;
  const discountedTotal = Math.max(0, subtotal - automaticDiscount);

  const freeShippingThreshold = 5000;
  const remaining = Math.max(0, freeShippingThreshold - discountedTotal);
  const progress = Math.min(100, (discountedTotal / freeShippingThreshold) * 100);

  const handleCheckout = () => {
    router.push('/e-commerce/checkout');
    onClose();
  };

  const handleViewCart = () => {
    router.push('/e-commerce/cart');
    onClose();
  };

  return (
    <>
      <div
        className={`
          fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white">
          <h2 className="text-xl font-bold text-gray-900">Shopping cart</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Active campaigns strip */}
        {discountData && discountData.campaigns_applied.length > 0 && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2">
            <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Active Offers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {discountData.campaigns_applied.map(c => (
                <span key={c.id} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  🎁 {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}

          {!isLoading && cart.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Your cart is empty</p>
              <button onClick={onClose} className="mt-4 text-teal-600 hover:text-teal-700 font-medium">
                Continue Shopping
              </button>
            </div>
          )}

          {!isLoading && cart.length > 0 && (
            <div className="space-y-4">
              {cart.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && cart.length > 0 && (
          <div className="border-t p-6 space-y-4 bg-white">
            {/* Free Shipping Progress */}
            {remaining > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Add <span className="font-bold text-red-700">৳{remaining.toFixed(2)}</span> to cart and get free shipping!
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-700 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-semibold">🎉 You've qualified for free shipping!</p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>৳{subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
              </div>

              {automaticDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Sale Discount
                  </span>
                  <span>-৳{automaticDiscount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-red-700">
                  ৳{discountedTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleViewCart}
                className="w-full bg-white border-2 border-gray-900 text-gray-900 py-3 rounded font-semibold hover:bg-gray-50 transition-colors"
              >
                VIEW CART
              </button>
              <button
                onClick={handleCheckout}
                className="w-full bg-red-700 text-white py-3 rounded font-semibold hover:bg-red-800 transition-colors"
              >
                CHECKOUT
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          body {
            overflow: ${isOpen ? 'hidden' : 'auto'};
          }
        }
      `}</style>
    </>
  );
}
