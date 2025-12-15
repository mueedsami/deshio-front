'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import customerService, { Customer, CustomerOrder } from '@/services/customerService';
import orderService from '@/services/orderService';

export default function CustomerLookup() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'order'>('customer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [singleOrder, setSingleOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [orderSuggestions, setOrderSuggestions] = useState<CustomerOrder[]>([]);
  const [showOrderSuggestions, setShowOrderSuggestions] = useState(false);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  };

  // Real-time search for suggestions
  const fetchSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    try {
      const formattedSearch = formatPhoneNumber(searchTerm);
      
      const searchResults = await customerService.search({
        phone: formattedSearch,
        per_page: 10
      });

      // Filter to only show customers whose phone starts with the search term
      const matchingSuggestions = searchResults.data.filter(customer => {
        const customerPhone = customer.phone.replace(/\D/g, '');
        return customerPhone.startsWith(formattedSearch);
      });

      setSuggestions(matchingSuggestions);
      setShowSuggestions(matchingSuggestions.length > 0);
    } catch (err) {
      console.error('Suggestions error:', err);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Real-time search for order suggestions
  const fetchOrderSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setOrderSuggestions([]);
      setShowOrderSuggestions(false);
      return;
    }

    setOrderSearchLoading(true);
    try {
      // Remove # symbol if present
      const cleanSearch = searchTerm.trim().replace(/^#/, '');
      
      const searchResults = await orderService.getAll({
        search: cleanSearch,
        per_page: 10
      });

      // Filter to only show orders whose order_number starts with the search term
      // And convert Order type to CustomerOrder type
      const matchingSuggestions: CustomerOrder[] = searchResults.data
        .filter(order => {
          const orderNum = order.order_number.replace(/^#/, '');
          const searchNum = cleanSearch.replace(/^#/, '');
          return orderNum.toLowerCase().startsWith(searchNum.toLowerCase());
        })
        .map(order => ({
          id: order.id,
          order_number: order.order_number,
          order_date: order.order_date,
          order_type: order.order_type,
          order_type_label: order.order_type_label || order.order_type,
          total_amount: order.total_amount,
          paid_amount: order.paid_amount,
          outstanding_amount: order.outstanding_amount,
          payment_status: order.payment_status,
          status: order.status,
          store: order.store,
          items: order.items || [],
          shipping_address: order.shipping_address,
          notes: order.notes
        }));

      setOrderSuggestions(matchingSuggestions);
      setShowOrderSuggestions(matchingSuggestions.length > 0);
    } catch (err) {
      console.error('Order suggestions error:', err);
      setOrderSuggestions([]);
    } finally {
      setOrderSearchLoading(false);
    }
  };

  // Debounce the suggestions search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (phoneNumber.trim()) {
        fetchSuggestions(phoneNumber);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [phoneNumber]);

  // Debounce the order suggestions search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (orderNumber.trim()) {
        fetchOrderSuggestions(orderNumber);
      } else {
        setOrderSuggestions([]);
        setShowOrderSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [orderNumber]);

  // Click outside to close suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
      if (!target.closest('.order-search-container')) {
        setShowOrderSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (selectedCustomer: Customer) => {
    setPhoneNumber(selectedCustomer.phone);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Load the selected customer's data
    setLoading(true);
    setError('');
    setCustomer(null);
    setOrders([]);

    try {
      setCustomer(selectedCustomer);
      
      console.log('Customer selected:', selectedCustomer);
      
      // Fetch customer's orders
      const ordersResponse = await customerService.getOrderHistory(selectedCustomer.id, {
        per_page: 100,
        page: 1
      });

      console.log('Orders fetched:', ordersResponse);

      setOrders(ordersResponse.data || []);

    } catch (err: any) {
      console.error('Load customer error:', err);
      setError(err.message || 'An error occurred while loading customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrderSuggestion = async (selectedOrder: CustomerOrder) => {
    setOrderNumber(selectedOrder.order_number);
    setShowOrderSuggestions(false);
    setOrderSuggestions([]);
    
    // Load the selected order's data
    setLoading(true);
    setError('');
    setCustomer(null);
    setSingleOrder(null);

    try {
      setSingleOrder(selectedOrder);
      console.log('Order selected:', selectedOrder);
      
      // Fetch full order details to get customer info
      const fullOrder = await orderService.getById(selectedOrder.id);
      
      // Set customer info
      if (fullOrder.customer) {
        const customerData: Customer = {
          id: fullOrder.customer.id,
          customer_code: fullOrder.customer.customer_code,
          name: fullOrder.customer.name,
          phone: fullOrder.customer.phone,
          email: fullOrder.customer.email,
          customer_type: 'retail',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCustomer(customerData);
      }

    } catch (err: any) {
      console.error('Load order error:', err);
      setError(err.message || 'An error occurred while loading order data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrder = async () => {
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError('');
    setSingleOrder(null);
    setCustomer(null);

    try {
      // Remove # symbol if present and trim
      const cleanOrderNumber = orderNumber.trim().replace(/^#/, '');
      
      console.log('Searching for order:', cleanOrderNumber);
      console.log('Original input:', orderNumber);
      
      // Try searching with the clean order number
      const ordersResponse = await orderService.getAll({
        search: cleanOrderNumber,
        per_page: 50
      });

      console.log('Order search results:', ordersResponse);
      console.log('Number of results:', ordersResponse.data?.length);

      if (!ordersResponse.data || ordersResponse.data.length === 0) {
        setError(`No order found with number: ${cleanOrderNumber}`);
        return;
      }

      // Find exact match for order number (case-insensitive)
      let foundOrder = ordersResponse.data.find(order => 
        order.order_number.toLowerCase() === cleanOrderNumber.toLowerCase()
      );

      // If no exact match, try partial match
      if (!foundOrder) {
        foundOrder = ordersResponse.data.find(order => 
          order.order_number.toLowerCase().includes(cleanOrderNumber.toLowerCase())
        );
      }

      // Fall back to first result
      if (!foundOrder) {
        foundOrder = ordersResponse.data[0];
      }

      console.log('Found order:', foundOrder);
      console.log('Order number match:', foundOrder.order_number);

      // Convert to CustomerOrder format
      const orderData: CustomerOrder = {
        id: foundOrder.id,
        order_number: foundOrder.order_number,
        order_date: foundOrder.order_date,
        order_type: foundOrder.order_type,
        order_type_label: foundOrder.order_type_label || foundOrder.order_type,
        total_amount: foundOrder.total_amount,
        paid_amount: foundOrder.paid_amount,
        outstanding_amount: foundOrder.outstanding_amount,
        payment_status: foundOrder.payment_status,
        status: foundOrder.status,
        store: foundOrder.store,
        items: foundOrder.items || [],
        shipping_address: foundOrder.shipping_address,
        notes: foundOrder.notes
      };

      setSingleOrder(orderData);
      console.log('Order data set:', orderData);

      // Also fetch and set customer info
      if (foundOrder.customer) {
        const customerData: Customer = {
          id: foundOrder.customer.id,
          customer_code: foundOrder.customer.customer_code,
          name: foundOrder.customer.name,
          phone: foundOrder.customer.phone,
          email: foundOrder.customer.email,
          customer_type: 'retail',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCustomer(customerData);
        console.log('Customer data set:', customerData);
      }

    } catch (err: any) {
      console.error('Search order error:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'An error occurred while searching for the order');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Close suggestions
    setShowSuggestions(false);
    setSuggestions([]);

    setLoading(true);
    setError('');
    setCustomer(null);
    setOrders([]);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      console.log('Searching for phone:', formattedPhone);
      
      // Use customerService to search by phone
      const searchResults = await customerService.search({
        phone: formattedPhone,
        per_page: 10 // Get more results to filter
      });
      
      console.log('Search results:', searchResults);
      
      if (!searchResults.data || searchResults.data.length === 0) {
        setError('No customer found with this phone number');
        return;
      }

      // Find EXACT match for the phone number
      const exactMatch = searchResults.data.find(customer => {
        const customerPhone = customer.phone.replace(/\D/g, '');
        return customerPhone === formattedPhone;
      });

      if (!exactMatch) {
        setError(`No customer found with phone number: ${phoneNumber}`);
        return;
      }

      const customerData = exactMatch;
      
      // Set customer data
      setCustomer(customerData);
      
      console.log('Customer found:', customerData);
      
      // Fetch customer's orders using customerService
      const ordersResponse = await customerService.getOrderHistory(customerData.id, {
        per_page: 100,
        page: 1
      });

      console.log('Orders fetched:', ordersResponse);

      setOrders(ordersResponse.data || []);

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatOrderType = (order: CustomerOrder) => {
    if (order.order_type_label) {
      return order.order_type_label;
    }
    // Fallback: format order_type to readable text
    if (order.order_type) {
      return order.order_type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'N/A';
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status?: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300">
          Unknown
        </span>
      );
    }

    const statusConfig: { [key: string]: { bg: string; text: string } } = {
      'paid': { 
        bg: 'bg-green-100 dark:bg-green-900/30', 
        text: 'text-green-800 dark:text-green-300'
      },
      'partial': { 
        bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
        text: 'text-yellow-800 dark:text-yellow-300'
      },
      'partially_paid': { 
        bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
        text: 'text-yellow-800 dark:text-yellow-300'
      },
      'pending': { 
        bg: 'bg-orange-100 dark:bg-orange-900/30', 
        text: 'text-orange-800 dark:text-orange-300'
      },
      'failed': { 
        bg: 'bg-red-100 dark:bg-red-900/30', 
        text: 'text-red-800 dark:text-red-300'
      }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig['pending'];

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-white dark:bg-black">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} />

          <main className="flex-1 overflow-auto bg-white dark:bg-black">
            {/* Compact Header with Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="px-4 py-2">
                <div className="max-w-7xl mx-auto">
                  <h1 className="text-base font-semibold text-black dark:text-white leading-none mb-2">Lookup</h1>
                  
                  {/* Tabs */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setActiveTab('customer');
                        setError('');
                        setCustomer(null);
                        setOrders([]);
                        setSingleOrder(null);
                        setPhoneNumber('');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        activeTab === 'customer'
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      Customer Lookup
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('order');
                        setError('');
                        setCustomer(null);
                        setOrders([]);
                        setSingleOrder(null);
                        setOrderNumber('');
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        activeTab === 'order'
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      Order Lookup
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-4">
              {activeTab === 'customer' ? (
                <>
                  {/* Customer Search Bar */}
                  <div className="mb-4">
                    <div className="relative max-w-xl mx-auto search-container">
                      <div className="relative">
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          onKeyPress={handleKeyPress}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                          }}
                          placeholder="Type phone number..."
                          className="w-full pl-3 pr-24 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-black dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                        <button
                          onClick={handleSearch}
                          disabled={loading}
                          className="absolute right-1.5 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                        >
                          {loading ? 'Searching...' : 'Search'}
                        </button>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-xl max-h-80 overflow-y-auto z-50">
                            {searchLoading && (
                              <div className="px-3 py-2 text-center">
                                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin mx-auto"></div>
                              </div>
                            )}
                            {suggestions.map((suggestion, index) => (
                              <button
                                key={suggestion.id}
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className={`w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
                                  index !== suggestions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-black dark:text-white mb-0.5">
                                      {suggestion.phone}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                      {suggestion.name}
                                    </p>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-medium uppercase">
                                    {suggestion.customer_type}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {error && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Order Search Bar */}
                  <div className="mb-4">
                    <div className="relative max-w-xl mx-auto order-search-container">
                      <div className="relative">
                        <input
                          type="text"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSearchOrder();
                            }
                          }}
                          onFocus={() => {
                            if (orderSuggestions.length > 0) setShowOrderSuggestions(true);
                          }}
                          placeholder="Type order number..."
                          className="w-full pl-3 pr-24 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-black dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                        <button
                          onClick={handleSearchOrder}
                          disabled={loading}
                          className="absolute right-1.5 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                        >
                          {loading ? 'Searching...' : 'Search'}
                        </button>

                        {/* Order Autocomplete Suggestions */}
                        {showOrderSuggestions && orderSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-xl max-h-80 overflow-y-auto z-50">
                            {orderSearchLoading && (
                              <div className="px-3 py-2 text-center">
                                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin mx-auto"></div>
                              </div>
                            )}
                            {orderSuggestions.map((suggestion, index) => (
                              <button
                                key={suggestion.id}
                                onClick={() => handleSelectOrderSuggestion(suggestion)}
                                className={`w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
                                  index !== orderSuggestions.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-black dark:text-white mb-0.5">
                                      {suggestion.order_number}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {formatDate(suggestion.order_date)}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span className="font-medium text-gray-600 dark:text-gray-400">
                                        {formatCurrency(suggestion.total_amount)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {getStatusBadge(suggestion.payment_status)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {error && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Customer Details */}
              {customer && (
                <div className="space-y-3">
                  {/* Compact Customer Info Card */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">Customer Information</h2>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Name</p>
                            <p className="text-sm font-medium text-black dark:text-white">{customer.name}</p>
                          </div>

                          <div>
                            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Phone</p>
                            <p className="text-sm font-medium text-black dark:text-white">{customer.phone}</p>
                          </div>

                          {customer.email && (
                            <div>
                              <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Email</p>
                              <p className="text-sm text-black dark:text-white">{customer.email}</p>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-3">
                          {customer.created_at && (
                            <div>
                              <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Customer Since</p>
                              <p className="text-sm font-medium text-black dark:text-white">{formatDate(customer.created_at)}</p>
                            </div>
                          )}

                          {activeTab === 'customer' && (
                            <div>
                              <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Total Orders</p>
                              <p className="text-sm font-medium text-black dark:text-white">{orders.length}</p>
                            </div>
                          )}

                          <div>
                            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Status</p>
                            <p className="text-sm font-medium text-black dark:text-white capitalize">{customer.status || 'Active'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Address - Full Width */}
                      {customer.address && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                          <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Address</p>
                          <p className="text-sm text-black dark:text-white">{customer.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact Stats - Only for Customer Tab */}
                  {activeTab === 'customer' && orders.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="border border-gray-200 dark:border-gray-800 rounded-md p-2.5">
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-1">Orders</p>
                        <p className="text-xl font-semibold text-black dark:text-white">{orders.length}</p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-md p-2.5">
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-1">Spent</p>
                        <p className="text-xl font-semibold text-black dark:text-white">
                          ৳{(orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / 1000).toFixed(1)}k
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-md p-2.5">
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-1">Avg</p>
                        <p className="text-xl font-semibold text-black dark:text-white">
                          ৳{orders.length > 0 ? (orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / orders.length / 1000).toFixed(1) : 0}k
                        </p>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-800 rounded-md p-2.5">
                        <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-1">Due</p>
                        <p className="text-xl font-semibold text-black dark:text-white">
                          ৳{(orders.reduce((sum, order) => sum + parseFloat(order.outstanding_amount), 0) / 1000).toFixed(1)}k
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compact Order History */}
                  {((activeTab === 'customer' && orders.length > 0) || (activeTab === 'order' && singleOrder)) && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                          {activeTab === 'customer' ? 'Order History' : 'Order Details'}
                        </h2>
                        <span className="text-[9px] px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded font-medium">
                          {activeTab === 'customer' ? orders.length : 1}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {(activeTab === 'customer' ? orders : [singleOrder!]).map((order) => (
                          <div key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <div 
                              className="p-3 cursor-pointer"
                              onClick={() => toggleOrderDetails(order.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 grid grid-cols-5 gap-3">
                                  <div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Order #</p>
                                    <p className="text-xs font-medium text-black dark:text-white">{order.order_number}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Date</p>
                                    <p className="text-xs text-black dark:text-white">{formatDate(order.order_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Type</p>
                                    <p className="text-xs text-black dark:text-white">{formatOrderType(order)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Total</p>
                                    <p className="text-xs font-medium text-black dark:text-white">{formatCurrency(order.total_amount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase font-medium mb-0.5">Payment</p>
                                    {getStatusBadge(order.payment_status)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Compact Expanded Order Details */}
                            {expandedOrderId === order.id && (
                              <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <div className="pt-3 space-y-2">
                                  {/* Order Items */}
                                  <div>
                                    <p className="text-[9px] font-semibold text-black dark:text-white uppercase mb-1.5">Items</p>
                                    <div className="bg-white dark:bg-black rounded border border-gray-200 dark:border-gray-800 overflow-hidden">
                                      <table className="w-full text-[10px]">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                          <tr>
                                            <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-gray-700 dark:text-gray-300 uppercase">Product</th>
                                            <th className="px-2 py-1.5 text-left text-[9px] font-semibold text-gray-700 dark:text-gray-300 uppercase">SKU</th>
                                            <th className="px-2 py-1.5 text-right text-[9px] font-semibold text-gray-700 dark:text-gray-300 uppercase">Qty</th>
                                            <th className="px-2 py-1.5 text-right text-[9px] font-semibold text-gray-700 dark:text-gray-300 uppercase">Price</th>
                                            <th className="px-2 py-1.5 text-right text-[9px] font-semibold text-gray-700 dark:text-gray-300 uppercase">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                          {order.items.map((item) => (
                                            <tr key={item.id}>
                                              <td className="px-2 py-1.5 font-medium text-black dark:text-white">{item.product_name}</td>
                                              <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{item.product_sku}</td>
                                              <td className="px-2 py-1.5 text-right font-medium text-black dark:text-white">{item.quantity}</td>
                                              <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price)}</td>
                                              <td className="px-2 py-1.5 text-right font-medium text-black dark:text-white">{formatCurrency(item.total_amount)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Payment Summary & Store */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-[9px] font-semibold text-black dark:text-white uppercase mb-1">Store</p>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">{order.store.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-semibold text-black dark:text-white uppercase mb-1">Payment</p>
                                      <div className="space-y-0.5 text-[10px]">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                          <span className="font-medium text-black dark:text-white">{formatCurrency(order.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                                          <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(order.paid_amount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Due:</span>
                                          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(order.outstanding_amount)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  {order.notes && (
                                    <div>
                                      <p className="text-[9px] font-semibold text-black dark:text-white uppercase mb-1">Notes</p>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-400">{order.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}