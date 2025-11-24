import React from 'react';
import { DispatchStatistics } from '@/services/dispatchService';

interface DispatchStatisticsCardsProps {
  statistics: DispatchStatistics | null;
  loading?: boolean;
}

const DispatchStatisticsCards: React.FC<DispatchStatisticsCardsProps> = ({
  statistics,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!statistics) return null;

  const cards = [
    {
      label: 'Total',
      value: statistics.total_dispatches,
      bgColor: 'bg-white dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-900 dark:text-white',
      labelColor: 'text-gray-600 dark:text-gray-400',
    },
    {
      label: 'Pending',
      value: statistics.pending,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-900 dark:text-yellow-300',
      labelColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'In Transit',
      value: statistics.in_transit,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-900 dark:text-blue-300',
      labelColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Delivered',
      value: statistics.delivered,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-900 dark:text-green-300',
      labelColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Cancelled',
      value: statistics.cancelled,
      bgColor: 'bg-gray-50 dark:bg-gray-700',
      borderColor: 'border-gray-200 dark:border-gray-600',
      textColor: 'text-gray-900 dark:text-gray-300',
      labelColor: 'text-gray-600 dark:text-gray-400',
    },
    {
      label: 'Overdue',
      value: statistics.overdue,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-900 dark:text-red-300',
      labelColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Expected Today',
      value: statistics.expected_today,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-900 dark:text-purple-300',
      labelColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Value in Transit',
      value: `৳${parseFloat(statistics.total_value_in_transit).toLocaleString()}`,
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      textColor: 'text-indigo-900 dark:text-indigo-300',
      labelColor: 'text-indigo-600 dark:text-indigo-400',
      isAmount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg border ${card.borderColor} p-4`}
        >
          <div className={`text-sm ${card.labelColor} mb-1`}>{card.label}</div>
          <div className={`text-2xl font-bold ${card.textColor} ${card.isAmount ? 'text-lg' : ''}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DispatchStatisticsCards;