'use client';

import { useState } from 'react';
import { MoreVertical, MapPin, User, Package, Phone, Hash, Warehouse, Store as StoreIcon } from 'lucide-react';
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

export default function StoreCard({ store, showManageStock, onManageStock, onUpdate }: StoreCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const storeType = store.is_warehouse ? 'Warehouse' : 'Store';

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;

    try {
      setLoading(true);
      await storeService.deleteStore(store.id);
      setMenuOpen(false);

      if (onUpdate) onUpdate();
      else window.location.reload();
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
    if (onManageStock) onManageStock(store.id);
    else router.push(`/inventory?store=${store.id}`);
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StoreIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <h3 className="text-gray-900 dark:text-white font-semibold truncate">
              {store.name || 'Store Name'}
            </h3>

            {/* Status Badge */}
            {store.is_active ? (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded">
                Inactive
              </span>
            )}

            {/* Online Badge */}
            {store.is_online && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                Online
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{store.address || 'Location not available'}</span>
          </div>

          {store.store_code && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">Code: {store.store_code}</span>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            onClick={() => setMenuOpen((p) => !p)}
            disabled={loading}
            type="button"
          >
            <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-700 shadow-lg rounded-lg z-20 overflow-hidden border border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleEdit}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                  type="button"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                  type="button"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Type</span>
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
            {store.is_warehouse ? <Warehouse className="w-4 h-4 text-gray-400" /> : <StoreIcon className="w-4 h-4 text-gray-400" />}
            <span>{storeType}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Pathao Key</span>
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{store.pathao_key || 'N/A'}</span>
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
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{store.phone}</span>
            </div>
          </div>
        )}
      </div>

      {/* Manage Stock Button */}
      {showManageStock && (
        <div className="mt-4">
          <button
            onClick={handleManageStock}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-900 dark:text-white"
            type="button"
          >
            <Package className="w-4 h-4" />
            Manage Stock
          </button>
        </div>
      )}
    </div>
  );
}
