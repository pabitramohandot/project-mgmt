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
  X
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import NotificationBell from '@/components/NotificationBell';

export default function Dashboard() {
  const { showToast } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState('Workspace');
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
  const [dashboardTimeframe, setDashboardTimeframe] = useState('all');
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
        const res = await fetch(`/api/dashboard?timeframe=${dashboardTimeframe}`);
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
  }, [dashboardTimeframe]);

  const activeAlerts = stats?.pendingTasks ? stats.pendingTasks.slice(0, 5) : [];

  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAlertIndex(prev => (prev + 1) % activeAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAlerts.length]);

  if (loading || !userReady) {
    return (
      <div className="empty-state">
        <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h3>Loading your workspace dashboard...</h3>
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
        { label: 'Jan', value: Math.round(baseEarnings * 0.45) || 30000 },
        { label: 'Feb', value: Math.round(baseEarnings * 0.60) || 45000 },
        { label: 'Mar', value: Math.round(baseEarnings * 0.50) || 38000 },
        { label: 'Apr', value: Math.round(baseEarnings * 0.80) || 60000 },
        { label: 'May', value: Math.round(baseEarnings * 0.70) || 52000 },
        { label: 'Jun', value: Math.round(baseEarnings * 0.95) || 71000 },
        { label: 'Jul', value: baseEarnings || 75000 }
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
        {p.project_tasks === 'none' && p.project_calendar === 'none' && p.credentials === 'none' && (
          <div className="card empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Zap size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No Active Dashboard Tools</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Your user role currently does not grant access to any workspace tools on this dashboard.</p>
          </div>
        )}

        {/* Bottom Section: Calendar + Credentials */}
        {(p.project_calendar !== 'none' || p.credentials !== 'none') && (
          <div className="employee-bottom-grid" style={{
            gridTemplateColumns: (p.project_calendar !== 'none' && p.credentials !== 'none') ? '1.4fr 1fr' : '1fr'
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

          {/* Right: Project Credentials (40% width) */}
          {p.credentials !== 'none' && (
            <div className="card employee-credentials-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Lock size={16} style={{ color: 'var(--accent-secondary)' }} />
                <span>Project Credentials Vault</span>
              </h3>
            </div>

            <div className="credentials-vault-list">
              {!stats.credentials || stats.credentials.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No project credentials available.
                </div>
              ) : (
                stats.credentials.map((group, gIdx) => (
                  <div key={gIdx} className="cred-project-group">
                    <div className="cred-project-header">
                      <Briefcase size={12} />
                      <span>{group.projectName}</span>
                    </div>
                    
                    <div className="cred-items-container">
                      {group.credentials.map((cred, cIdx) => {
                        const credId = `${group.projectId}-${cIdx}`;
                        const isRevealed = !!revealedCreds[credId];
                        
                        return (
                          <div key={cred._id || cIdx} className="cred-item-card">
                            <div className="cred-item-header">
                              <span className="cred-item-label">{cred.label || 'Credentials'}</span>
                              <span className="cred-item-type-badge">{cred.type}</span>
                            </div>

                            {cred.loginUrl && (
                              <div className="cred-field-row">
                                <span className="cred-field-name">URL:</span>
                                <a href={cred.loginUrl} target="_blank" rel="noopener noreferrer" className="cred-field-link">
                                  <span>{cred.loginUrl}</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            )}

                            {cred.username && (
                              <div className="cred-field-row">
                                <span className="cred-field-name">User:</span>
                                <div className="cred-field-val-container">
                                  <span className="cred-field-value">{cred.username}</span>
                                  <button 
                                    className="cred-copy-btn"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cred.username);
                                      showToast('Username copied to clipboard', 'success');
                                    }}
                                    title="Copy username"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {cred.password && (
                              <div className="cred-field-row">
                                <span className="cred-field-name">Pass:</span>
                                <div className="cred-field-val-container">
                                  <span className="cred-field-value password-font">
                                    {isRevealed ? cred.password : '••••••••'}
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button 
                                      className="cred-copy-btn"
                                      onClick={() => {
                                        setRevealedCreds(prev => ({ ...prev, [credId]: !prev[credId] }));
                                      }}
                                      title={isRevealed ? "Hide password" : "Show password"}
                                    >
                                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                    <button 
                                      className="cred-copy-btn"
                                      onClick={() => {
                                        navigator.clipboard.writeText(cred.password);
                                        showToast('Password copied to clipboard', 'success');
                                      }}
                                      title="Copy password"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
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
          <p className="dashboard-subtitle-text">Welcome back, {username.charAt(0).toUpperCase() + username.slice(1)}. Here is your workspace performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <NotificationBell userRole={userRole} />
          
          <div className="select-container-custom">
            <select
              value={dashboardTimeframe}
              onChange={(e) => setDashboardTimeframe(e.target.value)}
              className="btn-filter-dropdown"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
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

          {/* Pagination Dots (only if more than 1 alert) - Rendered centered below the card */}
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
            <span className="stat-card-badge positive">
              15% <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Project Value */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box teal-theme">
              <TrendingUp size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Total Value
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide budget" : "Show budget"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.projects?.totalBudget ?? 0)}</span>
            <span className="stat-card-badge positive">
              8% <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Earnings */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box green-theme">
              <IndianRupee size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Total Earnings
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide earnings" : "Show earnings"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.invoices?.totalEarnings ?? 0)}</span>
            <span className="stat-card-badge positive">
              10% <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Amount */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="stat-card-icon-box orange-theme">
              <Clock size={14} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Outstanding Amount
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide outstanding" : "Show outstanding"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats?.invoices?.totalPendingAmount ?? 0)}</span>
            <span className="stat-card-badge negative">
              4% <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>↘</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart + Tasks */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Analytics Chart */}
        <div className="card dashboard-large-card relative" style={{ minHeight: '310px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Billing Performance</h3>
            </div>
            <select 
              value={chartTimeframe} 
              onChange={(e) => setChartTimeframe(e.target.value)} 
              className="btn-filter-dropdown-small"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>

          <div style={{ margin: '0.35rem 0 1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {displayPrice(activeValue)}
              </span>
              <span className="stat-card-badge positive" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                12% <span style={{ fontSize: '0.7rem' }}>↗</span>
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {chartTimeframe === 'Weekly' ? `For ${activeLabel}` : chartTimeframe === 'Quarterly' ? `For ${activeLabel}` : `For ${activeLabel}`}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '190px' }}>
            {/* SVG Rendered Chart */}
            <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="rgba(0, 174, 239, 0.4)" />
                </linearGradient>
                {/* Diagonal stripes pattern */}
                <pattern id="diagonalStripes" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <rect width="8" height="16" fill="var(--accent-primary)" />
                  <rect x="8" width="8" height="16" fill="#00c8ff" />
                </pattern>
              </defs>
 
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
              <line x1="40" y1="65" x2="480" y2="65" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
              <line x1="40" y1="110" x2="480" y2="110" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
              <line x1="40" y1="155" x2="480" y2="155" stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.3} />
              <line x1="40" y1="165" x2="480" y2="165" stroke="var(--border-color)" strokeWidth="1" />
 
              {/* Y Axis Labels */}
              <text x="32" y="24" fontSize="8" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue)}</text>
              <text x="32" y="69" fontSize="8" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.75)}</text>
              <text x="32" y="114" fontSize="8" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.5)}</text>
              <text x="32" y="159" fontSize="8" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.25)}</text>
              <text x="32" y="169" fontSize="8" fill="var(--text-muted)" textAnchor="end">0</text>
 
              {/* Bar Columns */}
              {chartData.map((d, index) => {
                const spacing = 60;
                const barWidth = 24;
                const baselineY = 165;
                const barHeight = (d.value / maxChartValue) * 135;
                const barX = index * spacing + 65;
                const barY = baselineY - barHeight;
                const isHovered = activeBar === index;
                // Highlight either the hovered bar or, if none is hovered, the last bar (current month)
                const isHighlighted = isHovered || (activeBar === null && index === chartData.length - 1);
 
                return (
                  <g key={index} onMouseEnter={() => setActiveBar(index)} onMouseLeave={() => setActiveBar(null)}>
                    {isHovered && (
                      <rect
                        x={barX - 8}
                        y={10}
                        width={barWidth + 16}
                        height={165}
                        fill="var(--border-color)"
                        opacity={0.15}
                        rx={8}
                      />
                    )}
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill="var(--accent-primary)"
                      rx={6}
                      style={{
                        transition: 'height 0.3s ease, y 0.3s ease, opacity 0.2s',
                        cursor: 'pointer',
                        opacity: isHighlighted ? 1 : 0.18
                      }}
                    />
                    <text
                      x={barX + barWidth / 2}
                      y={182}
                      fontSize="9"
                      fill={isHighlighted ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                      fontWeight={isHighlighted ? '600' : '400'}
                      textAnchor="middle"
                      style={{ transition: 'color 0.2s' }}
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
 
            {/* Interactive Tooltip Overlay */}
            {activeBar !== null && (
              <div 
                className="chart-tooltip animate-fade-in"
                style={{
                  position: 'absolute',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                  borderRadius: '12px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem',
                  left: `${((activeBar * 60 + 77) / 500) * 100}%`,
                  top: `${145 - (chartData[activeBar].value / maxChartValue) * 135}px`,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  minWidth: '120px'
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{chartData[activeBar].label} Billings</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.88rem' }}>
                    {displayPrice(chartData[activeBar].value)}
                  </span>
                  <span className="stat-card-badge positive" style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', borderRadius: '9999px' }}>
                    8% ↗
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ongoing Tasks */}
        <div className="card dashboard-large-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="stat-card-icon-box blue-theme" style={{ width: '28px', height: '28px', borderRadius: '6px' }}>
                <Clock size={14} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Ongoing Tasks</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsAddTaskOpen(true)}
              className="btn btn-primary" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '8px' }}
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {ongoingProjects.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No active projects found. Create one to begin.
              </div>
            ) : (
              ongoingProjects.map((project) => (
                <Link href={`/projects/${project._id}`} key={project._id} className="ongoing-task-card">
                  <div className="ongoing-task-title">{project.name}</div>
                  <div className="task-progress-bar-container-premium">
                    <div 
                      className="task-progress-bar-fill-premium" 
                      style={{ 
                        width: `${project.progress}%`
                      }}
                    ></div>
                  </div>
                  <div className="ongoing-task-percentage">{project.progress}% completed</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="dashboard-ai-banner">
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
      <div style={{ marginTop: '1.25rem' }}>
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
          margin-bottom: 2rem;
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
          grid-template-columns: repeat(4, 1fr);
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
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: none;
          letter-spacing: 0;
        }
        .stat-card-value {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-top: 0;
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
          padding: 0.75rem 1rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: none;
          border-bottom: 1px solid var(--border-color);
          background: var(--table-header-bg);
          text-align: left;
        }
        .dashboard-premium-table td {
          padding: 0.8rem 1rem;
          font-size: 0.8rem;
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
