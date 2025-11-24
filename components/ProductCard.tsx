// components/ProductCard.tsx
'use client';

import { Edit, Trash2, Eye, Archive, RotateCcw, Package } from 'lucide-react';
import { Product } from '@/services/productService';

interface ProductCardProps {
  product: Product;
  image: string;
  categoryPath: string;
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
}

export default function ProductCard({
  product,
  image,
  categoryPath,
  onDelete,
  onEdit,
  onView,
  onArchive,
  onRestore,
}: ProductCardProps) {
  const isArchived = product.is_archived;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div 
        className="aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer relative group"
        onClick={() => onView(product)}
      >
        <img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
          }}
        />
        {isArchived && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
            Archived
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            SKU: {product.sku}
          </p>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Category:</span> {categoryPath}
          </p>
          {product.vendor && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Vendor:</span> {product.vendor.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onView(product)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          
          {!isArchived && (
            <button
              onClick={() => onEdit(product)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-xs"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          )}

          {isArchived ? (
            <button
              onClick={() => onRestore?.(product.id)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-xs"
              title="Restore"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
          ) : (
            <button
              onClick={() => onArchive?.(product.id)}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors text-xs"
              title="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => onDelete(product.id)}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-xs"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}