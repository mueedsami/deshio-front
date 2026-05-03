'use client';

import { StoreProvider, useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, Target, Zap, CreditCard, ChevronDown, Building2 } from 'lucide-react';

function HRMLayoutContent({ children }: { children: React.ReactNode }) {
  const { isGlobal, user } = useAuth();
  const { selectedStoreId, setSelectedStoreId, availableStores, isLoadingStores } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'My Dashboard', href: '/hrm/my', icon: LayoutDashboard, roles: ['employee', 'pos-salesman', 'branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Staff', href: '/hrm/branch', icon: Users, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Reports', href: '/hrm/attendance', icon: BarChart3, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Sales Targets', href: '/hrm/sales-targets', icon: Target, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Rewards & Fines', href: '/hrm/rewards-fines', icon: Zap, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
    { label: 'Payroll', href: '/hrm/payroll', icon: CreditCard, roles: ['branch-manager', 'admin', 'super-admin', 'online-moderator'] },
  ];

  const filteredTabs = tabs.filter(tab => {
    if (!user?.role?.slug) return false;
    return tab.roles.includes(user.role.slug);
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
        .hrm-root { font-family: 'DM Sans', sans-serif; }
        .hrm-display { font-family: 'Syne', sans-serif; }
        .gold-shimmer {
          background: linear-gradient(105deg, #c9a84c 0%, #f0d080 40%, #c9a84c 60%, #a07830 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tab-active-line::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #c9a84c, #f0d080);
          border-radius: 2px 2px 0 0;
        }
        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }
        .glow-gold { box-shadow: 0 0 30px rgba(201,168,76,0.15); }
        .hrm-card { 
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
        }
        .hrm-card-hover:hover {
          border-color: rgba(201,168,76,0.2);
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          transition: all 0.2s ease;
        }
        .stat-glow-green { box-shadow: 0 0 40px rgba(52,211,153,0.08); }
        .stat-glow-red { box-shadow: 0 0 40px rgba(239,68,68,0.08); }
        .stat-glow-gold { box-shadow: 0 0 40px rgba(201,168,76,0.1); }
        .pill-gold {
          background: linear-gradient(105deg, rgba(201,168,76,0.15), rgba(240,208,128,0.1));
          border: 1px solid rgba(201,168,76,0.25);
          color: #f0d080;
        }
        .pill-green {
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.2);
          color: #34d399;
        }
        .pill-red {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
        }
        .pill-blue {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8;
        }
        .pill-amber {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.2);
          color: #fbbf24;
        }
        .btn-primary {
          background: linear-gradient(135deg, #c9a84c 0%, #f0d080 50%, #c9a84c 100%);
          color: #0a0a0f;
          font-weight: 700;
          transition: all 0.2s;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,0.3); }
        .btn-primary:active { transform: translateY(0); }
        .btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: white; }
        .input-dark {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          transition: all 0.2s;
        }
        .input-dark:focus { outline: none; border-color: rgba(201,168,76,0.4); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        .input-dark::placeholder { color: rgba(255,255,255,0.25); }
        .divider { border-color: rgba(255,255,255,0.06); }
        .text-muted { color: rgba(255,255,255,0.4); }
        .text-sub { color: rgba(255,255,255,0.6); }
        .text-main { color: rgba(255,255,255,0.9); }
        .progress-track { background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .progress-gold { background: linear-gradient(90deg, #c9a84c, #f0d080); border-radius: 99px; }
        .progress-green { background: linear-gradient(90deg, #059669, #34d399); border-radius: 99px; }
        .progress-blue { background: linear-gradient(90deg, #4f46e5, #818cf8); border-radius: 99px; }
        .table-row-hover:hover { background: rgba(255,255,255,0.03); }
        .select-dark {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: white;
          -webkit-appearance: none;
        }
        .select-dark:focus { outline: none; border-color: rgba(201,168,76,0.4); }
        .select-dark option { background: #1a1a2e; color: white; }
        .avatar-ring {
          background: linear-gradient(135deg, #c9a84c, #f0d080);
          padding: 1.5px;
          border-radius: 50%;
        }
        .scroll-custom::-webkit-scrollbar { width: 4px; height: 4px; }
        .scroll-custom::-webkit-scrollbar-track { background: transparent; }
        .scroll-custom::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div className="hrm-root noise-bg relative border-b border-white/[0.06] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-0.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(240,208,128,0.1))', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Users className="w-4 h-4" style={{ color: '#f0d080' }} />
            </div>
            <h1 className="hrm-display text-xl font-700 text-white tracking-tight">HRM <span className="gold-shimmer">Management</span></h1>
          </div>
          <p className="text-xs text-muted ml-11">Attendance · Performance · Payroll</p>
        </div>

        {isGlobal && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted text-xs font-medium">
              <Building2 className="w-3.5 h-3.5" />
              Branch
            </div>
            <div className="relative">
              <select
                value={selectedStoreId || ''}
                onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                disabled={isLoadingStores}
                className="select-dark pl-3 pr-8 py-2 text-sm rounded-xl cursor-pointer w-48"
              >
                <option value="" disabled>Select Store</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="hrm-root border-b border-white/[0.06] px-6 overflow-x-auto scroll-custom"
        style={{ background: 'rgba(10,10,15,0.8)' }}>
        <nav className="flex gap-1">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`relative flex items-center gap-2 py-3.5 px-4 text-xs font-600 transition-all whitespace-nowrap rounded-t-lg ${isActive
                    ? 'tab-active-line text-white'
                    : 'text-muted hover:text-sub'
                  }`}
                style={isActive ? { fontFamily: 'Syne, sans-serif', fontWeight: 600 } : { fontFamily: 'DM Sans, sans-serif' }}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? '' : 'opacity-50'}`}
                  style={isActive ? { color: '#f0d080' } : {}} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <main className="hrm-root flex-1 overflow-y-auto p-6 scroll-custom" style={{ background: '#0a0a0f' }}>
        {children}
      </main>
    </div>
  );
}

export default function HRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <HRMLayoutContent>{children}</HRMLayoutContent>
    </StoreProvider>
  );
}