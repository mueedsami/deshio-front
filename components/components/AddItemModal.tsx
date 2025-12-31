'use client';

import { useState, useEffect } from 'react';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio';
  options?: string[];
}

interface AddItemModalProps {
  open: boolean;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, string | number>;
  onClose: () => void;
  onSave: (data: Record<string, string | number>) => void;
}

export default function AddItemModal({
  open,
  title,
  fields,
  initialData,
  onClose,
  onSave,
}: AddItemModalProps) {
  const getInitialFormData = () => {
    if (initialData) {
      return initialData;
    }
    return fields.reduce((acc, field) => {
      acc[field.name] = '';
      return acc;
    }, {} as Record<string, string | number>);
  };

  const [formData, setFormData] = useState<Record<string, string | number>>(getInitialFormData());

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleChange = (name: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const allFieldsFilled = fields.every((field) => {
      const value = formData[field.name];
      return value !== '' && value !== undefined && value !== null;
    });

    if (!allFieldsFilled) {
      alert('Please fill in all fields');
      return;
    }

    console.log('Submitting form data:', formData);
    onSave(formData);
    
    const emptyData = fields.reduce((acc, field) => {
      acc[field.name] = '';
      return acc;
    }, {} as Record<string, string | number>);
    setFormData(emptyData);
  };

  const handleClose = () => {
    const emptyData = fields.reduce((acc, field) => {
      acc[field.name] = '';
      return acc;
    }, {} as Record<string, string | number>);
    setFormData(emptyData);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
              </label>

             {field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'radio' ? (
                <div className="flex gap-4">
                  {field.options?.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-gray-900 dark:text-gray-200">
                      <input
                        type="radio"
                        name={field.name}
                        value={opt}
                        checked={formData[field.name] === opt}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="text-gray-600 focus:ring-gray-500"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}

            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}