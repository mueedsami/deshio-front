import React from 'react';
import { Trash2, AlertCircle, Package } from 'lucide-react';

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
  isDefective?: boolean; // ✅ New flag
  defectId?: string; // ✅ New field
}

interface CartTableProps {
  items: CartItem[];
  onRemoveItem: (id: number) => void;
  onUpdateQuantity: (id: number, newQty: number) => void;
  darkMode: boolean;
}

export default function CartTable({ items, onRemoveItem, onUpdateQuantity, darkMode }: CartTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Cart is empty</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Scan or select products to add them to cart
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Cart Items ({items.length})
        </h2>
        {items.some(item => item.isDefective) && (
          <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-4 h-4" />
            <span>Contains defective items</span>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                Product
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                Batch
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                Qty
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                Price
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                Discount
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                Amount
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr 
                key={item.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  item.isDefective ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.productName}
                        </p>
                        {/* ✅ Defective Badge */}
                        {item.isDefective && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded font-medium">
                            DEFECTIVE
                          </span>
                        )}
                      </div>
                      {item.barcode && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {item.barcode}
                        </p>
                      )}
                      {/* ✅ Defect ID for debugging */}
                      {item.isDefective && item.defectId && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                          Defect ID: {item.defectId}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {item.batchNumber}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Batch ID: {item.batchId}
                  </p>
                </td>
                
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {/* ✅ Prevent quantity changes for defective items */}
                    {item.isDefective ? (
                      <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-center font-medium text-gray-900 dark:text-white">
                        {item.qty}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.max(1, item.qty - 1))}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.availableQty}
                          value={item.qty}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            if (newQty > 0 && newQty <= item.availableQty) {
                              onUpdateQuantity(item.id, newQty);
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.min(item.availableQty, item.qty + 1))}
                          disabled={item.qty >= item.availableQty}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {item.isDefective ? 'Fixed qty' : `Available: ${item.availableQty}`}
                  </p>
                </td>
                
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ৳{item.price.toFixed(2)}
                  </p>
                </td>
                
                <td className="px-4 py-3 text-right">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    ৳{item.discount.toFixed(2)}
                  </p>
                </td>
                
                <td className="px-4 py-3 text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ৳{item.amount.toFixed(2)}
                  </p>
                </td>
                
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          
          {/* Summary Row */}
          <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Subtotal:
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  ৳{items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ✅ Warning message for defective items */}
      {items.some(item => item.isDefective) && (
        <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-orange-900 dark:text-orange-300">
                Defective Items Notice
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                This cart contains {items.filter(i => i.isDefective).length} defective item(s). 
                Quantity cannot be changed for defective items. 
                After order completion, defect status will be automatically updated.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}