import { Trash2 } from 'lucide-react';
import { Field } from '@/services/productService';

interface FieldValue {
  fieldId: number;
  fieldName: string;
  fieldType: string;
  value: any;
  instanceId: string;
}

interface DynamicFieldInputProps {
  field: FieldValue;
  availableFields: Field[];
  onUpdate: (value: any) => void;
  onRemove: () => void;
}

export default function DynamicFieldInput({
  field,
  availableFields,
  onUpdate,
  onRemove
}: DynamicFieldInputProps) {
  const { fieldType, fieldName, value } = field;
  const fieldDef = availableFields.find(f => f.id === field.fieldId);

  const renderInput = () => {
    switch (fieldType.toLowerCase()) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={fieldType}
            value={value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={fieldDef?.placeholder || `Enter ${fieldName.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={fieldDef?.placeholder || `Enter ${fieldName.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={fieldDef?.placeholder || `Enter ${fieldName.toLowerCase()}`}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select {fieldName.toLowerCase()}</option>
            {fieldDef?.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={(e) => onUpdate(e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={fieldDef?.placeholder || `Enter ${fieldName.toLowerCase()}`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        );
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {fieldName}
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {renderInput()}
    </div>
  );
}