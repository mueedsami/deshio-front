'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, MapPin, CreditCard, ShoppingBag, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import checkoutService, { Address, OrderItem, PaymentMethod } from '@/services/checkoutService';
import { useCart } from '../CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();

  // State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Form data
  const [shippingAddress, setShippingAddress] = useState<Address>({
    name: '',
    phone: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Dhaka',
    state: 'Dhaka Division',
    postal_code: '',
    country: 'Bangladesh',
    landmark: '',
    delivery_instructions: '',
  });

  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash_on_delivery');
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [shippingCharge, setShippingCharge] = useState(60);

  // Load selected items from cart
  useEffect(() => {
    const selectedIds = localStorage.getItem('checkout-selected-items');
    if (selectedIds) {
      const ids = JSON.parse(selectedIds);
      const items = cartItems.filter((item: any) => ids.includes(item.id));
      setSelectedItems(items);
    } else {
      // If no items selected, redirect to cart
      router.push('/e-commerce/cart');
    }
  }, [cartItems]);

  // Restore checkout state after login
  useEffect(() => {
    const wasRedirected = localStorage.getItem('checkout-redirect');
    
    if (wasRedirected === 'true') {
      // User just logged in, restore their checkout state
      const savedShippingData = localStorage.getItem('checkout-shipping-data');
      const savedPaymentMethod = localStorage.getItem('checkout-payment-method');
      
      if (savedShippingData) {
        try {
          const shippingData = JSON.parse(savedShippingData);
          setShippingAddress(shippingData);
        } catch (error) {
          console.error('Error restoring shipping data:', error);
        }
      }
      
      if (savedPaymentMethod) {
        setSelectedPaymentMethod(savedPaymentMethod);
        // Move to payment step
        setCurrentStep('payment');
      }
      
      // Clear the saved state
      localStorage.removeItem('checkout-redirect');
      localStorage.removeItem('checkout-shipping-data');
      localStorage.removeItem('checkout-payment-method');
    }
  }, []);

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const methods = await checkoutService.getPaymentMethods();
        setPaymentMethods(methods);
        
        // Set default payment method if available
        if (methods.length > 0 && !selectedPaymentMethod) {
          setSelectedPaymentMethod(methods[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
        
        // Set fallback payment methods
        const fallbackMethods: PaymentMethod[] = [
          {
            id: 'cash_on_delivery',
            name: 'Cash on Delivery',
            description: 'Pay with cash when your order is delivered',
            fee: 0,
            is_online: false,
            is_active: true,
          }
        ];
        setPaymentMethods(fallbackMethods);
        setSelectedPaymentMethod(fallbackMethods[0].id);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Calculate totals
  const orderItems: OrderItem[] = selectedItems.map(item => ({
    product_id: item.product_id || item.id,
    product_name: item.product_name || item.name,
    quantity: item.quantity,
    price: parseFloat(item.price || '0'),
    total: parseFloat(item.price || '0') * item.quantity,
    product_image: item.product_image || item.image,
    sku: item.sku,
    color: item.color,
    size: item.size,
  }));

  const summary = checkoutService.calculateOrderSummary(orderItems, shippingCharge);

  // Form validation
  const validateShippingForm = (): boolean => {
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address_line_1 || !shippingAddress.city) {
      setError('Please fill in all required fields');
      return false;
    }

    // Validate phone number (Bangladesh format)
    const phoneRegex = /^(\+88)?01[3-9]\d{8}$/;
    if (!phoneRegex.test(shippingAddress.phone.replace(/[\s-]/g, ''))) {
      setError('Please enter a valid Bangladesh phone number');
      return false;
    }

    // Validate email if provided
    if (shippingAddress.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(shippingAddress.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    setError(null);
    return true;
  };

  // Handle shipping form submission
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateShippingForm()) {
      return;
    }

    setCurrentStep('payment');
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create order (user is authenticated, cart is already in backend)
      const orderData = {
        payment_method: selectedPaymentMethod as any,
        shipping_address: shippingAddress,
        billing_address: sameAsShipping ? shippingAddress : billingAddress!,
        notes: orderNotes,
        coupon_code: couponCode,
        delivery_preference: 'standard' as const,
        items: orderItems, // Include items in request (for reference)
      };

      const result = await checkoutService.createGuestOrder(orderData);

      // Clear selected items from localStorage
      localStorage.removeItem('checkout-selected-items');

      // Store order number for confirmation page
      localStorage.setItem('last-order-number', result.order.order_number);

      // Redirect to order confirmation
      router.push(`/e-commerce/order-confirmation/${result.order.order_number}`);

    } catch (error: any) {
      console.error('Order placement failed:', error);
      setError(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-red-700 mx-auto mb-4" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep === 'shipping' ? 'text-red-700' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 'shipping' ? 'bg-red-700 text-white' : 'bg-gray-200'
              }`}>
                <MapPin size={20} />
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </div>
            
            <ChevronRight className="text-gray-400" />
            
            <div className={`flex items-center ${currentStep === 'payment' ? 'text-red-700' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 'payment' ? 'bg-red-700 text-white' : 'bg-gray-200'
              }`}>
                <CreditCard size={20} />
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
            
            <ChevronRight className="text-gray-400" />
            
            <div className={`flex items-center ${currentStep === 'review' ? 'text-red-700' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-red-700 text-white' : 'bg-gray-200'
              }`}>
                <Package size={20} />
              </div>
              <span className="ml-2 font-medium">Review</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            {currentStep === 'shipping' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MapPin className="text-red-700" />
                  Shipping Information
                </h2>
                
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={shippingAddress.email}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.address_line_1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address_line_1: e.target.value })}
                      placeholder="House/Flat number, Street name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.address_line_2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address_line_2: e.target.value })}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Division <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                        required
                      >
                        <option value="Dhaka Division">Dhaka Division</option>
                        <option value="Chittagong Division">Chittagong Division</option>
                        <option value="Rajshahi Division">Rajshahi Division</option>
                        <option value="Khulna Division">Khulna Division</option>
                        <option value="Barisal Division">Barisal Division</option>
                        <option value="Sylhet Division">Sylhet Division</option>
                        <option value="Rangpur Division">Rangpur Division</option>
                        <option value="Mymensingh Division">Mymensingh Division</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postal_code}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.landmark}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, landmark: e.target.value })}
                      placeholder="Nearby landmark for easy delivery"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions (Optional)
                    </label>
                    <textarea
                      value={shippingAddress.delivery_instructions}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, delivery_instructions: e.target.value })}
                      placeholder="Any special instructions for delivery"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {/* Payment Method */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard className="text-red-700" />
                  Payment Method
                </h2>

                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-red-700 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="mt-1 w-5 h-5 text-red-700"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{method.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                        {method.fee > 0 && (
                          <p className="text-sm text-red-700 mt-1">Fee: ৳{method.fee}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => setCurrentStep('shipping')}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back to Shipping
                  </button>
                  <button
                    onClick={() => {
                      // Check authentication before proceeding to review
                      const token = localStorage.getItem('auth_token');
                      
                      if (!token) {
                        // Not authenticated - save checkout state and redirect to login
                        localStorage.setItem('checkout-redirect', 'true');
                        localStorage.setItem('checkout-shipping-data', JSON.stringify(shippingAddress));
                        localStorage.setItem('checkout-payment-method', selectedPaymentMethod);
                        router.push('/e-commerce/login');
                      } else {
                        // Authenticated - proceed to review
                        setCurrentStep('review');
                      }
                    }}
                    disabled={!selectedPaymentMethod}
                    className="flex-1 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            )}

            {/* Review & Place Order */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                {/* Shipping Address Review */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Shipping Address</h3>
                    <button
                      onClick={() => setCurrentStep('shipping')}
                      className="text-red-700 text-sm font-medium hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-gray-700">
                    <p className="font-semibold">{shippingAddress.name}</p>
                    <p>{shippingAddress.phone}</p>
                    {shippingAddress.email && <p>{shippingAddress.email}</p>}
                    <p className="mt-2">
                      {shippingAddress.address_line_1}
                      {shippingAddress.address_line_2 && `, ${shippingAddress.address_line_2}`}
                    </p>
                    <p>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                    </p>
                    {shippingAddress.landmark && <p className="text-sm text-gray-600 mt-1">Landmark: {shippingAddress.landmark}</p>}
                  </div>
                </div>

                {/* Payment Method Review */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Payment Method</h3>
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="text-red-700 text-sm font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-gray-700">
                    {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || selectedPaymentMethod}
                  </p>
                </div>

                {/* Order Notes */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Order Notes (Optional)</h3>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special instructions for your order"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full bg-red-700 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Processing Order...
                    </>
                  ) : (
                    <>
                      <Package size={24} />
                      Place Order - ৳{summary.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ShoppingBag className="text-red-700" />
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {selectedItems.map((item: any) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product_image || item.image}
                      alt={item.product_name || item.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-product.jpg';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {item.product_name || item.name}
                      </h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-red-700">
                        ৳{(parseFloat(item.price) * item.quantity).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal ({selectedItems.length} items)</span>
                  <span>৳{summary.subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span>৳{summary.shipping_charge.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>

                {summary.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-৳{summary.discount_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-red-700">৳{summary.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Coupon Code */}
              {currentStep === 'review' && (
                <div className="mt-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    />
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}