'use client';

import ReportCard from './ReportCard';
import { NamedValue } from '@/services/businessAnalyticsService';
import { FolderKanban } from 'lucide-react';

function currency(value: number) {
    return new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function CategoryPerformanceCard({ data }: { data: NamedValue[] }) {
    const rows = [...(data || [])].sort((a, b) => b.value - a.value).slice(0, 8);
    const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1;
    const top = rows[0];

    return (
        <ReportCard
            title="Best Selling Categories"
            subtitle="See which categories are bringing the most sales in the selected period"
        >
            <div className="space-y-5">
                {top ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400">
                                <FolderKanban className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Top Category</div>
                                <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">{top.label}</div>
                                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Sales {currency(top.value)} • {((top.value / total) * 100).toFixed(1)}% of top-category sales</div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3">
                    {rows.length > 0 ? rows.map((row, index) => {
                        const width = Math.max((row.value / (rows[0]?.value || 1)) * 100, 4);
                        return (
                            <div key={`${row.label}-${index}`} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-gray-900 dark:text-white">{row.label}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Rank #{index + 1}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{currency(row.value)}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{((row.value / total) * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${width}%` }} />
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            No category sales found for this date range.
                        </div>
                    )}
                </div>
            </div>
        </ReportCard>
    );
}