import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface Product {
  id: number | string;
  name: string;
  attributes: Record<string, any>;
  variations?: {
    id: string | number;
    attributes: Record<string, any>;
  }[];
}

interface VariationsModalProps {
  product: Product;
  mainImage: string | null;
  onClose: () => void;
  onSelectVariation?: (product: Product, variation: { id: string | number; attributes: Record<string, any> }) => void;
  groupedProducts?: Product[];
}

export default function VariationsModal({
  product,
  mainImage,
  onClose,
  onSelectVariation,
  groupedProducts = [],
}: VariationsModalProps) {
  const [quantities, setQuantities] = useState<Record<string | number, number>>({});

  useEffect(() => {
    const initial: Record<string | number, number> = {};
    product.variations?.forEach((v) => {
      initial[v.id] = 0;
    });
    setQuantities(initial);
  }, [product.variations]);

  // Helper to get variation image
  const getVariationImage = (attributes: Record<string, any>): string => {
    // Priority: mainImage -> first variationImage -> groupMainImage -> fallback
    if (attributes.mainImage) return attributes.mainImage;
    if (attributes.variationImages && Array.isArray(attributes.variationImages) && attributes.variationImages.length > 0) {
      return attributes.variationImages[0];
    }
    if (attributes.groupMainImage) return attributes.groupMainImage;
    return mainImage || ERROR_IMG_SRC;
  };

  // Helper to get variation label
  const getVariationLabel = (attributes: Record<string, any>): string => {
    const parts: string[] = [];
    if (attributes.color) parts.push(attributes.color);
    if (attributes.size) parts.push(attributes.size);
    return parts.length > 0 ? parts.join(' - ') : 'Default';
  };

  // Helper to view product details
  const handleImageClick = (variationId: string | number) => {
    window.open(`/product/view?id=${variationId}`, '_blank');
  };

  if (!product.variations || product.variations.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Variations for {product.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            No variations found for this product.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Check which columns to display
  const hasColor = product.variations.some(v => v.attributes.color);
  const hasSize = product.variations.some(v => v.attributes.size);

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Variations for {product.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {product.variations.length} variation{product.variations.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Image
                  </th>
                  {hasColor && (
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Color
                    </th>
                  )}
                  {hasSize && (
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Size
                    </th>
                  )}
                  {onSelectVariation && (
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {product.variations.map((variation, index) => {
                  const variationImage = getVariationImage(variation.attributes);
                  const color = variation.attributes.color || '-';
                  const size = variation.attributes.size || '-';
                  
                  return (
                    <tr
                      key={variation.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleImageClick(variation.id)}
                          className="relative group cursor-pointer"
                          title="Click to view product details"
                        >
                          <ImageWithFallback
                            src={variationImage}
                            alt={`${product.name} - ${color} - ${size}`}
                            className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600 transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">
                              View
                            </span>
                          </div>
                        </button>
                      </td>
                      {hasColor && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {color !== '-' && (
                              <div 
                                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: color.toLowerCase() }}
                                title={color}
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {color}
                            </span>
                          </div>
                        </td>
                      )}
                      {hasSize && (
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {size}
                          </span>
                        </td>
                      )}
                      {onSelectVariation && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onSelectVariation(product, variation)}
                            className="px-3 py-1.5 text-sm bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white rounded-lg transition-colors whitespace-nowrap"
                          >
                            Select
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}