import React from 'react';
import { X, ShoppingCart, DollarSign, Package, Barcode, Store } from 'lucide-react';

interface DefectItem {
  id: string;
  barcode: string;
  productId: number;
  productName: string;
  status: 'pending' | 'approved' | 'sold';
  addedBy: string;
  addedAt: string;
  originalOrderId?: number;
  customerPhone?: string;
  sellingPrice?: number;
  returnReason?: string;
  store?: string;
}

interface SellDefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defect: DefectItem;
  sellPrice: string;
  setSellPrice: (price: string) => void;
  sellType: 'pos' | 'social';
  setSellType: (type: 'pos' | 'social') => void;
  onSell: () => void;
  loading: boolean;
}

export default function SellDefectModal({
  isOpen,
  onClose,
  defect,
  sellPrice,
  setSellPrice,
  sellType,
  setSellType,
  onSell,
  loading
}: SellDefectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full transform transition-all animate-in zoom-in-95 duration-200 border border-gray-300 dark:border-gray-600">
        {/* Header */}
        <div className="relative p-4 border-b border-gray-300 dark:border-gray-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            disabled={loading}
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sell Defective Item</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Configure sale details</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Product Info Card */}
          <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Package className="w-3 h-3 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Product</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{defect.productName}</p>
                  </div>
                </div>
                {defect.returnReason && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                    Return
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <Barcode className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Barcode</p>
                    <p className="text-xs font-mono text-gray-900 dark:text-white">{defect.barcode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Product ID</p>
                    <p className="text-xs text-gray-900 dark:text-white">#{defect.productId}</p>
                  </div>
                </div>
              </div>

              {defect.returnReason && (
                <div className="pt-1 border-t border-gray-300 dark:border-gray-600">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Return Reason</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{defect.returnReason}</p>
                </div>
              )}

              {defect.customerPhone && (
                <div className="pt-1 border-t border-gray-300 dark:border-gray-600">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Customer Phone</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{defect.customerPhone}</p>
                </div>
              )}

              {defect.store && (
                <div className="pt-1 border-t border-gray-300 dark:border-gray-600">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Store</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{defect.store}</p>
                </div>
              )}
            </div>
          </div>

          {/* Selling Price Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" />
              Selling Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">৳</span>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-all placeholder:text-gray-400"
                autoFocus
              />
            </div>
            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Enter discounted price for this item</p>
          </div>

          {/* Sale Platform Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Store className="w-3 h-3" />
              Sale Platform
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSellType('pos')}
                className={`flex-1 py-1.5 px-2 border rounded text-xs font-medium transition-all ${
                  sellType === 'pos'
                    ? 'border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                POS
              </button>
              <button
                onClick={() => setSellType('social')}
                className={`flex-1 py-1.5 px-2 border rounded text-xs font-medium transition-all ${
                  sellType === 'social'
                    ? 'border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Social
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-0 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onSell}
            disabled={loading || !sellPrice || parseFloat(sellPrice) <= 0}
            className="flex-1 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-md transition-all text-sm font-medium disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                Sell via {sellType === 'pos' ? 'POS' : 'Social'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
