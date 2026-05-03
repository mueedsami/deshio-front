'use client';

import React from 'react';
import ReportCard from './ReportCard';
import { NamedValue } from '@/services/businessAnalyticsService';

function DonutLike({ title, data }: { title: string; data: NamedValue[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const tones = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(148,163,184,.1)" strokeWidth="12" />
          {data.map((item, i) => {
            const fraction = item.value / total;
            const dash = fraction * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={item.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={tones[i % tones.length]}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 80 80)"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />
            );
          })}
          <text x="80" y="76" textAnchor="middle" className="fill-gray-400 text-[10px] font-bold uppercase tracking-widest">Total</text>
          <text x="80" y="98" textAnchor="middle" className="fill-gray-900 dark:fill-white text-xl font-black">{total}</text>
        </svg>
      </div>
      <div className="w-full space-y-2">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tones[i % tones.length] }} />
              <span className="truncate text-gray-600 dark:text-gray-400 font-medium capitalize">{item.label}</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md min-w-[32px] text-center">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MixChartsSection({ 
  statusMix, 
  channelMix, 
  paymentMix 
}: { 
  statusMix: NamedValue[], 
  channelMix: NamedValue[], 
  paymentMix: NamedValue[] 
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <ReportCard title="Order Status">
        <DonutLike title="Status" data={statusMix} />
      </ReportCard>
      <ReportCard title="Order Channels">
        <DonutLike title="Channels" data={channelMix} />
      </ReportCard>
      <ReportCard title="Payment Status">
        <DonutLike title="Payment" data={paymentMix} />
      </ReportCard>
    </div>
  );
}
