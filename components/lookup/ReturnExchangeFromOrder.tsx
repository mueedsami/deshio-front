'use client';

import { useState } from 'react';
import { RotateCcw, ArrowRightLeft, X, Check, AlertTriangle, ChevronDown, Building2 } from 'lucide-react';
import productReturnService from '@/services/productReturnService';

interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price?: string | number;
  total_amount?: string | number;
  returnable_quantity?: number;
  returned_quantity?: number;
  barcodes?: string[];
}

interface Order {
  id: number;
  order_number: string;
  store?: { id: number; name: string };
  store_id?: number;
  items: OrderItem[];
}

interface Props {
  order: Order;
  stores?: Array<{ id: number; name: string }>;
}

type Mode = 'return' | null;

const RETURN_REASONS = [
  { value: 'defective_product', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'customer_dissatisfaction', label: 'Customer Dissatisfaction' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'color_issue', label: 'Color Issue' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'late_delivery', label: 'Late Delivery' },
  { value: 'changed_mind', label: 'Changed Mind' },
  { value: 'duplicate_order', label: 'Duplicate Order' },
  { value: 'other', label: 'Other' },
];

export default function ReturnExchangeFromOrder({ order, stores = [] }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  // Return state
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({}); // item.id -> qty
  const [returnReason, setReturnReason] = useState('defective_product');
  const [returnType, setReturnType] = useState('customer_return');
  const [receivedAtStore, setReceivedAtStore] = useState(String(order.store?.id || order.store_id || ''));
  const [customerNotes, setCustomerNotes] = useState('');
  const [itemReasons, setItemReasons] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => {
    setMode(null);
    setSelectedItems({});
    setReturnReason('defective_product');
    setReturnType('customer_return');
    setReceivedAtStore(String(order.store?.id || order.store_id || ''));
    setCustomerNotes('');
    setItemReasons({});
    setErr('');
    setSuccess('');
  };

  const toggleItem = (itemId: number, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[itemId] !== undefined) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: 1 };
    });
  };

  const setQty = (itemId: number, qty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(qty, maxQty));
    if (clamped === 0) {
      setSelectedItems(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    } else {
      setSelectedItems(prev => ({ ...prev, [itemId]: clamped }));
    }
  };

  const isCrossStore = receivedAtStore && order.store?.id && parseInt(receivedAtStore) !== order.store.id;

  const handleReturn = async () => {
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = order.items.find(i => i.id === parseInt(itemId));
        return { order_item_id: parseInt(itemId), quantity: qty, reason: itemReasons[parseInt(itemId)] || undefined };
      });

    if (itemsToReturn.length === 0) { setErr('Please select at least one item to return'); return; }

    setLoading(true); setErr('');
    try {
      const res = await productReturnService.create({
        order_id: order.id,
        received_at_store_id: receivedAtStore ? parseInt(receivedAtStore) : undefined,
        return_reason: returnReason as any,
        return_type: returnType as any,
        items: itemsToReturn,
        customer_notes: customerNotes || undefined,
      });

      const returnNumber = res?.data?.return_number || res?.data?.id;
      setSuccess(`Return created successfully! Return #: ${returnNumber}. You can manage it in the Returns & Exchanges section.`);
      setMode(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create return';
      setErr(msg);
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-800 dark:text-green-300">Return Created Successfully</p>
            <p className="text-[10px] text-green-700 dark:text-green-400 mt-0.5">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
      {/* Action buttons */}
      {!mode && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('return')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Initiate Return
          </button>
          <a
            href="/returns"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            View All Returns →
          </a>
        </div>
      )}

      {/* Return form */}
      {mode === 'return' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Initiate Return</p>
                <p className="text-[9px] text-gray-500">Order #{order.order_number}</p>
              </div>
            </div>
            <button onClick={reset} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {err && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-700 dark:text-red-400">{err}</p>
              </div>
            )}

            {/* Cross-store warning */}
            {isCrossStore && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">Cross-Store Return</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                    Item was purchased at {order.store?.name || `Store #${order.store_id}`} but will be returned to a different store. Batch tracking will be maintained automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Select items */}
            <div>
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Select Items to Return</p>
              <div className="space-y-2">
                {order.items.map(item => {
                  const maxQty = item.returnable_quantity ?? item.quantity;
                  const isSelected = selectedItems[item.id] !== undefined;
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 transition-colors ${isSelected ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleItem(item.id, maxQty)}
                          className="mt-0.5 w-3.5 h-3.5 text-red-600 rounded cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                          <p className="text-[9px] text-gray-500">
                            Ordered: {item.quantity}
                            {item.returned_quantity ? ` • Returned: ${item.returned_quantity}` : ''}
                            {' '}• Returnable: {maxQty}
                          </p>
                          {isSelected && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-medium text-gray-600 dark:text-gray-400 mb-1">Return Qty</label>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => setQty(item.id, (selectedItems[item.id] || 1) - 1, maxQty)}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold">
                                    −
                                  </button>
                                  <input type="number" min="1" max={maxQty} value={selectedItems[item.id] || 1}
                                    onChange={e => setQty(item.id, parseInt(e.target.value) || 1, maxQty)}
                                    className="w-12 text-center px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                                  <button type="button" onClick={() => setQty(item.id, (selectedItems[item.id] || 1) + 1, maxQty)}
                                    className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-bold">
                                    +
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[9px] font-medium text-gray-600 dark:text-gray-400 mb-1">Item Reason (optional)</label>
                                <input type="text" value={itemReasons[item.id] || ''} onChange={e => setItemReasons(p => ({ ...p, [item.id]: e.target.value }))}
                                  placeholder="e.g. Screen crack"
                                  className="w-full px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">Return Reason *</label>
                <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">Return Type</label>
                <select value={returnType} onChange={e => setReturnType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="customer_return">Customer Return</option>
                  <option value="store_return">Store Return</option>
                  <option value="warehouse_return">Warehouse Return</option>
                </select>
              </div>
            </div>

            {/* Received at store */}
            {stores.length > 0 && (
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Received At Store
                  {isCrossStore && <span className="ml-1 text-blue-500">(Cross-Store)</span>}
                </label>
                <select value={receivedAtStore} onChange={e => setReceivedAtStore(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Customer notes */}
            <div>
              <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Notes (optional)</label>
              <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} rows={2}
                placeholder="Customer's description of the issue..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>

            {/* Summary */}
            {Object.keys(selectedItems).length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Return Summary</p>
                {Object.entries(selectedItems).map(([itemId, qty]) => {
                  const item = order.items.find(i => i.id === parseInt(itemId));
                  if (!item) return null;
                  const price = parseFloat(String(item.unit_price || '0'));
                  return (
                    <div key={itemId} className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>{item.product_name} × {qty}</span>
                      <span>{isNaN(price) ? '—' : `৳${(price * qty).toLocaleString()}`}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleReturn} disabled={loading || Object.keys(selectedItems).length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 font-medium">
                <RotateCcw className="w-3.5 h-3.5" />
                {loading ? 'Creating...' : 'Create Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
