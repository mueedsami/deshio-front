'use client';

import { Fragment, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import purchaseOrderService, {
  CanDeletePurchaseOrderData,
  PurchaseOrder,
} from '@/services/purchase-order.service';

export const dynamic = 'force-dynamic';

const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Alert = ({ type, message }: { type: 'success' | 'error'; message: string }) => (
  <div
    className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}
  >
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </div>
);

const extractErrorMessage = (error: any): string => {
  const apiMessage = error?.response?.data?.message;
  const fallback = error?.message;
  return apiMessage || fallback || 'Request failed';
};

const statusColor = (status?: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'approved':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'partially_received':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'received':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

function PurchaseOrderHardDeleteClientPage() {
  const searchParams = useSearchParams();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [checkLoadingId, setCheckLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [checkResults, setCheckResults] = useState<Record<number, CanDeletePurchaseOrderData>>({});

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Link-only access gate:
  // 1) You must pass ?access=... in URL
  // 2) If NEXT_PUBLIC_PO_DELETE_ACCESS_KEY is set, it must match
  const accessFromUrl = (searchParams.get('access') || '').trim();
  const requiredAccessKey = (process.env.NEXT_PUBLIC_PO_DELETE_ACCESS_KEY || '').trim();
  const hasAccess = requiredAccessKey ? accessFromUrl === requiredAccessKey : accessFromUrl.length > 0;

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4500);
  };

  const loadPurchaseOrders = async (page = 1, search = activeSearch) => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const res = await purchaseOrderService.getAll({
        page,
        per_page: 20,
        search: search || undefined,
        sort_by: 'id',
        sort_direction: 'desc',
      });

      const payload = res?.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];
      setRows(list);
      setCurrentPage(payload?.current_page || 1);
      setLastPage(payload?.last_page || 1);
      setTotalRows(payload?.total || list.length || 0);
    } catch (error: any) {
      showAlert('error', extractErrorMessage(error) || 'Failed to load purchase orders');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    loadPurchaseOrders(1, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, activeSearch]);

  const handleCheckDelete = async (po: PurchaseOrder) => {
    setCheckLoadingId(po.id);
    try {
      const res = await purchaseOrderService.canDelete(po.id);
      const info = res?.data;
      if (info) {
        setCheckResults((prev) => ({ ...prev, [po.id]: info }));
        if (info.can_delete) {
          showAlert('success', `${info.po_number} can be deleted.`);
        } else {
          showAlert('error', `${info.po_number} cannot be deleted. Check blockers below.`);
        }
      }
    } catch (error: any) {
      showAlert('error', extractErrorMessage(error) || 'Failed to check delete permissions');
    } finally {
      setCheckLoadingId(null);
    }
  };

  const handleHardDelete = async (po: PurchaseOrder) => {
    let checkInfo = checkResults[po.id];

    if (!checkInfo) {
      try {
        const checkRes = await purchaseOrderService.canDelete(po.id);
        checkInfo = checkRes?.data;
        if (checkInfo) {
          setCheckResults((prev) => ({ ...prev, [po.id]: checkInfo as CanDeletePurchaseOrderData }));
        }
      } catch (error: any) {
        showAlert('error', extractErrorMessage(error) || 'Failed to validate PO before deletion');
        return;
      }
    }

    if (!checkInfo?.can_delete) {
      showAlert('error', 'This PO cannot be deleted. Resolve blockers first.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${checkInfo.po_number}?\n\n` +
        `This will remove the PO and all ${checkInfo.items_count} item rows permanently.\n\n` +
        'This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeleteLoadingId(po.id);
    try {
      const res = await purchaseOrderService.hardDelete(po.id);
      const message = res?.message || `Purchase order ${checkInfo.po_number} deleted permanently.`;

      setRows((prev) => prev.filter((x) => x.id !== po.id));
      setCheckResults((prev) => {
        const next = { ...prev };
        delete next[po.id];
        return next;
      });

      showAlert('success', message);
    } catch (error: any) {
      const apiData = error?.response?.data;
      const msg = apiData?.message || extractErrorMessage(error) || 'Hard delete failed';
      showAlert('error', msg);

      // Optional: keep a visible blocker in UI after failed delete
      const existing = checkResults[po.id];
      const blockerMessage = msg;
      const fallbackInfo: CanDeletePurchaseOrderData = {
        can_delete: false,
        po_number: po.po_number,
        vendor_name: po.vendor?.name || undefined,
        status: po.status,
        total_amount: po.total_amount,
        items_count: Array.isArray(po.items) ? po.items.length : 0,
        blockers: [{ type: apiData?.error_code || 'delete_error', message: blockerMessage, details: apiData?.data }],
      };

      setCheckResults((prev) => ({
        ...prev,
        [po.id]: existing
          ? {
              ...existing,
              can_delete: false,
              blockers: [
                ...(existing.blockers || []),
                { type: apiData?.error_code || 'delete_error', message: blockerMessage, details: apiData?.data },
              ],
            }
          : fallbackInfo,
      }));
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {alert && <Alert type={alert.type} message={alert.message} />}

      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} setIsSidebarOpen={setIsSidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Purchase Order Hard Delete</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Internal page. Not linked in navigation. Use only by direct URL.
            </p>
          </div>

          {!hasAccess ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-red-200 dark:border-red-900/40">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Access denied</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    This page requires an access key in the URL.
                  </p>
                  <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">Open using:</p>
                    <code className="block mt-1 p-2 rounded bg-gray-100 dark:bg-gray-900 text-xs break-all">
                      /purchase-order/internal-hard-delete?access=YOUR_KEY
                    </code>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Optional: set <code>NEXT_PUBLIC_PO_DELETE_ACCESS_KEY</code> in frontend env to enforce exact key match.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                  <div className="flex gap-2 w-full lg:max-w-xl">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setCurrentPage(1);
                            setActiveSearch(searchInput.trim());
                          }
                        }}
                        placeholder="Search by PO number / vendor"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setCurrentPage(1);
                        setActiveSearch(searchInput.trim());
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Search
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadPurchaseOrders(currentPage, activeSearch)}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Safety rules: can delete only when status is draft/approved/cancelled, no payments, and no received inventory.
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 dark:text-gray-400">No purchase orders found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/60">
                        <tr>
                          <th className="px-4 py-3 text-left">PO</th>
                          <th className="px-4 py-3 text-left">Vendor</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Paid</th>
                          <th className="px-4 py-3 text-right">Outstanding</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((po) => {
                          const check = checkResults[po.id];
                          const canDelete = !!check?.can_delete;
                          return (
                            <Fragment key={po.id}>
                              <tr className="border-t border-gray-100 dark:border-gray-700">
                                <td className="px-4 py-3 align-top">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">{po.po_number}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Order: {formatDate(po.order_date)}</div>
                                </td>
                                <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                                  {po.vendor?.name || 'N/A'}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(po.status)}`}>
                                    {String(po.status || 'unknown').replace('_', ' ').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-top text-right">৳{formatCurrency(po.total_amount)}</td>
                                <td className="px-4 py-3 align-top text-right text-green-700 dark:text-green-400">
                                  ৳{formatCurrency(po.paid_amount)}
                                </td>
                                <td className="px-4 py-3 align-top text-right text-yellow-700 dark:text-yellow-400">
                                  ৳{formatCurrency(po.outstanding_amount)}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleCheckDelete(po)}
                                      disabled={checkLoadingId === po.id || deleteLoadingId === po.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                                    >
                                      {checkLoadingId === po.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <ShieldCheck className="w-4 h-4" />
                                      )}
                                      Check
                                    </button>

                                    <button
                                      onClick={() => handleHardDelete(po)}
                                      disabled={!canDelete || checkLoadingId === po.id || deleteLoadingId === po.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300 disabled:cursor-not-allowed"
                                    >
                                      {deleteLoadingId === po.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {check && (
                                <tr className="bg-gray-50/70 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
                                  <td colSpan={7} className="px-4 py-3">
                                    {check.can_delete ? (
                                      <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                                        ✅ This PO can be safely deleted.
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">
                                          ❌ Cannot delete due to the following blockers:
                                        </div>
                                        <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                          {(check.blockers || []).map((b, idx) => (
                                            <li key={`${po.id}-${idx}`}>{b.message}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div>Total: {totalRows}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = Math.max(1, currentPage - 1);
                      setCurrentPage(next);
                      loadPurchaseOrders(next, activeSearch);
                    }}
                    disabled={currentPage <= 1 || loading}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {lastPage}
                  </span>
                  <button
                    onClick={() => {
                      const next = Math.min(lastPage, currentPage + 1);
                      setCurrentPage(next);
                      loadPurchaseOrders(next, activeSearch);
                    }}
                    disabled={currentPage >= lastPage || loading}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}


export default function PurchaseOrderHardDeletePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <PurchaseOrderHardDeleteClientPage />
    </Suspense>
  );
}
