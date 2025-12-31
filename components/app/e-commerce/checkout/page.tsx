'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, MapPin, CreditCard, ShoppingBag, AlertCircle, Loader2, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import SSLCommerzPayment from '@/components/ecommerce/SSLCommerzPayment';
import checkoutService, { Address, OrderItem, PaymentMethod } from '@/services/checkoutService';
import cartService from '@/services/cartService';
import guestCheckoutService, { GuestPaymentMethod } from '@/services/guestCheckoutService';

export default function CheckoutPage() {
  const router = useRouter();

  // State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Address management
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<number | null>(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  
  const getEmptyAddressForm = (): Omit<Address, 'id'> => ({
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
    type: 'both',
    is_default_shipping: false,
    is_default_billing: false,
  });

  const [addressForm, setAddressForm] = useState<Omit<Address, 'id'>>(getEmptyAddressForm());
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(''); // ✅ CHANGED: stores payment method CODE
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; message: string } | null>(null);
  const [shippingCharge, setShippingCharge] = useState(60);

  // Guest checkout state
  const [guestPhone, setGuestPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPaymentMethod, setGuestPaymentMethod] = useState<GuestPaymentMethod>('cod');
  const [guestAddress, setGuestAddress] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Dhaka',
    state: 'Dhaka',
    postal_code: '',
    country: 'Bangladesh',
  });

  // ✅ NEW: SSLCommerz payment screen state
  const [showSSLCommerzPayment, setShowSSLCommerzPayment] = useState(false);

  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  };

  const isGuestCheckout = () => !isAuthenticated();

  const cleanPhone = (input: string) => input.replace(/[^0-9+]/g, '');

  const formatBDPhone = (input: string) => {
    const cleaned = input.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+880')) return cleaned;
    if (cleaned.startsWith('880')) return '+880' + cleaned.slice(3);
    if (cleaned.startsWith('0')) return cleaned;
    if (/^1[3-9]\d{8}$/.test(cleaned)) return '0' + cleaned;
    return cleaned;
  };

  const isValidBDPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return /^(?:880|0)?1[3-9]\d{8}$/.test(cleaned);
  };

  // ✅ FIXED: Load selected items directly from backend
  useEffect(() => {
    const loadCheckoutItems = async () => {
      console.log('🔍 === CHECKOUT LOAD START ===');
      
      const selectedIdsStr = localStorage.getItem('checkout-selected-items');
      console.log('📋 localStorage checkout items:', selectedIdsStr);
      
      if (!selectedIdsStr) {
        console.warn('⚠️ No selected items in localStorage, redirecting to cart...');
        setIsLoadingItems(false);
        router.push('/e-commerce/cart');
        return;
      }

      try {
        const ids = JSON.parse(selectedIdsStr);
        console.log('🔢 Selected IDs:', ids);
        
        if (!Array.isArray(ids) || ids.length === 0) {
          console.error('❌ Invalid selected items format');
          localStorage.removeItem('checkout-selected-items');
          setIsLoadingItems(false);
          router.push('/e-commerce/cart');
          return;
        }

        // ✅ Load fresh cart data from backend
        console.log('📦 Fetching cart from backend...');
        const cartData = await cartService.getCart();
        console.log('✅ Cart data loaded:', cartData);
        
        // ✅ Filter by selected IDs
        const items = cartData.cart_items.filter(item => ids.includes(item.id));
        console.log('✅ Filtered checkout items:', items);
        console.log('✅ Item count:', items.length);
        
        if (items.length === 0) {
          console.error('❌ No matching items found in cart!');
          alert('Selected items are no longer in your cart. Redirecting...');
          localStorage.removeItem('checkout-selected-items');
          setIsLoadingItems(false);
          router.push('/e-commerce/cart');
          return;
        }
        
        // ✅ Transform to match expected format
        const transformedItems = items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          name: item.product.name,
          images: item.product.images || [],
          sku: item.product.sku ?? '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          variant_options: item.variant_options,
          notes: item.notes,
        }));
        
        console.log('✅ Setting selected items:', transformedItems);
        setSelectedItems(transformedItems);
        setIsLoadingItems(false);
        console.log('🔍 === CHECKOUT LOAD END ===');
        
      } catch (error) {
        console.error('❌ Error loading checkout items:', error);
        localStorage.removeItem('checkout-selected-items');
        setIsLoadingItems(false);
        router.push('/e-commerce/cart');
      }
    };

    loadCheckoutItems();
  }, [router]); // ✅ Remove cart dependency - we fetch directly

  // Fetch addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!isAuthenticated()) return;

      try {
        setLoadingAddresses(true);
        const result = await checkoutService.getAddresses();
        
        console.log('📍 Fetched addresses:', result);
        setAddresses(result.addresses);
        
        if (result.default_shipping) {
          setSelectedShippingAddressId(result.default_shipping.id!);
        } else if (result.addresses.length > 0) {
          setSelectedShippingAddressId(result.addresses[0].id!);
        }
        
        if (result.default_billing) {
          setSelectedBillingAddressId(result.default_billing.id!);
        }
        
      } catch (error: any) {
        console.error('Failed to fetch addresses:', error);
        setError('Failed to load addresses');
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, []);

  // ✅ FIXED: Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const methods = await checkoutService.getPaymentMethods();
        console.log('💳 Fetched payment methods:', methods);
        setPaymentMethods(methods);
        
        // Set default payment method by CODE
        if (methods.length > 0) {
          const defaultMethod = methods.find(m => m.code === 'cash') || methods[0];
          setSelectedPaymentMethod(defaultMethod.code);
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
        
        const fallbackMethods: PaymentMethod[] = [
          {
            id: 1,
            code: 'cash',
            name: 'Cash on Delivery',
            description: 'Pay with cash when your order is delivered',
            type: 'cash',
            allowed_customer_types: ['ecommerce'],
            is_active: true,
            requires_reference: false,
            supports_partial: true,
            min_amount: null,
            max_amount: null,
            processor: null,
            processor_config: null,
            icon: null,
            fixed_fee: 0,
            percentage_fee: 0,
            sort_order: 1,
          }
        ];
        setPaymentMethods(fallbackMethods);
        setSelectedPaymentMethod(fallbackMethods[0].code);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Update shipping charge based on selected address
  useEffect(() => {
    if (selectedShippingAddressId) {
      const address = addresses.find(a => a.id === selectedShippingAddressId);
      if (address) {
        const charge = checkoutService.calculateDeliveryCharge(address.city);
        setShippingCharge(charge);
      }
    }
  }, [selectedShippingAddressId, addresses]);

  // Guest shipping charge (based on typed city)
  useEffect(() => {
    if (isGuestCheckout()) {
      setShippingCharge(checkoutService.calculateDeliveryCharge(guestAddress.city || 'Dhaka'));
    }
  }, [guestAddress.city]);

  // Calculate totals
  const orderItems: OrderItem[] = selectedItems.map(item => {
    const unitPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
    const totalPrice = typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price;
    
    return {
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      price: unitPrice,
      total: totalPrice,
      product_image: item.images?.[0]?.image_url || '/placeholder-product.jpg',
      sku: item.sku || '',
    };
  });
  const couponDiscount = appliedCoupon?.discount || 0;
  const summary = checkoutService.calculateOrderSummary(orderItems, shippingCharge, couponDiscount);

  const handleSaveAddress = async () => {
    setError(null);
    
    if (!addressForm.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!addressForm.phone.trim() || addressForm.phone.length !== 11) {
      setError('Valid 11-digit phone number is required');
      return;
    }
    
    if (!addressForm.address_line_1.trim()) {
      setError('Address is required');
      return;
    }
    
    if (!addressForm.city || addressForm.city === '') {
      setError('City is required');
      return;
    }
    
    if (!addressForm.state || addressForm.state === '') {
      setError('State/Division is required');
      return;
    }
    
    if (!addressForm.postal_code.trim() || addressForm.postal_code.length !== 4) {
      setError('Valid 4-digit postal code is required');
      return;
    }
    
    try {
      setIsProcessing(true);

      if (editingAddressId) {
        const result = await checkoutService.updateAddress(editingAddressId, addressForm);
        setAddresses(prev => prev.map(addr => 
          addr.id === editingAddressId ? result.address : addr
        ));
      } else {
        const result = await checkoutService.createAddress(addressForm);
        setAddresses(prev => [...prev, result.address]);
        
        if (addresses.length === 0 || addressForm.is_default_shipping) {
          setSelectedShippingAddressId(result.address.id!);
        }
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(getEmptyAddressForm());
      setError(null);

    } catch (error: any) {
      console.error('❌ Failed to save address:', error);
      setError(error.message || 'Failed to save address. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm(address);
    setEditingAddressId(address.id!);
    setShowAddressForm(true);
    setError(null);
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await checkoutService.deleteAddress(id);
      setAddresses(prev => prev.filter(addr => addr.id !== id));
      
      if (selectedShippingAddressId === id) {
        const remainingAddresses = addresses.filter(addr => addr.id !== id);
        setSelectedShippingAddressId(remainingAddresses[0]?.id || null);
      }
      if (selectedBillingAddressId === id) {
        setSelectedBillingAddressId(null);
      }
    } catch (error: any) {
      console.error('Failed to delete address:', error);
      setError(error.message || 'Failed to delete address');
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    const result = checkoutService.validateCoupon(couponCode, summary.subtotal);
    
    if (result.valid) {
      setAppliedCoupon({ discount: result.discount, message: result.message });
      setError(null);
    } else {
      setError(result.message);
      setAppliedCoupon(null);
    }
  };

  const handleGuestPlaceOrder = async () => {
    setError(null);

    if (selectedItems.length === 0) {
      setError('Your cart is empty. Please add items first.');
      return;
    }

    if (!guestPhone.trim() || !isValidBDPhone(guestPhone)) {
      setError('Please enter a valid Bangladesh phone number (e.g. 017xxxxxxxx)');
      return;
    }

    if (!guestAddress.full_name.trim()) {
      setError('Delivery name is required');
      return;
    }

    if (!guestAddress.address_line_1.trim()) {
      setError('Delivery address is required');
      return;
    }

    if (!guestAddress.city.trim()) {
      setError('City is required');
      return;
    }

    if (!guestAddress.postal_code.trim()) {
      setError('Postal code is required');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        phone: cleanPhone(formatBDPhone(guestPhone)),
        items: selectedItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          ...(it.variant_options ? { variant_options: it.variant_options } : {}),
        })),
        payment_method: guestPaymentMethod,
        delivery_address: {
          full_name: guestAddress.full_name,
          ...(guestAddress.phone?.trim() ? { phone: cleanPhone(guestAddress.phone) } : {}),
          address_line_1: guestAddress.address_line_1,
          ...(guestAddress.address_line_2?.trim() ? { address_line_2: guestAddress.address_line_2 } : {}),
          city: guestAddress.city,
          ...(guestAddress.state?.trim() ? { state: guestAddress.state } : {}),
          postal_code: guestAddress.postal_code,
          country: guestAddress.country || 'Bangladesh',
        },
        ...(guestName.trim() ? { customer_name: guestName.trim() } : {}),
        ...(guestEmail.trim() ? { customer_email: guestEmail.trim() } : {}),
        ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
      };

      const resp: any = await guestCheckoutService.checkout(payload as any);

      // SSLCommerz style response
      const paymentUrl = resp?.data?.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      // COD style response
      const orderNumber = resp?.data?.order?.order_number;
      if (!orderNumber) {
        throw new Error(resp?.message || 'Order created, but no order number returned');
      }

      // Remove checked-out items from cart
      for (const it of selectedItems) {
        try {
          await cartService.removeFromCart(it.id);
        } catch {
          // ignore
        }
      }

      localStorage.removeItem('checkout-selected-items');

      alert(`🎉 Order placed successfully!\n\nOrder Number: ${orderNumber}\nTotal: ৳${summary.total_amount.toFixed(2)}\n\nWe will contact you for confirmation.`);
      router.push(`/e-commerce/order-confirmation/${orderNumber}`);
    } catch (err: any) {
      console.error('❌ Guest checkout failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FIXED: Handle place order with SSLCommerz detection
  const handlePlaceOrder = async () => {
    if (!selectedShippingAddressId) {
      setError('Please select a shipping address');
      return;
    }

    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // ✅ Find the selected payment method object
    const paymentMethod = paymentMethods.find(pm => pm.code === selectedPaymentMethod);
    
    if (!paymentMethod) {
      setError('Invalid payment method selected');
      return;
    }

    console.log('💳 Selected payment method:', paymentMethod);

    // ✅ Check if it's an online payment method
    const isOnlinePayment = checkoutService.isOnlinePaymentMethod(paymentMethod);

    console.log('🔍 Is online payment:', isOnlinePayment);

    if (isOnlinePayment) {
      // ✅ Show SSLCommerz payment component
      console.log('🔐 Showing SSLCommerz payment screen');
      setShowSSLCommerzPayment(true);
      return;
    }

    // ✅ Continue with offline payment (COD, Cash, etc.)
    setIsProcessing(true);
    setError(null);

    try {
      const orderData: any = {
        payment_method: paymentMethod.code, // ✅ Use payment method code
        shipping_address_id: selectedShippingAddressId,
        billing_address_id: sameAsShipping ? selectedShippingAddressId : (selectedBillingAddressId || selectedShippingAddressId),
        notes: orderNotes || '',
        delivery_preference: 'standard' as const,
      };

      if (appliedCoupon && couponCode) {
        orderData.coupon_code = couponCode;
      }

      console.log('📦 Placing order:', orderData);

      const result = await checkoutService.createOrderFromCart(orderData);

      console.log('✅ Order placed successfully:', result);

      // Clear checkout data
      localStorage.removeItem('checkout-selected-items');

      // ✅ Show success message
      alert(`🎉 Order placed successfully!\n\nOrder Number: ${result.order.order_number}\nTotal: ৳${result.order.total_amount}\n\nYou will be redirected to your account.`);

      // ✅ Redirect to my-account page
      router.push('/e-commerce/my-account');

    } catch (error: any) {
      console.error('❌ Order placement failed:', error);
      setError(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoadingItems) {
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

  // ✅ NEW: Show SSLCommerz payment screen
  if (showSSLCommerzPayment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setShowSSLCommerzPayment(false)}
            className="mb-4 text-red-700 hover:text-red-800 flex items-center gap-2 font-medium"
          >
            ← Back to Review Order
          </button>
          
          <SSLCommerzPayment
            shippingAddressId={selectedShippingAddressId!}
            billingAddressId={sameAsShipping ? selectedShippingAddressId! : selectedBillingAddressId}
            orderNotes={orderNotes}
            couponCode={appliedCoupon ? couponCode : undefined}
            totalAmount={summary.total_amount}
            onError={(error) => {
              console.error('❌ Payment error:', error);
              setError(error);
              setShowSSLCommerzPayment(false);
            }}
            onCancel={() => {
              setShowSSLCommerzPayment(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Guest checkout UI (no login required)
  if (isGuestCheckout()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quick Checkout</h1>
              <p className="text-gray-600 mt-1">No account needed — just enter your phone and delivery details.</p>
            </div>
            <Link
              href="/e-commerce/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Login / Register
            </Link>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-600 mr-3 mt-0.5" size={20} />
              <div className="text-red-700">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="017XXXXXXXX"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">We’ll use this to confirm and track your order.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (optional)</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Recipient name"
                      value={guestAddress.full_name}
                      onChange={(e) => setGuestAddress({ ...guestAddress, full_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      placeholder="House, road, area"
                      value={guestAddress.address_line_1}
                      onChange={(e) => setGuestAddress({ ...guestAddress, address_line_1: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (optional)</label>
                    <input
                      type="text"
                      placeholder="Apartment, floor, landmark"
                      value={guestAddress.address_line_2}
                      onChange={(e) => setGuestAddress({ ...guestAddress, address_line_2: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      placeholder="Dhaka"
                      value={guestAddress.city}
                      onChange={(e) => setGuestAddress({ ...guestAddress, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Delivery charge updates automatically.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      placeholder="1207"
                      value={guestAddress.postal_code}
                      onChange={(e) => setGuestAddress({ ...guestAddress, postal_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
                    <textarea
                      rows={3}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., deliver after 5 PM"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="guest_payment_method"
                      value="cod"
                      checked={guestPaymentMethod === 'cod'}
                      onChange={() => setGuestPaymentMethod('cod')}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Cash on Delivery</div>
                      <div className="text-sm text-gray-600">Pay when your order is delivered</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="guest_payment_method"
                      value="sslcommerz"
                      checked={guestPaymentMethod === 'sslcommerz'}
                      onChange={() => setGuestPaymentMethod('sslcommerz')}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Pay Online (SSLCommerz)</div>
                      <div className="text-sm text-gray-600">You’ll be redirected to complete payment</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 max-h-64 overflow-auto pr-1">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.images?.[0]?.image_url || '/placeholder-product.jpg'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">৳{Number(item.total_price).toFixed(0)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">৳{summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium">৳{shippingCharge.toFixed(2)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount</span>
                      <span className="font-medium">-৳{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">৳{summary.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleGuestPlaceOrder}
                  disabled={isProcessing}
                  className="w-full mt-5 bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
                >
                  {isProcessing ? 'Processing…' : `Place Order – ৳${summary.total_amount.toFixed(0)}`}
                </button>

                <p className="text-xs text-gray-500 mt-3">
                  By placing your order, you agree to receive an order confirmation call/SMS.
                </p>
              </div>
            </div>
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
              <span className="ml-2 font-medium hidden sm:inline">Shipping</span>
            </div>
            
            <ChevronRight className="text-gray-400" />
            
            <div className={`flex items-center ${currentStep === 'payment' ? 'text-red-700' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 'payment' ? 'bg-red-700 text-white' : 'bg-gray-200'
              }`}>
                <CreditCard size={20} />
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Payment</span>
            </div>
            
            <ChevronRight className="text-gray-400" />
            
            <div className={`flex items-center ${currentStep === 'review' ? 'text-red-700' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-red-700 text-white' : 'bg-gray-200'
              }`}>
                <Package size={20} />
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Review</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {appliedCoupon && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <Package className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-green-900">Coupon Applied!</h3>
              <p className="text-green-700 text-sm">{appliedCoupon.message}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* 🔒 ORIGINAL SHIPPING ADDRESS CODE - UNCHANGED */}
            {currentStep === 'shipping' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="text-red-700" />
                    Shipping Address
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddressId(null);
                      setAddressForm(getEmptyAddressForm());
                      setError(null);
                    }}
                    className="flex items-center gap-2 text-red-700 font-medium hover:text-red-800"
                  >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Add New Address</span>
                  </button>
                </div>

                {loadingAddresses ? (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-red-700 mx-auto mb-2" />
                    <p className="text-gray-600">Loading addresses...</p>
                  </div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-8">
                    <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No addresses found. Please add a delivery address.</p>
                    <button
                      onClick={() => {
                        setShowAddressForm(true);
                        setError(null);
                      }}
                      className="bg-red-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-800"
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <>
                    {showAddressForm && (
                      <div className="mb-6 p-4 border-2 border-red-200 rounded-lg space-y-4 bg-red-50">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">
                            {editingAddressId ? 'Edit Address' : 'New Address'}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddressForm(false);
                              setEditingAddressId(null);
                              setAddressForm(getEmptyAddressForm());
                              setError(null);
                            }}
                            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={addressForm.name}
                              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                              placeholder="John Doe"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="tel"
                              value={addressForm.phone}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setAddressForm({ ...addressForm, phone: value });
                              }}
                              placeholder="01712345678"
                              maxLength={11}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">11 digits, e.g., 01712345678</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={addressForm.email || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                            placeholder="john@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1 <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.address_line_1}
                            onChange={(e) => setAddressForm({ ...addressForm, address_line_1: e.target.value })}
                            placeholder="House/Flat number, Street name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            value={addressForm.address_line_2 || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, address_line_2: e.target.value })}
                            placeholder="Area, Sector"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                          />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City <span className="text-red-600">*</span>
                            </label>
                            <select
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                            >
                              <option value="Dhaka">Dhaka</option>
                              <option value="Chittagong">Chittagong</option>
                              <option value="Sylhet">Sylhet</option>
                              <option value="Rajshahi">Rajshahi</option>
                              <option value="Khulna">Khulna</option>
                              <option value="Barisal">Barisal</option>
                              <option value="Rangpur">Rangpur</option>
                              <option value="Mymensingh">Mymensingh</option>
                              <option value="Comilla">Comilla</option>
                              <option value="Gazipur">Gazipur</option>
                              <option value="Narayanganj">Narayanganj</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State <span className="text-red-600">*</span>
                            </label>
                            <select
                              value={addressForm.state}
                              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Postal Code <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={addressForm.postal_code}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setAddressForm({ ...addressForm, postal_code: value });
                              }}
                              placeholder="1234"
                              maxLength={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">4 digits</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Landmark (Optional)
                          </label>
                          <input
                            type="text"
                            value={addressForm.landmark || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            placeholder="Near XYZ School"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Instructions (Optional)
                          </label>
                          <textarea
                            value={addressForm.delivery_instructions || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                            placeholder="e.g., Call before delivery"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="defaultShipping"
                            checked={addressForm.is_default_shipping || false}
                            onChange={(e) => setAddressForm({ ...addressForm, is_default_shipping: e.target.checked })}
                            className="w-4 h-4 text-red-700 focus:ring-red-700 rounded"
                          />
                          <label htmlFor="defaultShipping" className="text-sm text-gray-700">
                            Set as default shipping address
                          </label>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAddress}
                            disabled={isProcessing}
                            className="flex-1 bg-red-700 text-white py-2.5 rounded-lg font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="animate-spin" size={16} />
                                Saving...
                              </>
                            ) : (
                              <>
                                {editingAddressId ? 'Update Address' : 'Save Address'}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddressForm(false);
                              setEditingAddressId(null);
                              setAddressForm(getEmptyAddressForm());
                              setError(null);
                            }}
                            disabled={isProcessing}
                            className="px-6 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Address List */}
                    {!showAddressForm && addresses.length > 0 && (
                      <div className="space-y-3">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedShippingAddressId === address.id
                                ? 'border-red-700 bg-red-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shipping_address"
                                value={address.id}
                                checked={selectedShippingAddressId === address.id}
                                onChange={() => setSelectedShippingAddressId(address.id!)}
                                className="mt-1 w-5 h-5 text-red-700"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{address.name}</p>
                                    <p className="text-sm text-gray-600">{address.phone}</p>
                                    <p className="text-sm text-gray-700 mt-1">
                                      {address.address_line_1}
                                      {address.address_line_2 && `, ${address.address_line_2}`}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      {address.city}, {address.state} {address.postal_code}
                                    </p>
                                    {address.is_default_shipping && (
                                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                        Default Shipping
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleEditAddress(address);
                                      }}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteAddress(address.id!);
                                      }}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {addresses.length > 0 && !showAddressForm && (
                  <button
                    onClick={() => setCurrentStep('payment')}
                    disabled={!selectedShippingAddressId}
                    className="w-full mt-6 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                )}
              </div>
            )}

            {/* ✅ FIXED: Payment Method */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard className="text-red-700" />
                  Payment Method
                </h2>

                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.code}
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPaymentMethod === method.code
                          ? 'border-red-700 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.code}
                        checked={selectedPaymentMethod === method.code}
                        onChange={(e) => {
                          console.log('💳 Payment method selected:', e.target.value);
                          setSelectedPaymentMethod(e.target.value);
                        }}
                        className="mt-1 w-5 h-5 text-red-700 cursor-pointer"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{method.name}</h3>
                        {method.description && (
                          <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                        )}
                        {(method.fixed_fee > 0 || method.percentage_fee > 0) && (
                          <p className="text-sm text-red-700 mt-1">
                            Fee: ৳{method.fixed_fee}
                            {method.percentage_fee > 0 && ` + ${method.percentage_fee}%`}
                          </p>
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
                    onClick={() => setCurrentStep('review')}
                    disabled={!selectedPaymentMethod}
                    className="flex-1 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            )}

            {/* 🔒 ORIGINAL REVIEW CODE - UNCHANGED (except payment method display) */}
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
                      Change
                    </button>
                  </div>
                  {selectedShippingAddressId && (
                    (() => {
                      const address = addresses.find(a => a.id === selectedShippingAddressId);
                      if (!address) return null;
                      return (
                        <div className="text-gray-700">
                          <p className="font-semibold">{address.name}</p>
                          <p>{address.phone}</p>
                          {address.email && <p>{address.email}</p>}
                          <p className="mt-2">
                            {address.address_line_1}
                            {address.address_line_2 && `, ${address.address_line_2}`}
                          </p>
                          <p>
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          {address.landmark && <p className="text-sm text-gray-600 mt-1">Landmark: {address.landmark}</p>}
                        </div>
                      );
                    })()
                  )}
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
                    {paymentMethods.find(m => m.code === selectedPaymentMethod)?.name || selectedPaymentMethod}
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

          {/* 🔒 ORIGINAL ORDER SUMMARY - UNCHANGED */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ShoppingBag className="text-red-700" />
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {selectedItems.map((item: any) => {
                  const unitPrice = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price;
                  const totalPrice = typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price;
                  
                  return (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.images?.[0]?.image_url || '/placeholder-product.jpg'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.name}
                        </h4>
                        {item.variant_options && (
                          <div className="flex gap-1 mt-1">
                            {item.variant_options.color && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {item.variant_options.color}
                              </span>
                            )}
                            {item.variant_options.size && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {item.variant_options.size}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-red-700">
                          ৳{totalPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
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

                <div className="flex justify-between text-gray-700">
                  <span>Tax (5%)</span>
                  <span>৳{summary.tax_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
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
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-700 focus:border-transparent"
                      disabled={!!appliedCoupon}
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={!!appliedCoupon}
                      className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className="text-xs text-red-700 mt-2 hover:underline"
                    >
                      Remove coupon
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}