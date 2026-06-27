'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  IndianRupee, 
  FileText, 
  Clock, 
  Plus, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Bot,
  Sparkles,
  Brain,
  Eye,
  EyeOff,
  ChevronDown,
  Calendar,
  Zap,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  CalendarDays,
  ClipboardList,
  X,
  Users
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import NotificationBell from '@/components/NotificationBell';

export default function Dashboard() {
  const { showToast } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState('Workspace');
  const [companyLogo, setCompanyLogo] = useState('');
  const [username, setUsername] = useState('User');
  const [userRole, setUserRole] = useState('');
  const [userCategory, setUserCategory] = useState('');
  const [userPermissions, setUserPermissions] = useState(null);
  const [userReady, setUserReady] = useState(false);
  
  // Employee dashboard states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: '',
    projectId: '',
    dueDate: '',
    priority: 'Medium',
    assignedTo: '',
    notes: ''
  });
  const [allProjects, setAllProjects] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [revealedCreds, setRevealedCreds] = useState({});
  const [draggedOverCol, setDraggedOverCol] = useState(null);

  // Fetch all projects when modal is opened
  useEffect(() => {
    if (isAddTaskOpen) {
      const fetchProjects = async () => {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            setAllProjects(data);
          }
        } catch (e) {
          console.error('Failed to load projects', e);
        }
      };
      fetchProjects();
    }
  }, [isAddTaskOpen]);

  const [showPrices, setShowPrices] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('show_prices');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [activeBar, setActiveBar] = useState(null);
  const [chartTimeframe, setChartTimeframe] = useState('Monthly');
  const [dashboardTimeframe, setDashboardTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  const toggleShowPrices = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowPrices(prev => {
      const newVal = !prev;
      localStorage.setItem('show_prices', String(newVal));
      return newVal;
    });
  };

  const handleDropTask = async (taskId, targetStatus) => {
    try {
      const task = stats.tasks.find(t => t._id === taskId);
      if (!task) return;
      
      const projectId = task.projectId;
      
      // Fetch current project tasks
      const projRes = await fetch(`/api/projects/${projectId}`);
      if (!projRes.ok) throw new Error('Failed to load project details for task update');
      const { project } = await projRes.json();
      
      if (!project) throw new Error('Project not found');
      
      const updatedTasks = project.tasks.map(t => {
        if (t._id === taskId) {
          return {
            ...t,
            status: targetStatus,
            completed: targetStatus === 'Completed'
          };
        }
        return t;
      });
      
      const updateRes = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      
      if (!updateRes.ok) throw new Error('Failed to update task status in database');
      
      // Reload stats to refresh dashboard
      const reloadRes = await fetch('/api/dashboard');
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setStats(reloadData);
      }
      showToast(`Task status updated to ${targetStatus}`, 'success');
    } catch (e) {
      console.error(e);
      showToast(e.message, 'error');
    }
  };

  const handleToggleEmployeeTask = async (taskId, completed) => {
    const nextStatus = !completed ? 'Completed' : 'Todo';
    await handleDropTask(taskId, nextStatus);
  };

  const handleEmployeeAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim() || !taskForm.projectId) {
      showToast('Task name and Project are required', 'error');
      return;
    }
    
    try {
      setIsSubmittingTask(true);
      
      const projRes = await fetch(`/api/projects/${taskForm.projectId}`);
      if (!projRes.ok) throw new Error('Failed to load project details for adding task');
      const { project } = await projRes.json();
      
      if (!project) throw new Error('Project not found');
      
      const newTask = {
        name: taskForm.name.trim(),
        completed: false,
        status: 'Todo',
        assignedTo: taskForm.assignedTo || username,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        priority: taskForm.priority,
        notes: taskForm.notes,
        assignedBy: username
      };
      
      const updatedTasks = [...(project.tasks || []), newTask];
      
      const updateRes = await fetch(`/api/projects/${taskForm.projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      
      if (!updateRes.ok) throw new Error('Failed to add task to project');
      
      setIsAddTaskOpen(false);
      setTaskForm({
        name: '',
        projectId: '',
        dueDate: '',
        priority: 'Medium',
        assignedTo: '',
        notes: ''
      });
      
      const reloadRes = await fetch('/api/dashboard');
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setStats(reloadData);
      }
      showToast('Task created and assigned successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  useEffect(() => {
    async function fetchMe() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.company?.name) {
            setCompanyName(meData.company.name);
          }
          if (meData.company?.logo) {
            setCompanyLogo(meData.company.logo);
          }
          if (meData.role) {
            setUserRole(meData.role);
          }
          if (meData.username) {
            setUsername(meData.username);
          }
          if (meData.category) {
            setUserCategory(meData.category);
          }
          if (meData.permissions) {
            setUserPermissions(meData.permissions);
          }
          if (meData.companyUsers) {
            setCompanyUsers(meData.companyUsers);
          }
        }
      } catch (err) {
        console.error('Failed to load auth data:', err);
      } finally {
        setUserReady(true);
      }
    }
    fetchMe();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        let url = `/api/dashboard?timeframe=${dashboardTimeframe}`;
        if (dashboardTimeframe === 'custom') {
          if (customStartDate) url += `&startDate=${customStartDate}`;
          if (customEndDate) url += `&endDate=${customEndDate}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load dashboard data');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [dashboardTimeframe, customStartDate, customEndDate]);

  const activeAlerts = stats?.pendingTasks ? stats.pendingTasks.slice(0, 5) : [];

  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAlertIndex(prev => (prev + 1) % activeAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAlerts.length]);

  if (loading || !userReady) {
    const isEmployee = userCategory === 'Employee';

    if (isEmployee) {
      return (
        <div className="animate-fade-in dashboard-page-wrapper">
          <div className="dashboard-header-container">
            <div>
              <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '400px', maxWidth: '100%' }}></div>
            </div>
            <div>
              <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '8px' }}></div>
            </div>
          </div>

          <div className="kanban-section" style={{ marginTop: '1.25rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '150px' }}></div>
            <div className="kanban-board">
              {[1, 2, 3].map(i => (
                <div key={i} className="kanban-column" style={{ background: 'transparent', border: 'none' }}>
                  <div className="skeleton" style={{ height: '30px', marginBottom: '1rem', borderRadius: '8px' }}></div>
                  <div className="skeleton skeleton-card" style={{ height: '120px', marginBottom: '1rem' }}></div>
                  <div className="skeleton skeleton-card" style={{ height: '120px', marginBottom: '1rem' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade-in dashboard-page-wrapper">
        <div className="dashboard-header-container">
          <div>
            <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '400px', maxWidth: '100%' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '8px' }}></div>
            <div className="skeleton" style={{ width: '130px', height: '42px', borderRadius: '8px' }}></div>
          </div>
        </div>

        <div className="dashboard-stats-grid">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="dashboard-stat-card-premium">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '60%', margin: 0 }}></div>
              </div>
              <div className="skeleton" style={{ width: '40%', height: '28px', borderRadius: '6px', marginTop: '0.5rem' }}></div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-left-col">
            <div className="dashboard-card-premium" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
              <div className="skeleton skeleton-title" style={{ width: '200px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: '2rem' }}></div>
              <div className="skeleton" style={{ width: '100%', flex: 1, borderRadius: '8px' }}></div>
            </div>
          </div>
          <div className="dashboard-right-col">
            <div className="dashboard-card-premium" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
              <div className="skeleton skeleton-title" style={{ width: '180px', marginBottom: '2rem' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[1, 2, 3].map(i => (
                  <div key={i}>
                    <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '40%' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ color: '#ef4444' }}>
        <AlertCircle size={48} />
        <h3>Error loading dashboard</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const displayPrice = (value) => {
    return showPrices ? formatCurrency(value) : '₹ ••••••';
  };

  const formatYLabel = (val) => {
    if (!showPrices) return '₹ •••';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  // Process data for bar chart
  let chartData = [];
  if (stats?.billingPerformance) {
    if (chartTimeframe === 'Weekly') {
      chartData = stats.billingPerformance.weekly || [];
    } else if (chartTimeframe === 'Quarterly') {
      chartData = stats.billingPerformance.quarterly || [];
    } else {
      chartData = stats.billingPerformance.monthly || [];
    }
  } else {
    const baseEarnings = stats?.invoices?.totalEarnings || 75000;
    if (chartTimeframe === 'Weekly') {
      chartData = [
        { label: 'Week 1', value: Math.round(baseEarnings * 0.15) || 11000 },
        { label: 'Week 2', value: Math.round(baseEarnings * 0.25) || 18000 },
        { label: 'Week 3', value: Math.round(baseEarnings * 0.35) || 26000 },
        { label: 'Week 4', value: Math.round(baseEarnings * 0.25) || 20000 }
      ];
    } else if (chartTimeframe === 'Quarterly') {
      chartData = [
        { label: 'Q1', value: Math.round(baseEarnings * 0.8) || 60000 },
        { label: 'Q2', value: Math.round(baseEarnings * 1.2) || 90000 },
        { label: 'Q3', value: Math.round(baseEarnings * 0.95) || 71000 },
        { label: 'Q4', value: baseEarnings || 75000 }
      ];
    } else {
      chartData = [
        { label: 'Jan', value: Math.round(baseEarnings * 0.40) || 30000 },
        { label: 'Feb', value: Math.round(baseEarnings * 0.55) || 41000 },
        { label: 'Mar', value: Math.round(baseEarnings * 0.50) || 38000 },
        { label: 'Apr', value: Math.round(baseEarnings * 0.75) || 56000 },
        { label: 'May', value: Math.round(baseEarnings * 0.70) || 52000 },
        { label: 'Jun', value: Math.round(baseEarnings * 0.95) || 71000 },
        { label: 'Jul', value: Math.round(baseEarnings * 0.85) || 64000 },
        { label: 'Aug', value: Math.round(baseEarnings * 0.90) || 68000 },
        { label: 'Sep', value: Math.round(baseEarnings * 1.05) || 78000 },
        { label: 'Oct', value: Math.round(baseEarnings * 1.00) || 75000 },
        { label: 'Nov', value: Math.round(baseEarnings * 1.15) || 86000 },
        { label: 'Dec', value: Math.round(baseEarnings * 1.25) || 93000 }
      ];
    }
  }
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 10000);
  const activeBarIndex = activeBar !== null ? activeBar : (chartData.length - 1);
  const activeValue = chartData[activeBarIndex]?.value ?? (stats?.invoices?.totalEarnings || 0);
  const activeLabel = chartData[activeBarIndex]?.label ?? 'Current';

  // Ongoing tasks calculator
  const ongoingProjects = (stats?.recentProjects || [])
    .filter(p => ['Planning', 'In Progress', 'Under Review', 'Pending'].includes(p.status))
    .slice(0, 3)
    .map(proj => {
      const totalTasks = proj.tasks?.length || 0;
      let progress = 0;
      if (totalTasks > 0) {
        const completed = proj.tasks.filter(t => t.completed).length;
        progress = Math.round((completed / totalTasks) * 100);
      } else {
        switch (proj.status) {
          case 'Completed': progress = 100; break;
          case 'Under Review': progress = 80; break;
          case 'In Progress': progress = 50; break;
          case 'Planning': progress = 15; break;
        }
      }
      return { ...proj, progress };
    });

  const totalProjects = stats?.projects?.total ?? 0;
  const activeProjects = stats?.projects?.active ?? 0;
  const completedProjects = stats?.projects?.completed ?? 0;
  const otherProjects = Math.max(0, totalProjects - activeProjects - completedProjects);

  const T_proj = Math.max(1, totalProjects);
  const pctActive = activeProjects / T_proj;
  const pctCompleted = completedProjects / T_proj;
  const pctOther = otherProjects / T_proj;

  const circ = 2 * Math.PI * 70;
  const lenActive = pctActive * circ;
  const lenCompleted = pctCompleted * circ;
  const lenOther = pctOther * circ;

  const offActive = 0;
  const offCompleted = -lenActive;
  const offOther = -(lenActive + lenCompleted);

  const totalClients = stats?.clients?.total ?? 0;
  const activeClients = stats?.clients?.active ?? 0;
  const inactiveClients = stats?.clients?.inactive ?? 0;

  const T_cli = Math.max(1, totalClients);
  const pctActiveCli = activeClients / T_cli;
  const pctInactiveCli = inactiveClients / T_cli;

  const lenActiveCli = pctActiveCli * circ;
  const lenInactiveCli = pctInactiveCli * circ;

  const offActiveCli = 0;
  const offInactiveCli = -lenActiveCli;

  const handleExportReport = (boxName) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented opening the report. Please allow popups.', 'error');
      return;
    }

    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary') || '#00aeef';

    let tableHeaders = '';
    let tableRows = '';

    if (boxName === 'Billing Performance') {
      tableHeaders = '<th>Time Period</th><th>Revenue / Billings</th>';
      const chartRows = chartData.map(d => `<tr><td>${d.label}</td><td>${formatCurrency(d.value)}</td></tr>`).join('');
      tableRows = `
        ${chartRows}
        <tr class="total-row"><td>Total Value</td><td>${formatCurrency(stats?.projects?.totalBudget ?? 0)}</td></tr>
        <tr class="total-row"><td>Total Earnings</td><td>${formatCurrency(stats?.invoices?.totalEarnings ?? 0)}</td></tr>
        <tr class="total-row"><td>Outstanding Amount</td><td>${formatCurrency(stats?.invoices?.totalPendingAmount ?? 0)}</td></tr>
      `;
    } else if (boxName === 'Projects Overview') {
      tableHeaders = '<th>Project Name</th><th>Site URL</th><th>Client</th><th>Type</th><th>Budget</th><th>Status</th>';
      tableRows = (stats?.recentProjects || []).map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.siteUrl || '—'}</td>
          <td>${p.clientName || '—'}</td>
          <td>${p.projectType || '—'}</td>
          <td>${formatCurrency(p.budget)}</td>
          <td><span class="badge ${p.status.toLowerCase().replace(' ', '')}">${p.status}</span></td>
        </tr>
      `).join('');
      if ((stats?.recentProjects || []).length === 0) {
        tableRows = '<tr><td colspan="6" style="text-align:center;">No projects found.</td></tr>';
      }
    } else if (boxName === 'Clients Overview') {
      tableHeaders = '<th>Client Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Status</th>';
      tableRows = (stats?.recentClients || []).map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.company || '—'}</td>
          <td>${c.email}</td>
          <td>${c.phone || '—'}</td>
          <td><span class="badge ${c.status === 'Inactive' ? 'inactive' : 'active'}">${c.status || 'Active'}</span></td>
        </tr>
      `).join('');
      if ((stats?.recentClients || []).length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center;">No clients found.</td></tr>';
      }
    } else if (boxName === 'Ongoing Projects') {
      tableHeaders = '<th>Project Name</th><th>Client</th><th>Timeline</th><th>Progress</th><th>Status</th>';
      tableRows = ongoingProjects.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.clientName || '—'}</td>
          <td>${p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} to ${p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}</td>
          <td>${p.progress}% completed</td>
          <td><span class="badge ${p.status.toLowerCase().replace(' ', '')}">${p.status}</span></td>
        </tr>
      `).join('');
      if (ongoingProjects.length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center;">No ongoing projects found.</td></tr>';
      }
    } else if (boxName === 'Ongoing Tasks') {
      tableHeaders = '<th>Task Name</th><th>Project</th><th>Priority</th><th>Due Date</th><th>Status</th>';
      const tasks = [];
      (stats?.recentProjects || []).forEach(p => {
        (p.tasks || []).forEach(t => {
          if (!t.completed) {
            tasks.push({ ...t, projectName: p.name });
          }
        });
      });
      tableRows = tasks.map(t => `
        <tr>
          <td><strong>${t.name}</strong></td>
          <td>${t.projectName}</td>
          <td>${t.priority || 'Medium'}</td>
          <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
          <td><span class="badge pending">Todo</span></td>
        </tr>
      `).join('');
      if (tasks.length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center;">No ongoing tasks found.</td></tr>';
      }
    } else if (boxName === 'Employees') {
      tableHeaders = '<th>Username</th><th>Role</th><th>Category</th><th>Assigned Tasks</th><th>Completed Tasks</th>';
      tableRows = (stats?.employeeStats || []).map(emp => `
        <tr>
          <td><strong>${emp.username}</strong></td>
          <td>${emp.role}</td>
          <td>${emp.category || 'Employee'}</td>
          <td>${emp.assignedTasks}</td>
          <td>${emp.completedTasks}</td>
        </tr>
      `).join('');
      if ((stats?.employeeStats || []).length === 0) {
        tableRows = '<tr><td colspan="5" style="text-align:center;">No employee records found.</td></tr>';
      }
    }

    const htmlContent = `
      <html>
      <head>
        <title>${boxName} Report - ${companyName}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 40px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 800;
            color: ${brandColor};
          }
          .report-title {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .timestamp {
            font-size: 12px;
            color: #64748b;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          tr:hover {
            background: #f8fafc;
          }
          .total-row {
            background: #f8fafc;
            font-weight: 700;
          }
          .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 9999px;
            text-transform: uppercase;
          }
          .badge.active, .badge.completed, .badge.paid {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
          }
          .badge.planning, .badge.draft {
            background: rgba(100, 116, 139, 0.1);
            color: #64748b;
          }
          .badge.progress, .badge.inprogress {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }
          .badge.review, .badge.underreview {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
          }
          .badge.inactive, .badge.overdue {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${companyLogo
              ? `<img src="${companyLogo}" alt="Company Logo" style="height: 48px; max-width: 180px; object-fit: contain;" />`
              : `<div class="logo-text">${companyName}</div>`
            }
          </div>
          <div>
            <h1 class="report-title">${boxName} Detail Report</h1>
            <div class="timestamp">Generated on ${new Date().toLocaleString('en-IN')}</div>
            <div class="timestamp">Timeframe filter: ${dashboardTimeframe === 'daily' ? 'Day-wise' : dashboardTimeframe.charAt(0).toUpperCase() + dashboardTimeframe.slice(1)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          This report is auto-generated by the IONETWEB Workspace management console. Confidentially for internal use only.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const p = userPermissions || {};

  return (
    <div className="animate-fade-in dashboard-page-wrapper">
      {userCategory === 'Employee' ? (
        <>
        {/* Top Header Section */}
        <div className="dashboard-header-container">
          <div>
            <h1 className="dashboard-title-text">Employee Workspace</h1>
            <p className="dashboard-subtitle-text">Welcome back, {username.charAt(0).toUpperCase() + username.slice(1)}. Manage your assignments and scheduled calendar posts.</p>
          </div>
          {p.project_tasks !== 'none' && (
            <div>
              <button className="btn btn-primary" onClick={() => setIsAddTaskOpen(true)}>
                <Plus size={16} />
                <span>Create Task</span>
              </button>
            </div>
          )}
        </div>

        {/* Expiry alerts banners carousel / Overdue Pending Tasks notification area */}
        {p.pending_tasks !== 'none' && stats.overdueTasks?.length > 0 && (
          <div className="employee-overdue-banner animate-fade-in">
            <div className="overdue-banner-content">
              <AlertTriangle size={18} style={{ color: 'var(--status-overdue)' }} />
              <span>
                <strong>Urgent Action Required:</strong> You have {stats.overdueTasks.length} overdue task{stats.overdueTasks.length > 1 ? 's' : ''}.
              </span>
            </div>
            <div className="overdue-banner-list">
              {stats.overdueTasks.map((t, idx) => (
                <div key={idx} className="overdue-badge-pill">
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <span style={{ opacity: 0.8, marginLeft: '4px' }}>in {t.projectName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draggable Kanban Task board */}
        {p.project_tasks !== 'none' && (
          <div className="kanban-section">
          <div className="section-header-row" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ClipboardList size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>My Task Board</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Drag and drop cards to update status</p>
          </div>

          <div className="kanban-board">
            {[
              { title: 'To Do', status: 'Todo', color: 'var(--text-secondary)' },
              { title: 'In Progress', status: 'In Progress', color: 'var(--accent-primary)' },
              { title: 'Completed', status: 'Completed', color: 'var(--status-completed)' }
            ].map(col => {
              const colTasks = (stats.tasks || [])
                .filter(t => t.status === col.status)
                .sort((a, b) => {
                  if (!a.dueDate && !b.dueDate) return 0;
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return new Date(a.dueDate) - new Date(b.dueDate);
                });
              return (
                <div 
                  key={col.status}
                  className={`kanban-column ${draggedOverCol === col.status ? 'drag-over' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDraggedOverCol(col.status)}
                  onDragLeave={() => setDraggedOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('text/plain');
                    handleDropTask(taskId, col.status);
                    setDraggedOverCol(null);
                  }}
                >
                  <div className="kanban-column-header">
                    <span className="kanban-column-title" style={{ color: col.color }}>
                      <span className="column-indicator-dot" style={{ backgroundColor: col.color }}></span>
                      {col.title}
                    </span>
                    <span className="kanban-column-count">{colTasks.length}</span>
                  </div>
                  
                  <div className="kanban-cards-container">
                    {colTasks.length === 0 ? (
                      <div className="kanban-empty-placeholder">
                        No tasks here
                      </div>
                    ) : (
                      colTasks.map(task => {
                        const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
                        return (
                          <div
                            key={task._id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', task._id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            className={`kanban-card ${isOverdue ? 'overdue' : ''}`}
                          >
                            <div className="kanban-card-project">{task.projectName}</div>
                            <div className="kanban-card-title">{task.name}</div>
                            
                            <div className="kanban-card-meta">
                              {task.dueDate ? (
                                <div className={`kanban-card-date ${isOverdue ? 'overdue' : ''}`}>
                                  <CalendarDays size={12} />
                                  <span>{new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                </div>
                              ) : (
                                <div className="kanban-card-date">
                                  <CalendarDays size={12} style={{ opacity: 0.5 }} />
                                  <span style={{ opacity: 0.5 }}>No due date</span>
                                </div>
                              )}
                              
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleEmployeeTask(task._id, task.completed)}
                                className="kanban-card-checkbox"
                                onClick={(e) => e.stopPropagation()}
                                title="Toggle completion"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Fallback when all main sections are empty */}
        {p.project_tasks === 'none' && p.project_calendar === 'none' && (
          <div className="card empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Zap size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No Active Dashboard Tools</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Your user role currently does not grant access to any workspace tools on this dashboard.</p>
          </div>
        )}

        {/* Bottom Section: Calendar */}
        {p.project_calendar !== 'none' && (
          <div className="employee-bottom-grid" style={{
            gridTemplateColumns: '1fr'
          }}>
            {/* Left: Content Calendar (60% width) */}
            {p.project_calendar !== 'none' && (
              <div className="card employee-calendar-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Assigned Content Calendar</span>
              </h3>
              <span className="badge badge-inprogress" style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem' }}>
                {stats.calendarPosts?.length || 0} Posts Assigned
              </span>
            </div>

            <div className="calendar-posts-list">
              {!stats.calendarPosts || stats.calendarPosts.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No calendar posts assigned to you.
                </div>
              ) : (
                stats.calendarPosts.map((post, idx) => {
                  const postDate = new Date(post.scheduledDate);
                  const monthStr = postDate.toLocaleString('default', { month: 'short' });
                  const dayStr = postDate.getDate();
                  
                  return (
                    <div key={idx} className="calendar-post-row-premium">
                      <div className="calendar-date-badge">
                        <span className="month">{monthStr}</span>
                        <span className="day">{dayStr}</span>
                      </div>
                      
                      <div className="calendar-post-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="calendar-post-project">{post.projectName}</span>
                          <span className={`badge-post-type ${post.postType?.toLowerCase() || 'static'}`}>
                            {post.postType}
                          </span>
                        </div>
                        <div className="calendar-post-topic">{post.topic || 'Untitled Post'}</div>
                        {post.content && <p className="calendar-post-content">{post.content}</p>}
                        
                        {post.platforms && post.platforms.length > 0 && (
                          <div className="calendar-post-platforms">
                            {post.platforms.map((p, pIdx) => (
                              <span key={pIdx} className="platform-tag">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="calendar-post-status-col">
                        <span className={`badge badge-${post.status?.toLowerCase().replace(/\s+/g, '') || 'pending'}`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )}
        </div>
      )}
      </>
    ) : (
      <>
            {/* Top Header Section */}
      <div className="dashboard-header-container">
        <div>
          <h1 className="dashboard-title-text">Dashboard</h1>
          <p className="dashboard-subtitle-text">Welcome back, {username.charAt(0).toUpperCase() + username.slice(1)}. Here is your company's performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Global Timeframe Selector */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="timeframe-selector-tabs">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'custom', label: 'Custom' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDashboardTimeframe(t.id)}
                  className={`timeframe-tab-btn ${dashboardTimeframe === t.id ? 'active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {dashboardTimeframe === 'custom' && (
              <div 
                className="custom-date-picker-container animate-fade-in" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'var(--bg-secondary)', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>From</span>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={(e) => setCustomStartDate(e.target.value)} 
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      padding: '0'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>To</span>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={(e) => setCustomEndDate(e.target.value)} 
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      padding: '0'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {userCategory !== 'Management' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href="/projects" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }}>
                <Plus size={16} />
                <span>New Project</span>
              </Link>
              <Link href="/invoices" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }}>
                <FileText size={16} />
                <span>New Invoice</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Expiry alerts banners carousel */}
      {activeAlerts.length > 0 && activeAlerts[currentAlertIndex] && (
        <div className="dashboard-alerts-carousel-container">
          <div 
            key={`${activeAlerts[currentAlertIndex].type}-${activeAlerts[currentAlertIndex].id}-${currentAlertIndex}`} 
            className="dashboard-alert-banner animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
              <AlertTriangle size={16} className="alert-banner-icon" style={{ flexShrink: 0 }} />
              <span className="alert-banner-title" style={{ flexShrink: 0 }}>{activeAlerts[currentAlertIndex].title}:</span>
              <span className="alert-banner-desc" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activeAlerts[currentAlertIndex].description}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
              <Link href={activeAlerts[currentAlertIndex].link} className="alert-banner-action">
                Resolve &rarr;
              </Link>
            </div>
          </div>

          {activeAlerts.length > 1 && (
            <div className="carousel-dots">
              {activeAlerts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentAlertIndex(idx)}
                  className={`carousel-dot ${idx === currentAlertIndex ? 'active' : ''}`}
                  title={`Go to alert ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="dashboard-stats-grid">
        {/* Card 1: Active Projects */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box blue-theme">
              <Briefcase size={14} />
            </div>
            <span className="stat-card-title">Active Projects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{stats?.projects?.active ?? 0}</span>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box purple-theme">
              <Users size={14} />
            </div>
            <span className="stat-card-title">Active Clients</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{stats?.clients?.active ?? 0}</span>
          </div>
        </div>

        {/* Card 3: Total Project Value */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box teal-theme">
              <TrendingUp size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Total Value
              <button onClick={(e) => toggleShowPrices(e)} className="stat-card-eye-btn" title={showPrices ? "Hide budget" : "Show budget"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.projects?.totalBudget ?? 0)}</span>
          </div>
        </div>

        {/* Card 4: Total Earnings */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box green-theme">
              <IndianRupee size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Earnings
              <button onClick={(e) => toggleShowPrices(e)} className="stat-card-eye-btn" title={showPrices ? "Hide earnings" : "Show earnings"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.invoices?.totalEarnings ?? 0)}</span>
          </div>
        </div>

        {/* Card 5: Outstanding Amount */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box orange-theme">
              <Clock size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Outstanding
              <button onClick={(e) => toggleShowPrices(e)} className="stat-card-eye-btn" title={showPrices ? "Hide outstanding" : "Show outstanding"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.invoices?.totalPendingAmount ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Premium Dashboard Reorganized Grid - Row 1 Charts */}
      <div className="dashboard-charts-grid">
        
        {/* Box 1: Billing Performance Chart & Summaries */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Billing Performance</span>
            </span>
            <button className="btn-report" onClick={() => handleExportReport('Billing Performance')}>
              <FileText size={12} />
              <span>Report</span>
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.1rem 0' }}>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {displayPrice(activeValue)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                Revenue: {activeLabel}
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', alignItems: 'flex-start', marginTop: '0.5rem', minHeight: '180px' }}>
            {/* Y-Axis Labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '145px', paddingRight: '8px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right', width: '42px', paddingTop: '10px', flexShrink: 0 }}>
              <span>{formatYLabel(maxChartValue)}</span>
              <span>{formatYLabel(maxChartValue * 0.6)}</span>
              <span>{formatYLabel(maxChartValue * 0.3)}</span>
              <span>0</span>
            </div>

            {/* Chart Area wrapper */}
            <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
              <div style={{ flex: 1, position: 'relative', minHeight: '145px' }}>
                <svg width="100%" height="100%" viewBox="0 0 500 165" preserveAspectRatio="none" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" />
                      <stop offset="100%" stopColor="var(--accent-primary-glow)" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="20" x2="500" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
                  <line x1="0" y1="165" x2="500" y2="165" stroke="var(--border-color)" strokeWidth="1" />
                  {chartData.map((d, index) => {
                    const count = chartData.length;
                    const spacing = 500 / count;
                    const barWidth = Math.max(10, Math.min(22, spacing * 0.45));
                    const baselineY = 165;
                    const barHeight = (d.value / maxChartValue) * 145;
                    const barX = index * spacing + spacing / 2 - barWidth / 2;
                    const barY = baselineY - barHeight;
                    const isHovered = activeBar === index;
                    const isHighlighted = isHovered || (activeBar === null && index === chartData.length - 1);
                    return (
                      <g key={index} onMouseEnter={() => setActiveBar(index)} onMouseLeave={() => setActiveBar(null)}>
                        {isHovered && (
                          <rect x={barX - 8} y={10} width={barWidth + 16} height={155} fill="var(--border-color)" opacity={0.15} rx={8} />
                        )}
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          fill="url(#barGradient)"
                          rx={5}
                          style={{ transition: 'all 0.3s ease', cursor: 'pointer', opacity: isHighlighted ? 1 : 0.2 }}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* X-Axis Labels (HTML flex row) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', height: '35px', alignItems: 'center', padding: '0 5px' }}>
                {chartData.map((d, index) => {
                  const isHovered = activeBar === index;
                  const isHighlighted = isHovered || (activeBar === null && index === chartData.length - 1);
                  return (
                    <div 
                      key={index} 
                      style={{ 
                        flex: 1, 
                        textAlign: 'center', 
                        fontSize: '0.72rem', 
                        fontWeight: isHighlighted ? 700 : 500, 
                        color: isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={() => setActiveBar(index)}
                      onMouseLeave={() => setActiveBar(null)}
                    >
                      {d.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Eye Toggled Billing Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Value</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {displayPrice(stats?.projects?.totalBudget ?? 0)}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Earnings</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {displayPrice(stats?.invoices?.totalEarnings ?? 0)}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {displayPrice(stats?.invoices?.totalPendingAmount ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Projects Overview */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Projects Overview</span>
            </span>
            <button className="btn-report" onClick={() => handleExportReport('Projects Overview')}>
              <FileText size={12} />
              <span>Report</span>
            </button>
          </div>

          {/* Projects Overview SVG Donut Chart Centered Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', width: '100%', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <svg width="210" height="210" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="70" fill="transparent" stroke="var(--border-color)" strokeWidth="16" opacity="0.4" />
                {lenOther > 0 && (
                  <circle cx="100" cy="100" r="70" fill="transparent" 
                          stroke="#64748b" strokeWidth="16" 
                          strokeDasharray={`${lenOther} ${circ - lenOther}`} 
                          strokeDashoffset={offOther} 
                          transform="rotate(-90 100 100)" 
                          strokeLinecap="round" />
                )}
                {lenCompleted > 0 && (
                  <circle cx="100" cy="100" r="70" fill="transparent" 
                          stroke="#10b981" strokeWidth="16" 
                          strokeDasharray={`${lenCompleted} ${circ - lenCompleted}`} 
                          strokeDashoffset={offCompleted} 
                          transform="rotate(-90 100 100)" 
                          strokeLinecap="round" />
                )}
                {lenActive > 0 && (
                  <circle cx="100" cy="100" r="70" fill="transparent" 
                          stroke="var(--accent-primary)" strokeWidth="16" 
                          strokeDasharray={`${lenActive} ${circ - lenActive}`} 
                          strokeDashoffset={offActive} 
                          transform="rotate(-90 100 100)" 
                          strokeLinecap="round" />
                )}
                <text x="100" y="95" textAnchor="middle" className="donut-center-value">
                  {totalProjects}
                </text>
                <text x="100" y="120" textAnchor="middle" className="donut-center-label">
                  Projects
                </text>
              </svg>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
              <div className="legend-pill" style={{ padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 5px var(--accent-primary)', flexShrink: 0 }}></span>
                    <span className="legend-label" style={{ fontSize: '0.75rem' }}>Active</span>
                  </div>
                  <span className="legend-value" style={{ fontSize: '1.1rem', paddingLeft: '12px' }}>{activeProjects}</span>
                </div>
              </div>
              <div className="legend-pill" style={{ padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 5px #10b981', flexShrink: 0 }}></span>
                    <span className="legend-label" style={{ fontSize: '0.75rem' }}>Completed</span>
                  </div>
                  <span className="legend-value" style={{ fontSize: '1.1rem', paddingLeft: '12px' }}>{completedProjects}</span>
                </div>
              </div>
              <div className="legend-pill" style={{ padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#64748b', flexShrink: 0 }}></span>
                    <span className="legend-label" style={{ fontSize: '0.75rem' }}>Planning</span>
                  </div>
                  <span className="legend-value" style={{ fontSize: '1.1rem', paddingLeft: '12px' }}>{otherProjects}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.1rem', display: 'flex', justifyContent: 'center' }}>
            <Link href="/projects" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, textDecoration: 'none' }} className="view-all-link">
              <span>View all Projects</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Box 3: Clients Overview */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <Users size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Clients Overview</span>
            </span>
            <button className="btn-report" onClick={() => handleExportReport('Clients Overview')}>
              <FileText size={12} />
              <span>Report</span>
            </button>
          </div>

          {/* Clients Overview SVG Donut Chart Centered Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', width: '100%', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <svg width="210" height="210" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="70" fill="transparent" stroke="var(--border-color)" strokeWidth="16" opacity="0.4" />
                {lenInactiveCli > 0 && (
                  <circle cx="100" cy="100" r="70" fill="transparent" 
                          stroke="#64748b" strokeWidth="16" 
                          strokeDasharray={`${lenInactiveCli} ${circ - lenInactiveCli}`} 
                          strokeDashoffset={offInactiveCli} 
                          transform="rotate(-90 100 100)" 
                          strokeLinecap="round" />
                )}
                {lenActiveCli > 0 && (
                  <circle cx="100" cy="100" r="70" fill="transparent" 
                          stroke="#10b981" strokeWidth="16" 
                          strokeDasharray={`${lenActiveCli} ${circ - lenActiveCli}`} 
                          strokeDashoffset={offActiveCli} 
                          transform="rotate(-90 100 100)" 
                          strokeLinecap="round" />
                )}
                <text x="100" y="95" textAnchor="middle" className="donut-center-value">
                  {totalClients}
                </text>
                <text x="100" y="120" textAnchor="middle" className="donut-center-label">
                  Clients
                </text>
              </svg>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
              <div className="legend-pill" style={{ padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 5px #10b981', flexShrink: 0 }}></span>
                    <span className="legend-label" style={{ fontSize: '0.75rem' }}>Active</span>
                  </div>
                  <span className="legend-value" style={{ fontSize: '1.1rem', paddingLeft: '12px' }}>{activeClients}</span>
                </div>
              </div>
              <div className="legend-pill" style={{ padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#64748b', flexShrink: 0 }}></span>
                    <span className="legend-label" style={{ fontSize: '0.75rem' }}>Inactive</span>
                  </div>
                  <span className="legend-value" style={{ fontSize: '1.1rem', paddingLeft: '12px' }}>{inactiveClients}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.1rem', display: 'flex', justifyContent: 'center' }}>
            <Link href="/clients" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, textDecoration: 'none' }} className="view-all-link">
              <span>View all Clients</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2 Scrollers */}
      <div className="dashboard-scrollers-grid">
        {/* Box 4: Ongoing Projects Progress Tracking */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Ongoing Projects</span>
            </span>
            <button className="btn-report" onClick={() => handleExportReport('Ongoing Projects')}>
              <FileText size={12} />
              <span>Report</span>
            </button>
          </div>

          <div className="item-list dashboard-scroller">
            {ongoingProjects.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No ongoing projects currently active.
              </div>
            ) : (
              ongoingProjects.map(proj => (
                <div key={proj._id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href={`/projects/${proj._id}`} style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                      {proj.name}
                    </Link>
                    <span className="ongoing-task-percentage" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {proj.progress}%
                    </span>
                  </div>
                  
                  <div className="task-progress-bar-container-premium" style={{ height: '4px' }}>
                    <div className="task-progress-bar-fill-premium" style={{ width: `${proj.progress}%` }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>Client: {proj.clientName || 'None'}</span>
                    <span>Target: {proj.endDate ? new Date(proj.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Box 5: Ongoing Tasks Checklist */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <ClipboardList size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Ongoing Tasks</span>
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button 
                onClick={() => setIsAddTaskOpen(true)}
                className="btn btn-primary" 
                style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px', borderRadius: '6px' }}
              >
                <Plus size={10} />
                <span>New</span>
              </button>
              <button className="btn-report" onClick={() => handleExportReport('Ongoing Tasks')}>
                <FileText size={12} />
                <span>Report</span>
              </button>
            </div>
          </div>

          <div className="item-list dashboard-scroller">
            {(() => {
              const ongoingTasks = [];
              (stats?.recentProjects || []).forEach(p => {
                (p.tasks || []).forEach(t => {
                  if (!t.completed) {
                    ongoingTasks.push({ ...t, projectId: p._id, projectName: p.name });
                  }
                });
              });

              if (ongoingTasks.length === 0) {
                return (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No ongoing tasks currently active.
                  </div>
                );
              }

              return ongoingTasks.slice(0, 5).map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div key={task._id} className="item-row" style={{ padding: '0.55rem 0.75rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={task.name}>
                        {task.name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.projectName} • due {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </div>
                    <span 
                      className={`badge-post-type ${task.priority?.toLowerCase() === 'high' ? 'reel' : task.priority?.toLowerCase() === 'low' ? 'motion' : 'carousel'}`}
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'capitalize' }}
                    >
                      {task.priority || 'Medium'}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Box 6: Employees & Task Assignments */}
        <div className="dashboard-glass-card">
          <div className="box-header">
            <span className="box-title">
              <Users size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Employees & Tasks</span>
            </span>
            <button className="btn-report" onClick={() => handleExportReport('Employees')}>
              <FileText size={12} />
              <span>Report</span>
            </button>
          </div>

          <div className="item-list dashboard-scroller">
            {(!stats?.employeeStats || stats.employeeStats.length === 0) ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No employees registered in company workspace.
              </div>
            ) : (
              stats.employeeStats.map(emp => {
                const completionRate = emp.assignedTasks > 0 ? Math.round((emp.completedTasks / emp.assignedTasks) * 100) : 0;
                const initials = emp.username.slice(0, 2).toUpperCase();
                const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
                const avatarColor = avatarColors[emp.username.charCodeAt(0) % avatarColors.length];
                return (
                  <div key={emp._id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    {/* Employee header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.username.charAt(0).toUpperCase() + emp.username.slice(1)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.role}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: emp.pendingTasksCount > 0 ? 'var(--accent-warning, #f59e0b)' : 'var(--accent-success, #10b981)' }}>
                          {emp.pendingTasksCount > 0 ? `${emp.pendingTasksCount} Pending` : 'All Done'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.completedTasks}/{emp.assignedTasks} tasks</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {emp.assignedTasks > 0 && (
                      <div className="task-progress-bar-container-premium" style={{ height: '3px' }}>
                        <div className="task-progress-bar-fill-premium" style={{ width: `${completionRate}%` }}></div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* AI Assistant Banner */}
      <div className="dashboard-ai-banner" style={{ marginTop: '0.5rem' }}>
        <div className="ai-banner-content">
          <div className="ai-banner-icon-container">
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h3 className="ai-banner-title">IONETWEB AI Workspace Agent</h3>
            <p className="ai-banner-subtitle">Query status reports, email invoices, compile task updates, or examine timeline metrics via conversation prompts.</p>
          </div>
        </div>
        <Link href="/ai-agents" className="btn btn-primary ai-banner-btn">
          <Brain size={16} />
          <span>Launch AI Agent</span>
        </Link>
      </div>

      {/* Bottom Row: Recent Invoices Statement */}
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Recent Invoices</h2>
          <Link href="/invoices" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <span>All Invoices</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table className="dashboard-premium-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentInvoices || []).length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No invoices generated yet. Create one to collect payments!
                  </td>
                </tr>
              ) : (
                (stats?.recentInvoices || []).slice(0, 4).map((invoice) => (
                  <tr key={invoice._id} onClick={() => window.location.href = `/invoices/${invoice._id}`} className="premium-table-row">
                    <td>
                      <span className="table-invoice-link">{invoice.invoiceNumber}</span>
                    </td>
                    <td>{invoice.clientName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{displayPrice(invoice.total)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Upon Receipt'}
                    </td>
                    <td>
                      <span className={`badge badge-${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
    )}

    {/* Modal for task creation */}
    {isAddTaskOpen && (
      <div className="modal-overlay" onClick={() => setIsAddTaskOpen(false)}>
        <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Create Task</h2>
            <button onClick={() => setIsAddTaskOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <X size={20} />
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Add a task to a project and assign it to a teammate.
          </p>

          <form onSubmit={handleEmployeeAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Title *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="What needs to be done?"
                value={taskForm.name}
                onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Associated Project *</label>
              <select
                required
                className="form-select"
                value={taskForm.projectId}
                onChange={(e) => setTaskForm(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <option value="">Select a project...</option>
                {allProjects.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.name}
                  </option>
                ))}
                {allProjects.length === 0 && (
                  <option disabled value="">No projects found</option>
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Priority</label>
                <select 
                  className="form-select"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Due Date / Reminder</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Assign To (optional)</label>
              <select 
                className="form-select"
                value={taskForm.assignedTo}
                onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Add assignees...</option>
                {companyUsers.map(u => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notes (optional)</label>
              <textarea 
                className="form-textarea"
                placeholder="Add details..."
                rows={4}
                value={taskForm.notes}
                onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddTaskOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingTask}>
                {isSubmittingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Styled Scoped Styling */}
      <style jsx global>{`
        /* Custom variables and overrides for light theme black content */
        [data-theme="light"] .dashboard-page-wrapper {
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #000000 !important;
        }
        
        /* Middle row Donut center and Legend styling */
        .donut-center-value {
          font-size: 2.2rem !important;
          font-weight: 800 !important;
          font-family: var(--font-heading);
          fill: var(--text-primary);
          transition: fill 0.3s ease;
        }
        .donut-center-label {
          font-size: 0.88rem !important;
          font-weight: 700 !important;
          font-family: var(--font-sans);
          fill: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: fill 0.3s ease;
        }
        .legend-label {
          font-size: 0.95rem !important;
          font-weight: 600 !important;
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }
        .legend-value {
          font-size: 1.4rem !important;
          font-weight: 800 !important;
          color: var(--text-primary);
          margin-top: 2px;
          transition: color 0.3s ease;
        }

        [data-theme="light"] .donut-center-value,
        [data-theme="light"] .donut-center-label {
          fill: #000000 !important;
        }
        [data-theme="light"] .legend-label,
        [data-theme="light"] .legend-value {
          color: #000000 !important;
        }
        [data-theme="light"] .stat-card-title,
        [data-theme="light"] .stat-card-value {
          color: #000000 !important;
        }
        [data-theme="light"] .box-title {
          color: #000000 !important;
        }

        .timeframe-selector-tabs {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }
        [data-theme="light"] .timeframe-selector-tabs {
          background: rgba(0, 0, 0, 0.03);
        }
        .timeframe-tab-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 0.35rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .timeframe-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        [data-theme="light"] .timeframe-tab-btn:hover {
          background: rgba(0, 0, 0, 0.02);
        }
        .timeframe-tab-btn.active {
          background: var(--accent-primary) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px var(--accent-primary-glow);
        }

        .dashboard-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          padding-bottom: 2rem;
        }
        .dashboard-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .dashboard-title-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .dashboard-subtitle-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin: 0.2rem 0 0 0;
        }
        .btn-filter-dropdown {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.5rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-filter-dropdown:hover {
          border-color: var(--accent-primary);
        }
        .btn-filter-dropdown-small {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 0.35rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-filter-dropdown-small:hover {
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }
        .dashboard-alerts-carousel-container {
          margin-bottom: 1rem;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .carousel-dots {
          display: flex;
          gap: 0.35rem;
          align-items: center;
          justify-content: center;
          margin-top: 0.25rem;
        }
        .carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.3);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        [data-theme="light"] .carousel-dot {
          background: rgba(217, 119, 6, 0.25);
        }
        .carousel-dot.active {
          background: #f59e0b;
          transform: scale(1.3);
        }
        [data-theme="light"] .carousel-dot.active {
          background: #d97706;
        }
        .dashboard-alert-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-left: 5px solid #f59e0b;
          border-radius: 10px;
          padding: 0.75rem 1.25rem;
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.05);
        }
        [data-theme="light"] .dashboard-alert-banner {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-left: 5px solid #d97706;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.08);
        }
        .alert-banner-icon {
          color: #fbbf24;
          flex-shrink: 0;
        }
        [data-theme="light"] .alert-banner-icon {
          color: #d97706;
        }
        .alert-banner-title {
          font-weight: 700;
          color: #fbbf24;
        }
        [data-theme="light"] .alert-banner-title {
          color: #b45309;
        }
        .alert-banner-desc {
          color: #fef3c7;
          font-weight: 500;
        }
        [data-theme="light"] .alert-banner-desc {
          color: #451a03;
          font-weight: 500;
        }
        .alert-banner-action {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          font-weight: 700;
          text-decoration: none;
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          font-size: 0.78rem;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        [data-theme="light"] .alert-banner-action {
          background: #fff3c4;
          color: #78350f;
          border: 1px solid #fcd34d;
        }
        .alert-banner-action:hover {
          background: #f59e0b;
          color: #0c1520;
          border-color: #f59e0b;
          transform: translateY(-1px);
        }
        [data-theme="light"] .alert-banner-action:hover {
          background: #d97706;
          color: #ffffff;
          border-color: #d97706;
          transform: translateY(-1px);
        }
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
        @media (max-width: 640px) {
          .dashboard-stats-grid {
            grid-template-columns: 1fr;
            gap: 0.85rem;
          }
        }

        /* Row-based Grid Layouts */
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr 0.8fr;
          gap: 1.25rem;
          margin-top: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .dashboard-scrollers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1024px) {
          .dashboard-charts-grid,
          .dashboard-scrollers-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
        @media (max-width: 640px) {
          .dashboard-charts-grid,
          .dashboard-scrollers-grid {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-scroller {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 6px;
        }
        .dashboard-scroller::-webkit-scrollbar {
          width: 5px;
        }
        .dashboard-scroller::-webkit-scrollbar-track {
          background: transparent;
        }
        .dashboard-scroller::-webkit-scrollbar-thumb {
          background: var(--border-color-hover);
          border-radius: 99px;
        }

        .legend-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.45rem 0.75rem;
          transition: all 0.2s ease;
        }
        [data-theme="light"] .legend-pill {
          background: #ffffff;
          box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8), 
                      2px 2px 5px rgba(165, 180, 203, 0.08);
          border: 1px solid rgba(15, 45, 74, 0.04);
        }
        .legend-pill:hover {
          border-color: var(--accent-primary-glow);
          transform: translateX(2px);
        }

        /* Soft Neumorphic Glass Cards matching the sample */
        .dashboard-glass-card {
          background: var(--bg-card);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 16px -6px rgba(0, 0, 0, 0.02);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                      box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                      border-color 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        [data-theme="light"] .dashboard-glass-card {
          background: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 6px 6px 20px rgba(165, 180, 203, 0.15), 
                      -6px -6px 20px rgba(255, 255, 255, 0.8);
        }

        .dashboard-glass-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-primary);
          box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.08), 0 10px 20px -8px rgba(0, 0, 0, 0.04);
        }
        
        [data-theme="light"] .dashboard-glass-card:hover {
          box-shadow: 8px 12px 28px rgba(165, 180, 203, 0.25), 
                      -8px -8px 28px rgba(255, 255, 255, 0.9);
        }

        /* Card Header & Titles */
        .box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.65rem;
        }
        
        .box-title {
          font-size: 0.98rem;
          font-weight: 800;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-heading);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Report Button matching neumorphic sample look */
        .btn-report {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 0.25rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        [data-theme="light"] .btn-report {
          background: #ffffff;
          box-shadow: inset 1px 1px 3px rgba(255, 255, 255, 0.8), 
                      2px 2px 5px rgba(165, 180, 203, 0.15);
        }

        .btn-report:hover {
          color: var(--text-secondary);
          border-color: var(--accent-primary);
          background: var(--accent-primary-glow);
          transform: scale(1.02);
        }

        /* Metric pills list */
        .metric-pill-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .metric-pill {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        [data-theme="light"] .metric-pill {
          background: #fdfdfd;
          box-shadow: inset 1px 1px 3px rgba(255, 255, 255, 0.9), 
                      2px 2px 6px rgba(165, 180, 203, 0.08);
        }

        .metric-pill:hover {
          border-color: var(--accent-primary-glow);
          background: rgba(255, 255, 255, 0.04);
        }
        
        [data-theme="light"] .metric-pill:hover {
          background: #fafbfc;
          border-color: rgba(0, 174, 239, 0.15);
        }

        .metric-pill-value {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .metric-pill-label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 2px;
          font-weight: 500;
        }

        /* Lists within cards */
        .item-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          flex: 1;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.45rem 0.65rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        [data-theme="light"] .item-row {
          background: #ffffff;
          box-shadow: 2px 2px 6px rgba(165, 180, 203, 0.05);
          border: 1px solid rgba(15, 45, 74, 0.04);
        }

        .item-row:hover {
          border-color: var(--accent-primary-glow);
          transform: translateX(2px);
          background: rgba(255, 255, 255, 0.02);
        }

        [data-theme="light"] .item-row:hover {
          background: #fafafa;
          border-color: rgba(0, 174, 239, 0.15);
        }
        .dashboard-stat-card-premium {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .dashboard-stat-card-premium:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 174, 239, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }
        .stat-card-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: none;
          letter-spacing: 0;
        }
        .stat-card-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-top: 0.15rem;
        }
        .stat-card-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          margin-left: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .stat-card-badge.positive {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .stat-card-badge.negative {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .stat-card-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-card-icon-box.blue-theme {
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
        }
        .stat-card-icon-box.purple-theme {
          background: rgba(168, 85, 247, 0.08);
          color: #a855f7;
        }
        .stat-card-icon-box.teal-theme {
          background: rgba(6, 182, 212, 0.08);
          color: #06b6d4;
        }
        .stat-card-icon-box.green-theme {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
        }
        .stat-card-icon-box.orange-theme {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
        }
        .stat-card-eye-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .stat-card-eye-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .dashboard-columns-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 868px) {
          .dashboard-columns-grid {
            grid-template-columns: 1fr;
          }
        }
        .dashboard-large-card {
          padding: 1.15rem;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-secondary);
        }
        .ongoing-task-card {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 0.85rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
        }
        .ongoing-task-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
        }
        .ongoing-task-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .task-progress-bar-container-premium {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
          overflow: hidden;
        }
        [data-theme="light"] .task-progress-bar-container-premium {
          background: rgba(0, 0, 0, 0.05);
        }
        .task-progress-bar-fill-premium {
          height: 100%;
          border-radius: 9999px;
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15),
            rgba(255, 255, 255, 0.15) 6px,
            transparent 6px,
            transparent 12px
          ), var(--accent-primary);
          transition: width 0.4s ease;
        }
        .ongoing-task-percentage {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .dashboard-ai-banner {
          background: var(--accent-primary-glow);
          border: 1px solid var(--border-color-hover);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
          box-shadow: 0 10px 30px var(--accent-primary-glow);
        }
        .ai-banner-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1 1 500px;
        }
        .ai-banner-icon-container {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--accent-primary-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ai-banner-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }
        .ai-banner-subtitle {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.45;
        }
        .ai-banner-btn {
          background: var(--accent-primary);
          border: none;
          box-shadow: 0 4px 15px var(--accent-primary-glow);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.15rem;
          font-size: 0.85rem;
          font-weight: 600;
          transition: filter 0.2s, transform 0.2s;
        }
        .ai-banner-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .dashboard-premium-table {
          width: 100%;
          border-collapse: collapse;
        }
        .dashboard-premium-table th {
          padding: 0.85rem 1.15rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: none;
          border-bottom: 1px solid var(--border-color);
          background: var(--table-header-bg);
          text-align: left;
        }
        .dashboard-premium-table td {
          padding: 0.95rem 1.15rem;
          font-size: 0.95rem;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
          color: var(--text-primary);
        }
        .premium-table-row {
          cursor: pointer;
          transition: background-color 0.2s, transform 0.2s;
        }
        .premium-table-row:hover {
          background-color: rgba(0, 174, 239, 0.025);
        }
        .table-invoice-link {
          font-weight: 600;
          color: var(--accent-primary);
        }
        .table-invoice-link:hover {
          text-decoration: underline;
        }

        /* Employee Workspace & Kanban styles */
        .employee-overdue-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-left: 5px solid #ef4444;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08);
        }
        .overdue-banner-content {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.88rem;
        }
        .overdue-banner-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .overdue-badge-pill {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 0.72rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
        }
        [data-theme="light"] .employee-overdue-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-left: 5px solid #ef4444;
          color: #991b1b;
        }
        [data-theme="light"] .overdue-badge-pill {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .kanban-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          margin-top: 1rem;
        }
        @media (max-width: 768px) {
          .kanban-board {
            grid-template-columns: 1fr;
          }
        }
        .kanban-column {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          min-height: 420px;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          transition: all 0.2s ease-in-out;
        }
        [data-theme="light"] .kanban-column {
          background: rgba(0, 0, 0, 0.01);
        }
        .kanban-column.drag-over {
          background: var(--accent-primary-glow);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 174, 239, 0.15);
        }
        .column-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .kanban-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 0.25rem;
        }
        .kanban-column-title {
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .kanban-column-count {
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 0.15rem 0.45rem;
          border-radius: 9999px;
        }
        [data-theme="light"] .kanban-column-count {
          background: rgba(0, 0, 0, 0.05);
        }
        .kanban-cards-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        .kanban-empty-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
          border: 1px dashed var(--border-color);
          border-radius: 8px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .kanban-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.85rem;
          cursor: grab;
          transition: all 0.2s ease-in-out;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .kanban-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
          background: var(--bg-card-hover);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }
        .kanban-card:active {
          cursor: grabbing;
        }
        .kanban-card.overdue {
          border-left: 3px solid var(--status-overdue);
        }
        .kanban-card-project {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--accent-primary);
        }
        .kanban-card-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }
        .kanban-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.25rem;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .kanban-card-date {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .kanban-card-date.overdue {
          color: var(--status-overdue);
          font-weight: 600;
        }
        .kanban-card-checkbox {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid var(--border-color);
          cursor: pointer;
        }
        .employee-bottom-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 1.25rem;
          margin-top: 1.25rem;
        }
        @media (max-width: 1024px) {
          .employee-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
        .calendar-posts-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .calendar-post-row-premium {
          display: flex;
          gap: 1rem;
          padding: 0.85rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          align-items: center;
          transition: all 0.2s ease;
        }
        .calendar-post-row-premium:hover {
          border-color: var(--accent-primary-glow);
          background: rgba(255, 255, 255, 0.02);
        }
        .calendar-date-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          width: 45px;
          height: 48px;
          flex-shrink: 0;
        }
        .calendar-date-badge .month {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--accent-primary);
          line-height: 1;
        }
        .calendar-date-badge .day {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
          margin-top: 1px;
        }
        [data-theme="light"] .calendar-date-badge {
          background: rgba(0, 0, 0, 0.02);
        }
        .calendar-post-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .calendar-post-project {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .badge-post-type {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }
        [data-theme="light"] .badge-post-type {
          background: rgba(0, 0, 0, 0.04);
        }
        .badge-post-type.reel { background: rgba(162, 28, 175, 0.1); color: #f472b6; }
        .badge-post-type.motion { background: rgba(3, 105, 161, 0.1); color: #38bdf8; }
        .badge-post-type.carousel { background: rgba(217, 119, 6, 0.1); color: #fbbf24; }
        .calendar-post-topic {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .calendar-post-content {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .calendar-post-platforms {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
          margin-top: 0.15rem;
        }
        .platform-tag {
          font-size: 0.62rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
        }
        [data-theme="light"] .platform-tag {
          background: rgba(0, 0, 0, 0.02);
        }
        .calendar-post-status-col {
          flex-shrink: 0;
        }
        .credentials-vault-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .cred-project-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .cred-project-header {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding-bottom: 0.35rem;
          border-bottom: 1px solid var(--border-color);
        }
        .cred-items-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .cred-item-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.75rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .cred-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.15rem;
        }
        .cred-item-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .cred-item-type-badge {
          font-size: 0.65rem;
          font-weight: 600;
          background: var(--accent-secondary-glow);
          color: var(--accent-secondary);
          padding: 0.05rem 0.4rem;
          border-radius: 4px;
        }
        .cred-field-row {
          display: flex;
          font-size: 0.75rem;
          align-items: center;
        }
        .cred-field-name {
          color: var(--text-muted);
          width: 45px;
          flex-shrink: 0;
        }
        .cred-field-link {
          color: var(--accent-primary);
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .cred-field-link:hover {
          text-decoration: underline;
        }
        .cred-field-val-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          min-width: 0;
          background: rgba(0, 0, 0, 0.20);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 0.15rem 0.4rem;
        }
        [data-theme="light"] .cred-field-val-container {
          background: rgba(0, 0, 0, 0.03);
        }
        .cred-field-value {
          color: var(--text-primary);
          font-weight: 500;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .cred-field-value.password-font {
          font-family: monospace;
          letter-spacing: 0.05em;
        }
        .cred-copy-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .cred-copy-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
