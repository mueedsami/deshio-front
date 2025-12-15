'use client';
import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import axios from '@/lib/axios';
import defectIntegrationService from '@/services/defectIntegrationService';
import Toast from '@/components/Toast';

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: string;
  supports_partial: boolean;
  requires_reference: boolean;
}

interface Store {
  id: number;
  name: string;
  code?: string;
  type?: string;
}

export default function AmountDetailsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [vatRate, setVatRate] = useState('5');
  const [transportCost, setTransportCost] = useState('0');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Store assignment state
  const [stores, setStores] = useState<Store[]>([]);
  const [assignStoreNow, setAssignStoreNow] = useState<boolean>(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] =
    useState<'success' | 'error' | 'info' | 'warning'>('success');

  const calculateItemAmount = (item: any): number => {
    if (item.amount !== undefined && item.amount !== null) {
      return parseFloat(item.amount);
    }

    const unitPrice = parseFloat(item.unit_price || 0);
    const quantity = parseInt(item.quantity || 0);
    const discountAmount = parseFloat(item.discount_amount || 0);

    return unitPrice * quantity - discountAmount;
  };

  const displayToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success'
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    const storedOrder = sessionStorage.getItem('pendingOrder');
    if (storedOrder) {
      const parsedOrder = JSON.parse(storedOrder);
      console.log('📦 Loaded order data:', parsedOrder);

      if (parsedOrder.items) {
        parsedOrder.items = parsedOrder.items.map((item: any) => ({
          ...item,
          amount: calculateItemAmount(item),
        }));

        if (!parsedOrder.subtotal || parsedOrder.subtotal === 0) {
          parsedOrder.subtotal = parsedOrder.items.reduce(
            (sum: number, item: any) => sum + calculateItemAmount(item),
            0
          );
        }
      }

      setOrderData(parsedOrder);

      // Default store assignment based on existing data (if any)
      if (parsedOrder.store_id) {
        setAssignStoreNow(true);
        setSelectedStoreId(String(parsedOrder.store_id));
      } else {
        setAssignStoreNow(false);
        setSelectedStoreId('');
      }
    } else {
      window.location.href = '/social-commerce';
      return;
    }

    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get('/payment-methods', {
          params: { customer_type: 'social_commerce' },
        });
        if (response.data.success) {
          const methods = response.data.data?.payment_methods || [];
          setPaymentMethods(methods);
          if (methods.length > 0) {
            setSelectedPaymentMethod(String(methods[0].id));
          }
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    const fetchStores = async () => {
      try {
        setIsLoadingStores(true);
        const response = await axios.get('/stores');
        console.log('🏬 Stores API raw response:', response.data);

        let storeList: Store[] = [];

        // Try multiple common shapes safely
        if (Array.isArray(response.data)) {
          storeList = response.data;
        } else if (Array.isArray(response.data?.data)) {
          storeList = response.data.data;
        } else if (Array.isArray(response.data?.data?.stores)) {
          storeList = response.data.data.stores;
        } else if (Array.isArray(response.data?.stores)) {
          storeList = response.data.stores;
        } else if (Array.isArray(response.data?.items)) {
          storeList = response.data.items;
        }

        console.log('🏬 Parsed stores list:', storeList);
        setStores(storeList);

        if (!storeList.length) {
          // No stores → force "decide later"
          setAssignStoreNow(false);
          setSelectedStoreId('');
        } else {
          // If order already had a store_id, keep it; else leave empty (user must pick)
          // (we already set selectedStoreId above from parsedOrder)
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        setAssignStoreNow(false);
        setSelectedStoreId('');
      } finally {
        setIsLoadingStores(false);
      }
    };

    fetchPaymentMethods();
    fetchStores();
  }, []);

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const subtotal = orderData.subtotal || 0;
  const totalDiscount =
    orderData.items?.reduce(
      (sum: number, item: any) =>
        sum + (parseFloat(item.discount_amount) || 0),
      0
    ) || 0;
  const vat = (subtotal * parseFloat(vatRate || '0')) / 100;
  const transport = parseFloat(transportCost) || 0;
  const total = subtotal + vat + transport;

  const selectedMethod = paymentMethods.find(
    (m) => String(m.id) === selectedPaymentMethod
  );
  const hasStores = stores && stores.length > 0;
  const selectedStore = stores.find(
    (s) => String(s.id) === selectedStoreId
  );

  const handlePlaceOrder = async () => {
    // Validate store selection only if "Assign now" AND we actually have stores
    if (assignStoreNow && hasStores && !selectedStoreId) {
      displayToast(
        'Please select a store or choose "Decide store later".',
        'error'
      );
      return;
    }

    if (!selectedPaymentMethod) {
      displayToast('Please select a payment method', 'error');
      return;
    }

    if (selectedMethod?.requires_reference && !transactionReference.trim()) {
      displayToast(
        `Please enter transaction reference for ${selectedMethod.name}`,
        'error'
      );
      return;
    }

    setIsProcessing(true);

    try {
      console.log('═══════════════════════════════════');
      console.log('📦 PLACING SOCIAL COMMERCE ORDER');
      console.log('═══════════════════════════════════');

      // Build payload from orderData but control store_id + store_assignment_mode
      const orderPayload: any = { ...orderData };

      if (
        orderPayload.order_type === 'social_commerce' ||
        orderPayload.order_type === 'ecommerce'
      ) {
        if (assignStoreNow && selectedStoreId) {
          orderPayload.store_id = parseInt(selectedStoreId, 10);
          orderPayload.store_assignment_mode = 'assign_now';
        } else {
          // Pending assignment: send null store_id and mode
          if ('store_id' in orderPayload) {
            delete orderPayload.store_id;
          }
          orderPayload.store_assignment_mode = 'pending_assignment';
        }
      }

      console.log('📦 Order payload being sent:', orderPayload);

      console.log('📦 Step 1: Creating order...');
      const createOrderResponse = await axios.post('/orders', orderPayload);

      if (!createOrderResponse.data.success) {
        throw new Error(
          createOrderResponse.data.message || 'Failed to create order'
        );
      }

      const createdOrder = createOrderResponse.data.data;
      console.log('✅ Order created:', createdOrder.order_number);
      console.log('Status:', createdOrder.status);
      console.log('Fulfillment status:', createdOrder.fulfillment_status);

      if (!assignStoreNow) {
        console.log(
          'ℹ️ Order created WITHOUT store_id – should appear as pending_assignment on backend.'
        );
      } else {
        console.log('🏬 Assigned Store ID:', orderPayload.store_id);
      }

      const defectiveItems = orderData.defectiveItems || [];

      if (defectiveItems.length > 0) {
        console.log('🏷️ Processing', defectiveItems.length, 'defective items...');

        for (const defectItem of defectiveItems) {
          try {
            console.log(
              `📋 Marking defective ${defectItem.defectId} as sold...`
            );

            await defectIntegrationService.markDefectiveAsSold(
              defectItem.defectId,
              {
                order_id: createdOrder.id,
                selling_price: defectItem.price,
                sale_notes: `Sold via Social Commerce - Order #${createdOrder.order_number}`,
                sold_at: new Date().toISOString(),
              }
            );

            console.log(
              `✅ Defective ${defectItem.defectId} marked as sold`
            );
          } catch (defectError: any) {
            console.error(
              `❌ Failed to mark defective ${defectItem.defectId}:`,
              defectError
            );
            console.warn(
              `Warning: Could not update defect status for ${defectItem.productName}`
            );
          }
        }
      }

      console.log('💰 Step 2: Processing payment (full amount)...');
      const paymentData: any = {
        payment_method_id: parseInt(selectedPaymentMethod),
        amount: total,
        payment_type: 'full',
        auto_complete: false,
        notes:
          paymentNotes ||
          `Social Commerce payment via ${selectedMethod?.name}`,
      };

      if (selectedMethod?.requires_reference && transactionReference) {
        paymentData.transaction_reference = transactionReference;
        paymentData.external_reference = transactionReference;
      }

      if (
        selectedMethod?.type === 'mobile_banking' &&
        transactionReference
      ) {
        paymentData.payment_data = {
          mobile_number: orderData.customer.phone,
          provider: selectedMethod.name,
          transaction_id: transactionReference,
        };
      } else if (selectedMethod?.type === 'card' && transactionReference) {
        paymentData.payment_data = {
          transaction_reference: transactionReference,
        };
      }

      console.log('Payment payload being sent:', paymentData);

      const paymentResponse = await axios.post(
        `/orders/${createdOrder.id}/payments/simple`,
        paymentData
      );

      if (!paymentResponse.data.success) {
        throw new Error(
          paymentResponse.data.message || 'Failed to process payment'
        );
      }
      console.log('✅ Payment processed');

      console.log('═══════════════════════════════════');
      console.log('✅ ORDER CREATED - PENDING FULFILLMENT');
      console.log(`Order Number: ${createdOrder.order_number}`);
      console.log(`Status: ${createdOrder.status}`);
      console.log(`Fulfillment Status: ${createdOrder.fulfillment_status}`);
      if (!assignStoreNow) {
        console.log(
          'Next step: Operations team will assign this order to a store.'
        );
      } else {
        console.log(
          'Next step: Warehouse staff at assigned store will scan barcodes.'
        );
      }
      console.log('═══════════════════════════════════');

      const successMsgBase = `Order ${createdOrder.order_number} created successfully!`;
      const successStore = assignStoreNow
        ? ' Pending warehouse fulfillment at assigned store.'
        : ' Pending store assignment in order management.';

      displayToast(successMsgBase + successStore, 'success');
      sessionStorage.removeItem('pendingOrder');

      setTimeout(() => {
        window.location.href = '/orders';
      }, 3000);
    } catch (error: any) {
      console.error('═══════════════════════════════════');
      console.error('❌ ORDER CREATION FAILED');
      console.error('Error:', error);
      console.error('═══════════════════════════════════');

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Error placing order. Please try again.';
      displayToast(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

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
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">
                Amount Details
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left Column - Order Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Order Summary
                  </h2>

                  {/* Customer Info */}
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-2">
                      Customer Information
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {orderData.customer.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {orderData.customer.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {orderData.customer.phone}
                    </p>
                  </div>

                  {/* Delivery Address */}
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-800 dark:text-green-300 font-medium mb-2">
                      Delivery Address
                    </p>
                    {orderData.isInternational ? (
                      <>
                        <p className="text-xs text-gray-900 dark:text-white">
                          {orderData.deliveryAddress.city}
                          {orderData.deliveryAddress.state &&
                            `, ${orderData.deliveryAddress.state}`}
                          , {orderData.deliveryAddress.country}
                        </p>
                        {orderData.deliveryAddress.postalCode && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Postal Code:{' '}
                            {orderData.deliveryAddress.postalCode}
                          </p>
                        )}
                        {orderData.deliveryAddress.address && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {orderData.deliveryAddress.address}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                          <Globe className="w-3 h-3" />
                          <span>International Delivery</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-900 dark:text-white">
                          {orderData.deliveryAddress.division},{' '}
                          {orderData.deliveryAddress.district},{' '}
                          {orderData.deliveryAddress.city}
                        </p>
                        {orderData.deliveryAddress.zone && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Zone: {orderData.deliveryAddress.zone}
                          </p>
                        )}
                        {orderData.deliveryAddress.address && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {orderData.deliveryAddress.address}
                          </p>
                        )}
                        {orderData.deliveryAddress.postalCode && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Postal Code:{' '}
                            {orderData.deliveryAddress.postalCode}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Store Assignment */}
                  <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-2">
                      Store Assignment
                    </p>

                    <div className="flex flex-col gap-1 mb-2">
                      <label className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          className="h-3 w-3"
                          checked={assignStoreNow}
                          onChange={() => setAssignStoreNow(true)}
                          disabled={isProcessing || !hasStores}
                        />
                        <span>
                          Assign this order to a store now
                          {!hasStores && ' (No active stores found)'}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          className="h-3 w-3"
                          checked={!assignStoreNow}
                          onChange={() => setAssignStoreNow(false)}
                          disabled={isProcessing}
                        />
                        <span>
                          Decide store later (mark as pending assignment)
                        </span>
                      </label>
                    </div>

                    {assignStoreNow && hasStores && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          Select Store
                        </label>
                        <select
                          value={selectedStoreId}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          disabled={isProcessing || isLoadingStores}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                          <option value="">
                            {isLoadingStores
                              ? 'Loading stores...'
                              : 'Select a store'}
                          </option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                              {store.code ? ` (${store.code})` : ''}
                            </option>
                          ))}
                        </select>
                        {assignStoreNow && !selectedStoreId && !isLoadingStores && (
                          <p className="mt-1 text-[11px] text-red-500">
                            Please select a store or choose &quot;Decide store
                            later&quot;.
                          </p>
                        )}
                        {assignStoreNow && selectedStore && (
                          <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                            Assigned Store: {selectedStore.name}
                            {selectedStore.code
                              ? ` (${selectedStore.code})`
                              : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {!assignStoreNow && (
                      <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                        This order will be created with
                        <span className="font-semibold"> status</span>{' '}
                        <code>pending_assignment</code> and{' '}
                        <code>store_id = null</code>. It can be assigned to a
                        store later from the backoffice.
                      </p>
                    )}

                    {!hasStores && (
                      <p className="mt-1 text-[11px] text-orange-600 dark:text-orange-400">
                        No active stores returned from API. Store assignment can
                        be done later when stores are available.
                      </p>
                    )}
                  </div>

                  {/* Products List */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Products ({orderData.items?.length || 0})
                    </p>
                    <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                      {orderData.items?.map(
                        (item: any, index: number) => {
                          const itemAmount = calculateItemAmount(item);
                          const isDefective =
                            orderData.defectiveItems?.some(
                              (d: any) => d.defectId === item.defectId
                            );

                          return (
                            <div
                              key={index}
                              className={`flex justify-between items-center p-2 rounded ${
                                isDefective
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'
                                  : 'bg-gray-50 dark:bg-gray-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-900 dark:text-white truncate">
                                  {item.productName}
                                  {isDefective && (
                                    <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded">
                                      Defective
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Qty: {item.quantity} ×{' '}
                                  {parseFloat(
                                    item.unit_price || 0
                                  ).toFixed(2)}{' '}
                                  Tk
                                </p>
                                {item.discount_amount > 0 && (
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    Discount:{' '}
                                    {`-${parseFloat(
                                      item.discount_amount
                                    ).toFixed(2)} Tk`}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white ml-2">
                                {itemAmount.toFixed(2)} Tk
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-gray-900 dark:text-white">
                        Subtotal
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {subtotal.toFixed(2)} Tk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Payment Details */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Payment Details
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Sub Total
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {subtotal.toFixed(2)} Tk
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Discount
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {totalDiscount.toFixed(2)} Tk
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                          VAT
                        </label>
                        <input
                          type="text"
                          value={vat.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                          VAT Rate %
                        </label>
                        <input
                          type="number"
                          value={vatRate}
                          onChange={(e) => setVatRate(e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Transport Cost
                      </label>
                      <input
                        type="number"
                        value={transportCost}
                        onChange={(e) => setTransportCost(e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-lg font-semibold mb-4">
                        <span className="text-gray-900 dark:text-white">
                          Total
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {total.toFixed(2)} Tk
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) =>
                          setSelectedPaymentMethod(e.target.value)
                        }
                        disabled={isProcessing}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">Select Payment Method</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Transaction Reference */}
                    {selectedMethod?.requires_reference && (
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                          Transaction Reference{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={transactionReference}
                          onChange={(e) =>
                            setTransactionReference(e.target.value)
                          }
                          disabled={isProcessing}
                          placeholder={`Enter ${selectedMethod.name} transaction ID`}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                        />
                      </div>
                    )}

                    {/* Payment Notes */}
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                        Payment Notes (Optional)
                      </label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        disabled={isProcessing}
                        placeholder="Add any payment notes..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <button
                        onClick={() => window.history.back()}
                        disabled={isProcessing}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isProcessing || !selectedPaymentMethod}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Processing...
                          </>
                        ) : (
                          'Place Order'
                        )}
                      </button>
                    </div>
                  </div>
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
