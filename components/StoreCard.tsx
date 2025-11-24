'use client';

import { useState } from 'react';
import { MoreVertical, MapPin, User, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import storeService from '@/services/storeService';

// Laravel API Store type
interface Store {
  id: number;
  name: string;
  address: string;
  pathao_key: string;
  type?: string;
  is_warehouse: boolean;
  is_online: boolean;
  is_active: boolean;
  phone?: string;
  email?: string;
  contact_person?: string;
  store_code?: string;
  created_at?: string;
  updated_at?: string;
}

interface StoreCardProps {
  store: Store;
  showManageStock?: boolean;
  onManageStock?: (storeId: number) => void;
  onUpdate?: () => void; // Callback to refresh the store list
}

// Currency Formatter (Bangladeshi Taka)
const currencyFormatter = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(num: number) {
  try {
    return currencyFormatter.format(num);
  } catch (err) {
    return `৳${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
}

export default function StoreCard({ store, showManageStock, onManageStock, onUpdate }: StoreCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Mock stats (until backend provides real analytics)
  const mockStats = {
    revenue: Math.floor(Math.random() * 500000) + 100000,
    revenueChange: Math.floor(Math.random() * 50000) - 25000,
    products: Math.floor(Math.random() * 500) + 50,
    orders: Math.floor(Math.random() * 1000) + 100,
  };

  const isPositive = mockStats.revenueChange >= 0;
  const formattedRevenue = formatCurrency(mockStats.revenue);

  // Revenue change indicator
  const revenueChangeIcon = isPositive ? (
    <TrendingUp className="w-4 h-4 text-green-500" />
  ) : (
    <TrendingDown className="w-4 h-4 text-red-500" />
  );

  // Get store type display
  const storeType = store.is_warehouse ? 'Warehouse' : 'Store';

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await storeService.deleteStore(store.id);
      setMenuOpen(false);
      
      // Refresh the store list
      if (onUpdate) {
        onUpdate();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to delete store:', error);
      alert(error.response?.data?.message || 'Failed to delete store');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setMenuOpen(false);
    router.push(`/store/add-store?id=${store.id}`);
  };

  const handleManageStock = () => {
    if (onManageStock) {
      onManageStock(store.id);
    } else {
      // Default navigation to inventory page
      router.push(`/inventory?store=${store.id}`);
    }
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-gray-900 dark:text-white font-semibold">
              {store.name || 'Store Name'}
            </h3>
            {/* Status Badge */}
            {store.is_active ? (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                Inactive
              </span>
            )}
            {/* Online Badge */}
            {store.is_online && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                Online
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>{store.address || 'Location not available'}</span>
          </div>
          {store.store_code && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Code: {store.store_code}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={loading}
          >
            <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setMenuOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-700 shadow-lg rounded-md z-20 overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type & Pathao Key */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Type</span>
          <span className="text-gray-900 dark:text-white font-medium">{storeType}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Pathao Key</span>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-900 dark:text-white">
              {store.pathao_key || 'N/A'}
            </span>
          </div>
        </div>
        {store.contact_person && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Contact</span>
            <span className="text-gray-900 dark:text-white">{store.contact_person}</span>
          </div>
        )}
        {store.phone && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Phone</span>
            <span className="text-gray-900 dark:text-white">{store.phone}</span>
          </div>
        )}
      </div>

      {/* Revenue */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formattedRevenue}
            </span>
            {mockStats.revenueChange !== 0 && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                {revenueChangeIcon}
                <span
                  className={`ml-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}
                >
                  {isPositive ? '+' : ''}৳{mockStats.revenueChange.toLocaleString('en-BD')}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Products</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {mockStats.products}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orders</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {mockStats.orders}
          </p>
        </div>
      </div>

      {/* Manage Stock Button */}
      {showManageStock && (
        <div className="mt-4">
          <button
            onClick={handleManageStock}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-900 dark:text-white"
          >
            <Package className="w-4 h-4" />
            Manage Stock
          </button>
        </div>
      )}
    </div>
  );
}