'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Edit, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Category } from '@/services/categoryService';

interface CategoryListItemProps {
  category: Category;
  onDelete: (id: number) => void;
  onEdit: (category: Category) => void;
  onAddSubcategory: (parentId: number) => void;
  level?: number;
}

export default function CategoryListItem({
  category,
  onDelete,
  onEdit,
  onAddSubcategory,
  level = 0,
}: CategoryListItemProps) {
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check both children and all_children
  const subcategories = category.children || category.all_children || [];
  const hasSubcategories = subcategories && subcategories.length > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      <div
        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
        style={{ marginLeft: `${level * 24}px` }}
      >
        {hasSubcategories ? (
          <button
            onClick={() => setShowSubcategories(!showSubcategories)}
            className="h-6 w-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {showSubcategories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <ImageWithFallback
          src={category.image_url || " "}
          alt={category.title}
          className="w-16 h-16 rounded object-cover flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 dark:text-white mb-1">{category.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{category.description || ''}</p>
          <span className="text-xs text-gray-500 dark:text-gray-400">/{category.slug}</span>
        </div>

        {hasSubcategories && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
            {subcategories.length} subcategories
          </span>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <button
                onClick={() => {
                  onEdit(category);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onAddSubcategory(category.id);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Subcategory
              </button>
              <button
                onClick={() => {
                  onDelete(category.id);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {showSubcategories && hasSubcategories && (
        <div className="mt-2 space-y-2">
          {subcategories.map((sub) => (
            <CategoryListItem
              key={sub.id}
              category={sub}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSubcategory={onAddSubcategory}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}