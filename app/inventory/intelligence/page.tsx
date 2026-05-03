'use client';

import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/lib/axios';
import inventoryRebalancingService from '@/services/inventoryRebalancingService';
import { toast } from 'react-hot-toast';
import {
  ArrowRight, BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  Zap, RefreshCw, Package, Store, Clock, ChevronDown, ChevronUp,
  Flame, Snowflake, ArrowLeftRight, CheckCircle2, Info, Star
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BranchSummary {
  store_id: number; store_name: string; units_sold: number; revenue: number;
  velocity_day: number; total_stock: number; sku_count: number;
  dead_sku_count: number; stock_value: number;
}

interface Recommendation {
  product_id: number; product_name: string; sku: string;
  urgency: 'urgent' | 'high' | 'medium' | 'low';
  urgency_score: number;
  from_store_id: number; from_store_name: string;
  from_store_stock: number; from_store_velocity: number; from_store_batch_id: number | null;
  to_store_id: number; to_store_name: string;
  to_store_stock: number; to_store_velocity: number; to_store_days_remaining: number | null;
  suggested_quantity: number; reason: string; estimated_value: number;
  all_stores: StoreVelocity[];
}

interface StoreVelocity {
  store_id: number; store_name: string; stock: number; units_sold: number;
  velocity: number; days_of_stock: number | null;
}

interface BestSeller {
  product_id: number; product_name: string; sku: string;
  total_units: number; total_revenue: number; total_stock: number;
  by_store: StoreVelocity[];
}

interface SlowMover {
  product_id: number; product_name: string; sku: string; dead_stock: number;
  affected_stores: { store_id: number; store_name: string; stock: number }[];
}

interface CrossStoreStar {
  product_id: number; product_name: string; sku: string;
  hot_store_id: number; hot_store_name: string; hot_store_velocity: number;
  dead_store_id: number; dead_store_name: string; dead_store_stock: number;
}

interface IntelligenceData {
  period_days: number; generated_at: string;
  branch_summary: BranchSummary[];
  recommendations: Recommendation[];
  best_sellers: BestSeller[];
  slow_movers: SlowMover[];
  cross_store_stars: CrossStoreStar[];
  stats: { total_products_tracked: number; total_recommendations: number; urgent_count: number; high_count: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tk = (n: number) => `৳${n.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

const URGENCY_CONFIG = {
  urgent: { label: 'Urgent',  color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   dot: 'bg-red-500' },
  high:   { label: 'High',    color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.25)',  dot: 'bg-orange-500' },
  medium: { label: 'Medium',  color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.2)',   dot: 'bg-yellow-500' },
  low:    { label: 'Low',     color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.15)',  dot: 'bg-indigo-400' },
} as const;

function DaysTag({ days }: { days: number | null }) {
  if (days === null) return <span style={{ color: 'rgba(255,255,255,0.3)' }} className="text-[10px]">—</span>;
  if (days === 999) return <span style={{ color: '#818cf8' }} className="text-[10px] font-600">No sales</span>;
  const color = days <= 7 ? '#f87171' : days <= 14 ? '#fb923c' : days <= 30 ? '#fbbf24' : '#34d399';
  return <span className="text-[10px] font-700" style={{ color }}>{days}d left</span>;
}

function UrgencyBadge({ urgency }: { urgency: keyof typeof URGENCY_CONFIG }) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <span className="text-[10px] font-700 px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StockIntelligencePage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'bestsellers' | 'slowmovers' | 'crossstore'>('recommendations');
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null); // product_id being submitted
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get('/inventory/intelligence', { params: { days } });
      if (res.data.success) setData(res.data.data);
      else toast.error('Failed to load intelligence data');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateRebalancing = async (rec: Recommendation) => {
    if (!rec.from_store_batch_id) {
      toast.error('No source batch found for this product at the source store.');
      return;
    }
    setSubmitting(rec.product_id);
    try {
      const res = await inventoryRebalancingService.createRebalancingRequest({
        product_id: rec.product_id,
        source_store_id: rec.from_store_id,
        source_batch_id: rec.from_store_batch_id,
        destination_store_id: rec.to_store_id,
        quantity: rec.suggested_quantity,
        reason: rec.reason,
        priority: rec.urgency === 'urgent' ? 'urgent' : rec.urgency === 'high' ? 'high' : rec.urgency === 'medium' ? 'medium' : 'low',
      });
      if (res.success) {
        toast.success(`Rebalancing request created for ${rec.product_name}!`);
      } else {
        toast.error(res.message || 'Failed to create request');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create rebalancing request');
    } finally {
      setSubmitting(null);
    }
  };

  const filteredRecs = (data?.recommendations || []).filter(r =>
    urgencyFilter === 'all' || r.urgency === urgencyFilter
  );

  const tabs = [
    { id: 'recommendations', label: 'Move Suggestions', icon: ArrowLeftRight, count: data?.stats.total_recommendations },
    { id: 'bestsellers',     label: 'Best Sellers',     icon: Flame,          count: data?.best_sellers.length },
    { id: 'slowmovers',      label: 'Slow Movers',      icon: Snowflake,      count: data?.slow_movers.length },
    { id: 'crossstore',      label: 'Branch Stars',     icon: Star,           count: data?.cross_store_stars.length },
  ] as const;

  return (
    <div className="min-h-screen p-6 space-y-5" style={{ background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .intel-card { background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
        .intel-card-hover:hover { border-color: rgba(201,168,76,0.2); background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); transition: all 0.2s; }
        .gold-text { background: linear-gradient(105deg, #c9a84c, #f0d080, #c9a84c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .gold-btn { background: linear-gradient(135deg, #c9a84c, #f0d080, #c9a84c); color: #0a0a0f; font-weight: 700; transition: all 0.2s; }
        .gold-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,0.3); }
        .ghost-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); transition: all 0.2s; }
        .ghost-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .input-dark { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; }
        .input-dark:focus { outline: none; border-color: rgba(201,168,76,0.4); }
        .input-dark option { background: #1a1a2e; }
        .tr-hover:hover { background: rgba(255,255,255,0.025); }
        .vel-bar { background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; height: 4px; }
        .vel-fill { background: linear-gradient(90deg, #c9a84c, #f0d080); height: 4px; border-radius: 99px; }
        .pulse-dot { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .scroll-thin::-webkit-scrollbar { width: 3px; } .scroll-thin::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 99px; }
        .syne { font-family: 'Syne', sans-serif; }
        .tab-active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #c9a84c, #f0d080); border-radius: 2px 2px 0 0; }
        .avatar-ring { background: linear-gradient(135deg, #c9a84c, #f0d080); padding: 1.5px; border-radius: 50%; display: inline-flex; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <BarChart3 className="w-5 h-5" style={{ color: '#f0d080' }} />
            </div>
            <h1 className="syne text-2xl font-800 text-white">Stock <span className="gold-text">Intelligence</span></h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs ml-12">
            Best-sellers · Slow movers · AI-powered rebalancing suggestions across branches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="input-dark px-3 py-2 rounded-xl text-xs font-600">
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
          <button onClick={loadData} disabled={isLoading}
            className="ghost-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-600">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Products Tracked', value: data.stats.total_products_tracked, color: '#818cf8', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.12)' },
            { label: 'Move Suggestions', value: data.stats.total_recommendations, color: '#f0d080', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.12)' },
            { label: 'Urgent Moves',     value: data.stats.urgent_count,           color: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.12)' },
            { label: 'High Priority',    value: data.stats.high_count,             color: '#fb923c', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.12)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-[10px] uppercase tracking-widest font-600 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              <p className="syne text-3xl font-800" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Branch summary cards ────────────────────────────────────────── */}
      {data && data.branch_summary.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest font-600 mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Branch Overview — Last {days} Days</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.branch_summary.map(branch => {
              const maxVel = Math.max(...data.branch_summary.map(b => b.velocity_day), 1);
              return (
                <div key={branch.store_id} className="intel-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-ring w-8 h-8">
                        <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-700"
                          style={{ background: '#0a0a0f', color: '#f0d080', fontFamily: 'Syne' }}>
                          {branch.store_name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="text-white text-xs font-700 truncate max-w-[140px]">{branch.store_name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-[10px]">{branch.sku_count} SKUs · {branch.dead_sku_count} dead</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="syne font-800 text-sm gold-text">{tk(branch.revenue)}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-[10px]">{branch.units_sold} units sold</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Velocity</span>
                      <span style={{ color: '#f0d080' }} className="font-700">{branch.velocity_day} u/day</span>
                    </div>
                    <div className="vel-bar">
                      <div className="vel-fill transition-all duration-700" style={{ width: `${(branch.velocity_day / maxVel) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] pt-1">
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>Stock: <span className="text-white font-600">{branch.total_stock}</span></span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>Value: <span style={{ color: '#818cf8' }} className="font-600">{tk(branch.stock_value)}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="intel-card overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b overflow-x-auto scroll-thin" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-xs font-600 whitespace-nowrap transition-colors ${isActive ? 'tab-active text-white' : ''}`}
                style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.4)' }}>
                <tab.icon className="w-3.5 h-3.5" style={{ color: isActive ? '#f0d080' : undefined }} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full"
                    style={{ background: isActive ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)', color: isActive ? '#f0d080' : 'rgba(255,255,255,0.4)' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'rgba(201,168,76,0.3)', borderTopColor: '#f0d080' }} />
            </div>
          ) : (
            <>
              {/* ══ RECOMMENDATIONS TAB ══ */}
              {activeTab === 'recommendations' && (
                <div className="space-y-4">
                  {/* Filter bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[10px] uppercase tracking-widest font-600">Filter:</span>
                    {['all', 'urgent', 'high', 'medium', 'low'].map(f => (
                      <button key={f} onClick={() => setUrgencyFilter(f)}
                        className="text-[10px] font-700 px-2.5 py-1 rounded-full transition-all capitalize"
                        style={{
                          background: urgencyFilter === f ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                          border: urgencyFilter === f ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.06)',
                          color: urgencyFilter === f ? '#f0d080' : 'rgba(255,255,255,0.4)'
                        }}>
                        {f}
                      </button>
                    ))}
                    <span style={{ color: 'rgba(255,255,255,0.25)' }} className="text-[10px] ml-auto">{filteredRecs.length} suggestions</span>
                  </div>

                  {filteredRecs.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20 text-white" />
                      <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">No suggestions for this filter. Your inventory is well balanced!</p>
                    </div>
                  ) : (
                    filteredRecs.map((rec, idx) => {
                      const cfg = URGENCY_CONFIG[rec.urgency];
                      const isExpanded = expandedRec === rec.product_id;
                      const maxVel = Math.max(...rec.all_stores.map(s => s.velocity), 0.01);
                      return (
                        <div key={`${rec.product_id}-${idx}`} className="rounded-2xl overflow-hidden"
                          style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}>
                          <div className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                              {/* Product info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <UrgencyBadge urgency={rec.urgency} />
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }} className="text-[10px] font-mono">{rec.sku}</span>
                                </div>
                                <p className="text-white text-sm font-700 leading-tight truncate">{rec.product_name}</p>
                                <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[11px] mt-1 leading-relaxed">{rec.reason}</p>
                              </div>

                              {/* Flow arrow */}
                              <div className="flex items-center gap-3 shrink-0">
                                {/* From store */}
                                <div className="text-center">
                                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[9px] uppercase tracking-widest mb-1">From</p>
                                  <p className="text-white text-xs font-700 max-w-[90px] truncate">{rec.from_store_name}</p>
                                  <p className="text-xs font-700" style={{ color: '#818cf8' }}>{rec.from_store_stock} in stock</p>
                                  <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-[10px]">{rec.from_store_velocity.toFixed(2)} u/day</p>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                  <div className="px-3 py-1.5 rounded-xl text-[10px] font-800 syne"
                                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#f0d080' }}>
                                    {rec.suggested_quantity} units
                                  </div>
                                  <ArrowRight className="w-4 h-4" style={{ color: '#f0d080' }} />
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }} className="text-[9px]">{tk(rec.estimated_value)}</span>
                                </div>

                                {/* To store */}
                                <div className="text-center">
                                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[9px] uppercase tracking-widest mb-1">To</p>
                                  <p className="text-white text-xs font-700 max-w-[90px] truncate">{rec.to_store_name}</p>
                                  <p className="text-xs font-700" style={{ color: '#34d399' }}>{rec.to_store_velocity.toFixed(2)} u/day</p>
                                  <DaysTag days={rec.to_store_days_remaining} />
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => setExpandedRec(isExpanded ? null : rec.product_id)}
                                  className="ghost-btn p-2 rounded-xl">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleCreateRebalancing(rec)}
                                  disabled={submitting === rec.product_id}
                                  className="gold-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs disabled:opacity-50">
                                  {submitting === rec.product_id ? (
                                    <><span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(10,10,15,0.3)', borderTopColor: '#0a0a0f' }} /> Creating...</>
                                  ) : (
                                    <><ArrowLeftRight className="w-3.5 h-3.5" /> Create Request</>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded: all-store breakdown */}
                          {isExpanded && (
                            <div className="px-4 pb-4">
                              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <p style={{ color: 'rgba(255,255,255,0.35)' }} className="text-[10px] uppercase tracking-widest font-600">All Branch Breakdown</p>
                                </div>
                                <table className="w-full">
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      {['Branch', 'Stock', 'Sold', 'Velocity', 'Days Left'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rec.all_stores.map(s => (
                                      <tr key={s.store_id} className="tr-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="px-4 py-2.5 text-xs text-white font-600">{s.store_name}</td>
                                        <td className="px-4 py-2.5 text-xs" style={{ color: '#818cf8' }}>{s.stock}</td>
                                        <td className="px-4 py-2.5 text-xs" style={{ color: '#34d399' }}>{s.units_sold}</td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            <div className="vel-bar flex-1 min-w-[60px]">
                                              <div className="vel-fill" style={{ width: `${(s.velocity / maxVel) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] font-600" style={{ color: '#f0d080' }}>{s.velocity.toFixed(2)}/d</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5"><DaysTag days={s.days_of_stock} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ══ BEST SELLERS TAB ══ */}
              {activeTab === 'bestsellers' && (
                <div className="space-y-3">
                  {(data?.best_sellers || []).length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-center text-sm py-8">No sales data in the selected period.</p>
                  ) : (
                    (data?.best_sellers || []).map((prod, idx) => (
                      <div key={prod.product_id} className="intel-card intel-card-hover p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-800 syne shrink-0"
                            style={{
                              background: idx === 0 ? 'linear-gradient(135deg,rgba(201,168,76,0.3),rgba(240,208,128,0.15))' : 'rgba(255,255,255,0.05)',
                              border: idx === 0 ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              color: idx === 0 ? '#f0d080' : 'rgba(255,255,255,0.4)'
                            }}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-white text-sm font-700 truncate">{prod.product_name}</p>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }} className="text-[10px] hidden md:inline">{prod.sku}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-[10px]">
                              <span><span style={{ color: 'rgba(255,255,255,0.35)' }}>Units: </span><span style={{ color: '#34d399' }} className="font-700">{prod.total_units}</span></span>
                              <span><span style={{ color: 'rgba(255,255,255,0.35)' }}>Revenue: </span><span className="gold-text font-700">{tk(prod.total_revenue)}</span></span>
                              <span><span style={{ color: 'rgba(255,255,255,0.35)' }}>Stock: </span><span style={{ color: '#818cf8' }} className="font-700">{prod.total_stock}</span></span>
                            </div>
                          </div>
                          {/* Mini branch breakdown */}
                          <div className="hidden lg:flex items-center gap-2">
                            {prod.by_store.filter(s => s.units_sold > 0).slice(0, 3).map(s => (
                              <div key={s.store_id} className="text-center px-2.5 py-1.5 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[9px] truncate max-w-[70px]">{s.store_name}</p>
                                <p style={{ color: '#34d399' }} className="text-xs font-700">{s.units_sold}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ══ SLOW MOVERS TAB ══ */}
              {activeTab === 'slowmovers' && (
                <div className="space-y-3">
                  {(data?.slow_movers || []).length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-center text-sm py-8">No slow movers found! All stock is moving.</p>
                  ) : (
                    (data?.slow_movers || []).map(prod => (
                      <div key={prod.product_id} className="rounded-2xl p-4"
                        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Snowflake className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                              <p className="text-white text-sm font-700">{prod.product_name}</p>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }} className="text-[10px]">{prod.sku}</span>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-[11px]">
                              <span style={{ color: '#818cf8' }} className="font-700">{prod.dead_stock} units</span> sitting unsold for {days} days across {prod.affected_stores.length} branch{prod.affected_stores.length > 1 ? 'es' : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {prod.affected_stores.map(s => (
                              <div key={s.store_id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <Store className="w-3 h-3" style={{ color: '#818cf8' }} />
                                <span className="text-[10px] text-white font-600 truncate max-w-[80px]">{s.store_name}</span>
                                <span style={{ color: '#818cf8' }} className="text-[10px] font-700">{s.stock}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ══ CROSS STORE STARS TAB ══ */}
              {activeTab === 'crossstore' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl mb-4"
                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f0d080' }} />
                    <p className="text-[11px]" style={{ color: 'rgba(240,208,128,0.7)' }}>
                      These products are selling well in one branch but have zero sales in another — prime candidates for stock transfers.
                    </p>
                  </div>

                  {(data?.cross_store_stars || []).length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-center text-sm py-8">No cross-branch disparities found.</p>
                  ) : (
                    (data?.cross_store_stars || []).map(item => (
                      <div key={`${item.product_id}-${item.hot_store_id}-${item.dead_store_id}`}
                        className="rounded-2xl p-4"
                        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(201,168,76,0.15)' }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <p className="text-white text-sm font-700 mb-0.5">{item.product_name}</p>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }} className="text-[10px]">{item.sku}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Flame className="w-3.5 h-3.5" style={{ color: '#fb923c' }} />
                                <span style={{ color: '#fb923c' }} className="text-[10px] font-700">Hot</span>
                              </div>
                              <p className="text-white text-xs font-700 max-w-[100px] truncate">{item.hot_store_name}</p>
                              <p style={{ color: '#34d399' }} className="text-[10px] font-700">{item.hot_store_velocity.toFixed(2)} u/day</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <ArrowRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                              <span style={{ color: 'rgba(255,255,255,0.2)' }} className="text-[9px]">transfer</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Snowflake className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                                <span style={{ color: '#818cf8' }} className="text-[10px] font-700">Dead</span>
                              </div>
                              <p className="text-white text-xs font-700 max-w-[100px] truncate">{item.dead_store_name}</p>
                              <p style={{ color: '#818cf8' }} className="text-[10px] font-700">{item.dead_store_stock} units sitting</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Footer note ────────────────────────────────────────────────── */}
      {data && (
        <p style={{ color: 'rgba(255,255,255,0.2)' }} className="text-[10px] text-center">
          Data computed at {format(new Date(data.generated_at), 'dd MMM yyyy · hh:mm a')} · Based on last {data.period_days} days of completed orders
        </p>
      )}
    </div>
  );
}
