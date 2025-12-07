import React from 'react';
import { ProductDispatch } from '@/services/dispatchService';
import { Eye, Truck, CheckCircle, XCircle, Ban, Scan } from 'lucide-react';

interface DispatchTableProps {
  dispatches: ProductDispatch[];
  loading: boolean;
  onViewDetails: (dispatch: ProductDispatch) => void;
  onApprove: (id: number) => void;
  onMarkDispatched: (id: number) => void;
  onMarkDelivered: (id: number) => void;
  onCancel: (id: number) => void;
  onScanBarcodes?: (dispatch: ProductDispatch) => void;
  currentStoreId?: number;
}

const DispatchTable: React.FC<DispatchTableProps> = ({
  dispatches,
  loading,
  onViewDetails,
  onApprove,
  onMarkDispatched,
  onMarkDelivered,
  onCancel,
  onScanBarcodes,
  currentStoreId,
}) => {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        label: 'Pending',
      },
      approved: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        label: 'Approved',
      },
      in_transit: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        label: 'In Transit',
      },
      delivered: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        label: 'Delivered',
      },
      cancelled: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-800 dark:text-gray-300',
        label: 'Cancelled',
      },
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} text-xs rounded`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if current user/store is the source or destination
  // If no currentStoreId is set, show all actions (admin view)
  const isSourceStore = (dispatch: ProductDispatch) => {
    if (!currentStoreId) return true; // Show all actions if no specific store
    return dispatch.source_store.id === currentStoreId;
  };

  const isDestinationStore = (dispatch: ProductDispatch) => {
    if (!currentStoreId) return true; // Show all actions if no specific store
    return dispatch.destination_store.id === currentStoreId;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Dispatch Requests
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Dispatch #
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                From → To
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Items
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Total Value
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Dispatch Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {dispatches.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  No dispatches found
                </td>
              </tr>
            ) : (
              dispatches.map((dispatch) => {
                const atDestination = isDestinationStore(dispatch);
                const atSource = isSourceStore(dispatch);
                
                return (
                  <tr
                    key={dispatch.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dispatch.dispatch_number}
                      </div>
                      {dispatch.tracking_number && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Track: {dispatch.tracking_number}
                        </div>
                      )}
                      {dispatch.status === 'in_transit' && currentStoreId && atDestination && (
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                          📦 Receiving Store
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {dispatch.source_store.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        → {dispatch.destination_store.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {dispatch.total_items} items
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      ৳{parseFloat(dispatch.total_value).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDate(dispatch.dispatch_date)}
                      </div>
                      {dispatch.expected_delivery_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {formatDate(dispatch.expected_delivery_date)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(dispatch.status)}
                      {dispatch.is_overdue && (
                        <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => onViewDetails(dispatch)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* SOURCE STORE ACTIONS */}
                        {atSource && dispatch.status === 'pending' && !dispatch.approved_by && (
                          <>
                            <button
                              onClick={() => onApprove(dispatch.id)}
                              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                            <button
                              onClick={() => onCancel(dispatch.id)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </>
                        )}

                        {atSource && dispatch.status === 'pending' && dispatch.approved_by && (
                          <>
                            <button
                              onClick={() => onMarkDispatched(dispatch.id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1"
                              title="Mark as Dispatched (Shipped)"
                            >
                              <Truck className="w-3 h-3" />
                              Mark Dispatched
                            </button>
                            <button
                              onClick={() => onCancel(dispatch.id)}
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              title="Cancel"
                            >
                              <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </>
                        )}

                        {/* DESTINATION STORE ACTIONS */}
                        {atDestination && dispatch.status === 'in_transit' && (
                          <>
                            {/* Optional Barcode Scanning for Verification */}
                            {onScanBarcodes && (
                              <button
                                onClick={() => onScanBarcodes(dispatch)}
                                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                title="Optional: Scan Barcodes for Verification"
                              >
                                <Scan className="w-3 h-3" />
                                Scan Barcodes
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchTable;