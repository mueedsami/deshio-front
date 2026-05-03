'use client';

import React from 'react';
import ReportCard from './ReportCard';
import { NamedValue } from '@/services/businessAnalyticsService';
import { Clock } from 'lucide-react';

export default function HourlyPulseCard({ 
  data, 
  isLoading 
}: { 
  data: NamedValue[], 
  isLoading?: boolean 
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  // SVG dimensions
  const center = 150;
  const radius = 100;
  const innerRadius = 60;

  return (
    <ReportCard
      title="Hourly Order Pulse"
      subtitle="Activity intensity throughout the day"
      isLoading={isLoading}
      className="h-full"
    >
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative">
          <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
            {data.map((item, i) => {
              const startAngle = (i * 360) / 24;
              const endAngle = ((i + 1) * 360) / 24;
              
              const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
              
              const ix1 = center + innerRadius * Math.cos((startAngle * Math.PI) / 180);
              const iy1 = center + innerRadius * Math.sin((startAngle * Math.PI) / 180);
              const ix2 = center + innerRadius * Math.cos((endAngle * Math.PI) / 180);
              const iy2 = center + innerRadius * Math.sin((endAngle * Math.PI) / 180);

              // Intensity based on value
              const intensity = item.value / max;
              const color = intensity > 0.7 
                ? 'fill-indigo-600' 
                : intensity > 0.4 
                ? 'fill-indigo-400' 
                : intensity > 0 
                ? 'fill-indigo-200' 
                : 'fill-gray-100 dark:fill-gray-800';

              return (
                <g key={i} className="group transition-all hover:opacity-80">
                  <path
                    d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1} Z`}
                    className={`${color} transition-colors group-hover:scale-105 transform origin-center`}
                  />
                  <title>{`${item.label}: ${item.value} orders`}</title>
                </g>
              );
            })}
            
            {/* Clock ticks / labels */}
            {[0, 6, 12, 18].map(h => {
              const angle = (h * 360) / 24;
              const tx = center + (radius + 20) * Math.cos((angle * Math.PI) / 180);
              const ty = center + (radius + 20) * Math.sin((angle * Math.PI) / 180);
              return (
                <text
                  key={h}
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(90 ${tx} ${ty})`}
                  className="fill-gray-400 dark:fill-gray-500 text-[10px] font-bold"
                >
                  {h === 0 ? 'Midnight' : h === 12 ? 'Noon' : `${h}:00`}
                </text>
              );
            })}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Clock className="w-5 h-5 text-gray-300 mb-1" />
            <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">{total}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Total Today</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-2 w-full max-w-[240px]">
          {data.filter(d => d.value > 0).slice(0, 4).map(d => (
            <div key={d.label} className="text-center">
              <div className="text-[10px] text-gray-400 font-bold mb-1">{d.label.split(':')[0]}h</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 rounded-lg py-1">{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </ReportCard>
  );
}
