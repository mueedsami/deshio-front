import { useState, useEffect } from 'react';
import { X, Plus, Minus, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface QueuedProduct {
  id: number | string;
  product_id: number;
  batch_id: number | null;
  productName: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  amount: number;
  image?: string | null;
}

interface SocialCommerceQueueProps {
  onBack: () => void;
  onUpdateQuantity: (id: number | string, delta: number) => void;
  onRemove: (id: number | string) => void;
  onClear: () => void;
  items: QueuedProduct[];
}

export default function SocialCommerceQueue({
  onBack,
  onUpdateQuantity,
  onRemove,
  onClear,
  items
}: SocialCommerceQueueProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const router = useRouter();



  const totalProducts = items.length;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-4 shadow-2xl flex items-center gap-3 hover:scale-105 transition-all group"
        >
          <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {totalProducts}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-teal-600">
            Open Queue
          </span>
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Social Commerce Queue</h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''} • {totalItems} total item{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1 text-[10px] font-bold text-gray-500 hover:text-red-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[100px] max-h-[400px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 text-gray-400">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Your queue is empty</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Add items from the list below</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3 hover:border-teal-200 dark:hover:border-teal-900 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate pr-6">
                    {item.productName}
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                    {item.sku}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    ৳{item.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={items.length === 0}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Social Commerce ({totalItems})
        </button>
      </div>
    </div>
  );
}
