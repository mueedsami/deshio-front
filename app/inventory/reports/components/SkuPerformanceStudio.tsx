'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CommandCenterResponse, NamedValue, ReportingFilters, TopProductRow } from '@/services/businessAnalyticsService';
import ReportCard from './ReportCard';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarRange,
  ChevronRight,
  Crown,
  Gauge,
  PackageSearch,
  Search,
  Store,
  TrendingUp,
  Wifi,
} from 'lucide-react';

function currency(value: number) {
  return new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function normalizeLabel(label: string) {
  return String(label || '').trim().toLowerCase();
}

function getOnlineValue(items: NamedValue[]) {
  return items.reduce((sum, item) => {
    const label = normalizeLabel(item.label);
    const online = ['online', 'e-commerce', 'ecommerce', 'website', 'web', 'social', 'facebook', 'instagram', 'courier'];
    return online.some((token) => label.includes(token)) ? sum + Number(item.value || 0) : sum;
  }, 0);
}

function getOfflineValue(items: NamedValue[]) {
  return items.reduce((sum, item) => {
    const label = normalizeLabel(item.label);
    const offline = ['pos', 'store', 'counter', 'offline', 'branch', 'shop'];
    return offline.some((token) => label.includes(token)) ? sum + Number(item.value || 0) : sum;
  }, 0);
}

function sortSkuOptions(rows: TopProductRow[]) {
  return [...rows]
    .filter((row) => row.sku)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 40);
}

