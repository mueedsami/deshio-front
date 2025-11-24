'use client';

import { useState, useEffect } from 'react';
import { X, Plus, DollarSign, ShoppingCart, MoreVertical, Eye, Receipt, Loader2, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { vendorService, Vendor } from '@/services/vendorService';
import purchaseOrderService, { PurchaseOrder, CreatePurchaseOrderData } from '@/services/purchase-order.service';
import { vendorPaymentService, CreatePaymentRequest, PaymentMethod } from '@/services/vendorPaymentService';
import storeService, { Store } from '@/services/storeService';
import productService, { Product } from '@/services/productService';

// Utility function to safely format currency
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md overflow-y-auto">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sizeClasses[size]} mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Alert = ({ type, message }: { type: 'success' | 'error'; message: string }) => (
  <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`}>
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </div>
);

export default function VendorPaymentPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendorPayments, setVendorPayments] = useState<any[]>([]);

  // Modal states
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showViewVendor, setShowViewVendor] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

  // Form states - Add Vendor
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    website: '',
    type: 'manufacturer' as 'manufacturer' | 'distributor',
    credit_limit: '',
    payment_terms: '',
    notes: ''
  });

  // Form states - Add Purchase
  const [purchaseForm, setPurchaseForm] = useState({
    vendor_id: '',
    store_id: '',
    expected_delivery_date: '',
    tax_amount: '',
    discount_amount: '',
    shipping_cost: '',
    notes: '',
    terms_and_conditions: '',
    items: [
      {
        product_id: '',
        quantity_ordered: '',
        unit_cost: '',
        unit_sell_price: '',
        tax_amount: '',
        discount_amount: '',
        notes: ''
      }
    ]
  });

  // Form states - Payment
  const [paymentForm, setPaymentForm] = useState({
    payment_method_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'purchase_order' as 'purchase_order' | 'advance',
    reference_number: '',
    transaction_id: '',
    notes: '',
    allocations: [] as { purchase_order_id: number; amount: number; notes?: string }[]
  });

  const [selectedPOs, setSelectedPOs] = useState<{ [key: number]: { selected: boolean; amount: string } }>({});

  // Load initial data
  useEffect(() => {
    loadVendors();
    loadStores();
    loadProducts();
    loadPaymentMethods();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (dropdownOpen !== null) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  // Show alert helper
  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  // Load vendors
  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getAll({ is_active: true });
      setVendors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      setVendors([]);
      showAlert('error', error.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  // Load stores (warehouses)
  const loadStores = async () => {
    try {
      const response = await storeService.getStores({ 
        is_warehouse: true,
        is_active: true 
      });
      
      if (response.success && Array.isArray(response.data?.data)) {
        setStores(response.data.data);
      } else if (response.success && Array.isArray(response.data)) {
        setStores(response.data);
      } else {
        console.warn('Unexpected stores response format:', response);
        setStores([]);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      setStores([]);
      showAlert('error', 'Failed to load warehouses');
    }
  };

  // Load products
  const loadProducts = async () => {
    try {
      const response = await productService.getAll({ 
        per_page: 1000
      });
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      setProducts([]);
      showAlert('error', error.message || 'Failed to load products');
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      const methods = await vendorPaymentService.getAllPaymentMethods();
      setPaymentMethods(Array.isArray(methods) ? methods : []);
    } catch (error: any) {
      console.error('Failed to load payment methods:', error);
      setPaymentMethods([]);
      showAlert('error', error.message || 'Failed to load payment methods');
    }
  };

  // Handle Add Vendor
  const handleAddVendor = async () => {
    if (!vendorForm.name.trim()) {
      showAlert('error', 'Vendor name is required');
      return;
    }

    try {
      setLoading(true);
      const newVendor = await vendorService.create({
        name: vendorForm.name,
        email: vendorForm.email || undefined,
        phone: vendorForm.phone || undefined,
        address: vendorForm.address || undefined,
        contact_person: vendorForm.contact_person || undefined,
        website: vendorForm.website || undefined,
        type: vendorForm.type,
        credit_limit: vendorForm.credit_limit ? parseFloat(vendorForm.credit_limit) : undefined,
        payment_terms: vendorForm.payment_terms || undefined,
        notes: vendorForm.notes || undefined
      });

      setVendors([...vendors, newVendor]);
      setVendorForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        contact_person: '',
        website: '',
        type: 'manufacturer',
        credit_limit: '',
        payment_terms: '',
        notes: ''
      });
      setShowAddVendor(false);
      showAlert('success', 'Vendor added successfully');
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Purchase Order
  const handleAddPurchase = async () => {
    if (!purchaseForm.vendor_id || !purchaseForm.store_id) {
      showAlert('error', 'Please select vendor and warehouse');
      return;
    }

    if (purchaseForm.items.length === 0 || !purchaseForm.items[0].product_id) {
      showAlert('error', 'Please add at least one product');
      return;
    }

    try {
      setLoading(true);

      const purchaseData: CreatePurchaseOrderData = {
        vendor_id: parseInt(purchaseForm.vendor_id),
        store_id: parseInt(purchaseForm.store_id),
        expected_delivery_date: purchaseForm.expected_delivery_date || undefined,
        tax_amount: purchaseForm.tax_amount ? parseFloat(purchaseForm.tax_amount) : undefined,
        discount_amount: purchaseForm.discount_amount ? parseFloat(purchaseForm.discount_amount) : undefined,
        shipping_cost: purchaseForm.shipping_cost ? parseFloat(purchaseForm.shipping_cost) : undefined,
        notes: purchaseForm.notes || undefined,
        terms_and_conditions: purchaseForm.terms_and_conditions || undefined,
        items: purchaseForm.items.filter(item => item.product_id).map(item => ({
          product_id: parseInt(item.product_id),
          quantity_ordered: parseInt(item.quantity_ordered),
          unit_cost: parseFloat(item.unit_cost),
          unit_sell_price: item.unit_sell_price ? parseFloat(item.unit_sell_price) : undefined,
          tax_amount: item.tax_amount ? parseFloat(item.tax_amount) : undefined,
          discount_amount: item.discount_amount ? parseFloat(item.discount_amount) : undefined,
          notes: item.notes || undefined
        }))
      };

      await purchaseOrderService.create(purchaseData);
      
      setPurchaseForm({
        vendor_id: '',
        store_id: '',
        expected_delivery_date: '',
        tax_amount: '',
        discount_amount: '',
        shipping_cost: '',
        notes: '',
        terms_and_conditions: '',
        items: [{
          product_id: '',
          quantity_ordered: '',
          unit_cost: '',
          unit_sell_price: '',
          tax_amount: '',
          discount_amount: '',
          notes: ''
        }]
      });
      
      setShowAddPurchase(false);
      showAlert('success', 'Purchase order created successfully');
      loadVendors();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Add product item to purchase
  const addProductItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [
        ...purchaseForm.items,
        {
          product_id: '',
          quantity_ordered: '',
          unit_cost: '',
          unit_sell_price: '',
          tax_amount: '',
          discount_amount: '',
          notes: ''
        }
      ]
    });
  };

  // Remove product item
  const removeProductItem = (index: number) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index)
    });
  };

  // Update product item
  const updateProductItem = (index: number, field: string, value: string) => {
    const newItems = [...purchaseForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  // Handle Payment
  const openPaymentModal = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setLoading(true);
    
    try {
      const outstanding = await vendorPaymentService.getOutstanding(vendor.id);
      setPurchaseOrders(outstanding.purchase_orders);
      
      const initialSelected: { [key: number]: { selected: boolean; amount: string } } = {};
      outstanding.purchase_orders.forEach(po => {
        initialSelected[po.id] = { selected: false, amount: '' };
      });
      setSelectedPOs(initialSelected);
      
      setShowPayment(true);
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to load outstanding orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle Make Payment
  const handlePayment = async () => {
    if (!selectedVendor || !paymentForm.payment_method_id || !paymentForm.amount) {
      showAlert('error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const allocations = Object.entries(selectedPOs)
        .filter(([_, data]) => data.selected && parseFloat(data.amount) > 0)
        .map(([poId, data]) => ({
          purchase_order_id: parseInt(poId),
          amount: parseFloat(data.amount),
          notes: `Payment for PO`
        }));

      const paymentData: CreatePaymentRequest = {
        vendor_id: selectedVendor.id,
        payment_method_id: parseInt(paymentForm.payment_method_id),
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_type: paymentForm.payment_type,
        reference_number: paymentForm.reference_number || undefined,
        transaction_id: paymentForm.transaction_id || undefined,
        notes: paymentForm.notes || undefined,
        allocations: allocations.length > 0 ? allocations : undefined
      };

      await vendorPaymentService.create(paymentData);

      setPaymentForm({
        payment_method_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'purchase_order',
        reference_number: '',
        transaction_id: '',
        notes: '',
        allocations: []
      });
      setSelectedPOs({});
      setShowPayment(false);
      showAlert('success', 'Payment recorded successfully');
      loadVendors();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  // Open view vendor
  const openViewVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowViewVendor(true);
  };

  // Open transactions
  const openTransactions = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setLoading(true);
    
    try {
      const payments = await vendorPaymentService.getAll({ vendor_id: vendor.id });
      setVendorPayments(payments.data || []);
      setShowTransactions(true);
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
    
    setDropdownOpen(null);
  };

  // Calculate total allocated amount
  const calculateTotalAllocated = () => {
    return Object.values(selectedPOs)
      .filter(data => data.selected)
      .reduce((sum, data) => sum + (parseFloat(data.amount) || 0), 0);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {alert && <Alert type={alert.type} message={alert.message} />}

        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Vendor Payment Management
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddVendor(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Vendor
              </button>
              <button
                onClick={() => setShowAddPurchase(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                New Purchase Order
              </button>
            </div>
          </div>

          {loading && vendors.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">Vendor</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Credit Limit</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(vendors) && vendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-6 py-3">
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{vendor.phone}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="capitalize text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          {vendor.type}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-xs">{vendor.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3">
                        ৳{formatCurrency(vendor.credit_limit)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          vendor.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openPaymentModal(vendor)}
                            className="flex items-center gap-1 bg-gray-900 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                          >
                            ৳ Make Payment
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(dropdownOpen === vendor.id ? null : vendor.id);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>

                            {dropdownOpen === vendor.id && (
                              <div className="fixed mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                                   style={{
                                     transform: 'translateX(-100%)',
                                     marginLeft: '-12px'
                                   }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openViewVendor(vendor);
                                    setDropdownOpen(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTransactions(vendor);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                                >
                                  <Receipt className="w-4 h-4" />
                                  View Transactions
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {vendors.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No vendors found. Add your first vendor to get started.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={showAddVendor}
        onClose={() => setShowAddVendor(false)}
        title="Add New Vendor"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vendorForm.name}
                onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={vendorForm.type}
                onChange={(e) => setVendorForm({...vendorForm, type: e.target.value as 'manufacturer' | 'distributor'})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="manufacturer">Manufacturer</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="vendor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="+880 1xxx-xxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={vendorForm.contact_person}
                onChange={(e) => setVendorForm({...vendorForm, contact_person: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Contact person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={vendorForm.website}
                onChange={(e) => setVendorForm({...vendorForm, website: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="https://vendor.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              value={vendorForm.address}
              onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
              placeholder="Enter vendor address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Credit Limit (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={vendorForm.credit_limit}
                onChange={(e) => setVendorForm({...vendorForm, credit_limit: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="50000.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={vendorForm.payment_terms}
                onChange={(e) => setVendorForm({...vendorForm, payment_terms: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Net 30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={vendorForm.notes}
              onChange={(e) => setVendorForm({...vendorForm, notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              placeholder="Additional notes about this vendor"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowAddVendor(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddVendor}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Vendor
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Purchase Order Modal */}
      <Modal
        isOpen={showAddPurchase}
        onClose={() => setShowAddPurchase(false)}
        title="Create Purchase Order"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={purchaseForm.vendor_id}
                onChange={(e) => setPurchaseForm({...purchaseForm, vendor_id: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select vendor</option>
                {Array.isArray(vendors) && vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={purchaseForm.store_id}
                onChange={(e) => setPurchaseForm({...purchaseForm, store_id: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select warehouse</option>
                {Array.isArray(stores) && stores.filter(s => s.is_warehouse).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={purchaseForm.expected_delivery_date}
                onChange={(e) => setPurchaseForm({...purchaseForm, expected_delivery_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Products</h3>
              <button
                onClick={addProductItem}
                className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700"
              >
                <Plus className="w-3 h-3" />
                Add Product
              </button>
            </div>

            {purchaseForm.items.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Product
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateProductItem(index, 'product_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select product</option>
                      {Array.isArray(products) && products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity_ordered}
                      onChange={(e) => updateProductItem(index, 'quantity_ordered', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit Cost (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => updateProductItem(index, 'unit_cost', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sell Price (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_sell_price}
                      onChange={(e) => updateProductItem(index, 'unit_sell_price', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.tax_amount}
                      onChange={(e) => updateProductItem(index, 'tax_amount', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Discount (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.discount_amount}
                      onChange={(e) => updateProductItem(index, 'discount_amount', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {purchaseForm.items.length > 1 && (
                  <button
                    onClick={() => removeProductItem(index)}
                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Amount (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchaseForm.tax_amount}
                onChange={(e) => setPurchaseForm({...purchaseForm, tax_amount: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchaseForm.discount_amount}
                onChange={(e) => setPurchaseForm({...purchaseForm, discount_amount: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping (৳)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchaseForm.shipping_cost}
                onChange={(e) => setPurchaseForm({...purchaseForm, shipping_cost: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={purchaseForm.notes}
              onChange={(e) => setPurchaseForm({...purchaseForm, notes: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              placeholder="Additional notes"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowAddPurchase(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleAddPurchase}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Purchase Order
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Make Payment"
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Vendor</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedVendor.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentForm.payment_method_id}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select method</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Type
              </label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) => setPaymentForm({...paymentForm, payment_type: e.target.value as 'purchase_order' | 'advance'})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="purchase_order">Purchase Order Payment</option>
                <option value="advance">Advance Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Amount (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            {paymentForm.payment_type === 'purchase_order' && purchaseOrders.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                  Allocate to Purchase Orders
                </h4>
                
                {Array.isArray(purchaseOrders) && purchaseOrders.map((po) => (
                  <div key={po.id} className="flex items-center gap-3 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedPOs[po.id]?.selected || false}
                      onChange={(e) => setSelectedPOs({
                        ...selectedPOs,
                        [po.id]: { ...selectedPOs[po.id], selected: e.target.checked, amount: e.target.checked ? selectedPOs[po.id]?.amount || '' : '' }
                      })}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {po.po_number}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Outstanding: ৳{formatCurrency(po.outstanding_amount)}
                      </p>
                    </div>
                    {selectedPOs[po.id]?.selected && (
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={po.outstanding_amount}
                        value={selectedPOs[po.id]?.amount || ''}
                        onChange={(e) => setSelectedPOs({
                          ...selectedPOs,
                          [po.id]: { ...selectedPOs[po.id], amount: e.target.value }
                        })}
                        className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Amount"
                      />
                    )}
                  </div>
                ))}

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Allocated:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      ৳{formatCurrency(calculateTotalAllocated())}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="CHQ-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="TXN-12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                placeholder="Additional notes"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowPayment(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Vendor Modal */}
      <Modal
        isOpen={showViewVendor}
        onClose={() => setShowViewVendor(false)}
        title="Vendor Details"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Vendor Name</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {selectedVendor.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Type</p>
                <p className="text-base text-gray-900 dark:text-gray-100 capitalize">
                  {selectedVendor.type}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedVendor.phone || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedVendor.email || 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Address</p>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {selectedVendor.address || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact Person</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedVendor.contact_person || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Credit Limit</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  ৳{formatCurrency(selectedVendor.credit_limit)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Payment Terms</p>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {selectedVendor.payment_terms || 'N/A'}
              </p>
            </div>

            {selectedVendor.notes && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {selectedVendor.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowViewVendor(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction History Modal */}
      <Modal
        isOpen={showTransactions}
        onClose={() => setShowTransactions(false)}
        title="Transaction History"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Vendor</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedVendor.name}
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {Array.isArray(vendorPayments) && vendorPayments.length > 0 ? (
                vendorPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {payment.payment_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.payment_type} - {payment.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        ৳{formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No transactions found.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowTransactions(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}