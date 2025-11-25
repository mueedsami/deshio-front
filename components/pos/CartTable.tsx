'use client';

import { Trash2, Plus, Minus } from 'lucide-react';

export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  batchId: number;
  batchNumber: string;
  qty: number;
  price: number;
  discount: number;
  amount: number;
  availableQty: number;
  barcode?: string;
}

interface CartTableProps {
  items: CartItem[];
  onRemoveItem: (id: number) => void;
  onUpdateQuantity: (id: number, newQty: number) => void;
  onUpdateDiscount: (id: number, discountValue: number) => void;
  darkMode: boolean;
  vatRate?: number; // VAT percentage to calculate per-product tax
}

export default function CartTable({ 
  items, 
  onRemoveItem, 
  onUpdateQuantity, 
  onUpdateDiscount,
  darkMode,
  vatRate = 0
}: CartTableProps) {
  
  /**
   * Calculate proportional VAT for a specific item
   */
  const calculateItemVAT = (item: CartItem): number => {
    if (vatRate === 0) return 0;
    
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    if (subtotal === 0) return 0;
    
    const totalVAT = (subtotal * vatRate) / 100;
    const itemShare = item.amount / subtotal;
    const itemVAT = totalVAT * itemShare;
    
    return itemVAT;
  };
  
  /**
   * Calculate total with VAT for a specific item
   */
  const getItemTotalWithVAT = (item: CartItem): number => {
    return item.amount + calculateItemVAT(item);
  };
  
  /**
   * Handle discount percentage input
   */
  const handleDiscountPercentChange = (item: CartItem, percent: number) => {
    const baseAmount = item.price * item.qty;
    const discountValue = (baseAmount * percent) / 100;
    onUpdateDiscount(item.id, discountValue);
  };

  /**
   * Handle discount amount input
   */
  const handleDiscountAmountChange = (item: CartItem, amount: number) => {
    const baseAmount = item.price * item.qty;
    const discountValue = Math.min(amount, baseAmount); // Can't discount more than total
    onUpdateDiscount(item.id, discountValue);
  };

  /**
   * Calculate discount percentage for display
   */
  const getDiscountPercent = (item: CartItem): number => {
    if (item.discount === 0) return 0;
    const baseAmount = item.price * item.qty;
    return (item.discount / baseAmount) * 100;
  };

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No items in cart. Scan or add products to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Subtotal
              </th>
              {vatRate > 0 && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  VAT ({vatRate}%)
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                {/* Product Info */}
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Batch: {item.batchNumber}
                    </p>
                    {item.barcode && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.barcode}
                      </p>
                    )}
                  </div>
                </td>

                {/* Quantity Controls */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        if (item.qty > 1) {
                          onUpdateQuantity(item.id, item.qty - 1);
                        }
                      }}
                      disabled={item.qty <= 1}
                      className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3 h-3 text-gray-700 dark:text-gray-300" />
                    </button>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        if (newQty > 0 && newQty <= item.availableQty) {
                          onUpdateQuantity(item.id, newQty);
                        }
                      }}
                      min="1"
                      max={item.availableQty}
                      className="w-16 text-center px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => {
                        if (item.qty < item.availableQty) {
                          onUpdateQuantity(item.id, item.qty + 1);
                        }
                      }}
                      disabled={item.qty >= item.availableQty}
                      className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                    Stock: {item.availableQty}
                  </p>
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ৳{item.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ৳{(item.price * item.qty).toFixed(2)}
                  </p>
                </td>

                {/* Discount Inputs */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-center">
                    {/* Discount Percentage */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="%"
                        defaultValue={getDiscountPercent(item) > 0 ? getDiscountPercent(item).toFixed(1) : ''}
                        onBlur={(e) => {
                          const percent = parseFloat(e.target.value) || 0;
                          if (percent >= 0) {
                            handleDiscountPercentChange(item, percent);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const percent = parseFloat((e.target as HTMLInputElement).value) || 0;
                            if (percent >= 0) {
                              handleDiscountPercentChange(item, percent);
                            }
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs text-center"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                    </div>

                    {/* Discount Amount */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">৳</span>
                      <input
                        type="number"
                        placeholder="0"
                        defaultValue={item.discount > 0 ? item.discount.toFixed(2) : ''}
                        onBlur={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          if (amount >= 0) {
                            handleDiscountAmountChange(item, amount);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const amount = parseFloat((e.target as HTMLInputElement).value) || 0;
                            if (amount >= 0) {
                              handleDiscountAmountChange(item, amount);
                            }
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs text-center"
                      />
                    </div>
                  </div>
                </td>

                {/* Total Amount (Before VAT) */}
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ৳{item.amount.toFixed(2)}
                  </p>
                  {item.discount > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      -৳{item.discount.toFixed(2)} off
                    </p>
                  )}
                </td>

                {/* VAT Column (Conditional) */}
                {vatRate > 0 && (
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      ৳{calculateItemVAT(item).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {((item.amount / items.reduce((s, i) => s + i.amount, 0)) * 100).toFixed(1)}%
                    </p>
                  </td>
                )}

                {/* Final Total (With VAT) */}
                <td className="px-4 py-3 text-right">
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    ৳{getItemTotalWithVAT(item).toFixed(2)}
                  </p>
                </td>

                {/* Remove Button */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cart Summary */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              ৳{items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
            </span>
          </div>
          
          {items.some(item => item.discount > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-green-600 dark:text-green-400">
                Total Savings
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                -৳{items.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}
              </span>
            </div>
          )}
          
          {vatRate > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-600 dark:text-blue-400">
                VAT ({vatRate}%)
              </span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                +৳{items.reduce((sum, item) => sum + calculateItemVAT(item), 0).toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
            <span className="text-base font-bold text-gray-900 dark:text-white">
              Grand Total
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ৳{items.reduce((sum, item) => sum + getItemTotalWithVAT(item), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}