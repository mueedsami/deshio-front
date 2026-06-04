'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Loader,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Store as StoreIcon,
  XCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import orderManagementService, {
  BulkAssignmentStoreSummary,
  BulkPendingAssignmentOrder,
} from '@/services/orderManagementService';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type StoreOption = {
  id: number;
  name: string;
  address?: string;
  store_code?: string;
  is_warehouse?: boolean;
  is_online?: boolean;
  is_active?: boolean;
};

const money = (value: string | number | undefined | null) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function BulkStoreAssignmentPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [orders, setOrders] = useState<BulkPendingAssignmentOrder[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');

  const displayToast = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4500);
  };

  const fetchBulkAssignmentData = async () => {
    setIsLoading(true);
    try {
      const data = await orderManagementService.getBulkPendingAssignment({
        per_page: 100,
        sort_order: sortOrder,
      });
      setOrders(data.orders || []);
      setStores(data.stores || []);
      setSelectedOrderIds((prev) =>
        prev.filter((id) => (data.orders || []).some((order) => order.id === id))
      );
    } catch (error: any) {
      console.error('Bulk assignment page load failed:', error);
      displayToast(error?.message || 'Failed to load bulk assignment page data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBulkAssignmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const selectedStore = useMemo(
    () => stores.find((store) => Number(store.id) === Number(selectedStoreId)) || null,
    [stores, selectedStoreId]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const orderText = [
        order.order_number,
        order.status,
        order.customer?.name,
        order.customer?.phone,
        order.customer?.email,
        ...(order.items_summary || []).map((item) => `${item.product_name} ${(item as any).product_sku || ''}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return orderText.includes(q);
    });
  }, [orders, searchQuery]);

  const selectedOrderSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);

  const getStoreFulfillment = (order: BulkPendingAssignmentOrder, storeId: number | '') => {
    if (!storeId) return null;
    return (
      order.available_stores_summary?.find(
        (summary) => Number(summary.store_id) === Number(storeId)
      ) || null
    );
  };

  const canSelectedStoreFulfill = (order: BulkPendingAssignmentOrder) => {
    const summary = getStoreFulfillment(order, selectedStoreId);
    return !!summary?.can_fulfill_entire_order;
  };

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderSet.has(order.id)),
    [orders, selectedOrderSet]
  );

  const blockingSelectedOrders = useMemo(() => {
    if (!selectedStoreId) return [];
    return selectedOrders.filter((order) => !canSelectedStoreFulfill(order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, selectedStoreId]);

  const visibleFulfillableIds = useMemo(() => {
    return filteredOrders
      .filter((order) => !selectedStoreId || canSelectedStoreFulfill(order))
      .map((order) => order.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, selectedStoreId]);

  const selectedValue = selectedOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const toggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAllVisibleFulfillable = () => {
    setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleFulfillableIds])));
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
    setLastResult(null);
  };

  const handleBulkAssign = async () => {
    if (!selectedStoreId) {
      displayToast('Please select a store first.', 'warning');
      return;
    }
    if (!selectedOrderIds.length) {
      displayToast('Please select at least one order.', 'warning');
      return;
    }
    if (blockingSelectedOrders.length > 0) {
      displayToast(
        `${blockingSelectedOrders.length} selected order(s) cannot be fulfilled by ${selectedStore?.name || 'this store'}. Remove them or choose another store.`,
        'warning'
      );
      return;
    }

    setIsAssigning(true);
    try {
      const result = await orderManagementService.bulkAssignOrdersToStorePending({
        store_id: Number(selectedStoreId),
        order_ids: selectedOrderIds,
        notes: assignmentNotes || undefined,
      });

      setLastResult(result);
      const assignedIds = result.data?.results?.success?.map((row) => Number(row.order_id)) || [];
      const failedCount = result.data?.failed_count || result.data?.results?.failed?.length || 0;
      const assignedCount = result.data?.assigned_count || assignedIds.length;

      if (assignedCount > 0) {
        setSelectedOrderIds((prev) => prev.filter((id) => !assignedIds.includes(id)));
        await fetchBulkAssignmentData();
      }

      if (failedCount > 0) {
        displayToast(`Assigned ${assignedCount}; ${failedCount} failed. Check the result card.`, 'warning');
      } else {
        displayToast(`✅ Assigned ${assignedCount} order(s) to ${selectedStore?.name || 'selected store'} and moved them to assigned_to_store.`, 'success');
      }
    } catch (error: any) {
      console.error('Bulk assignment failed:', error);
      displayToast(error?.message || 'Bulk assignment failed', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderFulfillmentPill = (summary: BulkAssignmentStoreSummary | null) => {
    if (!summary) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          <AlertTriangle className="h-3.5 w-3.5" /> Not checked
        </span>
      );
    }

    if (summary.can_fulfill_entire_order) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-3.5 w-3.5" /> Can fulfill · {summary.fulfillment_percentage}%
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <XCircle className="h-3.5 w-3.5" /> Insufficient · {summary.fulfillment_percentage}%
      </span>
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                    🧾 Bulk Store Assignment
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Select a store, review which pending-assignment orders it can fulfill, then assign one, many, or all selected orders to that store. Successful assignments move to <span className="font-semibold">assigned_to_store</span>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
                      className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <option value="asc">Oldest First</option>
                      <option value="desc">Newest First</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    onClick={fetchBulkAssignmentData}
                    disabled={isLoading || isAssigning}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pending Assignment</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Selected Orders</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{selectedOrderIds.length}</p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Selected Value</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">৳{selectedValue.toFixed(2)}</p>
                    </div>
                    <Box className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Stores</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stores.length}</p>
                    </div>
                    <StoreIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assign selected orders to store
                    </label>
                    <select
                      value={selectedStoreId}
                      onChange={(event) => setSelectedStoreId(event.target.value ? Number(event.target.value) : '')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">Select a store...</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}{store.store_code ? ` (${store.store_code})` : ''}{store.is_warehouse ? ' · Warehouse' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Search orders
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Order no, customer, phone, product..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assignment note (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Example: bulk assigned from HO"
                      value={assignmentNotes}
                      onChange={(event) => setAssignmentNotes(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {selectedStore && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Selected store: <strong>{selectedStore.name}</strong>{selectedStore.address ? ` — ${selectedStore.address}` : ''}
                    </span>
                  </div>
                )}

                {blockingSelectedOrders.length > 0 && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    {blockingSelectedOrders.length} selected order(s) are not fully fulfillable by the selected store. Assignment is disabled until you remove them or select another store.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={selectAllVisibleFulfillable}
                    disabled={filteredOrders.length === 0 || isLoading}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {selectedStoreId ? 'Select all fulfillable visible orders' : 'Select all visible orders'}
                  </button>
                  <button
                    onClick={clearSelection}
                    disabled={selectedOrderIds.length === 0 || isAssigning}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Clear selection
                  </button>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!selectedStoreId || selectedOrderIds.length === 0 || blockingSelectedOrders.length > 0 || isAssigning}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {isAssigning && <Loader className="h-4 w-4 animate-spin" />}
                    Assign {selectedOrderIds.length || ''} selected order{selectedOrderIds.length === 1 ? '' : 's'}
                  </button>
                </div>
              </div>

              {lastResult && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Last assignment result</h2>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                        Assigned: {lastResult.data?.assigned_count || lastResult.data?.results?.success?.length || 0}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-green-700 dark:text-green-300">
                        {(lastResult.data?.results?.success || []).slice(0, 8).map((row: any) => (
                          <p key={row.order_id}>{row.order_number} → {row.new_status}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Failed: {lastResult.data?.failed_count || lastResult.data?.results?.failed?.length || 0}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
                        {(lastResult.data?.results?.failed || []).slice(0, 8).map((row: any) => (
                          <p key={`${row.order_id}-${row.reason}`}>{row.order_number || row.order_id}: {row.reason}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="rounded-lg border border-gray-200 bg-white py-14 text-center dark:border-gray-700 dark:bg-gray-800">
                  <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading pending orders and fulfillment checks...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-14 text-center dark:border-gray-700 dark:bg-gray-800">
                  <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    {searchQuery ? 'No matching orders' : 'No pending assignment orders'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const selectedSummary = getStoreFulfillment(order, selectedStoreId);
                    const isSelected = selectedOrderSet.has(order.id);
                    const topStores = [...(order.available_stores_summary || [])]
                      .sort((a, b) => Number(b.fulfillment_percentage) - Number(a.fulfillment_percentage))
                      .slice(0, 4);

                    return (
                      <div
                        key={order.id}
                        className={`rounded-xl border-2 bg-white p-5 shadow-sm transition-all dark:bg-gray-800 ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40'
                            : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOrder(order.id)}
                              className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {order.order_number}
                                </h3>
                                <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                  pending_assignment
                                </span>
                                {renderFulfillmentPill(selectedSummary)}
                              </div>

                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                👤 {order.customer?.name || 'Unknown Customer'} • 📱 {order.customer?.phone || 'No phone'} • {formatDate(order.created_at || order.order_date)}
                              </p>

                              <div className="mt-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Ordered items
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {(order.items_summary || []).slice(0, 5).map((item, index) => (
                                    <span
                                      key={`${order.id}-${item.product_id}-${index}`}
                                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                      {item.product_name} ×{item.quantity}
                                    </span>
                                  ))}
                                  {(order.items_summary?.length || 0) > 5 && (
                                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                      +{(order.items_summary?.length || 0) - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Stores that can fulfill / partially fulfill
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {topStores.length ? topStores.map((summary) => (
                                    <span
                                      key={`${order.id}-${summary.store_id}`}
                                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                        summary.can_fulfill_entire_order
                                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                                          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                                      }`}
                                    >
                                      {summary.store_name}: {summary.fulfillment_percentage}%
                                    </span>
                                  )) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">No store availability data returned.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-[170px] rounded-lg bg-gray-50 p-4 text-right dark:bg-gray-900">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{money(order.total_amount)}</p>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                              {order.order_type || 'online order'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {showToast && <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />}
    </div>
  );
}
