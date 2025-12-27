'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Store as StoreIcon, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  ArrowLeft, 
  Loader, 
  RefreshCw,
  MapPin,
  TrendingUp,
  Award,
  Box
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import orderManagementService, { 
  PendingAssignmentOrder, 
  AvailableStore,
  AvailableStoresResponse 
} from '@/services/orderManagementService';
import Toast from '@/components/Toast';

export default function StoreAssignmentPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Orders list state
  const [pendingOrders, setPendingOrders] = useState<PendingAssignmentOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Assignment state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PendingAssignmentOrder | null>(null);
  const [availableStoresData, setAvailableStoresData] = useState<AvailableStoresResponse | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      const order = pendingOrders.find(o => o.id === selectedOrderId);
      setSelectedOrder(order || null);
      fetchAvailableStores(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchPendingOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await orderManagementService.getPendingAssignment({ per_page: 100 });
      setPendingOrders(data.orders);
      console.log('📦 Loaded pending assignment orders:', data.orders.length);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      displayToast('Error loading orders: ' + error.message, 'error');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchAvailableStores = async (orderId: number) => {
    setIsLoadingStores(true);
    try {
      const data = await orderManagementService.getAvailableStores(orderId);
      setAvailableStoresData(data);
      
      // Auto-select recommended store if available
      if (data.recommendation) {
        setSelectedStoreId(data.recommendation.store_id);
      }
      
      console.log('🏪 Available stores loaded:', data.stores.length);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      displayToast('Error loading stores: ' + error.message, 'error');
    } finally {
      setIsLoadingStores(false);
    }
  };

  const handleAssignStore = async () => {
    if (!selectedOrderId || !selectedStoreId) {
      displayToast('Please select a store', 'warning');
      return;
    }

    setIsAssigning(true);
    try {
      await orderManagementService.assignOrderToStore(selectedOrderId, {
        store_id: selectedStoreId,
        notes: assignmentNotes || undefined
      });

      displayToast('✅ Order assigned successfully!', 'success');
      
      // Wait and go back to list
      setTimeout(() => {
        setSelectedOrderId(null);
        setSelectedOrder(null);
        setAvailableStoresData(null);
        setSelectedStoreId(null);
        setAssignmentNotes('');
        fetchPendingOrders();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error assigning order:', error);
      displayToast(error.message || 'Failed to assign order', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const displayToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const filteredOrders = pendingOrders.filter(order => 
    order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ORDER LIST VIEW
  if (!selectedOrderId) {
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
            
            <main className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      🏪 Store Assignment
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      Assign pending e-commerce orders to stores based on inventory availability
                    </p>
                  </div>
                  <button
                    onClick={fetchPendingOrders}
                    disabled={isLoadingOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Pending Assignment</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                          {pendingOrders.length}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <Package className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                          {pendingOrders.reduce((sum, order) => 
                            sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0
                          )}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Box className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                          ৳{pendingOrders.reduce((sum, order) => 
                            sum + parseFloat(String(order.total_amount)), 0
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by order number or customer name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Orders List */}
                {isLoadingOrders ? (
                  <div className="text-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <Package className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      {searchQuery ? 'No matching orders' : 'No pending assignment orders'}
                    </p>
                    {!searchQuery && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        All orders have been assigned to stores
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredOrders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className="p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {order.order_number}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Pending Assignment
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              👤 {order.customer?.name} • 📱 {order.customer?.phone}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {order.items_summary?.slice(0, 3).map((item, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  {item.product_name} (×{item.quantity})
                                </span>
                              ))}
                              {(order.items_summary?.length || 0) > 3 && (
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  +{(order.items_summary?.length || 0) - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              ৳{parseFloat(String(order.total_amount)).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

        {showToast && (
          <Toast 
            message={toastMessage} 
            type={toastType} 
            onClose={() => setShowToast(false)} 
          />
        )}
      </div>
    );
  }

  // STORE ASSIGNMENT VIEW
  const selectedStoreData = availableStoresData?.stores.find(s => s.store_id === selectedStoreId);
  const recommendation = availableStoresData?.recommendation;

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
          
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedOrderId(null);
                      setSelectedOrder(null);
                      setAvailableStoresData(null);
                      setSelectedStoreId(null);
                      setAssignmentNotes('');
                    }}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowLeft className="text-gray-900 dark:text-white" />
                  </button>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedOrder?.order_number || 'Loading...'}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder?.customer?.name} • {availableStoresData?.total_items || 0} items
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendation Banner */}
              {recommendation && (
                <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Award className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        ⭐ Recommended: {recommendation.store_name}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {recommendation.reason} • {recommendation.fulfillment_percentage}% fulfillment
                      </p>
                      {recommendation.note && (
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                          💡 {recommendation.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Available Stores */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Available Stores
                  </h2>
                  
                  {isLoadingStores ? (
                    <div className="text-center py-12">
                      <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Checking inventory...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableStoresData?.stores.map(store => {
                        const isSelected = selectedStoreId === store.store_id;
                        const isRecommended = recommendation?.store_id === store.store_id;
                        
                        return (
                          <div
                            key={store.store_id}
                            onClick={() => setSelectedStoreId(store.store_id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : store.can_fulfill_entire_order
                                ? 'border-green-300 dark:border-green-800 bg-white dark:bg-gray-800 hover:border-green-500'
                                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {store.store_name}
                                  </h3>
                                  {isRecommended && (
                                    <Award className="h-4 w-4 text-yellow-500" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {store.store_address}
                                </p>
                              </div>
                              <div className="ml-4">
                                {store.can_fulfill_entire_order ? (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                      Can Fulfill
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900/30">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                      Insufficient
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>Fulfillment Capacity</span>
                                <span className="font-semibold">{store.fulfillment_percentage}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={`h-2 transition-all ${
                                    store.fulfillment_percentage === 100
                                      ? 'bg-green-500'
                                      : store.fulfillment_percentage >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${store.fulfillment_percentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Available: {store.total_items_available} / {store.total_items_required} items
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column - Store Details & Assignment */}
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    {selectedStoreData ? 'Inventory Details' : 'Select a Store'}
                  </h2>
                  
                  {selectedStoreData ? (
                    <div className="space-y-4">
                      {/* Inventory Details */}
                      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                          Product Availability
                        </h3>
                        <div className="space-y-3">
                          {selectedStoreData.inventory_details.map((detail, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg ${
                                detail.can_fulfill
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-red-50 dark:bg-red-900/20'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {detail.product_name}
                                  </h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    SKU: {detail.product_sku}
                                  </p>
                                </div>
                                {detail.can_fulfill ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Required: {detail.required_quantity} | Available: {detail.available_quantity}
                                </span>
                                <span className={`font-semibold ${
                                  detail.can_fulfill
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {detail.can_fulfill ? 'OK' : `Short by ${detail.required_quantity - detail.available_quantity}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assignment Notes */}
                      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Assignment Notes (Optional)
                        </label>
                        <textarea
                          value={assignmentNotes}
                          onChange={(e) => setAssignmentNotes(e.target.value)}
                          placeholder="Add any notes about this assignment..."
                          rows={3}
                          maxLength={500}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {assignmentNotes.length}/500 characters
                        </p>
                      </div>

                      {/* Assign Button */}
                      <button
                        onClick={handleAssignStore}
                        disabled={isAssigning || !selectedStoreData.can_fulfill_entire_order}
                        className={`w-full px-6 py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                          selectedStoreData.can_fulfill_entire_order && !isAssigning
                            ? 'bg-green-600 hover:bg-green-700 shadow-lg'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isAssigning ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Assigning Order...
                          </>
                        ) : selectedStoreData.can_fulfill_entire_order ? (
                          <>
                            <StoreIcon className="h-5 w-5" />
                            Assign to {selectedStoreData.store_name}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-5 w-5" />
                            Insufficient Inventory
                          </>
                        )}
                      </button>

                      {!selectedStoreData.can_fulfill_entire_order && (
                        <p className="text-sm text-center text-red-600 dark:text-red-400">
                          ⚠️ This store cannot fulfill the entire order. Please select a different store or consider restocking.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <StoreIcon className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Select a store to view inventory details
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {showToast && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setShowToast(false)} 
        />
      )}
    </div>
  );
}