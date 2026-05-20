'use client';

import { RotateCcw, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  order: any;
  onInitiateReturn: (order: any) => void;
  onInitiateExchange: (order: any) => void;
}

export default function ReturnExchangeFromOrder({ order, onInitiateReturn, onInitiateExchange }: Props) {
  const { role, isSuperAdmin } = useAuth();

  // Check roles: admin, branch-manager and POS (pos-salesman)
  const allowedRoles = ['super-admin', 'admin', 'branch-manager', 'pos-salesman'];
  const canInitiate = isSuperAdmin || (role && allowedRoles.includes(role));
  const activeReturn = order?.active_return || order?.activeReturn || (Array.isArray(order?.active_returns) ? order.active_returns[0] : null);
  const hasActiveReturn = Boolean(activeReturn || order?.has_active_return || order?.hasActiveReturn);

  if (!canInitiate) return null;

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      {hasActiveReturn && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          Return already initiated{activeReturn?.return_number ? `: ${activeReturn.return_number}` : ''}{activeReturn?.status ? ` (${activeReturn.status})` : ''}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => !hasActiveReturn && onInitiateReturn(order)}
          disabled={hasActiveReturn}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg font-medium transition-colors ${hasActiveReturn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100'}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Initiate Return
        </button>
        <button
          onClick={() => !hasActiveReturn && onInitiateExchange(order)}
          disabled={hasActiveReturn}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg font-medium transition-colors ${hasActiveReturn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Request Exchange
        </button>
      </div>
    </div>
  );
}

