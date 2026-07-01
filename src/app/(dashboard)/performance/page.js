'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Award,
  Search,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Clock,
  FileText
} from 'lucide-react';

export default function PerformancePage() {
  const [employeeStats, setEmployeeStats] = useState([]);
  const [monthlyEmployeeStats, setMonthlyEmployeeStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [taskStatusTab, setTaskStatusTab] = useState('all');
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' or 'all'

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load employee metrics');
      const data = await res.json();
      setEmployeeStats(data.employeeStats || []);
      setMonthlyEmployeeStats(data.monthlyEmployeeStats || []);
      
      const defaultStats = data.monthlyEmployeeStats || data.employeeStats || [];
      if (defaultStats.length > 0) {
        setSelectedEmployee(defaultStats[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const activeStats = timeframe === 'monthly' ? monthlyEmployeeStats : employeeStats;

  // Compute overall aggregates
  const totalEmployees = activeStats.length;
  const totalAssigned = activeStats.reduce((sum, e) => sum + e.assignedTasks, 0);
  const totalCompleted = activeStats.reduce((sum, e) => sum + e.completedTasks, 0);
  const averageCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  const totalPending = activeStats.reduce((sum, e) => sum + e.pendingTasksCount, 0);

  // Find top performer
  let topPerformer = null;
  let maxCompleted = -1;
  activeStats.forEach(emp => {
    if (emp.completedTasks > maxCompleted && emp.assignedTasks > 0) {
      maxCompleted = emp.completedTasks;
      topPerformer = emp;
    }
  });

  const filteredEmployees = activeStats.filter(emp => 
    emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keep selected employee reference correct after switching timeframe tabs
  const currentSelectedEmployee = selectedEmployee ? activeStats.find(e => e._id === selectedEmployee._id) : null;

  const handleExportReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the report. Please allow popups.');
      return;
    }

    const title = timeframe === 'monthly' ? 'Monthly Performance Report' : 'All-Time Performance Report';
    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const subtitle = timeframe === 'monthly' ? `Performance analysis for the month of ${monthName} (Resets Monthly)` : 'All-Time cumulative employee task performance report';

    const tableRows = activeStats.map(emp => {
      const rate = emp.assignedTasks > 0 ? Math.round((emp.completedTasks / emp.assignedTasks) * 100) : 0;
      return `
        <tr>
          <td><strong>${emp.username.charAt(0).toUpperCase() + emp.username.slice(1)}</strong></td>
          <td>${emp.role}</td>
          <td>${emp.completedTasks} / ${emp.assignedTasks}</td>
          <td>${rate}%</td>
          <td>${emp.pendingTasksCount}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 40px; }
          .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0; font-size: 24px; color: #0f172a; }
          p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 12px 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <p style="font-size: 11px;">Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Tasks (Completed/Assigned)</th>
              <th>Completion Rate</th>
              <th>Pending Tasks</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>'}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <TrendingUp size={28} style={{ color: 'var(--accent-primary)' }} />
            <span>Employee Performance Overview</span>
          </h1>
          <p className="page-subtitle">Analyze task completion rates, workload distribution, and overall team efficiency metrics.</p>
        </div>
        
        {/* Timeframe selector & export action */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="timeframe-selector-tabs" style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`timeframe-tab-btn ${timeframe === 'monthly' ? 'active' : ''}`}
              style={{ border: 'none', background: timeframe === 'monthly' ? 'var(--accent-primary)' : 'transparent', color: timeframe === 'monthly' ? '#ffffff' : 'var(--text-secondary)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`timeframe-tab-btn ${timeframe === 'all' ? 'active' : ''}`}
              style={{ border: 'none', background: timeframe === 'all' ? 'var(--accent-primary)' : 'transparent', color: timeframe === 'all' ? '#ffffff' : 'var(--text-secondary)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              All-Time
            </button>
          </div>

          <button 
            onClick={handleExportReport}
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }}
          >
            <FileText size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Row */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Metric 1: Total Staff */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box blue-theme">
              <Users size={14} />
            </div>
            <span className="stat-card-title">Total Staff</span>
          </div>
          <span className="stat-card-value">{totalEmployees}</span>
        </div>

        {/* Metric 2: Completion Rate */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box green-theme">
              <CheckCircle2 size={14} />
            </div>
            <span className="stat-card-title">Completion Rate</span>
          </div>
          <span className="stat-card-value">{averageCompletionRate}%</span>
        </div>

        {/* Metric 3: Top Performer */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box purple-theme">
              <Award size={14} />
            </div>
            <span className="stat-card-title">Top Performer</span>
          </div>
          <span className="stat-card-value" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topPerformer ? topPerformer.username.charAt(0).toUpperCase() + topPerformer.username.slice(1) : 'None'}
          </span>
        </div>

        {/* Metric 4: Pending Tasks */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box orange-theme">
              <Clock size={14} />
            </div>
            <span className="stat-card-title">Pending Tasks</span>
          </div>
          <span className="stat-card-value">{totalPending}</span>
        </div>

      </div>

      {loading ? (
        <div className="empty-state">
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
          <h3 style={{ marginTop: '1rem' }}>Computing analytics...</h3>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <AlertTriangle size={48} />
          <h3>Error loading metrics</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Left Block: Table of Performance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Search Bar Card */}
            <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search staff members by name or role..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', width: '100%', borderRadius: '8px' }}
                />
              </div>
            </div>

            {/* Performance List Table */}
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Teammate</th>
                    <th>Role</th>
                    <th>Task Stats</th>
                    <th>Completion Rate</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const rate = emp.assignedTasks > 0 ? Math.round((emp.completedTasks / emp.assignedTasks) * 100) : 0;
                      const isSelected = selectedEmployee && selectedEmployee._id === emp._id;
                      const initials = emp.username.slice(0, 2).toUpperCase();
                      const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
                      const avatarColor = avatarColors[emp.username.charCodeAt(0) % avatarColors.length];

                      return (
                        <tr 
                          key={emp._id} 
                          onClick={() => setSelectedEmployee(emp)}
                          className="premium-table-row"
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(0, 174, 239, 0.05)' : undefined,
                            borderLeft: isSelected ? '4px solid var(--accent-primary)' : '4px solid transparent'
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {initials}
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {emp.username.charAt(0).toUpperCase() + emp.username.slice(1)}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {emp.role}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <strong>{emp.completedTasks}</strong> / {emp.assignedTasks} completed
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                              <div className="task-progress-bar-container-premium" style={{ height: '4px', flex: 1 }}>
                                <div className="task-progress-bar-fill-premium" style={{ width: `${rate}%` }}></div>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', width: '30px', textAlign: 'right' }}>
                                {rate}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <ChevronRight size={16} style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom SVG performance comparison chart */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Teammate Workload Comparison</h3>
              
              <div style={{ position: 'relative', width: '100%', minHeight: '200px' }}>
                <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ display: 'block' }}>
                  <line x1="0" y1="20" x2="500" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="180" x2="500" y2="180" stroke="var(--border-color)" strokeWidth="1" />
                  
                  {filteredEmployees.slice(0, 6).map((emp, index) => {
                    const count = Math.min(6, filteredEmployees.length);
                    const spacing = 500 / count;
                    const barWidth = 16;
                    const baselineY = 180;
                    
                    const maxTasks = Math.max(...activeStats.map(e => e.assignedTasks), 5);
                    const assignedHeight = (emp.assignedTasks / maxTasks) * 140;
                    const completedHeight = (emp.completedTasks / maxTasks) * 140;
                    
                    const barX = index * spacing + spacing / 2 - barWidth;
                    
                    return (
                      <g key={emp._id}>
                        {/* Assigned Tasks Bar */}
                        <rect 
                          x={barX} 
                          y={baselineY - assignedHeight} 
                          width={barWidth} 
                          height={assignedHeight} 
                          fill="rgba(0, 174, 239, 0.15)"
                          rx={3}
                        />
                        {/* Completed Tasks Bar */}
                        <rect 
                          x={barX} 
                          y={baselineY - completedHeight} 
                          width={barWidth} 
                          height={completedHeight} 
                          fill="var(--accent-primary)"
                          rx={3}
                        />
                        <text 
                          x={barX + barWidth / 2} 
                          y="195" 
                          textAnchor="middle" 
                          fill="var(--text-secondary)" 
                          style={{ fontSize: '9px', fontWeight: 600 }}
                        >
                          {emp.username.slice(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', justifyContent: 'center', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(0, 174, 239, 0.15)' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Tasks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-primary)' }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Completed Tasks</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Block: Details of Selected Employee */}
          <div>
            {currentSelectedEmployee ? (
              <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '12px', position: 'sticky', top: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {currentSelectedEmployee.username.charAt(0).toUpperCase() + currentSelectedEmployee.username.slice(1)}'s Assignments
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentSelectedEmployee.role}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Task counts summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Completed</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{currentSelectedEmployee.completedTasks}</span>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Pending</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{currentSelectedEmployee.pendingTasksCount}</span>
                    </div>
                  </div>

                  {/* Filter Tabs inside Detail Panel */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                    {[
                      { id: 'all', label: `All (${currentSelectedEmployee.allTasks?.length || 0})` },
                      { id: 'pending', label: `Pending (${currentSelectedEmployee.pendingTasksCount})` },
                      { id: 'completed', label: `Completed (${currentSelectedEmployee.completedTasks})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setTaskStatusTab(tab.id)}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: taskStatusTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                          color: taskStatusTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          padding: '0.35rem 0',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const list = (currentSelectedEmployee.allTasks || []).filter(t => {
                        if (taskStatusTab === 'pending') return !t.completed;
                        if (taskStatusTab === 'completed') return t.completed;
                        return true;
                      });

                      if (list.length === 0) {
                        return (
                          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                            No tasks found matching filter.
                          </div>
                        );
                      }

                      return list.map((t, idx) => (
                        <div key={idx} style={{ padding: '0.65rem 0.85rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.7 : 1, paddingRight: '70px' }}>
                            {t.taskName}
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Link href={`/projects/${t.projectId}`} style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontWeight: 600 }}>
                              <Briefcase size={10} />
                              <span>{t.projectName}</span>
                            </Link>
                            <span>Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                          </div>
                          <span className={`badge ${t.completed ? 'completed' : 'progress'}`} style={{ position: 'absolute', right: '8px', top: '8px', fontSize: '0.62rem', padding: '0.15rem 0.35rem' }}>
                            {t.completed ? 'Completed' : t.status || 'Todo'}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                </div>
              </div>
            ) : (
              <div className="card empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <Users size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <h3>Select Teammate</h3>
                <p>Click on any teammate in the list to view their active load detail.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
