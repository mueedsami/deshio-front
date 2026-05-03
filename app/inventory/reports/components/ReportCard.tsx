'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ReportCardProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export default function ReportCard({
  title,
  subtitle,
  onRefresh,
  isLoading,
  children,
  headerAction,
  className = '',
}: ReportCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all hover:shadow-md ${className}`.trim()}>
      <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {title}
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />}
          </h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {headerAction}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Refresh Component Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
