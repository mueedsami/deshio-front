// components/orders/StatsCards.tsx

import { Package, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface StatsCardsProps {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

export default function StatsCards({ 
  totalOrders, 
  paidOrders, 
  pendingOrders, 
  totalRevenue 
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Total</span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">All Orders</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Completed</span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{paidOrders}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Paid Orders</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">Pending</span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingOrders}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Due Orders</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">Revenue</span>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
        </div>
      </div>
    </div>
  );
}