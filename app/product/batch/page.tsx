'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import BatchForm from '@/components/BatchForm';
import BatchCard from '@/components/BatchCard';
import batchService, { Batch, CreateBatchData } from '@/services/batchService';
import storeService, { Store } from '@/services/storeService';

interface Product {
  id: number;
  name: string;
}

export default function BatchPage() {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  // Read URL parameters when redirected back from product selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('productId');
      const pname = params.get('productName');
      
      if (pid) {
        setSelectedProductId(Number(pid));
      }
      
      if (pname) {
        setSelectedProductName(decodeURIComponent(pname));
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load stores
      const storesResponse = await storeService.getStores({ is_active: true });
      const storesData = storesResponse.data?.data || storesResponse.data || [];
      setStores(storesData);
      
      // Set first store as default if none selected
      if (storesData.length > 0 && !selectedStoreId) {
        setSelectedStoreId(storesData[0].id);
      }

      // Load batches
      const batchResponse = await batchService.getBatches({
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      const batchData = batchResponse.data?.data || batchResponse.data || [];
      setBatches(Array.isArray(batchData) ? batchData : []);
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openProductListForSelection = () => {
    router.push('/product/list?selectMode=true&redirect=/product/batch');
  };

  const handleAddBatch = async (formData: { costPrice: string; sellingPrice: string; quantity: string }) => {
    const { costPrice, sellingPrice, quantity } = formData;

    if (!selectedProductId || !selectedStoreId || !costPrice || !sellingPrice || !quantity) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const costPriceNum = parseFloat(costPrice);
    const sellingPriceNum = parseFloat(sellingPrice);
    const quantityNum = parseInt(quantity);

    console.log('Form values:', { costPrice, sellingPrice, quantity });
    console.log('Parsed values:', { costPriceNum, sellingPriceNum, quantityNum });

    // Validate positive numbers
    if (isNaN(costPriceNum) || isNaN(sellingPriceNum) || isNaN(quantityNum) || 
        costPriceNum <= 0 || sellingPriceNum <= 0 || quantityNum <= 0) {
      showToast('Please enter valid positive numbers', 'error');
      return;
    }

    try {
      setLoading(true);

      const batchData: CreateBatchData = {
        product_id: selectedProductId,
        store_id: selectedStoreId,
        quantity: quantityNum,
        cost_price: costPriceNum,
        sell_price: sellingPriceNum,
        // ✅ GENERATE BARCODES DURING BATCH CREATION
        generate_barcodes: true,
        barcode_type: 'CODE128',
        // ✅ Generate individual barcodes for each unit (if quantity <= 100)
        individual_barcodes: quantityNum <= 100,
      };

      console.log('Sending to API:', batchData);

      const response = await batchService.createBatch(batchData);
      
      console.log('API Response:', response);
      console.log('Barcodes generated:', response.data.barcodes_generated);
      console.log('Primary barcode:', response.data.primary_barcode);
      
      // Reload batches to get the newly created batch with barcodes
      await loadInitialData();
      
      showToast(
        `Batch created successfully! ${response.data.barcodes_generated} barcode(s) generated.`, 
        'success'
      );

      // Clear form
      handleClear();
      
    } catch (err: any) {
      console.error('Failed to create batch:', err);
      showToast(err.response?.data?.message || 'Failed to create batch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    try {
      console.log('Deleting batch:', batchId);
      
      const response = await batchService.deleteBatch(batchId);
      
      console.log('Delete response:', response);
      
      // Remove from local state
      setBatches(prev => prev.filter(b => b.id !== batchId));
      
      showToast('Batch deactivated successfully', 'success');
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMsg = err.response?.data?.message || 'Failed to delete batch';
      showToast(errorMsg, 'error');
    }
  };

  const handleClear = () => {
    setSelectedProductId(null);
    setSelectedProductName('');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const selectedProduct = selectedProductId 
    ? { id: selectedProductId, name: selectedProductName }
    : undefined;

  const selectedStore = selectedStoreId
    ? stores.find(s => s.id === selectedStoreId)
    : undefined;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Batches</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create batches and generate barcodes automatically
              </p>
            </div>

            <BatchForm
              selectedProduct={selectedProduct}
              selectedStore={selectedStore}
              stores={stores}
              onProductClick={openProductListForSelection}
              onStoreChange={setSelectedStoreId}
              onAddBatch={handleAddBatch}
              onClear={handleClear}
              loading={loading}
            />

            {/* Loading indicator */}
            {loading && (
              <div className="mb-4 flex items-center justify-center py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-600 dark:text-blue-400">
                  Creating batch and generating barcodes...
                </span>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Batches
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {batches.length} batch{batches.length !== 1 ? 'es' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.length === 0 && !loading ? (
                <div className="col-span-3 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No batches created yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Create your first batch to get started
                  </p>
                </div>
              ) : (
                batches.map(batch => (
                  <BatchCard 
                    key={batch.id} 
                    batch={batch}
                    onDelete={handleDeleteBatch}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg shadow-xl text-white transform transition-all duration-300 z-50 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } animate-slideIn`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}