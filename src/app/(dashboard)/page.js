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
  EyeOff
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
  const [showPrices, setShowPrices] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('show_prices');
    if (saved !== null) {
      setShowPrices(saved === 'true');
    }
  }, []);

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

  useEffect(() => {
    async function fetchStats() {
      try {
        const [res, meRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/auth/me')
        ]);
        if (!res.ok) throw new Error('Failed to load dashboard data');
        const data = await res.json();
        setStats(data);

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
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
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
    }).format(value);
  };

  const displayPrice = (value) => {
    return showPrices ? formatCurrency(value) : 'xxx';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {username.charAt(0).toUpperCase() + username.slice(1)}</h1>
          <p className="page-subtitle">Here is the latest status of your client projects and billing.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', position: 'relative' }}>
          {/* Reusable Notification Bell Icon for Desktop Welcome page */}
          <NotificationBell userRole={userRole} />

          <Link href="/projects" className="btn btn-primary">
            <Plus size={18} />
            <span>New Project</span>
          </Link>
          <Link href="/invoices" className="btn btn-secondary">
            <FileText size={18} />
            <span style={{ textAlign: 'left', lineHeight: '1.2' }}>
              Create<br className="show-mobile" /> Invoice
            </span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Active Projects</span>
            <span className="stat-value">{stats.projects.active}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Out of {stats.projects.total} total
            </span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-primary)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.1)' }}>
            <Briefcase size={22} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Total Project Value
              <button 
                onClick={toggleShowPrices} 
                className="eye-toggle-btn"
                title={showPrices ? "Hide prices" : "Show prices"}
              >
                {showPrices ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
            <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
              {displayPrice(stats.projects.totalBudget)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total budget allocated
            </span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-secondary)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Total Earnings
              <button 
                onClick={toggleShowPrices} 
                className="eye-toggle-btn"
                title={showPrices ? "Hide prices" : "Show prices"}
              >
                {showPrices ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {displayPrice(stats.invoices.totalEarnings)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              From paid invoices
            </span>
          </div>
          <div className="stat-icon" style={{ color: '#10b981', boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)' }}>
            <IndianRupee size={22} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Outstanding Amount
              <button 
                onClick={toggleShowPrices} 
                className="eye-toggle-btn"
                title={showPrices ? "Hide prices" : "Show prices"}
              >
                {showPrices ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
            <span className="stat-value" style={{ color: '#f59e0b' }}>
              {displayPrice(stats.invoices.totalPendingAmount)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Across {stats.invoices.pendingCount} unpaid
            </span>
          </div>
          <div className="stat-icon" style={{ color: '#f59e0b', boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Total Invoices</span>
            <span className="stat-value">{stats.invoices.total}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Generated so far
            </span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-secondary)', boxShadow: '0 0 15px rgba(6, 182, 212, 0.1)' }}>
            <FileText size={22} />
          </div>
        </div>
      </div>
      
      {/* Pending Tasks / Action Required */}
      {stats.pendingTasks && stats.pendingTasks.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
            <AlertTriangle size={24} style={{ strokeWidth: 2 }} />
            <span>Pending Tasks & Actions Required</span>
          </h2>
          <div className="tasks-grid">
            {stats.pendingTasks.map((task) => {
              let borderLeftColor = 'var(--accent-primary)';
              if (task.type === 'hosting_expiry') {
                borderLeftColor = '#ec4899';
              } else if (task.type === 'domain_expiry') {
                borderLeftColor = '#8b5cf6';
              } else if (task.type === 'project_pending') {
                borderLeftColor = '#f59e0b';
              } else if (task.type === 'invoice_draft') {
                borderLeftColor = '#3b82f6';
              }

              return (
                <div 
                  key={`${task.type}-${task.id}`}
                  className="card pending-task-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${borderLeftColor}`,
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '1.25rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span className="badge" style={{ background: `${borderLeftColor}20`, color: borderLeftColor, fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                        {task.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(task.date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{task.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{task.description}</p>
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link href={task.link} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', border: '1px solid var(--border-color)' }}>
                      Resolve Task
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Agents Dashboard Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#8b5cf6' }}>
          <Sparkles size={24} style={{ color: 'var(--accent-primary)', strokeWidth: 2 }} />
          <span>IONETWEB AI Copilot</span>
        </h2>
        <div 
          className="card" 
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.05)'
          }}
        >
          <div style={{ flex: '1 1 500px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Need a fast update or invoice lookup?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 0 }}>
              Use our AI Agent to generate 30-day client status reports, locate outstanding invoices, or email them directly to your contacts via conversational prompts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/ai-agents" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #7c3aed 100%)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)' }}>
              <Brain size={18} style={{ color: '#ffffff' }} />
              <span>Launch AI Agent</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid-2col">
        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Recent Projects</h2>
            <Link href="/projects" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
              <span>All Projects</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {stats.recentProjects.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No projects found. Create one to get started!
              </div>
            ) : (
              stats.recentProjects.map((project) => (
                <Link 
                  href={`/projects/${project._id}`} 
                  key={project._id}
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                  }}
                  className="project-row"
                >
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{project.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{project.clientName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {displayPrice(project.budget)}
                      <button 
                        onClick={toggleShowPrices} 
                        className="eye-toggle-btn-small"
                        title={showPrices ? "Hide prices" : "Show prices"}
                      >
                        {showPrices ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </span>
                    <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`}>
                      {project.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Recent Invoices</h2>
            <Link href="/invoices" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
              <span>All Invoices</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {stats.recentInvoices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No invoices found. Generate one to invoice clients!
              </div>
            ) : (
              stats.recentInvoices.map((invoice) => (
                <Link 
                  href={`/invoices/${invoice._id}`} 
                  key={invoice._id}
                  style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{invoice.clientName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {displayPrice(invoice.total)}
                      <button 
                        onClick={toggleShowPrices} 
                        className="eye-toggle-btn-small"
                        title={showPrices ? "Hide prices" : "Show prices"}
                      >
                        {showPrices ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </span>
                    <span className={`badge badge-${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Visual design styling for hover interactions of dashboard list elements */}
      <style jsx global>{`
        .project-row:hover, .card a:hover {
          background: rgba(255, 255, 255, 0.03);
          transform: translateX(4px);
        }
        .eye-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .eye-toggle-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .eye-toggle-btn-small {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 1px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          opacity: 0.6;
          transition: all 0.2s ease;
        }
        .eye-toggle-btn-small:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
