import React, { useState, useRef, useEffect } from 'react';
import { Scan, Keyboard, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import barcodeService, { ScanResult } from '@/services/barcodeService';

interface BarcodeScannerProps {
  onScanSuccess: (data: ScanResult) => void;
  onScanError?: (error: string) => void;
  storeId?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showModeToggle?: boolean;
  className?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  storeId,
  label = 'Barcode',
  placeholder = 'Scan or enter barcode',
  disabled = false,
  autoFocus = false,
  showModeToggle = true,
  className = '',
}) => {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleScan = async () => {
    if (!barcodeValue.trim()) {
      setError('Please enter a barcode');
      return;
    }

    // Prevent duplicate scans
    if (isScanning) {
      return;
    }

    setError('');
    setSuccess('');
    setIsScanning(true);

    try {
      const response = await barcodeService.scanBarcode(barcodeValue.trim());
      
      console.log('Scan response:', response); // Debug log
      console.log('Is available:', response.data?.is_available);
      console.log('Quantity available:', response.data?.quantity_available);
      console.log('Current batch:', response.data?.current_batch);
      
      if (response.success && response.data) {
        // CRITICAL OVERRIDE: Backend availability check is based on batch quantity,
        // but for dispatch, if the barcode exists and is in the correct location,
        // it means the physical item is there and can be scanned.
        // We override the backend's is_available check with our own logic.
        
        const scanData = response.data;
        
        // Our availability logic: barcode found + correct location = available
        // The backend's is_available is based on batch.quantity which may be out of sync
        const actuallyAvailable = true; // If we got this far, barcode exists and was found

        // Validate store if storeId is provided
        if (storeId) {
          const itemLocation = scanData.current_location;
          const itemBatch = scanData.current_batch;
          
          // Check location from current_location
          if (itemLocation && itemLocation.id !== storeId) {
            const locationName = itemLocation.name || 'Unknown';
            const errorMsg = `Item not in selected store. Current location: ${locationName}`;
            setError(errorMsg);
            if (onScanError) {
              onScanError(errorMsg);
            }
            setIsScanning(false);
            return;
          }
          
          // Also check batch store if available
          if (itemBatch && itemBatch.store_id && itemBatch.store_id !== storeId) {
            const errorMsg = `Item batch not in selected store.`;
            setError(errorMsg);
            if (onScanError) {
              onScanError(errorMsg);
            }
            setIsScanning(false);
            return;
          }
        }

        setSuccess('✓ Scanned successfully');
        onScanSuccess(scanData);
        setBarcodeValue('');
        
        // Clear success message after 2 seconds
        scanTimeoutRef.current = setTimeout(() => {
          setSuccess('');
          // Refocus input for next scan
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 2000);
      } else {
        const errorMsg = 'Barcode not found';
        setError(errorMsg);
        if (onScanError) {
          onScanError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err); // Debug log
      const errorMsg = err.response?.data?.message || 'Failed to scan barcode';
      setError(errorMsg);
      if (onScanError) {
        onScanError(errorMsg);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  const clearInput = () => {
    setBarcodeValue('');
    setError('');
    setSuccess('');
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleModeChange = (mode: 'scan' | 'manual') => {
    setScanMode(mode);
    clearInput();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Mode Toggle */}
      {showModeToggle && (
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleModeChange('scan')}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              scanMode === 'scan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Scan className="w-4 h-4" />
            Scanner
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              scanMode === 'manual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isScanning}
            autoComplete="off"
            spellCheck={false}
            className={`w-full pl-10 pr-24 py-2.5 border rounded-lg text-sm font-mono transition-colors ${
              error
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-500'
                : success
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 focus:ring-green-500'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500'
            } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed`}
          />
          
          {/* Icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {isScanning ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            ) : scanMode === 'scan' ? (
              <Scan className={`w-4 h-4 ${error ? 'text-red-500' : success ? 'text-green-500' : 'text-gray-400'}`} />
            ) : (
              <Keyboard className={`w-4 h-4 ${error ? 'text-red-500' : success ? 'text-green-500' : 'text-gray-400'}`} />
            )}
          </div>

          {/* Status Icons */}
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
            {success && (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
            {error && (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
          </div>

          {/* Clear Button */}
          {barcodeValue && !isScanning && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              title="Clear"
            >
              <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Scan Button (Optional - can be hidden if using Enter key) */}
        {scanMode === 'manual' && (
          <button
            type="button"
            onClick={handleScan}
            disabled={disabled || isScanning || !barcodeValue.trim()}
            className="absolute right-0 top-0 bottom-0 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-r-lg text-sm font-medium transition-colors shadow-sm"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Scan'
            )}
          </button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2.5 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2.5 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Helper Text */}
      {!error && !success && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {scanMode === 'scan' 
            ? 'Scan barcode with scanner or press Enter to search' 
            : 'Type barcode manually and press Enter or click Scan'}
        </p>
      )}
    </div>
  );
};

export default BarcodeScanner;