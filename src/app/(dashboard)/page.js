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
  Zap
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
  const [activeBar, setActiveBar] = useState(null);
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

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

  const activeAlerts = stats?.pendingTasks ? stats.pendingTasks.slice(0, 5) : [];

  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAlertIndex(prev => (prev + 1) % activeAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAlerts.length]);

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
  const baseEarnings = stats.invoices.totalEarnings || 75000;
  const chartData = [
    { label: 'Jan', value: Math.round(baseEarnings * 0.45) || 30000 },
    { label: 'Feb', value: Math.round(baseEarnings * 0.60) || 45000 },
    { label: 'Mar', value: Math.round(baseEarnings * 0.50) || 38000 },
    { label: 'Apr', value: Math.round(baseEarnings * 0.80) || 60000 },
    { label: 'May', value: Math.round(baseEarnings * 0.70) || 52000 },
    { label: 'Jun', value: Math.round(baseEarnings * 0.95) || 71000 },
    { label: 'Jul', value: baseEarnings || 75000 }
  ];
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 10000);

  // Ongoing tasks calculator
  const ongoingProjects = (stats.recentProjects || [])
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

  return (
    <div className="animate-fade-in dashboard-page-wrapper">
      {/* Top Header Section */}
      <div className="dashboard-header-container">
        <div>
          <h1 className="dashboard-title-text">Dashboard</h1>
          <p className="dashboard-subtitle-text">Welcome back, {username.charAt(0).toUpperCase() + username.slice(1)}. Here is your workspace performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <NotificationBell userRole={userRole} />
          
          <div className="select-container-custom">
            <button className="btn-filter-dropdown">
              <span>Monthly</span>
              <ChevronDown size={14} />
            </button>
          </div>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div className="stat-card-icon-box blue-theme">
              <Briefcase size={16} />
            </div>
            <span className="stat-card-title">Active Projects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{stats.projects.active}</span>
            <span className="stat-card-badge positive">
              15% <span style={{ fontSize: '0.75rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 2: Total Project Value */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div className="stat-card-icon-box teal-theme">
              <TrendingUp size={16} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Total Value
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide budget" : "Show budget"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats.projects.totalBudget)}</span>
            <span className="stat-card-badge positive">
              8% <span style={{ fontSize: '0.75rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Earnings */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div className="stat-card-icon-box green-theme">
              <IndianRupee size={16} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Total Earnings
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide earnings" : "Show earnings"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats.invoices.totalEarnings)}</span>
            <span className="stat-card-badge positive">
              10% <span style={{ fontSize: '0.75rem', marginLeft: '1px' }}>↗</span>
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Amount */}
        <div className="dashboard-stat-card-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div className="stat-card-icon-box orange-theme">
              <Clock size={16} />
            </div>
            <span className="stat-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Outstanding Amount
              <button onClick={toggleShowPrices} className="stat-card-eye-btn" title={showPrices ? "Hide outstanding" : "Show outstanding"}>
                {showPrices ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="stat-card-value">{displayPrice(stats.invoices.totalPendingAmount)}</span>
            <span className="stat-card-badge negative">
              4% <span style={{ fontSize: '0.75rem', marginLeft: '1px' }}>↘</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart + Tasks */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Analytics Chart */}
        <div className="card dashboard-large-card relative" style={{ minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Billing Performance</h3>
            </div>
            <button className="btn-filter-dropdown-small">
              <span>Weekly</span>
              <ChevronDown size={12} />
            </button>
          </div>

          <div style={{ margin: '0.5rem 0 1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {displayPrice(stats.invoices.totalEarnings)}
              </span>
              <span className="stat-card-badge positive" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                12% <span style={{ fontSize: '0.75rem' }}>↗</span>
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Compared to previous month
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '220px' }}>
            {/* SVG Rendered Chart */}
            <svg width="100%" height="100%" viewBox="0 0 500 220" preserveAspectRatio="none">
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
              <text x="32" y="24" fontSize="9" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue)}</text>
              <text x="32" y="69" fontSize="9" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.75)}</text>
              <text x="32" y="114" fontSize="9" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.5)}</text>
              <text x="32" y="159" fontSize="9" fill="var(--text-muted)" textAnchor="end">{formatYLabel(maxChartValue * 0.25)}</text>
              <text x="32" y="169" fontSize="9" fill="var(--text-muted)" textAnchor="end">0</text>

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
                      fill={isHighlighted ? 'url(#diagonalStripes)' : 'var(--accent-primary)'}
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
                      fontSize="10"
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
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  left: `${((activeBar * 60 + 77) / 500) * 100}%`,
                  top: `${145 - (chartData[activeBar].value / maxChartValue) * 135}px`,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  minWidth: '140px'
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{chartData[activeBar].label} Billings</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1rem' }}>
                    {displayPrice(chartData[activeBar].value)}
                  </span>
                  <span className="stat-card-badge positive" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '9999px' }}>
                    8% ↗
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ongoing Tasks */}
        <div className="card dashboard-large-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="stat-card-icon-box blue-theme" style={{ width: '28px', height: '28px', borderRadius: '6px' }}>
                <Clock size={14} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Ongoing Tasks</h3>
              </div>
            </div>
            <Link href="/projects" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '8px' }}>
              <Plus size={14} />
              <span>New Task</span>
            </Link>
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
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Recent Invoices</h2>
          <Link href="/invoices" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
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
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No invoices generated yet. Create one to collect payments!
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.slice(0, 4).map((invoice) => (
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

      {/* Styled Scoped Styling */}
      <style jsx global>{`
        .dashboard-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .dashboard-subtitle-text {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin: 0.25rem 0 0 0;
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
          border-radius: 16px;
          padding: 1.5rem;
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
          font-size: 0.82rem;
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
          margin-top: 0;
        }
        .stat-card-badge {
          font-size: 0.72rem;
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
          width: 36px;
          height: 36px;
          border-radius: 10px;
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
          padding: 1.5rem;
          border: 1px solid var(--border-color);
          border-radius: 16px;
          background: var(--bg-secondary);
        }
        .ongoing-task-card {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding: 1.25rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s ease-in-out;
        }
        .ongoing-task-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
        }
        .ongoing-task-title {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .task-progress-bar-container-premium {
          width: 100%;
          height: 10px;
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
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .dashboard-ai-banner {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.03);
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
          background: rgba(139, 92, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ai-banner-title {
          font-size: 1.05rem;
          font-weight: 750;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }
        .ai-banner-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.45;
        }
        .ai-banner-btn {
          background: linear-gradient(135deg, #ef4444 0%, #7c3aed 100%);
          border: none;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
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
          padding: 1rem 1.25rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: none;
          border-bottom: 1px solid var(--border-color);
          background: var(--table-header-bg);
          text-align: left;
        }
        .dashboard-premium-table td {
          padding: 1rem 1.25rem;
          font-size: 0.88rem;
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
      `}</style>
    </div>
  );
}
