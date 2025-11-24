import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Breadcrumb({ breadcrumb, title, productCount, onBack }: any) {
  return (
    <div className="border-b bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>Home</span>
            <span>/</span>
            <span>Shop</span>
            <span>/</span>
            {breadcrumb.map((crumb: string, index: number) => (
              <React.Fragment key={index}>
                {index > 0 && <span>/</span>}
                <span className={index === breadcrumb.length - 1 ? 'text-gray-900 font-semibold' : ''}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">{productCount} products found</p>
      </div>
    </div>
  );
}