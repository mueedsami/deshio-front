'use client';

import React, { useState, useEffect } from 'react';
import businessAnalyticsService, { StorePerformanceRow } from '@/services/businessAnalyticsService';
import ReportCard from './ReportCard';

function currency(value: number) {
  return new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function BranchPerformanceCard({
  initialData,
  initialFilters
}: {
  initialData: StorePerformanceRow[],
  initialFilters: { from: string, to: string, sku?: string }
}) {
  const [data, setData] = useState<StorePerformanceRow[]>(initialData);
  const [filters, setFilters] = useState<{ from: string, to: string, sku?: string }>(initialFilters);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
    setFilters(initialFilters);
  }, [initialData, initialFilters]);

  const fetchData = async (f = filters) => {
    setLoading(true);
    try {
      const res = await businessAnalyticsService.getBranchPerformance(f);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch branch performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxSales = Math.max(...data.map(s => s.net_sales), 1);

  return (
    <ReportCard
      title="Branch Performance"
      subtitle="Comparative analysis of store-level metrics"
      isLoading={loading}
      onRefresh={() => fetchData()}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          {data.map((store) => {
            const width = (store.net_sales / maxSales) * 100;
            return (
              <div key={store.store_id} className="group">
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {store.store_name}
                    <span className="text-[10px] text-gray-400 font-normal">ID: {store.store_id}</span>
                  </div>
                  <div className="text-gray-900 dark:text-white font-black">{currency(store.net_sales)}</div>
                </div>
                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto -mx-6 border-t border-gray-50 dark:border-gray-800/50 mt-6 pt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 dark:text-gray-500 bg-gray-50/30 dark:bg-gray-900/30 font-black">
                <th className="px-4 py-3 text-left uppercase tracking-widest text-[10px]">Store</th>
                <th className="px-4 py-3 text-right uppercase tracking-widest text-[10px]">Orders</th>
                <th className="px-4 py-3 text-right uppercase tracking-widest text-[10px]">Profit</th>
                <th className="px-4 py-3 text-right uppercase tracking-widest text-[10px]">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((store) => (
                <tr key={store.store_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{store.store_name}</td>
                  <td className="px-4 py-3 text-right font-medium">{store.orders}</td>
                  <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">{currency(store.profit)}</td>
                  <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white">{percent(store.margin_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportCard>
  );
}
