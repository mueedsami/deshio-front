// components/orders/OrdersTable.tsx

import { Package, MoreVertical, Edit2, Truck } from 'lucide-react';
import { Order } from '@/types/order';

interface OrdersTableProps {
  filteredOrders: Order[];
  totalOrders: number;
  activeMenu: number | null;
  setActiveMenu: (id: number | null) => void;
  onViewDetails: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onExchangeOrder: (order: Order) => void;
  onReturnOrder: (order: Order) => void;
  onCancelOrder: (orderId: number) => void;
  onSendToPathao?: (order: Order) => void;
  selectedOrders?: Set<number>;
  onToggleSelect?: (orderId: number) => void;
  onToggleSelectAll?: () => void;
}

export default function OrdersTable({
  filteredOrders,
  totalOrders,
  activeMenu,
  setActiveMenu,
  onViewDetails,
  onEditOrder,
  onExchangeOrder,
  onReturnOrder,
  onCancelOrder,
  onSendToPathao,
  selectedOrders,
  onToggleSelect,
  onToggleSelectAll,
}: OrdersTableProps) {
  const allSelected = selectedOrders && filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length;
  const someSelected = selectedOrders && selectedOrders.size > 0 && selectedOrders.size < filteredOrders.length;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Showing {filteredOrders.length} of {totalOrders} orders
          {selectedOrders && selectedOrders.size > 0 && (
            <span className="ml-2 text-blue-600 dark:text-blue-400">
              ({selectedOrders.size} selected)
            </span>
          )}
        </p>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No orders found</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  {onToggleSelectAll && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected || false}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someSelected || false;
                          }
                        }}
                        onChange={onToggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Order No</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOrders.map((order, index) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {onToggleSelect && selectedOrders && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => onToggleSelect(order.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.orderNumber || order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.orderType && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          order.orderType === 'social_commerce'
                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {order.orderType === 'social_commerce' ? 'Social' : 'E-Com'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm">
                          {order.customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{order.date}</td>
                    <td className="px-6 py-4">
                      {order.payments.due === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                          Due ৳{order.payments.due}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">৳{(order.amounts?.total || order.subtotal).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditOrder(order)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group"
                          title="Edit Order"
                        >
                          <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </button>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setActiveMenu(activeMenu === order.id ? null : order.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </button>
                          
                          {activeMenu === order.id && (
                            <div className={`absolute right-0 ${
                              index >= filteredOrders.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                            } bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 py-1 w-48 z-[100]`}
                            style={{ zIndex: 100 }}>
                              <button
                                onClick={() => onViewDetails(order)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => onEditOrder(order)}
                                className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                Edit Order
                              </button>
                              {onSendToPathao && (
                                <button
                                  onClick={() => {
                                    setActiveMenu(null);
                                    onSendToPathao(order);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2"
                                >
                                  <Truck className="w-4 h-4" />
                                  Send to Pathao
                                </button>
                              )}
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  onExchangeOrder(order);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                              >
                                Exchange Product
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  onReturnOrder(order);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                              >
                                Return Product
                              </button>
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                              <button
                                onClick={() => {
                                  setActiveMenu(null);
                                  onCancelOrder(order.id);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Cancel Order
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
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {onToggleSelect && selectedOrders && (
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => onToggleSelect(order.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer mt-1"
                      />
                    )}
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold">
                      {order.customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 dark:text-white">#{order.orderNumber || order.id}</p>
                        {order.orderType && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            order.orderType === 'social_commerce'
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {order.orderType === 'social_commerce' ? 'Social' : 'E-Com'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{order.customer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{order.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditOrder(order)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Order"
                    >
                      <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => setActiveMenu(activeMenu === order.id ? null : order.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    {order.payments.due === 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                        Due ৳{order.payments.due}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">৳{(order.amounts?.total || order.subtotal).toLocaleString()}</p>
                </div>
                
                {activeMenu === order.id && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative z-50">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onViewDetails(order);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onEditOrder(order);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-200 dark:border-gray-700"
                    >
                      Edit Order
                    </button>
                    {onSendToPathao && (
                      <button
                        onClick={() => {
                          setActiveMenu(null);
                          onSendToPathao(order);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-200 dark:border-gray-700 flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4" />
                        Send to Pathao
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onExchangeOrder(order);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-b border-gray-200 dark:border-gray-700"
                    >
                      Exchange Product
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onReturnOrder(order);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors border-b border-gray-200 dark:border-gray-700"
                    >
                      Return Product
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onCancelOrder(order.id);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}