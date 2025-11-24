'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Scan, CheckCircle, AlertCircle, Package, Info } from 'lucide-react';
import { ProductDispatch, DispatchItem } from '@/services/dispatchService';
import dispatchService from '@/services/dispatchService';

interface ScannedBarcode {
  id: number;
  barcode: string;
  product: {
    id: number;
    name: string;
  };
  scanned_at: string;
  scanned_by: string;
}

interface ItemScanningProgress {
  dispatch_item_id: number;
  required_quantity: number;
  scanned_count: number;
  remaining_count: number;
  scanned_barcodes: ScannedBarcode[];
}

interface DispatchBarcodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: ProductDispatch;
  onComplete: () => void;
  onMarkDelivered?: () => void;
}

const DispatchBarcodeScanModal: React.FC<DispatchBarcodeScanModalProps> = ({
  isOpen,
  onClose,
  dispatch,
  onComplete,
  onMarkDelivered,
}) => {
  const [selectedItem, setSelectedItem] = useState<DispatchItem | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<Record<number, ItemScanningProgress>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => {
    if (isOpen && dispatch.items) {
      // Load scanning progress for all items
      loadAllScanProgress();
      
      // Auto-select first item
      if (dispatch.items.length > 0 && !selectedItem) {
        setSelectedItem(dispatch.items[0]);
      }
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (isOpen && selectedItem) {
      // Focus barcode input when item is selected
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, selectedItem]);

  const loadAllScanProgress = async () => {
    if (!dispatch.items) return;

    const progressData: Record<number, ItemScanningProgress> = {};
    
    for (const item of dispatch.items) {
      try {
        const response = await dispatchService.getScannedBarcodes(dispatch.id, item.id);
        
        if (response.success) {
          progressData[item.id] = response.data;
        }
      } catch (error) {
        console.error(`Failed to load scan progress for item ${item.id}`, error);
      }
    }
    
    setScanProgress(progressData);
  };

  const loadItemScanProgress = async (itemId: number) => {
    try {
      const response = await dispatchService.getScannedBarcodes(dispatch.id, itemId);
      
      if (response.success) {
        setScanProgress(prev => ({
          ...prev,
          [itemId]: response.data,
        }));
      }
    } catch (error) {
      console.error('Failed to load scan progress', error);
    }
  };

  const handleScanBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !barcodeInput.trim()) {
      return;
    }

    setScanning(true);
    setError('');
    setSuccess('');

    try {
      const response = await dispatchService.scanBarcode(
        dispatch.id,
        selectedItem.id,
        barcodeInput.trim()
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to scan barcode');
      }

      // Show success message
      setSuccess(response.message || 'Barcode scanned successfully!');
      setBarcodeInput('');

      // Reload scan progress
      await loadItemScanProgress(selectedItem.id);

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(''), 2000);

    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Failed to scan barcode');
      
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    } finally {
      setScanning(false);
      barcodeInputRef.current?.focus();
    }
  };

  const getItemProgress = (item: DispatchItem) => {
    const progress = scanProgress[item.id];
    if (!progress) {
      return {
        scanned: 0,
        total: item.quantity,
        percentage: 0,
        isComplete: false,
      };
    }

    return {
      scanned: progress.scanned_count,
      total: progress.required_quantity,
      percentage: progress.required_quantity > 0 ? (progress.scanned_count / progress.required_quantity) * 100 : 0,
      isComplete: progress.remaining_count === 0,
    };
  };

  const getTotalScanned = () => {
    if (!dispatch.items) return 0;

    let total = 0;
    dispatch.items.forEach(item => {
      const progress = getItemProgress(item);
      total += progress.scanned;
    });

    return total;
  };

  if (!isOpen) return null;

  const currentItemProgress = selectedItem ? getItemProgress(selectedItem) : null;
  const totalScanned = getTotalScanned();

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Barcode Verification (Optional)
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded font-normal">
                  Optional
                </span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Dispatch: {dispatch.dispatch_number}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receiving at: {dispatch.destination_store.name}
              </p>
            </div>
            <button
              onClick={() => {
                onComplete(); // Refresh parent data
                onClose();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Note:</strong> Scanning barcodes is optional for verification purposes. 
                You can mark the dispatch as delivered without scanning all items.
                {totalScanned > 0 && ` (${totalScanned} items scanned so far)`}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Items List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Dispatch Items
            </h3>
            <div className="space-y-2">
              {dispatch.items?.map((item) => {
                const progress = getItemProgress(item);
                const isSelected = selectedItem?.id === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          SKU: {item.product.sku} | Qty: {item.quantity}
                        </div>
                      </div>
                      {progress.scanned > 0 && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                          {progress.scanned} scanned
                        </span>
                      )}
                    </div>

                    {progress.scanned > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {progress.scanned}/{progress.total}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scanning Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedItem ? (
              <>
                {/* Selected Item Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedItem.product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        SKU: {selectedItem.product.sku} | Batch: {selectedItem.batch.batch_number}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Expected Quantity: {selectedItem.quantity}
                      </p>
                    </div>
                  </div>

                  {currentItemProgress && currentItemProgress.scanned > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Scanned
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {currentItemProgress.scanned} / {currentItemProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${currentItemProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Barcode Scanner */}
                <form onSubmit={handleScanBarcode} className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scan or Enter Barcode
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan or type barcode..."
                        disabled={scanning}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={scanning || !barcodeInput.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {scanning ? 'Scanning...' : 'Scan'}
                    </button>
                  </div>
                </form>

                {/* Success/Error Messages */}
                {success && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-900 dark:text-green-300">{success}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-900 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Scanned Barcodes List */}
                {scanProgress[selectedItem.id]?.scanned_barcodes && 
                 scanProgress[selectedItem.id].scanned_barcodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Scanned Barcodes ({scanProgress[selectedItem.id].scanned_barcodes.length})
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                                Barcode
                              </th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                                Scanned At
                              </th>
                              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                                Scanned By
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {scanProgress[selectedItem.id].scanned_barcodes.map((barcode, index) => (
                              <tr
                                key={index}
                                className="border-t border-gray-200 dark:border-gray-700"
                              >
                                <td className="px-4 py-2 text-gray-900 dark:text-white font-mono">
                                  {barcode.barcode}
                                </td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                  {new Date(barcode.scanned_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                  {barcode.scanned_by}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select an item to start scanning
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalScanned > 0 ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {totalScanned} items scanned for verification
                </span>
              ) : (
                <span>
                  Scan items for optional verification
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {onMarkDelivered && (
                <button
                  onClick={() => {
                    onMarkDelivered();
                    onClose();
                  }}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Delivered
                </button>
              )}
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchBarcodeScanModal;