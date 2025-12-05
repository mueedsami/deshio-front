'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, MapPin, CreditCard, ShoppingBag, AlertCircle, Loader2, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import checkoutService, { Address, OrderItem, PaymentMethod } from '@/services/checkoutService';
import { useCart } from '../CartContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();

  // State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cod');
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; message: string } | null>(null);
  const [shippingCharge, setShippingCharge] = useState(60);

  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      localStorage.setItem('checkout-redirect', 'true');
      router.push('/e-commerce/login');
    }
  }, [router]);

  // ✅ FIXED: Load selected items from cart
  useEffect(() => {
    console.log('🔍 === CHECKOUT DEBUG START ===');
    
    console.log('1️⃣ Cart value:', cart);
    console.log('1️⃣ Cart is array?', Array.isArray(cart));
    console.log('1️⃣ Cart length:', cart?.length);
    
    if (!cart) {
      console.log('⏳ Waiting for cart to load...');
      return;
    }

    // ✅ cart is already an array from CartContext
    const cartItems = cart;
    
    console.log('2️⃣ Cart items:', cartItems);
    console.log('2️⃣ Cart items length:', cartItems.length);
    console.log('2️⃣ Cart item IDs:', cartItems.map((i: any) => i.id));

    const selectedIdsStr = localStorage.getItem('checkout-selected-items');
    console.log('3️⃣ localStorage value:', selectedIdsStr);
    
    if (!selectedIdsStr) {
      console.warn('⚠️ No selected items in localStorage, redirecting to cart...');
      router.push('/e-commerce/cart');
      return;
    }

    try {
      const ids = JSON.parse(selectedIdsStr);
      console.log('4️⃣ Parsed IDs:', ids);
      console.log('4️⃣ IDs is array?', Array.isArray(ids));
      
      // ✅ Filter cart items by selected IDs
      const items = cartItems.filter((item: any) => {
        const included = ids.includes(item.id);
        console.log(`  - Item ${item.id} (${item.name}): ${included ? '✅' : '❌'}`);
        return included;
      });
      
      console.log('5️⃣ Filtered items:', items);
      console.log('5️⃣ Filtered count:', items.length);
      
      if (items.length === 0) {
        console.error('❌ No matching items found!');
        console.error('📋 Available:', cartItems.map((i: any) => i.id));
        console.error('🔍 Looking for:', ids);
        
        alert(
          `Cart synchronization issue!\n\n` +
          `Expected: ${ids.join(', ')}\n` +
          `Found: ${cartItems.map((i: any) => i.id).join(', ') || 'none'}\n\n` +
          `Redirecting to cart...`
        );
        
        localStorage.removeItem('checkout-selected-items');
        router.push('/e-commerce/cart');
        return;
      }
      
      console.log('✅ Setting selected items:', items);
      setSelectedItems(items);
      console.log('🔍 === CHECKOUT DEBUG END ===');
      
    } catch (error) {
      console.error('❌ Error parsing selected items:', error);
      localStorage.removeItem('checkout-selected-items');
      router.push('/e-commerce/cart');
    }
  }, [cart, router]);

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

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const methods = await checkoutService.getPaymentMethods();
        setPaymentMethods(methods);
        
        const codMethod = methods.find(m => m.id === 'cod' || m.name.toLowerCase().includes('cash on delivery'));
        if (codMethod) {
          setSelectedPaymentMethod(codMethod.id);
        } else if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
        
        const fallbackMethods: PaymentMethod[] = [
          {
            id: 'cod',
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

const handlePlaceOrder = async () => {
  if (!selectedShippingAddressId) {
    setError('Please select a shipping address');
    return;
  }

  if (!selectedPaymentMethod) {
    setError('Please select a payment method');
    return;
  }

  setIsProcessing(true);
  setError(null);

  try {
    // Get the payment method CODE (string) and convert to lowercase
    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
    const paymentMethodCode = (paymentMethod?.name || 'cod').toLowerCase();

    const orderData = {
      payment_method: paymentMethodCode,
      shipping_address_id: selectedShippingAddressId,
      billing_address_id: sameAsShipping ? selectedShippingAddressId : (selectedBillingAddressId || selectedShippingAddressId),
      notes: orderNotes || '',
      delivery_preference: 'standard' as const,
    };

    // Only include coupon_code if it has a value
    if (appliedCoupon && couponCode) {
      orderData.coupon_code = couponCode;
    }

    console.log('📦 Placing order:', orderData);

    const result = await checkoutService.createOrderFromCart(orderData);

    console.log('✅ Order placed successfully:', result);

    // Clear checkout data
    localStorage.removeItem('checkout-selected-items');
    
    // Refresh cart to clear items
    await refreshCart();

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
  if (!cart || selectedItems.length === 0) {
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
            {/* Shipping Address */}
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

                        {/* ✅ FIX: Button calls handler directly, no form submission */}
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
                              console.log('🚫 Cancel clicked');
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
                    onClick={() => setCurrentStep('review')}
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