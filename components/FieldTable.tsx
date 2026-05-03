import { Trash2, Edit, RotateCcw } from 'lucide-react';

interface Field {
  id: number;
  title?: string;  // Backend uses 'title'
  name?: string;   // Keep for compatibility
  type: string;
  mode?: string;
  description?: string;
}

interface FieldTableProps {
  fields: Field[];
  onDelete: (id: number) => void;
  onEdit?: (field: Field) => void;
  onRestore?: (id: number) => void;
  isArchived?: boolean;
}

export default function FieldTable({ fields, onDelete, onEdit, onRestore, isArchived }: FieldTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto mt-4">
      <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fields.length > 0 ? (
            fields.map((field, index) => (
              <tr
                key={field.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {field.title || field.name}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
                    {field.type}
                  </span>
                </td>
                <td className="px-4 py-3">{field.mode ?? 'N/A'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    {onRestore && (
                      <button
                        onClick={() => onRestore(field.id)}
                        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1"
                        title="Restore field"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(field)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                        title="Edit field"
                      >
                        <Edit className="w-4 h-4" /> 
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(field.id)}
                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1"
                      title={isArchived ? "Permanently delete" : "Archive field"}
                    >
                      <Trash2 className="w-4 h-4" /> 
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-10 text-gray-500">
                {isArchived ? "No archived fields found." : "No active fields found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}