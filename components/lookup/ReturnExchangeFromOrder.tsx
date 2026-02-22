'use client';

import { useState } from 'react';
import { RotateCcw, ArrowRightLeft, X, Check, AlertTriangle, Building2, Package } from 'lucide-react';
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

type Mode = 'return' | 'exchange' | null;

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

  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [returnReason, setReturnReason] = useState('defective_product');
  const [receivedAtStore, setReceivedAtStore] = useState(String(order.store?.id || order.store_id || ''));
  const [customerNotes, setCustomerNotes] = useState('');
  const [itemReasons, setItemReasons] = useState<Record<number, string>>({});
  const [exchangeItems, setExchangeItems] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState<{ mode: Mode; returnNumber: string } | null>(null);

  const safeItems: OrderItem[] = Array.isArray(order?.items) ? order.items : [];

  const reset = () => {
    setMode(null);
    setSelectedItems({});
    setReturnReason('defective_product');
    setReceivedAtStore(String(order.store?.id || order.store_id || ''));
    setCustomerNotes('');
    setItemReasons({});
    setExchangeItems('');
    setErr('');
    setSuccess(null);
  };

  const toggleItem = (itemKey: number, maxQty: number) => {
    setSelectedItems(prev => {
      if (prev[itemKey] !== undefined) {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      }
      return { ...prev, [itemKey]: Math.min(1, maxQty) };
    });
  };

  const setQty = (itemKey: number, qty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(qty, maxQty));
    if (clamped === 0) {
      setSelectedItems(prev => { const n = { ...prev }; delete n[itemKey]; return n; });
    } else {
      setSelectedItems(prev => ({ ...prev, [itemKey]: clamped }));
    }
  };

  const isCrossStore = receivedAtStore && order.store?.id && parseInt(receivedAtStore) !== order.store.id;
  const selectedCount = Object.keys(selectedItems).length;

  const handleSubmit = async () => {
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([itemKey, qty]) => {
        const idx = parseInt(itemKey);
        const item = safeItems.find(i => (i.id ?? safeItems.indexOf(i)) === idx);
        return {
          order_item_id: item?.id ?? idx,
          quantity: qty,
          reason: itemReasons[idx] || undefined,
        };
      });

    if (itemsToReturn.length === 0) { setErr('Please select at least one item'); return; }
    if (mode === 'exchange' && !exchangeItems.trim()) { setErr('Please describe the items you want in exchange'); return; }

    setLoading(true); setErr('');
    try {
      const notes = mode === 'exchange'
        ? `[EXCHANGE REQUEST] Wanted: ${exchangeItems}${customerNotes ? ` | Notes: ${customerNotes}` : ''}`
        : customerNotes || undefined;

      const res = await productReturnService.create({
        order_id: order.id,
        received_at_store_id: receivedAtStore ? parseInt(receivedAtStore) : undefined,
        return_reason: returnReason as any,
        return_type: 'customer_return',
        items: itemsToReturn,
        customer_notes: notes,
      });

      const returnNumber =
        res?.data?.return_number ||
        res?.data?.data?.return_number ||
        String(res?.data?.id || res?.data?.data?.id || '');

      setSuccess({ mode, returnNumber });
      setMode(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ── */
  if (success) {
    const isExchange = success.mode === 'exchange';
    return (
      <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-800 dark:text-green-300">
              {isExchange ? 'Exchange Request Submitted' : 'Return Request Created'}
            </p>
            <p className="text-[11px] text-green-700 dark:text-green-400 mt-0.5">
              {success.returnNumber ? `Ref #${success.returnNumber} · ` : ''}
              Manage in the <a href="/returns" className="underline font-medium">Returns & Exchanges</a> section.
            </p>
            {isExchange && (
              <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
                Staff will review and confirm replacement availability.
              </p>
            )}
          </div>
          <button onClick={reset} className="text-green-600 hover:text-green-800 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">

      {/* Idle: action buttons */}
      {!mode && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('return')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Initiate Return
          </button>
          <button
            onClick={() => setMode('exchange')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 font-medium transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Request Exchange
          </button>
          <a
            href="/returns"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            View All Returns →
          </a>
        </div>
      )}

      {/* Active form */}
      {(mode === 'return' || mode === 'exchange') && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">

          {/* Header */}
          <div className={`border-b px-4 py-3 flex items-center justify-between ${
            mode === 'exchange'
              ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                mode === 'exchange' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/20'
              }`}>
                {mode === 'exchange'
                  ? <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  : <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {mode === 'exchange' ? 'Request Exchange' : 'Initiate Return'}
                </p>
                <p className="text-[9px] text-gray-500">Order #{order.order_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setMode('return'); setErr(''); }}
                className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors ${
                  mode === 'return'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >Return</button>
              <button
                onClick={() => { setMode('exchange'); setErr(''); }}
                className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors ${
                  mode === 'exchange'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >Exchange</button>
              <button onClick={reset} className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">

            {err && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 dark:text-red-400">{err}</p>
              </div>
            )}

            {isCrossStore && (
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 dark:text-blue-400">
                  <strong>Cross-store:</strong> Purchased at {order.store?.name || `Store #${order.store_id}`} but returned to a different store. Batch tracking maintained automatically.
                </p>
              </div>
            )}

            {mode === 'exchange' && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Select items to return and describe what you'd like instead. Staff will confirm replacement availability.
                </p>
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                Select Items to {mode === 'exchange' ? 'Exchange' : 'Return'}
              </p>
              {safeItems.length === 0 ? (
                <div className="flex items-center gap-2 py-4 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <Package className="w-4 h-4 text-gray-400" />
                  <p className="text-[11px] text-gray-500">No items found for this order.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {safeItems.map((item, idx) => {
                    const itemKey = item.id ?? idx;
                    const maxQty = item.returnable_quantity ?? Math.max(0, item.quantity - (item.returned_quantity || 0));
                    const isSelected = selectedItems[itemKey] !== undefined;
                    const isExhausted = maxQty <= 0;
                    const activeColor = mode === 'exchange' ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10';

                    return (
                      <div
                        key={String(itemKey)}
                        className={`rounded-lg border p-3 transition-all ${
                          isExhausted ? 'opacity-50 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                          : isSelected ? activeColor
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isExhausted}
                            onChange={() => !isExhausted && toggleItem(itemKey, maxQty)}
                            className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer accent-red-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight truncate">
                                  {item.product_name}
                                </p>
                                {item.product_sku && (
                                  <p className="text-[9px] text-gray-400">SKU: {item.product_sku}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[10px] text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
                                {isExhausted
                                  ? <p className="text-[9px] text-gray-400">Already returned</p>
                                  : <p className="text-[9px] text-green-600">Returnable: {maxQty}</p>
                                }
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-medium text-gray-500 mb-1">
                                    Qty
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <button type="button"
                                      onClick={() => setQty(itemKey, (selectedItems[itemKey] || 1) - 1, maxQty)}
                                      className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 font-bold text-sm leading-none">−
                                    </button>
                                    <input type="number" min="1" max={maxQty}
                                      value={selectedItems[itemKey] || 1}
                                      onChange={e => setQty(itemKey, parseInt(e.target.value) || 1, maxQty)}
                                      className="w-12 text-center px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <button type="button"
                                      onClick={() => setQty(itemKey, (selectedItems[itemKey] || 1) + 1, maxQty)}
                                      className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 font-bold text-sm leading-none">+
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-medium text-gray-500 mb-1">
                                    Item reason
                                  </label>
                                  <input type="text"
                                    value={itemReasons[itemKey] || ''}
                                    onChange={e => setItemReasons(p => ({ ...p, [itemKey]: e.target.value }))}
                                    placeholder="e.g. Broken zipper"
                                    className="w-full px-2 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reason + Store */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500">
                  {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">Received At Store</label>
                {stores.length > 0 ? (
                  <select value={receivedAtStore} onChange={e => setReceivedAtStore(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                ) : (
                  <div className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500">
                    {order.store?.name || `Store #${order.store_id}` || '—'}
                  </div>
                )}
              </div>
            </div>

            {/* Exchange: desired items */}
            {mode === 'exchange' && (
              <div>
                <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Desired Replacement Items *
                </label>
                <textarea value={exchangeItems} onChange={e => setExchangeItems(e.target.value)} rows={2}
                  placeholder="e.g. Same shirt in size L, blue — or SKU: SHIRT-L-BLU"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
            )}

            {/* Customer notes */}
            <div>
              <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Notes (optional)
              </label>
              <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} rows={2}
                placeholder="Any additional details..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none" />
            </div>

            {/* Summary */}
            {selectedCount > 0 && (
              <div className={`rounded-lg p-3 text-xs border ${
                mode === 'exchange'
                  ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'
              }`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {mode === 'exchange' ? 'Exchange' : 'Return'} Summary — {selectedCount} item{selectedCount !== 1 ? 's' : ''}
                </p>
                {Object.entries(selectedItems).map(([itemKey, qty]) => {
                  const idx = parseInt(itemKey);
                  const item = safeItems.find(i => (i.id ?? safeItems.indexOf(i)) === idx);
                  if (!item) return null;
                  const price = parseFloat(String(item.unit_price || '0'));
                  return (
                    <div key={itemKey} className="flex justify-between text-gray-700 dark:text-gray-300 py-0.5">
                      <span className="truncate mr-2">{item.product_name} × {qty}</span>
                      <span className="font-medium flex-shrink-0">
                        {!isNaN(price) && price > 0 ? `৳${(price * qty).toLocaleString()}` : '—'}
                      </span>
                    </div>
                  );
                })}
                {mode === 'exchange' && exchangeItems && (
                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] text-blue-700 dark:text-blue-400">
                      <strong>Wants:</strong> {exchangeItems}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={reset}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading || selectedCount === 0}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white rounded-lg disabled:opacity-40 font-medium transition-colors ${
                  mode === 'exchange' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {mode === 'exchange' ? <ArrowRightLeft className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {loading ? 'Submitting...' : mode === 'exchange'
                  ? `Submit Exchange (${selectedCount})`
                  : `Create Return (${selectedCount})`
                }
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
