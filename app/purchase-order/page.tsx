'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Eye, Check, Package, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import purchaseOrderService, { 
  PurchaseOrder, 
  ReceiveItemData,
  PurchaseOrderFilters 
} from '@/services/purchase-order.service';
import { vendorService, Vendor } from '@/services/vendorService';

// Utility function to safely format currency
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl';
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
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
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`}>
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    partially_received: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };

  const color = colors[status as keyof typeof colors] || colors.draft;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const colors = {
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  };

  const color = colors[status as keyof typeof colors] || colors.unpaid;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default function PurchaseOrdersPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [expandedPO, setExpandedPO] = useState<number | null>(null);

  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    vendor_id: undefined,
    status: '',
    payment_status: '',
    search: ''
  });

  // Receive form
  const [receiveForm, setReceiveForm] = useState<{
    items: Array<{
      item_id: number;
      quantity_received: string;
      batch_number: string;
      manufactured_date: string;
      expiry_date: string;
    }>;
  }>({
    items: []
  });

  useEffect(() => {
    loadPurchaseOrders();
    loadVendors();
  }, []);

  useEffect(() => {
    loadPurchaseOrders();
  }, [filters.vendor_id, filters.status, filters.payment_status]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderService.getAll(filters);
      const orders = response.data?.data || [];
      setPurchaseOrders(Array.isArray(orders) ? orders : []);
    } catch (error: any) {
      console.error('Failed to load purchase orders:', error);
      setPurchaseOrders([]);
      showAlert('error', error.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await vendorService.getAll({ is_active: true });
      setVendors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      setVendors([]);
    }
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    try {
      setLoading(true);
      const response = await purchaseOrderService.getById(po.id);
      setSelectedPO(response.data || po);
      setShowViewModal(true);
    } catch (error: any) {
      showAlert('error', 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePO = async (id: number) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) return;

    try {
      setLoading(true);
      await purchaseOrderService.approve(id);
      showAlert('success', 'Purchase order approved successfully');
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = async (po: PurchaseOrder) => {
    try {
      setLoading(true);
      const response = await purchaseOrderService.getById(po.id);
      const fullPO = response.data || po;
      setSelectedPO(fullPO);

      // Initialize receive form with PO items
      const items = (fullPO.items || []).map(item => ({
        item_id: item.id || 0,
        quantity_received: item.quantity_ordered?.toString() || '',
        batch_number: '',
        manufactured_date: '',
        expiry_date: ''
      }));

      setReceiveForm({ items });
      setShowReceiveModal(true);
    } catch (error: any) {
      showAlert('error', 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePO = async () => {
    if (!selectedPO) return;

    // Validate that at least one item has quantity
    const hasItems = receiveForm.items.some(item => 
      item.quantity_received && parseFloat(item.quantity_received) > 0
    );

    if (!hasItems) {
      showAlert('error', 'Please enter quantity received for at least one item');
      return;
    }

    try {
      setLoading(true);

      const receiveData: { items: ReceiveItemData[] } = {
        items: receiveForm.items
          .filter(item => item.quantity_received && parseFloat(item.quantity_received) > 0)
          .map(item => ({
            item_id: item.item_id,
            quantity_received: parseInt(item.quantity_received),
            batch_number: item.batch_number || undefined,
            manufactured_date: item.manufactured_date || undefined,
            expiry_date: item.expiry_date || undefined
          }))
      };

      await purchaseOrderService.receive(selectedPO.id, receiveData);
      showAlert('success', 'Products received successfully');
      setShowReceiveModal(false);
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to receive products');
    } finally {
      setLoading(false);
    }
  };

  const updateReceiveItem = (index: number, field: string, value: string) => {
    const newItems = [...receiveForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiveForm({ items: newItems });
  };

  const handleCancelPO = async (id: number) => {
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return; // User clicked cancel

    try {
      setLoading(true);
      await purchaseOrderService.cancel(id, reason);
      showAlert('success', 'Purchase order cancelled successfully');
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to cancel purchase order');
    } finally {
      setLoading(false);
    }
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
              Purchase Orders
            </h1>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor
                </label>
                <select
                  value={filters.vendor_id || ''}
                  onChange={(e) => {
                    const newFilters = {
                      ...filters,
                      vendor_id: e.target.value ? parseInt(e.target.value) : undefined
                    };
                    setFilters(newFilters);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Vendors</option>
                  {Array.isArray(vendors) && vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="partially_received">Partially Received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={filters.payment_status}
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Payment Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && loadPurchaseOrders()}
                  placeholder="Search PO number..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Purchase Orders List */}
          {loading && purchaseOrders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(purchaseOrders) && purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  {/* PO Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {po.po_number}
                            </h3>
                            <StatusBadge status={po.status} />
                            <PaymentStatusBadge status={po.payment_status} />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Vendor: {po.vendor?.name || 'N/A'} • Order Date: {formatDate(po.order_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Toggle details"
                        >
                          {expandedPO === po.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>

                        <button
                          onClick={() => handleViewPO(po)}
                          className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>

                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}

                        {(po.status === 'approved' || po.status === 'partially_received') && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            title="Receive products"
                          >
                            <Package className="w-4 h-4" />
                            Receive
                          </button>
                        )}

                        {po.status !== 'received' && po.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelPO(po.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Cancel PO"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PO Summary */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        ৳{formatCurrency(po.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Paid Amount</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ৳{formatCurrency(po.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Outstanding</p>
                      <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        ৳{formatCurrency(po.outstanding_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Expected Delivery</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(po.expected_delivery_date || '')}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedPO === po.id && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Order Items
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Product</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Qty Ordered</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Qty Received</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Unit Cost</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(po.items) && po.items.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.product_name}
                                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                    SKU: {item.product_sku}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  {item.quantity_ordered}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  {item.quantity_received || 0}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  ৳{formatCurrency(item.unit_cost)}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                  ৳{formatCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {purchaseOrders.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No purchase orders found.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Purchase Order Details"
        size="lg"
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">PO Number</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPO.po_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <StatusBadge status={selectedPO.status} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vendor</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPO.vendor?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warehouse</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPO.store?.name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Items</h4>
              <div className="space-y-2">
                {Array.isArray(selectedPO.items) && selectedPO.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{item.product_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Qty: {item.quantity_ordered} × ৳{formatCurrency(item.unit_cost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        ৳{formatCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.subtotal_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -৳{formatCurrency(selectedPO.discount_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Products"
        size="2xl"
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Purchase Order: {selectedPO.po_number}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Vendor: {selectedPO.vendor?.name}
              </p>
            </div>

            <div className="space-y-4">
              {receiveForm.items.map((item, index) => {
                const poItem = selectedPO.items?.[index];
                if (!poItem) return null;

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {poItem.product_name}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({poItem.product_sku})
                      </span>
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Ordered: {poItem.quantity_ordered} • 
                      Already Received: {poItem.quantity_received || 0}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quantity Receiving *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={(poItem.quantity_ordered || 0) - (poItem.quantity_received || 0)}
                          value={item.quantity_received}
                          onChange={(e) => updateReceiveItem(index, 'quantity_received', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Batch Number
                        </label>
                        <input
                          type="text"
                          value={item.batch_number}
                          onChange={(e) => updateReceiveItem(index, 'batch_number', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="BATCH-001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Manufactured Date
                        </label>
                        <input
                          type="date"
                          value={item.manufactured_date}
                          onChange={(e) => updateReceiveItem(index, 'manufactured_date', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateReceiveItem(index, 'expiry_date', e.target.value)}
                          min={item.manufactured_date || undefined}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleReceivePO}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Receive Products
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}