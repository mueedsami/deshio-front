import React, { useRef } from 'react';

interface Product {
  id: number;
  name: string;
}

interface Store {
  id: number;
  name: string;
}

interface BatchFormProps {
  selectedProduct: Product | undefined;
  selectedStore: Store | undefined;
  stores: Store[];
  onProductClick: () => void;
  onStoreChange: (storeId: number) => void;
  onAddBatch: (data: { costPrice: string; sellingPrice: string; quantity: string }) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function BatchForm({
  selectedProduct,
  selectedStore,
  stores,
  onProductClick,
  onStoreChange,
  onAddBatch,
  onClear,
  loading = false
}: BatchFormProps) {
  const costPriceRef = useRef<HTMLInputElement>(null);
  const sellingPriceRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (loading) return;
    
    onAddBatch({
      costPrice: costPriceRef.current?.value || '',
      sellingPrice: sellingPriceRef.current?.value || '',
      quantity: quantityRef.current?.value || '',
    });
  };

  const handleClear = () => {
    if (loading) return;
    
    if (costPriceRef.current) costPriceRef.current.value = '';
    if (sellingPriceRef.current) sellingPriceRef.current.value = '';
    if (quantityRef.current) quantityRef.current.value = '';
    onClear();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create New Batch
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Barcodes will be auto-generated</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Product Selection */}
        <div
          onClick={loading ? undefined : onProductClick}
          className={`border-2 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 flex items-center justify-between ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            selectedProduct ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-600'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Product *</div>
            <span className={`text-sm truncate block ${
              selectedProduct ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'
            }`}>
              {selectedProduct ? selectedProduct.name : 'Select Product...'}
            </span>
          </div>
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Store Selection */}
        <div className="relative">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Store *</label>
          <select
            value={selectedStore?.id || ''}
            onChange={e => onStoreChange(Number(e.target.value))}
            disabled={loading}
            className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select Store...</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cost Price */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cost Price *</label>
          <input
            ref={costPriceRef}
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={loading}
            onKeyPress={handleKeyPress}
            className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Selling Price */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Selling Price *</label>
          <input
            ref={sellingPriceRef}
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={loading}
            onKeyPress={handleKeyPress}
            className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity *</label>
          <input
            ref={quantityRef}
            type="number"
            placeholder="0"
            min={1}
            step="1"
            disabled={loading}
            onKeyPress={handleKeyPress}
            className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-white dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex gap-3">
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating Batch...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Batch</span>
            </>
          )}
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Individual barcodes will be automatically generated for each unit (up to 100 items). 
            For larger quantities, a primary barcode will be created.
          </div>
        </div>
      </div>
    </div>
  );
}