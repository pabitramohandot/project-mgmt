'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, LayoutDashboard, Rocket, Calendar, ClipboardList, CreditCard, 
  Sun, TrendingUp, CheckCircle2, Clock, AlertCircle, ArrowUpRight, 
  Plus, UserPlus, FileText, Check, X, ShieldAlert, Sparkles, Building, 
  Loader2, RefreshCw
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function HRDashboardPage() {
  const { showToast } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchHRDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await fetch('/api/hr-dashboard');
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        showToast('Failed to load HR Dashboard metrics', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to HR analytics server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHRDashboard();
  }, []);

  const handleQuickLeaveAction = async (leaveId, status) => {
    try {
      setActionLoading(leaveId);
      const res = await fetch('/api/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leaveId, status })
      });

      if (res.ok) {
        showToast(`Leave request ${status.toLowerCase()} successfully!`, 'success');
        fetchHRDashboard(true);
      } else {
        const err = await res.json();
        showToast(err.error || `Failed to update leave request`, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent-primary)', margin: '0 auto' }} />
        <h3 style={{ fontWeight: 700, marginTop: '0.5rem' }}>Loading HR Management Dashboard...</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aggregating workforce analytics, attendance, leaves & payroll status</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="card animate-fade-in" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '560px', margin: '3rem auto' }}>
        <ShieldAlert size={56} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          The HR Dashboard is restricted to Admin & HR Management. Please use your Employee Workspace dashboard for your daily task assignments and attendance.
        </p>
        <Link href="/" className="btn btn-primary" style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Return to My Workspace</span>
        </Link>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const attendance = metrics.attendance || {};
  const recentClockIns = Array.isArray(attendance.recentClockIns) ? attendance.recentClockIns : [];
  const onboarding = metrics.onboarding || {};
  const onboardingRecent = Array.isArray(onboarding.recent) ? onboarding.recent : [];
  const leaves = metrics.leaves || {};
  const pendingLeavesList = Array.isArray(leaves.pendingList) ? leaves.pendingList : [];
  const payroll = metrics.payroll || {};
  const holidays = Array.isArray(metrics.upcomingHolidays) ? metrics.upcomingHolidays : [];
  const deptCounts = metrics.departmentCounts || {};

  const deptList = Object.keys(deptCounts);
  const maxDeptCount = Math.max(...Object.values(deptCounts), 1);

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ 
              background: 'rgba(0, 174, 239, 0.1)', 
              color: 'var(--accent-primary)', 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              padding: '0.2rem 0.6rem', 
              borderRadius: '20px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              HR Analytics Hub
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Today: {data?.todayStr}</span>
          </div>
          <h1 className="page-title">HR Management Dashboard</h1>
          <p className="page-subtitle">Real-time overview of workforce headcount, attendance, leave approvals, employee onboarding, and monthly compensation.</p>
        </div>

        {/* Action Button Controls */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => fetchHRDashboard(true)} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 0.85rem' }} 
            disabled={refreshing}
            title="Refresh HR Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link href="/onboarding" className="btn btn-primary" style={{ padding: '0.5rem 0.85rem' }}>
            <UserPlus size={16} />
            <span>Onboard Employee</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Card 1: Total Workforce */}
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Workforce</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {metrics.totalEmployees}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {metrics.employeeLimit > 0 ? (
              <span style={{ 
                color: metrics.totalEmployees >= metrics.employeeLimit ? '#ef4444' : 'var(--accent-primary)', 
                fontWeight: 700, 
                background: metrics.totalEmployees >= metrics.employeeLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 174, 239, 0.1)', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '6px' 
              }}>
                Quota: {metrics.totalEmployees} / {metrics.employeeLimit} Max
              </span>
            ) : (
              <span>Active company employees</span>
            )}
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Attendance</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {attendance.attendancePercentage}%
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={22} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {attendance.presentToday} Present</span>
            <span>•</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>🌴 {attendance.onLeaveToday} On Leave</span>
          </div>
        </div>

        {/* Card 3: Active Onboardings */}
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Onboardings</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {onboarding.activeCount}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Rocket size={22} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{onboarding.completedCount} Completed</span>
            <span>orientation workflows</span>
          </div>
        </div>

        {/* Card 4: Pending Leaves */}
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Leave Requests</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: leaves.pendingCount > 0 ? '#ef4444' : 'var(--text-primary)', marginTop: '0.2rem' }}>
                {leaves.pendingCount}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} />
            </div>
          </div>
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
            {leaves.pendingCount > 0 ? (
              <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ Action required by HR</span>
            ) : (
              <span style={{ color: '#10b981', fontWeight: 600 }}>All leave requests reviewed</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2/3 and Right 1/3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Pending Leaves Review Table */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Pending Leave Applications</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Review and approve employee time-off requests directly from the dashboard.</p>
              </div>
              <Link href="/leaves" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>View All Leaves</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {pendingLeavesList.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>No Pending Leave Applications</div>
                <div style={{ fontSize: '0.8rem' }}>All submitted employee leave requests have been processed.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>Employee</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>Leave Type</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>Reason</th>
                      <th style={{ textAlign: 'center', padding: '0.65rem 0.85rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeavesList.map((item) => {
                      const empName = item.userId?.username || item.appliedBy || 'Employee';
                      const isLoadingThis = actionLoading === item._id;
                      return (
                        <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700 }}>
                            {empName}
                            {item.userId?.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{item.userId.email}</div>}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <span style={{ background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              {item.leaveType}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {item.startDate} to {item.endDate}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {item.reason}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleQuickLeaveAction(item._id, 'Approved')}
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                                disabled={isLoadingThis}
                              >
                                {isLoadingThis ? <Loader2 className="animate-spin" size={12} /> : <Check size={13} />}
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleQuickLeaveAction(item._id, 'Rejected')}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                disabled={isLoadingThis}
                              >
                                {isLoadingThis ? <Loader2 className="animate-spin" size={12} /> : <X size={13} />}
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Department Breakdown Bar Visualization */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Department Distribution</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workforce distribution across company categories & teams.</p>
              </div>
              <Link href="/employees" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Employee Directory</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {deptList.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No department data available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deptList.map((dept) => {
                  const count = deptCounts[dept];
                  const percentage = Math.round((count / maxDeptCount) * 100);
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <span>{dept}</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{count} {count === 1 ? 'member' : 'members'}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 100%)', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Employee Onboarding Progress */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Employee Onboarding & Orientation</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Checklist completion progress for new team hires.</p>
              </div>
              <Link href="/onboarding" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Manage Checklists</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {onboardingRecent.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <Rocket size={32} style={{ color: 'var(--accent-primary)', margin: '0 auto 0.5rem', opacity: 0.6 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>No Active Onboardings</div>
                <div style={{ fontSize: '0.8rem' }}>Click "Onboard Employee" to register new hires and initialize orientation checklists.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {onboardingRecent.map((item) => {
                  const empName = item.userId?.username || 'New Hire';
                  return (
                    <div key={item._id} style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{empName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.jobTitle} • {item.department}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '160px' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', background: item.progress === 100 ? '#10b981' : 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: item.progress === 100 ? '#10b981' : 'var(--accent-primary)' }}>{item.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Payroll & Compensation Summary */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Payroll Summary</h3>
              <Link href="/payroll" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                View Payroll
              </Link>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1.1rem', borderRadius: '12px', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Month: {payroll.currentMonth || 'Current'}</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                {payroll.currency || 'INR'} {(payroll.totalPayrollAmount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Total monthly net compensation</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Disbursed</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{payroll.paidPayrollCount}</div>
              </div>

              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>Pending</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{payroll.pendingPayrollCount}</div>
              </div>
            </div>
          </div>

          {/* Today's Clock-Ins */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Recent Clock-Ins</h3>
              <Link href="/attendance" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                Full Attendance
              </Link>
            </div>

            {recentClockIns.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                No clock-in records logged for today yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentClockIns.map((item) => (
                  <div key={item._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700 }}>{item.userId?.username || 'Employee'}</div>
                    <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{new Date(item.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Holidays */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Upcoming Holidays</h3>
              <Link href="/holidays" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                Calendar
              </Link>
            </div>

            {holidays.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                No upcoming holidays scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {holidays.map((h) => (
                  <div key={h._id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 0.85rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                      <Sun size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{h.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.date} • {h.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick HR Navigation Grid */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem' }}>HR Navigation Hub</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <Link href="/onboarding" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <Rocket size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Onboarding</span>
              </Link>
              <Link href="/employees" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <Users size={14} style={{ color: '#10b981' }} />
                <span>Employees</span>
              </Link>
              <Link href="/attendance" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <ClipboardList size={14} style={{ color: '#8b5cf6' }} />
                <span>Attendance</span>
              </Link>
              <Link href="/leaves" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <Calendar size={14} style={{ color: '#ef4444' }} />
                <span>Leaves</span>
              </Link>
              <Link href="/payroll" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <CreditCard size={14} style={{ color: '#f59e0b' }} />
                <span>Payroll</span>
              </Link>
              <Link href="/documents" style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Documents</span>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
