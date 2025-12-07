import React from 'react';

export default function ProductsToolbar({ viewMode, sortBy, onViewModeChange, onSortChange }: any) {
  return (
    <div className="flex justify-between items-center mb-6 pb-4 border-b">
      <p className="text-sm text-gray-600">
        Show: {' '}
        <button 
          onClick={() => onViewModeChange('grid-3')} 
          className={`mx-1 ${viewMode === 'grid-3' ? 'font-bold' : ''}`}
        >
          9
        </button> / 
        <button 
          onClick={() => onViewModeChange('grid-4')} 
          className={`mx-1 ${viewMode === 'grid-4' ? 'font-bold' : ''}`}
        >
          12
        </button> / 
        <button 
          onClick={() => onViewModeChange('grid-5')} 
          className={`mx-1 ${viewMode === 'grid-5' ? 'font-bold' : ''}`}
        >
          18
        </button>
      </p>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="featured">Default sorting</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="name">Name: A to Z</option>
      </select>
    </div>
  );
}