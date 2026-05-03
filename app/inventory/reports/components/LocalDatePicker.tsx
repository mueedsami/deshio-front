'use client';

import React from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

interface LocalDatePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  isLoading?: boolean;
}

export default function LocalDatePicker({ from, to, onChange, isLoading }: LocalDatePickerProps) {
  const presets = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 Days', days: 6 },
    { label: 'Last 30 Days', days: 29 },
    { label: 'Last 90 Days', days: 89 },
  ];

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    onChange(
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    );
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <div className="flex bg-white dark:bg-gray-800 rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-gray-700">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.days)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
          >
            {p.label}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm min-w-[240px]">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="bg-transparent border-none text-xs focus:ring-0 p-0 text-gray-600 dark:text-gray-300 w-full"
        />
        <span className="text-gray-300 dark:text-gray-600">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="bg-transparent border-none text-xs focus:ring-0 p-0 text-gray-600 dark:text-gray-300 w-full"
        />
      </div>
    </div>
  );
}
