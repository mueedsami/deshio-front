'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { assignmentBlockerService, storeService, type Store, type AssignmentBlockerOrderItem } from '@/services';
import { AlertTriangle, CheckCircle2, Loader2, PackageSearch, RefreshCcw, ShieldCheck, Unlock } from 'lucide-react';

type Mode = 'order' | 'product';

type FlatBlocker = AssignmentBlockerOrderItem & {
  store_id: number;
  store_name: string;
  product_id: number;
  product_name: string;
  product_sku?: string;
  issue_message?: string;
  available_quantity?: number;
  physical_quantity?: number;
  sellable_barcode_quantity?: number;
  assigned_quantity_subtracted?: number;
};

export default function AssignmentBlockersPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('order');
  const [query, setQuery] = useState('');
  const [storeId, setStoreId] = useState<number | ''>('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [raw, setRaw] = useState<any>(null);
  const [lastAction, setLastAction] = useState<any>(null);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await storeService.getStores({ is_active: true, per_page: 200 });
        const arr: Store[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
          ? res
          : [];
        setStores(arr);
      } catch {
        // Store filter is optional, so do not block the page.
      }
    };
    loadStores();
  }, []);

  const blockers = useMemo<FlatBlocker[]>(() => {
    if (!raw?.data) return [];

    if (mode === 'order') {
      return (raw.data.stores || []).flatMap((store: any) =>
        (store.inventory_details || []).flatMap((detail: any) =>
          (detail.blocking_orders || []).map((item: AssignmentBlockerOrderItem) => ({
            ...item,
            store_id: Number(store.store_id),
            store_name: store.store_name,
            product_id: Number(detail.product_id),
            product_name: detail.product_name,
            product_sku: detail.product_sku,
            issue_message: detail.issue_message,
            available_quantity: detail.available_quantity,
            physical_quantity: detail.physical_quantity,
            sellable_barcode_quantity: detail.sellable_barcode_quantity,
            assigned_quantity_subtracted: detail.assigned_quantity_subtracted,
          }))
        )
      );
    }

    return (raw.data.products || []).flatMap((productRow: any) =>
      (productRow.stores || []).flatMap((store: any) =>
        (store.no_barcode_orders || []).map((item: AssignmentBlockerOrderItem) => ({
          ...item,
          store_id: Number(store.store_id),
          store_name: store.store_name,
          product_id: Number(productRow.product.id),
          product_name: productRow.product.name,
          product_sku: productRow.product.sku,
          available_quantity: store.available_quantity,
          physical_quantity: store.physical_quantity,
          sellable_barcode_quantity: store.sellable_barcode_quantity,
          assigned_quantity_subtracted: store.assigned_quantity_subtracted,
        }))
      )
    );
  }, [raw, mode]);

  const load = async () => {
    const clean = query.trim();
    if (!clean) {
      setNotice({ type: 'error', text: mode === 'order' ? 'Enter an order number or order ID.' : 'Enter a product ID, SKU, or name.' });
      return;
    }

    setLoading(true);
    setNotice(null);
    setLastAction(null);
    try {
      const params: any = storeId ? { store_id: storeId } : {};
      const res = mode === 'order'
        ? await assignmentBlockerService.getOrderBlockers({ order: clean, ...params })
        : await assignmentBlockerService.getProductDiagnostics({ product: clean, max_orders: 200, ...params });
      setRaw(res);
      setNotice({ type: 'success', text: res.message || 'Diagnostics loaded.' });
    } catch (err: any) {
      setRaw(null);
      setNotice({ type: 'error', text: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to load diagnostics.' });
    } finally {
      setLoading(false);
    }
  };

  const releaseItem = async (orderItemId: number, apply: boolean) => {
    setActionLoading(orderItemId);
    setNotice(null);
    try {
      const res = await assignmentBlockerService.releaseItem({
        order_item_id: orderItemId,
        apply,
        reason: 'Released from Assignment Blockers panel after returned/revived stock verification.',
      });
      setLastAction(res);
      setNotice({ type: res.success ? 'success' : 'error', text: res.message || (apply ? 'Release completed.' : 'Dry run completed.') });
      if (apply) {
        await load();
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Action failed.' });
      setLastAction(err?.response?.data || null);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} darkMode={darkMode} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            darkMode={darkMode}
            onDarkModeToggle={() => setDarkMode(!darkMode)}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-5">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <PackageSearch className="h-6 w-6" /> Assignment Blockers
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Find old open order items that are still holding sellable stock. Returned quantities are now detected automatically before anything is released.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <ShieldCheck className="h-4 w-4" /> Return-aware calculation is automatic. Manual release is only for truly stale non-returned holds.
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Search type</label>
                    <select
                      value={mode}
                      onChange={(e) => {
                        setMode(e.target.value as Mode);
                        setRaw(null);
                        setLastAction(null);
                      }}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    >
                      <option value="order">Order</option>
                      <option value="product">Product</option>
                    </select>
                  </div>

                  <div className="lg:col-span-5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      {mode === 'order' ? 'Order number / ID' : 'Product ID / SKU / name'}
                    </label>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') load();
                      }}
                      placeholder={mode === 'order' ? 'e.g. ORD-S-8508 or 11687' : 'e.g. 1827 or JEW-EAR-E3-200'}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Store filter</label>
                    <select
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    >
                      <option value="">All stores</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2 flex items-end">
                    <button
                      onClick={load}
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Load
                    </button>
                  </div>
                </div>
              </div>

              {notice && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${notice.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                  : notice.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                  : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
                }`}>
                  {notice.text}
                </div>
              )}

              {lastAction && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-auto">
                  <div className="font-semibold mb-2">Last action response</div>
                  <pre>{JSON.stringify(lastAction, null, 2)}</pre>
                </div>
              )}

              {raw?.data && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Blocker rows</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{blockers.length}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Search mode</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{mode}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Summary</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{JSON.stringify(raw.data.summary || raw.data.order || {})}</div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Detected stock-holding order items</h2>
                  <span className="text-xs text-gray-500">Returned units are excluded automatically; dry run before manual release.</span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading diagnostics...</div>
                ) : blockers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No active assignment blockers found. Fully returned items are now ignored automatically by assignment availability.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {blockers.map((item) => (
                      <div key={`${item.order_item_id}-${item.store_id}-${item.product_id}`} className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">{item.product_name}</span>
                              <span className="text-xs rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">{item.product_sku || `P${item.product_id}`}</span>
                              <span className="text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-1">{item.store_name}</span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              Held by <b>{item.order_number}</b> / item #{item.order_item_id} · status <b>{item.status}</b> · effective hold <b>{item.effective_hold_quantity ?? item.quantity}</b>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Physical</b><br />{item.physical_quantity ?? '-'}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Available</b><br />{item.available_quantity ?? '-'}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Sellable barcode</b><br />{item.sellable_barcode_quantity ?? '-'}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Subtracted</b><br />{item.assigned_quantity_subtracted ?? '-'}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Batch ID</b><br />{item.product_batch_id ?? '-'}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Ordered</b><br />{item.ordered_quantity ?? item.quantity}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Returned</b><br />{item.returned_quantity ?? 0}</div>
                              <div className="rounded border border-gray-200 dark:border-gray-700 p-2"><b>Effective hold</b><br />{item.effective_hold_quantity ?? item.quantity}</div>
                            </div>
                            {Array.isArray(item.return_refs) && item.return_refs.length > 0 && (
                              <div className="text-xs text-green-700 dark:text-green-200">
                                Return refs: {item.return_refs.map((ref: any) => ref.return_number || `#${ref.return_id}`).join(', ')}
                              </div>
                            )}
                            {item.issue_message && (
                              <div className="text-xs text-amber-700 dark:text-amber-200 flex items-start gap-1">
                                <AlertTriangle className="h-4 w-4 shrink-0" /> {item.issue_message}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 min-w-[260px]">
                            <button
                              onClick={() => releaseItem(item.order_item_id, false)}
                              disabled={actionLoading === item.order_item_id}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
                            >
                              {actionLoading === item.order_item_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                              Dry check
                            </button>
                            <button
                              onClick={() => releaseItem(item.order_item_id, true)}
                              disabled={actionLoading === item.order_item_id}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                            >
                              {actionLoading === item.order_item_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                              Release hold
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
