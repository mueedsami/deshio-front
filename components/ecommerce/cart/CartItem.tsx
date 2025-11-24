'use client';

import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useCart } from '../../../app/e-commerce/CartContext';

export default function CartItem({ item }: any) {
  const { updateQuantity, removeFromCart } = useCart();
  const price = parseFloat(item.price || 0);
  const itemTotal = price * item.quantity;

  return (
    <div className="flex gap-4 border-b pb-4">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover rounded"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
              {item.name}
            </h3>
            {item.sku && (
              <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
            )}
          </div>
          <button
            onClick={() => removeFromCart(item.id)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center border border-gray-300 rounded">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-1.5 hover:bg-gray-100 transition-colors"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                updateQuantity(item.id, val);
              }}
              className="w-12 text-center border-x border-gray-300 outline-none"
              min="1"
            />
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-1.5 hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-sm font-bold text-red-700">
              {itemTotal.toLocaleString()}.00৳
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}