// components/orders/OrderFilters.tsx

import { Search, Filter } from 'lucide-react';

interface OrderFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export default function OrderFilters({
  search,
  setSearch,
  dateFilter,
  setDateFilter,
  statusFilter,
  setStatusFilter
}: OrderFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 mb-6 border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <span className="font-semibold text-gray-900 dark:text-white">Filter Orders</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Order ID or Customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:border-gray-900 dark:focus:border-gray-600 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        <input
          type="text"
          placeholder="DD-MMM-YYYY (e.g., 06-Oct-2025)"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:border-gray-900 dark:focus:border-gray-600 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:border-gray-900 dark:focus:border-gray-600 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none transition-all text-sm text-gray-900 dark:text-white"
        >
          <option>All Status</option>
          <option>Paid</option>
          <option>Due</option>
        </select>
      </div>
    </div>
  );
}