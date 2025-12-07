import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import BatchPrinter from './BatchPrinter';
import BatchEditModal from './BatchEditModal';
import { Batch, UpdateBatchData } from '@/services/batchService';
import { barcodeTrackingService } from '@/services/barcodeTrackingService';

interface BatchCardProps {
  batch: Batch;
  onDelete?: (batchId: number) => void;
  onEdit?: (batchId: number, data: UpdateBatchData) => Promise<void>;
}

export default function BatchCard({ batch, onDelete, onEdit }: BatchCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [loadingBarcodes, setLoadingBarcodes] = useState(true);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [showAllBarcodes, setShowAllBarcodes] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch barcodes for THIS specific batch
  useEffect(() => {
    fetchBatchBarcodes();
  }, [batch.id]);

  const fetchBatchBarcodes = async () => {
    try {
      setLoadingBarcodes(true);
      setBarcodeError(null);
      
      // Use the batch-specific endpoint
      const response = await barcodeTrackingService.getBatchBarcodes(batch.id);
      
      if (response.success && response.data.barcodes) {
        // Extract active barcode strings
        const barcodeValues = response.data.barcodes
          .filter(b => b.is_active)
          .map(b => b.barcode);
        
        setBarcodes(barcodeValues);
        console.log(`Loaded ${barcodeValues.length} barcodes for batch ${batch.id}`);
      } else {
        setBarcodeError('No barcodes found for this batch');
        setBarcodes([]);
      }
    } catch (error: any) {
      console.error('Error fetching batch barcodes:', error);
      setBarcodeError(error.message || 'Failed to load barcodes');
      setBarcodes([]);
    } finally {
      setLoadingBarcodes(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this batch? This will also deactivate all associated barcodes.')) {
      return;
    }
    
    try {
      setDeleting(true);
      
      if (onDelete) {
        await onDelete(batch.id);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (batchId: number, data: UpdateBatchData) => {
    if (onEdit) {
      await onEdit(batchId, data);
    }
  };

  // Helper to parse Laravel formatted numbers (removes commas)
  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, ''));
  };

  // Primary barcode (first one or batch barcode)
  const primaryBarcode = barcodes[0] || batch.barcode?.barcode || batch.batch_number;

  // Convert Laravel batch to legacy format for existing components
  const legacyBatch = {
    id: batch.id,
    productId: batch.product.id,
    quantity: batch.quantity,
    costPrice: parseFormattedNumber(batch.cost_price),
    sellingPrice: parseFormattedNumber(batch.sell_price),
    baseCode: primaryBarcode,
  };

  const legacyProduct = {
    id: batch.product.id,
    name: batch.product.name,
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 p-5 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Product</div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg">
              {batch.product.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {batch.store.name}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Quantity</div>
              <div className="font-bold text-xl text-gray-900 dark:text-white">
                {batch.quantity}
              </div>
            </div>
            
            {/* Edit Button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="group relative p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200 shadow-sm hover:shadow"
              title="Edit batch"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="group relative p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete batch"
            >
              {deleting ? (
                <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Cost</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ৳{legacyBatch.costPrice.toLocaleString('en-BD')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Selling</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ৳{legacyBatch.sellingPrice.toLocaleString('en-BD')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Profit</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {batch.profit_margin}
              </span>
            </div>
          </div>
        </div>

        {/* Barcodes Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {loadingBarcodes ? 'Loading barcodes...' : `${barcodes.length} Barcode${barcodes.length !== 1 ? 's' : ''} Generated`}
            </div>
            {barcodes.length > 1 && (
              <button
                onClick={() => setShowAllBarcodes(!showAllBarcodes)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showAllBarcodes ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>

          {loadingBarcodes ? (
            <div className="flex justify-center py-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            </div>
          ) : barcodeError ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-center">
              <p className="text-xs text-red-800 dark:text-red-300">
                {barcodeError}
              </p>
              <button
                onClick={fetchBatchBarcodes}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : barcodes.length === 0 ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-center">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                No barcodes generated yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary Barcode - Always Show */}
              <div className="flex justify-center p-3 border-2 border-blue-200 dark:border-blue-800 rounded bg-blue-50 dark:bg-blue-950/30">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                    Primary Barcode
                  </div>
                  <Barcode 
                    value={primaryBarcode} 
                    format="CODE128" 
                    renderer="svg" 
                    width={1.5} 
                    height={45} 
                    displayValue={true} 
                    margin={4}
                    fontSize={12}
                  />
                </div>
              </div>

              {/* Additional Barcodes - Show on expand */}
              {showAllBarcodes && barcodes.length > 1 && (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2 px-2">
                    All Generated Barcodes ({barcodes.length})
                  </div>
                  {barcodes.map((barcode, index) => (
                    <div key={index} className="flex justify-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex flex-col items-center">
                        <Barcode 
                          value={barcode} 
                          format="CODE128" 
                          renderer="svg" 
                          width={1.2} 
                          height={35} 
                          displayValue={true} 
                          margin={2}
                          fontSize={10}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Barcode Range Info */}
              {!showAllBarcodes && barcodes.length > 1 && (
                <div className="text-xs text-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-2">
                  <span className="font-medium">{barcodes.length} barcodes</span> from{' '}
                  <span className="font-mono">{barcodes[0]}</span>
                  {' '}to{' '}
                  <span className="font-mono">{barcodes[barcodes.length - 1]}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Print Button - Pass batch-specific barcodes */}
        <BatchPrinter 
          batch={legacyBatch} 
          product={legacyProduct} 
          barcodes={barcodes} // Pass the fetched barcodes
        />

        {/* Batch Info */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Batch: {batch.batch_number}</span>
            <span className={`px-2 py-1 rounded ${
              batch.status === 'available' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              batch.status === 'low_stock' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {batch.status?.replace('_', ' ') || 'Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <BatchEditModal
        batch={batch}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEdit}
      />
    </>
  );
}