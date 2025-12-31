import { Plus } from 'lucide-react';
import { Field } from '@/services/productService';

interface FieldsSidebarProps {
  fields: Field[];
  selectedFieldIds: number[];
  onAddField: (field: Field) => void;
}

export default function FieldsSidebar({ 
  fields, 
  selectedFieldIds, 
  onAddField 
}: FieldsSidebarProps) {
  const excludedFields = [
    'Primary Image', 
    'Additional Images', 
    'SKU', 
    'Product Name', 
    'Description', 
    'Category', 
    'Vendor', 
    'Color', 
    'Size'
  ];
  
  const availableFields = fields.filter(f => !excludedFields.includes(f.title));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Available Fields
      </h3>
      <div className="space-y-2">
        {availableFields.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No fields available</p>
        ) : (
          availableFields.map((field) => {
            const isSelected = selectedFieldIds.includes(field.id);
            return (
              <button
                key={field.id}
                onClick={() => !isSelected && onAddField(field)}
                disabled={isSelected}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
              >
                <span className="truncate">{field.title}</span>
                <Plus className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'opacity-30' : ''}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}