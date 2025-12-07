'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit, Trash2, Eye, Plus } from 'lucide-react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4=';

interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  image: string | null;
}

interface ProductGroup {
  sku: string;
  baseName: string;
  totalVariants: number;
  variants: ProductVariant[];
  primaryImage: string | null;
  categoryPath: string;
  category_id: number;
  hasVariations: boolean;
}

interface ProductListItemProps {
  productGroup: ProductGroup;
  onDelete: (id: number) => void;
  onEdit?: (id: number) => void;
  onView: (id: number) => void;
  onAddVariation: (group: ProductGroup) => void;
  onSelect?: (variant: ProductVariant) => void;
  selectable?: boolean;
}

export default function ProductListItem({
  productGroup,
  onDelete,
  onEdit,
  onView,
  onAddVariation,
  onSelect,
  selectable,
}: ProductListItemProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [isDropdownMounted, setIsDropdownMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
          setTimeout(() => setIsDropdownMounted(false), 200);
        }
      }
    }

    function handleScroll() {
      if (showDropdown) {
        setShowDropdown(false);
        setTimeout(() => setIsDropdownMounted(false), 200);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showDropdown]);

  const handleMenuClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX - 180
      });
    }
    if (!showDropdown) {
      setIsDropdownMounted(true);
      // Small delay to ensure mount happens before animation
      setTimeout(() => setShowDropdown(true), 10);
    } else {
      setShowDropdown(false);
      // Wait for animation to complete before unmounting
      setTimeout(() => setIsDropdownMounted(false), 200);
    }
  };

  // Group variants by color for display
  const variantsByColor = productGroup.variants.reduce((acc, variant) => {
    const color = variant.color || 'No Color';
    if (!acc[color]) {
      acc[color] = [];
    }
    acc[color].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  const hasMultipleVariants = productGroup.hasVariations;
  const firstVariant = productGroup.variants[0];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start gap-4 p-5">
        {/* Product Image */}
        <button
          type="button"
          onClick={() => onView(firstVariant.id)}
          className="flex-shrink-0 rounded-lg overflow-hidden hover:opacity-80 transition-opacity group"
          aria-label={`View ${productGroup.baseName}`}
        >
          <div className="relative">
            <img
              src={productGroup.primaryImage || ERROR_IMG_SRC}
              alt={productGroup.baseName}
              className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.src = ERROR_IMG_SRC;
              }}
            />
            {hasMultipleVariants && (
              <div className="absolute top-1 right-1 bg-gray-900 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                {productGroup.totalVariants}
              </div>
            )}
          </div>
        </button>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer" onClick={() => onView(firstVariant.id)}>
                {productGroup.baseName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="truncate">{productGroup.categoryPath}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
              SKU: {productGroup.sku}
            </span>
            {hasMultipleVariants && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-300 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
                 {productGroup.totalVariants} Variant{productGroup.totalVariants > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Variations Button */}
          {hasMultipleVariants && (
            <button
              onClick={() => setShowVariations(!showVariations)}
              className="px-4 py-2 text-sm font-medium bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-sm"
            >
              {showVariations ? 'Hide' : 'View'} Variations
            </button>
          )}

          {/* Select button (only for single variant products in select mode) */}
          {onSelect && !hasMultipleVariants && (
            <button
              onClick={() => onSelect(firstVariant)}
              className="px-4 py-2 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-sm"
            >
              Select
            </button>
          )}

          {/* Dropdown menu */}
          <button
            ref={buttonRef}
            onClick={handleMenuClick}
            className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {isDropdownMounted &&
            createPortal(
              <div
                ref={dropdownRef}
                className={`fixed w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 py-1 transition-all duration-200 origin-top-right ${
                  showDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`
                }}
              >
                <button
                  onClick={() => {
                    onView(firstVariant.id);
                    setShowDropdown(false);
                    setTimeout(() => setIsDropdownMounted(false), 200);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Details
                </button>
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(firstVariant.id);
                      setShowDropdown(false);
                      setTimeout(() => setIsDropdownMounted(false), 200);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Edit Product
                  </button>
                )}
                <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${hasMultipleVariants ? 'all variants of' : ''} "${productGroup.baseName}"?${hasMultipleVariants ? ` This will delete ${productGroup.totalVariants} products.` : ''}`)) {
                      productGroup.variants.forEach(v => onDelete(v.id));
                    }
                    setShowDropdown(false);
                    setTimeout(() => setIsDropdownMounted(false), 200);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete {hasMultipleVariants ? `All (${productGroup.totalVariants})` : ''}
                </button>
              </div>,
              document.body
            )}
        </div>
      </div>

      {/* Variations Dropdown */}
      {showVariations && hasMultipleVariants && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Available Variations ({productGroup.totalVariants})
            </h4>
            <button
              onClick={() => onAddVariation(productGroup)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variation
            </button>
          </div>
          
          <div className="space-y-3">
            {Object.entries(variantsByColor).map(([color, variants]) => (
              <div key={color} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {variants[0].image && (
                    <img
                      src={variants[0].image}
                      alt={color}
                      className="w-14 h-14 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = ERROR_IMG_SRC;
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {color}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {variants.length} size{variants.length > 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col flex-wrap gap-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {variant.size || 'One Size'}
                      </span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => onEdit && onEdit(variant.id)}
                          className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${variant.name}"?`)) {
                              onDelete(variant.id);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {onSelect && (
                          <button
                            onClick={() => onSelect(variant)}
                            className="text-xs text-gray-900 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium px-2 py-0.5 hover:bg-gray-50 dark:hover:bg-blue-900/30 rounded"
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => onView(variant.id)}
                          className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}