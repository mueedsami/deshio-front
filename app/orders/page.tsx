'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatsCards from '@/components/orders/StatsCards';
import OrderFilters from '@/components/orders/OrderFilters';
import OrdersTable from '@/components/orders/OrdersTable';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import EditOrderModal from '@/components/orders/EditOrderModal';
import ExchangeProductModal from '@/components/orders/ExchangeProductModal';
import ReturnProductModal from '@/components/orders/ReturnProductModal';
import { Order } from '@/types/order';
import { Truck, Printer, Settings, CheckCircle, XCircle, Package, ShoppingBag } from 'lucide-react';
import { checkQZStatus, printBulkReceipts, getPrinters } from '@/lib/qz-tray';
import axiosInstance from '@/lib/axios';
import shipmentService from '@/services/shipmentService';

export default function OrdersDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [isPrintingBulk, setIsPrintingBulk] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [showPrinterSelect, setShowPrinterSelect] = useState(false);
  const [bulkPrintProgress, setBulkPrintProgress] = useState<{
    show: boolean;
    current: number;
    total: number;
    success: number;
    failed: number;
  }>({ show: false, current: 0, total: 0, success: 0, failed: 0 });
  
  const [pathaoProgress, setPathaoProgress] = useState<{
    show: boolean;
    current: number;
    total: number;
    success: number;
    failed: number;
    details: Array<{ orderId: number; orderNumber?: string; status: 'success' | 'failed'; message: string }>;
  }>({ show: false, current: 0, total: 0, success: 0, failed: 0, details: [] });

  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    const name = localStorage.getItem('userName') || '';
    setUserRole(role);
    setUserName(name);
  }, []);

  const checkPrinterStatus = async () => {
    try {
      const status = await checkQZStatus();
      setQzConnected(status.connected);
      
      if (status.connected) {
        const printerList = await getPrinters();
        setPrinters(printerList);
        
        const savedPrinter = localStorage.getItem('defaultPrinter');
        if (savedPrinter && printerList.includes(savedPrinter)) {
          setSelectedPrinter(savedPrinter);
        } else if (printerList.length > 0) {
          setSelectedPrinter(printerList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to check printer status:', error);
    }
  };

  const handlePrinterSelect = (printer: string) => {
    setSelectedPrinter(printer);
    localStorage.setItem('defaultPrinter', printer);
    setShowPrinterSelect(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axiosInstance.get('/orders', {
        params: {
          order_type: 'social_commerce',
          sort_by: 'created_at',
          sort_order: 'desc',
          per_page: 1000
        }
      });

      if (response.data.success && response.data.data.data) {
        const transformedOrders = response.data.data.data.map((order: any) => ({
          id: order.id,
          orderNumber: order.order_number,
          date: new Date(order.order_date).toLocaleDateString('en-GB'),
          customer: {
            name: order.customer.name,
            phone: order.customer.phone,
            email: order.customer.email || '',
            address: order.shipping_address || ''
          },
          items: order.items?.map((item: any) => ({
            id: item.id,
            name: item.product_name,
            sku: item.product_sku,
            quantity: item.quantity,
            price: parseFloat(item.unit_price),
            discount: parseFloat(item.discount_amount || '0')
          })) || [],
          subtotal: parseFloat(order.subtotal),
          discount: parseFloat(order.discount_amount || '0'),
          shipping: parseFloat(order.shipping_amount || '0'),
          amounts: {
            total: parseFloat(order.total_amount),
            paid: parseFloat(order.paid_amount),
            due: parseFloat(order.outstanding_amount)
          },
          payments: {
            total: parseFloat(order.total_amount),
            paid: parseFloat(order.paid_amount),
            due: parseFloat(order.outstanding_amount)
          },
          status: order.payment_status === 'paid' ? 'Paid' : 'Pending',
          salesBy: order.salesman?.name || userName || 'N/A',
          store: order.store.name,
          notes: order.notes || ''
        }));

        let filteredData = transformedOrders;
        if (userRole === 'social_commerce_manager') {
          filteredData = transformedOrders.filter((order: any) => 
            order.salesBy === userName
          );
        }
        
        setOrders(filteredData);
        setFilteredOrders(filteredData);
        return;
      }

      setOrders([]);
      setFilteredOrders([]);
    } catch (error: any) {
      console.error('Failed to load orders from backend:', error);
      alert('Failed to load orders. Please check your connection.');
      setOrders([]);
      setFilteredOrders([]);
    }
  };

  useEffect(() => {
    let filtered = orders;

    if (search.trim()) {
      filtered = filtered.filter((o) =>
        o.id.toString().includes(search.trim()) ||
        o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.phone.includes(search.trim())
      );
    }

    if (dateFilter.trim()) {
      filtered = filtered.filter((o) => {
        const orderDate = o.date;
        let filterDateFormatted = dateFilter;
        if (dateFilter.includes('-') && dateFilter.split('-')[0].length === 4) {
          const [year, month, day] = dateFilter.split('-');
          filterDateFormatted = `${day}-${month}-${year}`;
        }
        return orderDate === filterDateFormatted;
      });
    }

    if (statusFilter !== 'All Status') {
      filtered = filtered.filter((o) =>
        statusFilter === 'Paid' ? o.payments.due === 0 : o.payments.due > 0
      );
    }

    setFilteredOrders(filtered);
  }, [search, dateFilter, statusFilter, orders]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setActiveMenu(null);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
    setActiveMenu(null);
  };

  const handleSaveOrder = async (updatedOrder: Order) => {
    try {
      const payload = {
        customer: {
          name: updatedOrder.customer.name,
          phone: updatedOrder.customer.phone,
          email: updatedOrder.customer.email,
          address: (updatedOrder as any).customer?.address ?? ''
        },
        shipping_address: (updatedOrder as any).customer?.address ?? '',
        shipping_amount: (updatedOrder as any).shipping ?? (updatedOrder as any).shipping_amount ?? 0,
        discount_amount: (updatedOrder as any).discount ?? (updatedOrder as any).discount_amount ?? 0,
        notes: (updatedOrder as any).notes ?? ''
      };

      const response = await axiosInstance.put(`/orders/${updatedOrder.id}`, payload);

      if (response.data.success) {
        await loadOrders();
        alert('Order updated successfully!');
      } else {
        alert('Failed to update order');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(`Failed to update order: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleExchangeOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowExchangeModal(true);
    setActiveMenu(null);
  };

  const handleReturnOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowReturnModal(true);
    setActiveMenu(null);
  };

  const handleProcessExchange = async (exchangeData: any) => {
    try {
      console.log('Processing exchange:', exchangeData);
      await loadOrders();
    } catch (error) {
      console.error('Error processing exchange:', error);
      throw error;
    }
  };

  const handleProcessReturn = async (returnData: any) => {
    try {
      console.log('Processing return:', returnData);
      await loadOrders();
      alert('Return processed successfully!');
    } catch (error) {
      console.error('Error processing return:', error);
      throw error;
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const response = await axiosInstance.patch(`/orders/${orderId}/cancel`, {
        reason: 'Cancelled by user'
      });

      if (response.data.success) {
        await loadOrders();
        setActiveMenu(null);
        alert('Order cancelled successfully!');
      } else {
        alert('Failed to cancel order');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      alert(`Failed to cancel order: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSendToPathao = async (order: Order) => {
    if (!confirm(`Send order #${order.orderNumber} to Pathao for delivery?`)) {
      return;
    }

    try {
      const existingShipment = await shipmentService.getByOrderId(order.id);
      
      if (existingShipment) {
        if (existingShipment.pathao_consignment_id) {
          alert(`This order already has a Pathao shipment.\nConsignment ID: ${existingShipment.pathao_consignment_id}`);
          return;
        }
        
        const updatedShipment = await shipmentService.sendToPathao(existingShipment.id);
        alert(`Order sent to Pathao successfully!\nConsignment ID: ${updatedShipment.pathao_consignment_id}\nTracking: ${updatedShipment.pathao_tracking_number}`);
        return;
      }

      const shipment = await shipmentService.create({
        order_id: order.id,
        delivery_type: 'home_delivery',
        package_weight: 1.0,
        send_to_pathao: true
      });

      alert(`Shipment created and sent to Pathao successfully!\nShipment #: ${shipment.shipment_number}\nConsignment ID: ${shipment.pathao_consignment_id}`);
      await loadOrders();

    } catch (error: any) {
      console.error('Send to Pathao error:', error);
      alert(`Failed to send to Pathao: ${error.message}`);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleToggleSelect = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkSendToPathao = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order to send to Pathao.');
      return;
    }

    if (!confirm(`Send ${selectedOrders.size} order(s) to Pathao?`)) {
      return;
    }

    setIsSendingBulk(true);
    setPathaoProgress({
      show: true,
      current: 0,
      total: selectedOrders.size,
      success: 0,
      failed: 0,
      details: []
    });

    try {
      const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
      const shipmentIdsToSend: number[] = [];

      for (const order of selectedOrdersList) {
        setPathaoProgress(prev => ({ ...prev, current: prev.current + 1 }));

        try {
          const existingShipment = await shipmentService.getByOrderId(order.id);

          if (existingShipment) {
            if (existingShipment.pathao_consignment_id) {
              setPathaoProgress(prev => ({
                ...prev,
                failed: prev.failed + 1,
                details: [...prev.details, {
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  status: 'failed',
                  message: 'Already sent to Pathao'
                }]
              }));
              continue;
            }
            shipmentIdsToSend.push(existingShipment.id);
          } else {
            const newShipment = await shipmentService.create({
              order_id: order.id,
              delivery_type: 'home_delivery',
              package_weight: 1.0,
              send_to_pathao: false
            });
            shipmentIdsToSend.push(newShipment.id);
          }
        } catch (error: any) {
          setPathaoProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            details: [...prev.details, {
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: 'failed',
              message: error.message
            }]
          }));
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (shipmentIdsToSend.length > 0) {
        const result = await shipmentService.bulkSendToPathao(shipmentIdsToSend);

        result.success.forEach((item) => {
          setPathaoProgress(prev => ({
            ...prev,
            success: prev.success + 1,
            details: [...prev.details, {
              orderId: 0,
              orderNumber: item.shipment_number,
              status: 'success',
              message: `Consignment ID: ${item.pathao_consignment_id}`
            }]
          }));
        });

        result.failed.forEach((item) => {
          setPathaoProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            details: [...prev.details, {
              orderId: 0,
              orderNumber: item.shipment_number,
              status: 'failed',
              message: item.reason
            }]
          }));
        });
      }

      alert(`Bulk Send to Pathao Completed!\n\nSuccess: ${pathaoProgress.success}\nFailed: ${pathaoProgress.failed}`);
      setSelectedOrders(new Set());
      await loadOrders();

    } catch (error: any) {
      console.error('Bulk send to Pathao error:', error);
      alert(`Failed to complete bulk send: ${error.message}`);
    } finally {
      setIsSendingBulk(false);
      setTimeout(() => {
        setPathaoProgress({ show: false, current: 0, total: 0, success: 0, failed: 0, details: [] });
      }, 3000);
    }
  };

  const handleBulkPrintReceipts = async () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order to print.');
      return;
    }

    try {
      await checkPrinterStatus();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      alert('Failed to connect to QZ Tray. Please ensure QZ Tray is running and try again.');
      return;
    }

    const status = await checkQZStatus();
    if (!status.connected) {
      alert('QZ Tray is not connected. Please start QZ Tray and try again.');
      return;
    }

    if (!selectedPrinter) {
      setShowPrinterSelect(true);
      alert('Please select a printer first.');
      return;
    }

    if (!confirm(`Print receipts for ${selectedOrders.size} order(s)?`)) {
      return;
    }

    setIsPrintingBulk(true);
    setBulkPrintProgress({
      show: true,
      current: 0,
      total: selectedOrders.size,
      success: 0,
      failed: 0
    });

    try {
      const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
      
      let successCount = 0;
      let failedCount = 0;
      let currentIndex = 0;

      for (const order of selectedOrdersList) {
        currentIndex++;
        setBulkPrintProgress(prev => ({ ...prev, current: currentIndex }));
        
        try {
          await printBulkReceipts([order], selectedPrinter);
          successCount++;
          setBulkPrintProgress(prev => ({ ...prev, success: successCount }));
        } catch (error) {
          failedCount++;
          setBulkPrintProgress(prev => ({ ...prev, failed: failedCount }));
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      alert(`Bulk print completed!\nSuccess: ${successCount}\nFailed: ${failedCount}`);
      setSelectedOrders(new Set());
    } catch (error) {
      alert('Failed to complete bulk print operation.');
    } finally {
      setIsPrintingBulk(false);
      setTimeout(() => {
        setBulkPrintProgress({ show: false, current: 0, total: 0, success: 0, failed: 0 });
      }, 2000);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + (order.amounts?.total || order.subtotal), 0);
  const paidOrders = orders.filter(o => o.payments.due === 0).length;
  const pendingOrders = orders.filter(o => o.payments.due > 0).length;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-white dark:bg-black">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} />

          <main className="flex-1 overflow-auto bg-white dark:bg-black">
            {/* Ultra Compact Header */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="px-4 py-2">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-black dark:bg-white rounded">
                      <ShoppingBag className="w-4 h-4 text-white dark:text-black" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-black dark:text-white leading-none">Orders</h1>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-none mt-0.5">
                        {filteredOrders.length} of {orders.length}
                      </p>
                    </div>
                  </div>
                  
                  {qzConnected && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-black dark:bg-white"></div>
                        <span className="font-medium text-black dark:text-white">Printer</span>
                      </div>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowPrinterSelect(!showPrinterSelect)}
                          className="flex items-center gap-1 px-2 py-1 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 rounded transition-colors"
                        >
                          <Settings className="w-3 h-3 text-black dark:text-white" />
                          <span className="text-[10px] font-medium text-black dark:text-white truncate max-w-[100px]">
                            {selectedPrinter || 'Select'}
                          </span>
                        </button>
                        
                        {showPrinterSelect && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded shadow-lg w-56 z-50">
                            <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-800">
                              <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Printers</p>
                            </div>
                            {printers.map((printer) => (
                              <button
                                key={printer}
                                onClick={() => handlePrinterSelect(printer)}
                                className={`w-full px-2 py-1.5 text-left text-[10px] transition-colors ${
                                  selectedPrinter === printer 
                                    ? 'bg-black dark:bg-white text-white dark:text-black font-medium' 
                                    : 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{printer}</span>
                                  {selectedPrinter === printer && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0 ml-1" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ultra Compact Stats */}
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-4 gap-2">
                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-medium">Total</p>
                    <p className="text-lg font-bold text-black dark:text-white leading-none mt-0.5">{orders.length}</p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-medium">Paid</p>
                    <p className="text-lg font-bold text-black dark:text-white leading-none mt-0.5">{paidOrders}</p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-medium">Pending</p>
                    <p className="text-lg font-bold text-black dark:text-white leading-none mt-0.5">{pendingOrders}</p>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded p-2">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-medium">Revenue</p>
                    <p className="text-lg font-bold text-black dark:text-white leading-none mt-0.5">৳{(totalRevenue / 1000).toFixed(0)}k</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-2">
              <OrderFilters
                search={search}
                setSearch={setSearch}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />

              {/* Ultra Compact Bulk Actions */}
              {selectedOrders.size > 0 && (
                <div className="mb-2 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-black dark:bg-white rounded flex items-center justify-center">
                        <span className="text-white dark:text-black text-[10px] font-bold">{selectedOrders.size}</span>
                      </div>
                      <p className="text-[10px] font-semibold text-black dark:text-white">{selectedOrders.size} selected</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleBulkPrintReceipts}
                        disabled={isPrintingBulk}
                        className="flex items-center gap-1 px-2 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black rounded transition-colors disabled:opacity-50 text-[10px] font-medium"
                      >
                        <Printer className="w-3 h-3" />
                        {isPrintingBulk ? 'Printing' : 'Print'}
                      </button>
                      <button
                        onClick={handleBulkSendToPathao}
                        disabled={isSendingBulk}
                        className="flex items-center gap-1 px-2 py-1 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black rounded transition-colors disabled:opacity-50 text-[10px] font-medium"
                      >
                        <Truck className="w-3 h-3" />
                        {isSendingBulk ? 'Sending' : 'Pathao'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ultra Compact Progress */}
              {pathaoProgress.show && (
                <div className="mb-2 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-black dark:text-white flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Pathao {pathaoProgress.current}/{pathaoProgress.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3 text-black dark:text-white" />
                        <span className="text-[10px] font-medium text-black dark:text-white">{pathaoProgress.success}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <XCircle className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] font-medium text-gray-500">{pathaoProgress.failed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
                    <div
                      className="bg-black dark:bg-white h-1 rounded-full transition-all"
                      style={{ width: `${(pathaoProgress.current / pathaoProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {bulkPrintProgress.show && (
                <div className="mb-2 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-black dark:text-white flex items-center gap-1">
                      <Printer className="w-3 h-3" />
                      Print {bulkPrintProgress.current}/{bulkPrintProgress.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3 text-black dark:text-white" />
                        <span className="text-[10px] font-medium text-black dark:text-white">{bulkPrintProgress.success}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <XCircle className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] font-medium text-gray-500">{bulkPrintProgress.failed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
                    <div
                      className="bg-black dark:bg-white h-1 rounded-full transition-all"
                      style={{ width: `${(bulkPrintProgress.current / bulkPrintProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <OrdersTable
                filteredOrders={filteredOrders}
                totalOrders={orders.length}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                onViewDetails={handleViewDetails}
                onEditOrder={handleEditOrder}
                onExchangeOrder={handleExchangeOrder}
                onReturnOrder={handleReturnOrder}
                onCancelOrder={handleCancelOrder}
                onSendToPathao={handleSendToPathao}
                selectedOrders={selectedOrders}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
              />
            </div>
          </main>
        </div>
      </div>

      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowDetailsModal(false)}
          onEdit={handleEditOrder}
        />
      )}

      {showEditModal && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveOrder}
        />
      )}

      {showExchangeModal && selectedOrder && (
        <ExchangeProductModal
          order={selectedOrder}
          onClose={() => setShowExchangeModal(false)}
          onExchange={handleProcessExchange}
        />
      )}

      {showReturnModal && selectedOrder && (
        <ReturnProductModal
          order={selectedOrder}
          onClose={() => setShowReturnModal(false)}
          onReturn={handleProcessReturn}
        />
      )}

      {activeMenu !== null && (
        <div className="fixed inset-0 z-[90]" onClick={() => setActiveMenu(null)} />
      )}

      {showPrinterSelect && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPrinterSelect(false)} />
      )}
    </div>
  );
}