export default function SkuPerformanceStudio({
  data,
  filters,
  onApply,
}: {
  data: CommandCenterResponse['data'];
  filters: ReportingFilters;
  onApply: (patch: Partial<ReportingFilters>) => void;
}) {
  const [skuInput, setSkuInput] = useState(filters.sku || '');

  useEffect(() => {
    setSkuInput(filters.sku || '');
  }, [filters.sku]);

  const skuOptions = useMemo(() => sortSkuOptions(data.top_products || []), [data.top_products]);
  const selectedProduct = useMemo(
    () => data.top_products.find((row) => normalizeLabel(row.sku) === normalizeLabel(String(filters.sku || ''))) || data.top_products[0],
    [data.top_products, filters.sku]
  );

  const totalUnits = Number(data.kpis.total_units || selectedProduct?.units || 0);
  const totalDays = Math.max(data.sales_trend.length, 1);
  const flowRate = totalUnits / totalDays;
  const stockOnHand = Number(selectedProduct?.stock_on_hand || 0);
  const daysOfCover = flowRate > 0 ? stockOnHand / flowRate : 0;
  const onlineOrders = getOnlineValue(data.order_type_mix || []);
  const offlineOrders = getOfflineValue(data.order_type_mix || []);
  const totalOrders = Number(data.kpis.total_orders || 0) || onlineOrders + offlineOrders || 1;
  const onlineShare = (onlineOrders / totalOrders) * 100;
  const peakDay = [...(data.sales_trend || [])].sort((a, b) => b.net_sales - a.net_sales)[0];
  const averageDailySales = data.kpis.net_sales / totalDays;
  const peakDailySales = peakDay?.net_sales || 0;

  const trendValues = data.sales_trend.map((item) => item.net_sales);
  const maxTrend = Math.max(...trendValues, 1);
  const minTrend = Math.min(...trendValues, 0);
  const width = 920;
  const height = 240;
  const padding = 24;
  const stepX = data.sales_trend.length > 1 ? (width - padding * 2) / (data.sales_trend.length - 1) : 0;
  const scaleY = (value: number) => {
    const range = maxTrend - minTrend || 1;
    return height - padding - ((value - minTrend) / range) * (height - padding * 2);
  };
  const linePath = data.sales_trend.length > 1
    ? data.sales_trend.map((point, index) => `${index === 0 ? 'M' : 'L'} ${padding + index * stepX} ${scaleY(point.net_sales)}`).join(' ')
    : '';
  const areaPath = data.sales_trend.length > 1
    ? `${linePath} L ${padding + (data.sales_trend.length - 1) * stepX} ${height - padding} L ${padding} ${height - padding} Z`
    : '';

  const branchMax = Math.max(...data.branch_performance.map((item) => item.net_sales), 1);
  const datewiseRows = [...data.sales_trend].sort((a, b) => a.date.localeCompare(b.date));

  const statCards = [
    {
      label: 'SKU Net Sales',
      value: currency(data.kpis.net_sales),
      sub: `${data.kpis.total_orders} orders in range`,
      icon: TrendingUp,
      accent: 'from-violet-600 via-indigo-500 to-cyan-400',
    },
    {
      label: 'Units Flow Rate',
      value: `${flowRate.toFixed(1)}/day`,
      sub: `${totalUnits} units sold`,
      icon: Gauge,
      accent: 'from-cyan-500 via-sky-500 to-indigo-500',
    },
    {
      label: 'Online Sales Share',
      value: percent(onlineShare || 0),
      sub: `${onlineOrders} online vs ${offlineOrders} offline`,
      icon: Wifi,
      accent: 'from-fuchsia-500 via-pink-500 to-rose-400',
    },
    {
      label: 'Stock Coverage',
      value: `${daysOfCover ? daysOfCover.toFixed(1) : '0.0'} days`,
      sub: `${stockOnHand} units in hand`,
      icon: Boxes,
      accent: 'from-amber-500 via-orange-500 to-red-400',
    },
  ];

  return (
    <ReportCard
      title="SKU Performance Studio"
      subtitle="Pick a SKU and instantly read sales trend, branch strength, online share, datewise movement, and sell-through velocity."
      className="overflow-hidden border-none bg-transparent shadow-none"
      headerAction={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
            <Search className="h-4 w-4 text-indigo-500" />
            <input
              list="inventory-report-skus"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApply({ sku: skuInput })}
              placeholder="Search or paste SKU"
              className="w-40 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400 dark:text-gray-100"
            />
            <datalist id="inventory-report-skus">
              {skuOptions.map((item) => (
                <option key={item.product_id} value={item.sku}>{item.name}</option>
              ))}
            </datalist>
          </div>
          <button
            onClick={() => onApply({ sku: skuInput })}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.02] dark:bg-white dark:text-gray-950"
          >
            Load SKU
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSkuInput('');
              onApply({ sku: '' });
            }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Clear SKU
          </button>
        </div>
      }
    >
      <div className="relative overflow-hidden rounded-[32px] border border-indigo-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,247,255,0.96))] p-6 shadow-[0_30px_80px_-35px_rgba(79,70,229,0.55)] dark:border-indigo-900/50 dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.32),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_25%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,15,26,0.98))] md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-300/60 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-200">
                <Crown className="h-3.5 w-3.5" />
                Owner View · SKU Radar
              </div>
              <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-3xl">
                {filters.sku ? `Live performance for SKU ${filters.sku}` : 'Choose a SKU to open the sales cockpit'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300 md:text-base">
                {selectedProduct ? selectedProduct.name : 'Use the SKU picker to focus the entire dashboard on one product.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="min-w-[160px] rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-2.5 text-white ${card.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{card.label}</span>
                    </div>
                    <div className="text-xl font-black text-gray-950 dark:text-white">{card.value}</div>
                    <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">{card.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-gray-950/45">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Datewise Sales Trend
                  </div>
                  <h3 className="mt-3 text-lg font-black text-gray-950 dark:text-white">Revenue rhythm across the selected period</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Peak day {peakDay?.date || '—'} · Peak sales {currency(peakDailySales)} · Avg/day {currency(averageDailySales)}</p>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-right dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Report Window</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <CalendarRange className="h-4 w-4 text-indigo-500" />
                    {data.period.from} <ChevronRight className="h-3.5 w-3.5 text-gray-400" /> {data.period.to}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
                    <defs>
                      <linearGradient id="sku-studio-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((step, index) => {
                      const y = padding + step * (height - padding * 2);
                      const value = maxTrend - step * (maxTrend - minTrend);
                      return (
                        <g key={index}>
                          <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 6" className="text-gray-500" />
                          <text x={padding - 6} y={y + 4} textAnchor="end" fontSize="10" className="fill-gray-400 font-semibold">
                            {compactNumber(value)}
                          </text>
                        </g>
                      );
                    })}
                    {data.sales_trend.length > 1 && <path d={areaPath} fill="url(#sku-studio-area)" />}
                    {data.sales_trend.length > 1 && <path d={linePath} fill="none" stroke="rgb(79 70 229)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
                    {data.sales_trend.map((point, index) => {
                      const x = padding + index * stepX;
                      const y = scaleY(point.net_sales);
                      const showLabel = data.sales_trend.length <= 10 || index % Math.ceil(data.sales_trend.length / 8) === 0 || index === data.sales_trend.length - 1;
                      return (
                        <g key={`${point.date}-${index}`}>
                          <circle cx={x} cy={y} r="4.5" fill="white" stroke="rgb(79 70 229)" strokeWidth="3" />
                          {showLabel && (
                            <text x={x} y={height - 8} textAnchor="middle" fontSize="10" className="fill-gray-400 font-semibold">
                              {point.date.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {data.sales_trend.length === 1 && (
                      <circle cx={width / 2} cy={height / 2} r="6" fill="rgb(79 70 229)" />
                    )}
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-gray-950/45 flex flex-col">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-500 shrink-0">
                  <Wifi className="h-4 w-4" />
                  Channel Power Split
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-5 text-white shadow-lg shadow-fuchsia-500/20">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Online Orders</div>
                    <div className="mt-2 text-3xl font-black">{onlineOrders}</div>
                    <div className="mt-2 text-sm font-medium text-white/80">{percent(onlineShare || 0)} of total volume</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Offline / Branch</div>
                    <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{offlineOrders}</div>
                    <div className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{percent(100 - (onlineShare || 0))} of known channels</div>
                  </div>
                </div>
                <div className="mt-auto pt-5 space-y-3">
                  {(data.order_type_mix || []).map((item) => {
                    const total = data.order_type_mix.reduce((sum, row) => sum + row.value, 0) || 1;
                    const width = (item.value / total) * 100;
                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{item.label}</span>
                          <span className="font-black text-gray-950 dark:text-white">{item.value}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-400" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-gray-950/45 flex flex-col">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-500 shrink-0">
                  <PackageSearch className="h-4 w-4" />
                  Flow & Restock Trigger
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10 text-center sm:text-left">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Daily Sell Through</div>
                    <div className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{flowRate.toFixed(2)}</div>
                    <div className="mt-1 text-[10px] font-bold text-gray-400 uppercase">Units/Day</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10 text-center sm:text-left">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Days of Cover</div>
                    <div className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{daysOfCover.toFixed(1)}</div>
                    <div className="mt-1 text-[10px] font-bold text-gray-400 uppercase">Days Left</div>
                  </div>
                </div>
                <div className="mt-auto pt-5">
                  <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                    <div className="flex items-start gap-3">
                      <Activity className="mt-0.5 h-4 w-4 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-wider">Strategic Insight</div>
                        <p className="mt-1.5 text-xs leading-5 text-gray-600 dark:text-gray-400 font-medium italic">
                          {daysOfCover <= 7
                            ? '"Restock alert: current cover is tight. Trigger replenishment or inter-branch balancing immediately."'
                            : daysOfCover <= 15
                            ? '"Monitor closely: stock is moving at a healthy pace, but this SKU may need replenishment planning soon."'
                            : '"Coverage looks comfortable. Push this SKU harder through campaigns or bundling if margin supports it."'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-gray-950/45">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-500">
                <Store className="h-4 w-4" />
                Branchwise Sales Strength
              </div>
              <div className="space-y-4">
                {data.branch_performance.map((branch) => {
                  const width = (branch.net_sales / branchMax) * 100;
                  return (
                    <div key={branch.store_id} className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-gray-950 dark:text-white">{branch.store_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{branch.orders} orders · Margin {percent(branch.margin_pct)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-gray-950 dark:text-white">{currency(branch.net_sales)}</div>
                          <div className="text-xs font-semibold text-indigo-500">Profit {currency(branch.profit)}</div>
                        </div>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-950/5 backdrop-blur dark:border-white/10 dark:bg-gray-950/45">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">
                <Gauge className="h-4 w-4" />
                Datewise Sales Ledger
              </div>
              <div className="max-h-[460px] overflow-auto pr-1">
                <div className="space-y-3">
                  {datewiseRows.map((row) => {
                    const width = (row.net_sales / maxTrend) * 100;
                    return (
                      <div key={row.date} className="rounded-2xl border border-gray-100 bg-white/90 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-gray-950 dark:text-white">{row.date}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{row.orders} orders · Profit {currency(row.gross_profit)}</div>
                          </div>
                          <div className="text-right text-lg font-black text-gray-950 dark:text-white">{currency(row.net_sales)}</div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
