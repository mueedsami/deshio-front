'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Globe, DollarSign, CreditCard, Wallet } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import axios from '@/lib/axios';
import defectIntegrationService from '@/services/defectIntegrationService';
import Toast from '@/components/Toast';

// VAT is inclusive in pricing. Hide VAT controls/lines in UI for now, but keep code paths for future.
const VAT_UI_ENABLED = false;

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: string;
  supports_partial: boolean;
  requires_reference: boolean;
  fixed_fee?: number;
  percentage_fee?: number;
}

type PaymentOption = 'full' | 'partial' | 'none';

const parseNumber = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const calculateItemAmount = (item: any): number => {
  if (item?.amount !== undefined && item?.amount !== null) return parseNumber(item.amount);
  const unitPrice = parseNumber(item?.unit_price);
  const qty = parseNumber(item?.quantity);
  const disc = parseNumber(item?.discount_amount);
  return unitPrice * qty - disc;
};

export default function AmountDetailsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [orderData, setOrderData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [vatRate, setVatRate] = useState('0');
  const [transportCost, setTransportCost] = useState('0');

  // Advanced payment options
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('full');
  const [advanceAmount, setAdvanceAmount] = useState('');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [codPaymentMethod, setCodPaymentMethod] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const displayToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    const storedOrder = sessionStorage.getItem('pendingOrder');
    if (!storedOrder) {
      window.location.href = '/social-commerce';
      return;
    }

    const parsedOrder = JSON.parse(storedOrder);

    if (parsedOrder.items) {
      parsedOrder.items = parsedOrder.items.map((item: any) => ({
        ...item,
        amount: calculateItemAmount(item),
      }));

      if (!parsedOrder.subtotal || parsedOrder.subtotal === 0) {
        parsedOrder.subtotal = parsedOrder.items.reduce((sum: number, item: any) => sum + calculateItemAmount(item), 0);
      }
    }

    setOrderData(parsedOrder);

    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get('/payment-methods', { params: { customer_type: 'social_commerce' } });
        const payload = response.data?.data ?? response.data;
        const methods: PaymentMethod[] = payload?.payment_methods || payload?.data?.payment_methods || payload?.methods || payload || [];

        const normalized = Array.isArray(methods) ? methods : [];
        setPaymentMethods(normalized);

        // Defaults: mobile_banking for advance/full, cash for COD
        const mobile = normalized.find((m) => m.type === 'mobile_banking') || normalized[0];
        const cash = normalized.find((m) => m.type === 'cash') || normalized.find((m) => m.code?.toLowerCase?.() === 'cash');

        if (mobile) setSelectedPaymentMethod(String(mobile.id));
        if (cash) setCodPaymentMethod(String(cash.id));
      } catch (err) {
        console.error('Error fetching payment methods:', err);
        setPaymentMethods([]);
      }
    };

    fetchPaymentMethods();
  }, []);

  const shippingForUi = useMemo(() => {
    if (!orderData) return null;
    return orderData.deliveryAddress || orderData.shipping_address || orderData.delivery_address || null;
  }, [orderData]);

  const subtotal = useMemo(() => parseNumber(orderData?.subtotal), [orderData]);
  const totalDiscount = useMemo(() => {
    return (orderData?.items || []).reduce((sum: number, it: any) => sum + parseNumber(it?.discount_amount), 0);
  }, [orderData]);

  const effectiveVatRate = useMemo(() => (VAT_UI_ENABLED ? parseNumber(vatRate) : 0), [vatRate]);

  const vat = useMemo(() => (subtotal * effectiveVatRate) / 100, [subtotal, effectiveVatRate]);
  const transport = useMemo(() => parseNumber(transportCost), [transportCost]);
  const total = useMemo(() => subtotal + vat + transport, [subtotal, vat, transport]);

  const selectedMethod = useMemo(
    () => paymentMethods.find((m) => String(m.id) === String(selectedPaymentMethod)),
    [paymentMethods, selectedPaymentMethod]
  );
  const codMethod = useMemo(
    () => paymentMethods.find((m) => String(m.id) === String(codPaymentMethod)),
    [paymentMethods, codPaymentMethod]
  );

  const advance = useMemo(() => {
    if (paymentOption === 'none') return 0;
    if (paymentOption === 'full') return total;
    return parseNumber(advanceAmount);
  }, [paymentOption, total, advanceAmount]);

  const codAmount = useMemo(() => {
    if (paymentOption === 'full') return 0;
    if (paymentOption === 'none') return total;
    return Math.max(0, total - advance);
  }, [paymentOption, total, advance]);

  const advanceFee = useMemo(() => {
    if (!selectedMethod || paymentOption === 'none') return 0;
    const fixed = parseNumber(selectedMethod.fixed_fee);
    const pct = parseNumber(selectedMethod.percentage_fee);
    return fixed + (advance * pct) / 100;
  }, [selectedMethod, paymentOption, advance]);

  const codFee = useMemo(() => {
    if (!codMethod) return 0;
    if (paymentOption !== 'partial' && paymentOption !== 'none') return 0;
    const fixed = parseNumber(codMethod.fixed_fee);
    const pct = parseNumber(codMethod.percentage_fee);
    return fixed + (codAmount * pct) / 100;
  }, [codMethod, paymentOption, codAmount]);

  const totalFees = useMemo(() => advanceFee + codFee, [advanceFee, codFee]);

  if (!orderData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    // Store must already be selected in the first page
    if (!orderData.store_id) {
      displayToast('Store is missing. Please go back and select a store.', 'error');
      return;
    }

    // Validation: payment methods
    if (paymentOption === 'full' || paymentOption === 'partial') {
      if (!selectedPaymentMethod) {
        displayToast('Please select a payment method', 'error');
        return;
      }
      if (selectedMethod?.requires_reference && !transactionReference.trim()) {
        displayToast(`Please enter transaction reference for ${selectedMethod.name}`, 'error');
        return;
      }
    }

    if (paymentOption === 'partial') {
      if (!advanceAmount || advance <= 0 || advance >= total) {
        displayToast('Please enter a valid advance amount (between 0 and total)', 'error');
        return;
      }
      if (!codPaymentMethod) {
        displayToast('Please select a COD payment method', 'error');
        return;
      }
    }

    if (paymentOption === 'none') {
      if (!codPaymentMethod) {
        displayToast('Please select a COD payment method', 'error');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // 1) Create order (sanitize payload)
      const orderPayload: any = {
        order_type: orderData.order_type || 'social_commerce',
        store_id: parseInt(String(orderData.store_id), 10),
        store_assignment_mode: 'assign_now',
        customer: {
          name: orderData.customer?.name,
          email: orderData.customer?.email || undefined,
          phone: orderData.customer?.phone,
        },
        shipping_address: orderData.shipping_address || orderData.delivery_address || orderData.deliveryAddress || {},
        delivery_address: orderData.shipping_address || orderData.delivery_address || orderData.deliveryAddress || {},
        items: (orderData.items || []).map((item: any) => ({
          product_id: item.product_id,
          batch_id: item.batch_id ?? null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
        })),
        shipping_amount: transport,
        notes:
          (orderData.notes || 'Social Commerce order.') +
          ` Payment: ${paymentOption === 'full' ? 'Full' : paymentOption === 'partial' ? `Advance ৳${advance.toFixed(2)} + COD ৳${codAmount.toFixed(2)}` : `Full COD ৳${codAmount.toFixed(2)}`}.`,
      };

      console.log('📦 Creating order:', orderPayload);
      const createOrderResponse = await axios.post('/orders', orderPayload);

      if (!createOrderResponse.data?.success) {
        throw new Error(createOrderResponse.data?.message || 'Failed to create order');
      }

      const createdOrder = createOrderResponse.data.data;
      console.log('✅ Order created:', createdOrder.order_number);

      // 2) Defective items
      const defectiveItems = orderData.defectiveItems || [];
      if (defectiveItems.length > 0) {
        console.log('🏷️ Processing defective items:', defectiveItems.length);
        for (const defectItem of defectiveItems) {
          try {
            await defectIntegrationService.markDefectiveAsSold(defectItem.defectId, {
              order_id: createdOrder.id,
              selling_price: defectItem.price,
              sale_notes: `Sold via Social Commerce - Order #${createdOrder.order_number}`,
              sold_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Failed to mark defect as sold:', defectItem?.defectId, e);
          }
        }
      }

      // 3) Payments
      if (paymentOption === 'full') {
        const paymentData: any = {
          payment_method_id: parseInt(selectedPaymentMethod, 10),
          amount: total,
          payment_type: 'full',
          auto_complete: true,
          notes: paymentNotes || `Social Commerce full payment via ${selectedMethod?.name}`,
          payment_data: {},
        };

        if (selectedMethod?.requires_reference && transactionReference) {
          paymentData.transaction_reference = transactionReference;
          paymentData.external_reference = transactionReference;
        }

        if (selectedMethod?.type === 'mobile_banking' && transactionReference) {
          paymentData.payment_data = {
            mobile_number: orderData.customer?.phone,
            provider: selectedMethod.name,
            transaction_id: transactionReference,
          };
        } else if (selectedMethod?.type === 'card' && transactionReference) {
          paymentData.payment_data = {
            card_reference: transactionReference,
            payment_method: selectedMethod.name,
          };
        } else if (selectedMethod?.type === 'bank_transfer' && transactionReference) {
          paymentData.payment_data = {
            transfer_reference: transactionReference,
            bank_name: selectedMethod.name,
          };
        } else {
          paymentData.payment_data = {
            notes: paymentNotes || `Payment via ${selectedMethod?.name}`,
          };
        }

        const paymentResponse = await axios.post(`/orders/${createdOrder.id}/payments/simple`, paymentData);
        if (!paymentResponse.data?.success) {
          throw new Error(paymentResponse.data?.message || 'Failed to process payment');
        }
      }

      if (paymentOption === 'partial') {
        const advancePaymentData: any = {
          payment_method_id: parseInt(selectedPaymentMethod, 10),
          amount: advance,
          payment_type: 'partial',
          auto_complete: true,
          notes: paymentNotes || `Advance via ${selectedMethod?.name}. COD remaining: ৳${codAmount.toFixed(2)}`,
          payment_data: {},
        };

        if (selectedMethod?.requires_reference && transactionReference) {
          advancePaymentData.transaction_reference = transactionReference;
          advancePaymentData.external_reference = transactionReference;
        }

        if (selectedMethod?.type === 'mobile_banking' && transactionReference) {
          advancePaymentData.payment_data = {
            mobile_number: orderData.customer?.phone,
            provider: selectedMethod.name,
            transaction_id: transactionReference,
            payment_stage: 'advance',
          };
        } else if (selectedMethod?.type === 'card' && transactionReference) {
          advancePaymentData.payment_data = {
            card_reference: transactionReference,
            payment_method: selectedMethod.name,
            payment_stage: 'advance',
          };
        } else if (selectedMethod?.type === 'bank_transfer' && transactionReference) {
          advancePaymentData.payment_data = {
            transfer_reference: transactionReference,
            bank_name: selectedMethod.name,
            payment_stage: 'advance',
          };
        } else {
          advancePaymentData.payment_data = {
            notes: `Advance payment - COD remaining: ৳${codAmount.toFixed(2)}`,
            payment_stage: 'advance',
          };
        }

        const advanceResponse = await axios.post(`/orders/${createdOrder.id}/payments/simple`, advancePaymentData);
        if (!advanceResponse.data?.success) {
          throw new Error(advanceResponse.data?.message || 'Failed to process advance payment');
        }
      }

      // paymentOption === 'none' => no payment now

      const msg =
        paymentOption === 'full'
          ? `Order ${createdOrder.order_number} placed with full payment.`
          : paymentOption === 'partial'
            ? `Order ${createdOrder.order_number} placed. Advance ৳${advance.toFixed(2)}, COD ৳${codAmount.toFixed(2)}.`
            : `Order ${createdOrder.order_number} placed. Full COD ৳${codAmount.toFixed(2)}.`;

      displayToast(msg, 'success');
      sessionStorage.removeItem('pendingOrder');

      setTimeout(() => {
        window.location.href = '/orders';
      }, 2000);
    } catch (error: any) {
      console.error('❌ Order placement failed:', error);
      const errMsg = error.response?.data?.message || error.message || 'Error placing order. Please try again.';
      displayToast(errMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">
                Amount Details
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left: Order Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>

                  {/* Customer */}
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-2">Customer Information</p>
                    <p className="text-sm text-gray-900 dark:text-white">{orderData.customer?.name}</p>
                    {orderData.customer?.email && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{orderData.customer.email}</p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400">{orderData.customer?.phone}</p>
                    <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                      Store ID: <span className="font-semibold">{String(orderData.store_id)}</span>
                    </p>
                  </div>

                  {/* Address */}
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-800 dark:text-green-300 font-medium mb-2">Delivery Address</p>

                    {orderData.isInternational ? (
                      <>
                        <p className="text-xs text-gray-900 dark:text-white">
                          {shippingForUi?.city || ''}
                          {shippingForUi?.state ? `, ${shippingForUi.state}` : ''}, {shippingForUi?.country || ''}
                        </p>
                        {shippingForUi?.postalCode || shippingForUi?.postal_code ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Postal Code: {shippingForUi?.postalCode || shippingForUi?.postal_code}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {shippingForUi?.address || shippingForUi?.street || orderData.customer?.address || ''}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
                          <Globe className="w-3 h-3" />
                          <span>International Delivery</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-900 dark:text-white">
                          {shippingForUi?.city || ''}
                          {shippingForUi?.zone ? `, ${shippingForUi.zone}` : ''}
                          {shippingForUi?.area ? `, ${shippingForUi.area}` : ''}
                        </p>
                        {(shippingForUi?.postalCode || shippingForUi?.postal_code) && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Postal Code: {shippingForUi?.postalCode || shippingForUi?.postal_code}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {shippingForUi?.address || shippingForUi?.street || orderData.customer?.address || ''}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Products */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Products ({orderData.items?.length || 0})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {orderData.items?.map((item: any, idx: number) => {
                        const itemAmount = calculateItemAmount(item);
                        return (
                          <div key={idx} className="flex justify-between items-start p-2 rounded bg-gray-50 dark:bg-gray-700">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-900 dark:text-white truncate">{item.productName || `Product #${item.product_id}`}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Qty: {item.quantity} × ৳{parseNumber(item.unit_price).toFixed(2)}
                              </p>
                              {parseNumber(item.discount_amount) > 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Discount: -৳{parseNumber(item.discount_amount).toFixed(2)}
                                </p>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white ml-2">৳{itemAmount.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>

                  {/* Totals */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                      <span className="text-gray-900 dark:text-white">৳{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Discount</span>
                      <span className="text-red-600 dark:text-red-400">-৳{totalDiscount.toFixed(2)}</span>
                    </div>
                    {VAT_UI_ENABLED && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">VAT ({vatRate}%)</span>
                        <span className="text-gray-900 dark:text-white">৳{vat.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Transport</span>
                      <span className="text-gray-900 dark:text-white">৳{transport.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold mt-2">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">৳{total.toFixed(2)}</span>
                    </div>
                    {totalFees > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Estimated gateway fees</span>
                        <span className="text-gray-700 dark:text-gray-300">৳{totalFees.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                {/* Right: Amount & Payment */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">Charges & Payments</h2>

                  {/* VAT + Transport */}
                  <div className={`grid gap-3 mb-4 ${VAT_UI_ENABLED ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {VAT_UI_ENABLED && (
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">VAT %</label>
                        <input
                          value={vatRate}
                          onChange={(e) => setVatRate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Transport (৳)</label>
                      <input
                        value={transportCost}
                        onChange={(e) => setTransportCost(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                  </div>

                  {/* Payment Option */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Payment Option</p>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={paymentOption === 'full'}
                          onChange={() => setPaymentOption('full')}
                          disabled={isProcessing}
                        />
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Full payment now</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={paymentOption === 'partial'}
                          onChange={() => setPaymentOption('partial')}
                          disabled={isProcessing}
                        />
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span>Advance + Cash on Delivery</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={paymentOption === 'none'}
                          onChange={() => setPaymentOption('none')}
                          disabled={isProcessing}
                        />
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>No advance (Full COD)</span>
                        </div>
                      </label>
                    </div>

                  {/* Payment Details */}
                  <div className="space-y-3">
                    {(paymentOption === 'full' || paymentOption === 'partial') && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                          <select
                            value={selectedPaymentMethod}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            disabled={isProcessing}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select payment method</option>
                            {paymentMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {paymentOption === 'partial' && (
                          <div>
                            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Advance Amount (৳)</label>
                            <input
                              value={advanceAmount}
                              onChange={(e) => setAdvanceAmount(e.target.value)}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="e.g. 500"
                            />
                            <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                              COD will be: <span className="font-semibold">৳{codAmount.toFixed(2)}</span>
                            </p>
                          </div>
                        )}

                        {selectedMethod?.requires_reference && (
                          <div>
                            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Transaction Reference</label>
                            <input
                              value={transactionReference}
                              onChange={(e) => setTransactionReference(e.target.value)}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="e.g. Txn ID"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {(paymentOption === 'partial' || paymentOption === 'none') && (
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">COD Payment Method</label>
                        <select
                          value={codPaymentMethod}
                          onChange={(e) => setCodPaymentMethod(e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select COD method</option>
                          {paymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Payment Notes (optional)</label>
                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        disabled={isProcessing}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g. bKash from customer's number..."
                      />
                    </div>

                    {/* Summary */}
                    <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-3 text-xs">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">Payment Summary</p>
                      <div className="space-y-1 text-gray-700 dark:text-gray-200">
                        <div className="flex justify-between">
                          <span>Total</span>
                          <span className="font-medium">৳{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Advance</span>
                          <span className="font-medium">৳{advance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>COD</span>
                          <span className="font-medium">৳{codAmount.toFixed(2)}</span>
                        </div>
                        {totalFees > 0 && (
                          <div className="flex justify-between">
                            <span>Estimated Fees</span>
                            <span className="font-medium">৳{totalFees.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                    >
                      {isProcessing ? 'Processing...' : 'Place Order'}
                    </button>
                  </div>

              {showToast && (
                <Toast
                  message={toastMessage}
                  type={toastType}
                  onClose={() => setShowToast(false)}
                />
              )}
            </div>
          </main>
        </div>
  );
}
