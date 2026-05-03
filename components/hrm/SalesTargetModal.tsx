'use client';

import { useState, useEffect } from 'react';
import { X, Target, AlertCircle } from 'lucide-react';
import hrmService from '@/services/hrmService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface SalesTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: { id: number; name: string } | null;
  onSuccess: () => void;
  storeId: number;
  initialTarget?: number;
  initialMonth?: string;
}

export default function SalesTargetModal({ isOpen, onClose, employee, onSuccess, storeId, initialTarget, initialMonth }: SalesTargetModalProps) {
  const [targetAmount, setTargetAmount] = useState(initialTarget?.toString() || '');
  const [targetMonth, setTargetMonth] = useState(initialMonth || format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialTarget) setTargetAmount(initialTarget.toString());
    if (initialMonth) setTargetMonth(initialMonth);
  }, [initialTarget, initialMonth]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setIsLoading(true);
    try {
      const res = await hrmService.setSalesTarget({ store_id: storeId, employee_id: employee.id, target_amount: Number(targetAmount), target_month: targetMonth });
      if (res.success) { toast.success(`Target set for ${employee.name}`); onSuccess(); onClose(); }
      else toast.error(res.message || 'Failed');
    } catch (error: any) { toast.error(error.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#0e0e18', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #c9a84c00, #f0d080, #c9a84c00)' }} />

        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <Target className="w-4 h-4" style={{ color: '#f0d080' }} />
            </div>
            <h3 className="text-white font-700 text-base" style={{ fontFamily: 'Syne, sans-serif' }}>Set Sales Target</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
            <X className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="avatar-ring w-9 h-9 shrink-0">
              <div className="w-full h-full rounded-full flex items-center justify-center text-sm font-700"
                style={{ background: '#0a0a0f', color: '#f0d080', fontFamily: 'Syne, sans-serif' }}>
                {employee.name.charAt(0)}
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-600">{employee.name}</p>
              <p className="text-muted text-[10px]">Sales target assignment</p>
            </div>
          </div>

          {/* Month */}
          <div>
            <label className="block text-muted text-[10px] uppercase tracking-widest font-600 mb-1.5">Target Month</label>
            <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} required
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm font-600" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-muted text-[10px] uppercase tracking-widest font-600 mb-1.5">Target Amount (৳)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-700 text-sm gold-shimmer">৳</span>
              <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0" required min="1"
                className="input-dark w-full pl-9 pr-4 py-4 rounded-xl text-3xl font-800 text-center"
                style={{ fontFamily: 'Syne, sans-serif', color: '#f0d080' }} />
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f0d080' }} />
            <p className="text-[11px]" style={{ color: 'rgba(240,208,128,0.7)' }}>
              This will overwrite any existing target for the selected month.
            </p>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-2xl text-sm font-700 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #f0d080 50%, #c9a84c 100%)', color: '#0a0a0f', boxShadow: '0 8px 24px rgba(201,168,76,0.3)' }}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(10,10,15,0.3)', borderTopColor: '#0a0a0f' }} />
                Saving...
              </span>
            ) : 'Set Monthly Target'}
          </button>
        </form>
      </div>
    </div>
  );
}