'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import cartService from '@/services/cartService';
import { useCart } from '../../../app/e-commerce/CartContext';

interface CartItemProps {
  item: {
    id: number;
    name: string;
    image: string;
    price: string | number;
    quantity: number;
    sku?: string;
    color?: string;
    size?: string;
  };
  onQuantityChange?: (itemId: number, newQuantity: number) => Promise<void>;
  onRemove?: (itemId: number) => Promise<void>;
  isUpdating?: boolean;
}

export default function CartItem({ item, onQuantityChange, onRemove, isUpdating: externalIsUpdating }: CartItemProps) {
  const { refreshCart } = useCart();
  const router = useRouter();
  const [internalIsUpdating, setInternalIsUpdating] = useState(false);
  
  // Use external isUpdating if provided, otherwise use internal
  const isUpdating = externalIsUpdating !== undefined ? externalIsUpdating : internalIsUpdating;
  
  // Safely parse price
  const price = typeof item?.price === 'string' 
    ? parseFloat(item.price) 
    : typeof item?.price === 'number' 
    ? item.price 
    : 0;
  
  const itemTotal = price * (item?.quantity || 0);

  // ✅ Handle quantity update with backend
  const handleQuantityChange = async (delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;
    
    // If parent provides handler, use it
    if (onQuantityChange) {
      await onQuantityChange(item.id, newQuantity);
      return;
    }
    
    // Otherwise handle internally
    try {
      setInternalIsUpdating(true);
      await cartService.updateQuantity(item.id, { quantity: newQuantity });
      await refreshCart();
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      alert(error.message || 'Failed to update quantity');
      await refreshCart();
    } finally {
      setInternalIsUpdating(false);
    }
  };

  // ✅ Handle direct input change
  const handleInputChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isNaN(newQuantity)) return;
    
    // If parent provides handler, use it
    if (onQuantityChange) {
      await onQuantityChange(item.id, newQuantity);
      return;
    }
    
    // Otherwise handle internally
    try {
      setInternalIsUpdating(true);
      await cartService.updateQuantity(item.id, { quantity: newQuantity });
      await refreshCart();
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      alert(error.message || 'Failed to update quantity');
      await refreshCart();
    } finally {
      setInternalIsUpdating(false);
    }
  };

  // ✅ Handle remove item with backend
  const handleRemove = async () => {
    if (!confirm('Remove this item from cart?')) return;
    
    // If parent provides handler, use it
    if (onRemove) {
      await onRemove(item.id);
      return;
    }
    
    // Otherwise handle internally
    try {
      setInternalIsUpdating(true);
      await cartService.removeFromCart(item.id);
      await refreshCart();
    } catch (error: any) {
      console.error('Error removing item:', error);
      alert(error.message || 'Failed to remove item');
      await refreshCart();
    } finally {
      setInternalIsUpdating(false);
    }
  };

  // ✅ Navigate to product detail
  const handleNavigateToProduct = () => {
    router.push(`/e-commerce/product/${item.id}`);
  };

  // Safety check
  if (!item) {
    return null;
  }

  return (
    <div className="flex gap-4 border-b pb-4 relative">
      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      )}

      {/* Product Image */}
      <div 
        className="relative w-20 h-20 flex-shrink-0 cursor-pointer"
        onClick={handleNavigateToProduct}
      >
        <img
          src={item.image || '/placeholder-product.jpg'}
          alt={item.name}
          className="w-full h-full object-cover rounded hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h3 
              className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-teal-600 transition-colors"
              onClick={handleNavigateToProduct}
            >
              {item.name}
            </h3>
            
            {/* Variant Info */}
            {(item.color || item.size) && (
              <p className="text-xs text-gray-500 mt-1">
                {item.color && <span>Color: {item.color}</span>}
                {item.color && item.size && <span> | </span>}
                {item.size && <span>Size: {item.size}</span>}
              </p>
            )}
            
            {item.sku && (
              <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
            )}
          </div>
          <button
            onClick={handleRemove}
            disabled={isUpdating}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove from cart"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center border border-gray-300 rounded">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={isUpdating || item.quantity <= 1}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && !isUpdating) {
                  handleInputChange(val);
                }
              }}
              disabled={isUpdating}
              className="w-12 text-center border-x border-gray-300 outline-none text-sm font-semibold disabled:bg-gray-50 disabled:cursor-not-allowed"
              min="1"
            />
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={isUpdating}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">
              ৳{price.toLocaleString('en-BD', { minimumFractionDigits: 2 })} each
            </p>
            <p className="text-sm font-bold text-red-700">
              ৳{itemTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}