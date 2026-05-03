'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import hrmService, { AttendanceRecord } from '@/services/hrmService';
import employeeService, { Employee } from '@/services/employeeService';
import AttendanceModal from '@/components/hrm/AttendanceModal';
import AccessControl from '@/components/AccessControl';
import {
  Users, TrendingUp, CheckCircle2, Clock, MoreVertical, Search,
  Edit3, UserCheck, UserX, Play, UserMinus, LogOut, ChevronRight,
  Activity, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function BranchHRMPage() {
  const { selectedStoreId } = useStore();
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean; employee: any; type: 'check_in' | 'check_out' | 'edit'; record?: any;
  }>({ isOpen: false, employee: null, type: 'check_in' });

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedStoreId) loadBranchData();
  }, [selectedStoreId]);

  const loadBranchData = async () => {
    setIsLoading(true);
    try {
      const [empData, attToday, perfData] = await Promise.all([
        employeeService.getAll({ store_id: selectedStoreId!, is_active: true }),
        hrmService.getTodayAttendance(selectedStoreId!),
        hrmService.getPerformanceReport({ store_id: selectedStoreId!, month: format(new Date(), 'yyyy-MM') })
      ]);
      setEmployees(empData);
      setTodayAttendance(attToday);
      setPerformanceReport(perfData);
    } catch (error) {
      console.error('Failed to load branch HRM data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = (Array.isArray(employees) ? employees : []).filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone?.includes(searchQuery)
  );

  const getEmpAttendance = (empId: number | string) =>
    (Array.isArray(todayAttendance) ? todayAttendance : []).find(a => a.employee_id === Number(empId));

  const att = Array.isArray(todayAttendance) ? todayAttendance : [];
  const presentCount = att.filter(a => a.status === 'present' || a.status === 'late').length;
  const absentCount = att.filter(a => a.status === 'absent').length;
  const notMarkedCount = employees.length - att.length;

  const handleBulkMark = async (type: 'present' | 'absent') => {
    if (!selectedStoreId) return;
    if (!window.confirm(`Mark all ${filteredEmployees.length} employees as ${type}?`)) return;
    try {
      const nowTime = format(new Date(), 'HH:mm');
      await hrmService.markAttendance({
        store_id: selectedStoreId,
        attendance_date: format(new Date(), 'yyyy-MM-dd'),
        entries: filteredEmployees.map(emp => ({
          employee_id: Number(emp.id),
          status: type,
          in_time: type === 'present' ? nowTime : undefined,
        }))
      });
      toast.success('Bulk attendance updated!');
      loadBranchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleQuickMark = async (emp: Employee, status: 'present' | 'leave' | 'leaving') => {
    setActiveMenuId(null);
    if (!selectedStoreId) return;
    if (status === 'present') { setAttendanceModal({ isOpen: true, employee: emp, type: 'check_in' }); return; }
    if (status === 'leaving') {
      const record = getEmpAttendance(emp.id);
      setAttendanceModal({ isOpen: true, employee: emp, type: 'check_out', record });
      return;
    }
    try {
      await hrmService.markAttendance({
        store_id: selectedStoreId,
        attendance_date: format(new Date(), 'yyyy-MM-dd'),
        entries: [{ employee_id: Number(emp.id), status }]
      });
      toast.success(`Marked as ${status}`);
      loadBranchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusPill = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'present') return <span className="pill-green text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Present</span>;
    if (s === 'late') return <span className="pill-amber text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Late</span>;
    if (s === 'absent') return <span className="pill-red text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Absent</span>;
    if (s === 'leave') return <span className="pill-blue text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Leave</span>;
    if (s === 'half_day') return <span style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24' }} className="text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Half Day</span>;
    if (s === 'holiday_auto' || s === 'off_day_auto') return <span style={{ background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.2)', color:'#a78bfa' }} className="text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">{s === 'holiday_auto' ? 'Holiday' : 'Off Day'}</span>;
    return <span className="text-[10px] font-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)' }}>Not Marked</span>;
  };

  if (!selectedStoreId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
        <Users className="w-14 h-14 mb-4" style={{ color: 'rgba(201,168,76,0.3)' }} />
        <h3 className="text-lg font-700 text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No Store Selected</h3>
        <p className="text-muted text-sm">Select a store to manage attendance</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: employees.length, icon: Users, color: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.2)', iconColor: '#818cf8' },
          { label: 'Present', value: presentCount, icon: CheckCircle2, color: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.15)', iconColor: '#34d399' },
          { label: 'Absent', value: absentCount, icon: UserX, color: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.15)', iconColor: '#f87171' },
          { label: 'Not Marked', value: notMarkedCount, icon: Clock, color: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.15)', iconColor: '#fbbf24' },
        ].map((stat) => (
          <div key={stat.label} className="hrm-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-xs uppercase tracking-widest font-500">{stat.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.color, border: `1px solid ${stat.border}` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.iconColor }} />
              </div>
            </div>
            <p className="text-3xl font-800 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main Table */}
        <div className="xl:col-span-2 hrm-card rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-white font-700 text-base" style={{ fontFamily: 'Syne, sans-serif' }}>Staff Attendance</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Activity className="w-3 h-3" style={{ color: '#34d399' }} />
                <p className="text-muted text-xs">{format(currentTime, 'EEEE · hh:mm:ss a')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-dark pl-9 pr-3 py-2 text-xs rounded-xl w-44"
                />
              </div>
              <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                <button onClick={() => handleBulkMark('present')}
                  className="btn-primary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap">
                  <UserCheck className="w-3.5 h-3.5" /> Clock In All
                </button>
                <button onClick={() => handleBulkMark('absent')}
                  className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap">
                  <UserX className="w-3.5 h-3.5" /> Mark Absent
                </button>
              </AccessControl>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['Employee', 'Status', 'Clock In', 'Clock Out', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest text-muted font-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: j === 0 ? '140px' : '80px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-muted text-sm">No staff found</td></tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const record = getEmpAttendance(emp.id);
                    const isClockedIn = record && (record.clock_in || record.status?.toLowerCase() === 'present' || record.status?.toLowerCase() === 'late');
                    const isClockedOut = record && record.clock_out;
                    return (
                      <tr key={emp.id} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="avatar-ring w-8 h-8 shrink-0">
                              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-700"
                                style={{ background: '#0a0a0f', color: '#f0d080' }}>
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <p className="text-white text-xs font-600 leading-tight">{emp.name}</p>
                              <p className="text-muted text-[10px]">{emp.phone || emp.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {record ? getStatusPill(record.status) : getStatusPill('')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-600" style={{ color: record?.clock_in ? '#34d399' : 'rgba(255,255,255,0.25)' }}>
                            {record?.clock_in || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-600" style={{ color: record?.clock_out ? '#f87171' : 'rgba(255,255,255,0.25)' }}>
                            {record?.clock_out || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                              {!isClockedIn ? (
                                <button onClick={() => handleQuickMark(emp, 'present')}
                                  className="btn-primary flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-700">
                                  <Play className="w-3 h-3" /> In
                                </button>
                              ) : !isClockedOut ? (
                                <button onClick={() => handleQuickMark(emp, 'leaving')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-700"
                                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                                  <LogOut className="w-3 h-3" /> Out
                                </button>
                              ) : (
                                <span className="text-[10px] font-600 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.5)' }}>
                                  Done
                                </span>
                              )}
                            </AccessControl>

                            <div className="relative">
                              <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                                <button onClick={() => setActiveMenuId(activeMenuId === Number(emp.id) ? null : Number(emp.id))}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ background: activeMenuId === Number(emp.id) ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                                  <MoreVertical className="w-4 h-4 text-muted" />
                                </button>
                              </AccessControl>
                              {activeMenuId === Number(emp.id) && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                                  <div className="absolute right-0 mt-1 w-44 rounded-xl z-50 py-1 overflow-hidden"
                                    style={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                                    {[
                                      { label: 'Mark Present', icon: UserCheck, color: '#34d399', action: () => handleQuickMark(emp, 'present') },
                                      { label: 'Mark Leaving', icon: LogOut, color: '#f87171', action: () => handleQuickMark(emp, 'leaving') },
                                      { label: 'Give Leave', icon: UserMinus, color: '#fbbf24', action: () => handleQuickMark(emp, 'leave') },
                                    ].map(item => (
                                      <button key={item.label} onClick={item.action}
                                        className="w-full px-4 py-2.5 text-xs font-600 text-left flex items-center gap-3 transition-colors"
                                        style={{ color: 'rgba(255,255,255,0.7)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                                        {item.label}
                                      </button>
                                    ))}
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 12px' }} />
                                    <button
                                      onClick={() => { setActiveMenuId(null); const r = getEmpAttendance(emp.id); setAttendanceModal({ isOpen: true, employee: emp, type: 'edit', record: r }); }}
                                      className="w-full px-4 py-2.5 text-xs font-600 text-left flex items-center gap-3"
                                      style={{ color: '#818cf8' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                      <Edit3 className="w-3.5 h-3.5" /> Manual Edit
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Performance Leaderboard */}
          <div className="hrm-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-700 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Leaderboard</h3>
              <span className="pill-gold text-[10px] font-700 px-2 py-0.5 rounded-full">{format(new Date(), 'MMM yyyy')}</span>
            </div>
            <div className="space-y-3">
              {(Array.isArray(performanceReport?.items) ? performanceReport.items : []).slice(0, 5).map((rank: any, idx: number) => (
                <div key={rank.employee.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-800 shrink-0"
                    style={{
                      background: idx === 0 ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(240,208,128,0.15))' : 'rgba(255,255,255,0.05)',
                      border: idx === 0 ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      color: idx === 0 ? '#f0d080' : 'rgba(255,255,255,0.4)',
                      fontFamily: 'Syne, sans-serif'
                    }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-600 truncate">{rank.employee.name}</p>
                    <div className="progress-track h-1 mt-1">
                      <div className={`h-1 ${idx === 0 ? 'progress-gold' : 'progress-blue'}`}
                        style={{ width: `${Math.min(rank.achievement_percentage, 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-700 shrink-0" style={{ color: idx === 0 ? '#f0d080' : '#818cf8' }}>
                    {rank.achievement_percentage}%
                  </span>
                </div>
              ))}
              {(!performanceReport?.items || performanceReport.items.length === 0) && (
                <p className="text-muted text-xs text-center py-4">No data yet</p>
              )}
            </div>
          </div>

          {/* Branch Performance */}
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #f0d080, transparent)', transform: 'translate(30%, -30%)' }} />
            <p className="text-[10px] uppercase tracking-widest font-600 mb-1" style={{ color: 'rgba(201,168,76,0.6)' }}>Branch Achievement</p>
            <p className="gold-shimmer text-4xl font-800 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              {performanceReport?.branch_achievement || 0}%
            </p>
            <div className="progress-track h-1.5 mb-2">
              <div className="progress-gold h-1.5 transition-all duration-1000"
                style={{ width: `${Math.min(performanceReport?.branch_achievement || 0, 100)}%` }} />
            </div>
            <p className="text-muted text-[10px]">Of monthly target achieved</p>
          </div>

          {/* Quick Actions */}
          <div className="hrm-card rounded-2xl p-5">
            <h3 className="text-white font-700 text-sm mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Sales Targets', href: '/hrm/sales-targets' },
                { label: 'Rewards & Fines', href: '/hrm/rewards-fines' },
                { label: 'Payroll', href: '/hrm/payroll' },
                { label: 'Attendance Report', href: '/hrm/attendance' },
              ].map(item => (
                <button key={item.href} onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-600 transition-all text-left"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.2)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}>
                  {item.label}
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {attendanceModal.isOpen && (
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={() => setAttendanceModal({ ...attendanceModal, isOpen: false })}
          employee={attendanceModal.employee}
          type={attendanceModal.type}
          record={attendanceModal.record}
          storeId={selectedStoreId!}
          onSuccess={loadBranchData}
        />
      )}
    </div>
  );
}
