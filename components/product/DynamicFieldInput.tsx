import { Trash2, Plus, Check, X } from 'lucide-react';
import { Field } from '@/services/productService';
import React, { useState } from 'react';

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
  onCreateOption?: (name: string) => Promise<void>;
}

export default function DynamicFieldInput({
  field,
  availableFields,
  onUpdate,
  onRemove,
  onCreateOption
}: DynamicFieldInputProps) {
  const { fieldType, fieldName, value } = field;
  const fieldDef = availableFields.find(f => f.id === field.fieldId);

  const [isManual, setIsManual] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddManual = async () => {
    const val = manualValue.trim();
    if (!val) return;

    setIsCreating(true);
    try {
      if (onCreateOption) {
        await onCreateOption(val);
      }
      setManualValue('');
      setIsManual(false);
    } catch (error) {
      console.error('Failed to create manual option:', error);
    } finally {
      setIsCreating(false);
    }
  };

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
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={value || ''}
                onChange={(e) => onUpdate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select {fieldName.toLowerCase()}</option>
                {fieldDef?.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {/* Also show the current value if it's not in options (manually added) */}
                {value && fieldDef?.options && !fieldDef.options.includes(value) && (
                  <option value={value}>{value}</option>
                )}
              </select>
              {onCreateOption && (
                <button
                  type="button"
                  onClick={() => setIsManual(true)}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  title={`Create new ${fieldName.toLowerCase()}`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>

            {isManual && (
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-900/20 animate-in slide-in-from-top-1">
                <input
                  type="text"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder={`Enter new ${fieldName.toLowerCase()}`}
                  className="flex-1 px-3 py-1.5 text-sm border border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManual();
                    }
                    if (e.key === 'Escape') setIsManual(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddManual}
                  disabled={isCreating || !manualValue.trim()}
                  className="p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsManual(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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