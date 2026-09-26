'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  DollarSign,
  Award,
  Layers,
  PhoneCall,
  UserPlus,
  Clock,
  RefreshCw,
  Plus,
  ChevronRight,
  User,
  Building
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { formatCurrency as fmtCurrency } from '@/lib/currency';

export default function CRMDashboardPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [data, setData] = useState({
    totalLeads: 0,
    totalPipelineValue: 0,
    totalWonValue: 0,
    wonCount: 0,
    lostCount: 0,
    winRate: 0,
    stageBreakdown: {},
    sourceBreakdown: {},
    recentLeads: [],
    upcomingActivities: [],
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [res, meRes] = await Promise.all([
        fetch('/api/crm/dashboard'),
        fetch('/api/auth/me')
      ]);
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.company?.currency) setCompanyCurrency(meData.company.currency);
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('Failed to load CRM analytics', 'error');
      }
    } catch (e) {
      console.error('Error fetching CRM dashboard:', e);
      showToast('Error loading CRM stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val) => {
    return fmtCurrency(val || 0, companyCurrency);
  };

  const getStageColor = (stageKey) => {
    const colors = {
      new: '#3b82f6',
      contacted: '#8b5cf6',
      qualified: '#06b6d4',
      proposal: '#f59e0b',
      negotiation: '#ec4899',
      won: '#10b981',
      lost: '#ef4444',
    };
    return colors[stageKey] || '#00aeef';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading CRM Analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <Target size={28} style={{ color: 'var(--accent-primary)' }} />
            CRM Overview & Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Track leads, manage deal pipelines, and monitor conversion velocity.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchStats}
            className="btn btn-secondary"
            style={{ padding: '0.6rem', borderRadius: '10px' }}
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
          <Link href="/crm/leads?action=add" className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
            <Plus size={16} />
            <span>Add New Lead</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Total Leads */}
        <div className="card stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#3b82f6', fontWeight: 700 }}>Total Leads</span>
            <span className="stat-value" style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{data.totalLeads}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Active CRM Database</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <UserPlus size={24} />
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--accent-primary)', fontWeight: 700 }}>Active Pipeline</span>
            <span className="stat-value" style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{formatCurrency(data.totalPipelineValue)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Value across deal stages</span>
          </div>
          <div className="stat-icon" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* Won Revenue */}
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#10b981', fontWeight: 700 }}>Closed Won Revenue</span>
            <span className="stat-value" style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{formatCurrency(data.totalWonValue)}</span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.5rem' }}>{data.wonCount} Deals Won</span>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Win Rate */}
        <div className="card stat-card">
          <div className="stat-info" style={{ width: '100%' }}>
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#a855f7', fontWeight: 700 }}>Win Conversion Rate</span>
            <span className="stat-value" style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{data.winRate}%</span>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '4px', marginTop: '0.65rem', overflow: 'hidden' }}>
              <div style={{ width: `${data.winRate}%`, background: '#a855f7', height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Main Analytics: Stage Funnel & Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Pipeline Stage Breakdown */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: 'span 2 / span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
                Pipeline Funnel & Stage Breakdown
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Deal distribution and monetary values per sales funnel phase.
              </p>
            </div>
            <Link href="/crm/leads" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View Board <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(data.stageBreakdown || {}).map(([stageKey, info]) => {
              const stageColor = getStageColor(stageKey);
              const percentage = data.totalLeads > 0 ? Math.round((info.count / data.totalLeads) * 100) : 0;
              return (
                <div key={stageKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stageColor }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {info.label || stageKey}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {info.count} {info.count === 1 ? 'lead' : 'leads'}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(info.value)}
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, background: stageColor, height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Acquisition Sources */}
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Acquisition Sources</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Where your leads originate.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(data.sourceBreakdown || {}).length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>No lead sources yet.</p>
            ) : (
              Object.entries(data.sourceBreakdown).map(([sourceName, count]) => {
                const pct = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
                return (
                  <div key={sourceName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sourceName}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}% of total leads</p>
                    </div>
                    <span style={{ padding: '0.2rem 0.6rem', background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Leads & Upcoming Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Leads */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--accent-primary)' }} />
              Recent Leads
            </h3>
            <Link href="/crm/leads" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.recentLeads.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No recent leads.</p>
            ) : (
              data.recentLeads.map((lead) => (
                <div key={lead._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{lead.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {lead.contactName} {lead.companyName ? `• ${lead.companyName}` : ''}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      {formatCurrency(lead.value)}
                    </span>
                    <span className="badge" style={{ background: `${getStageColor(lead.stage)}20`, color: getStageColor(lead.stage), fontSize: '0.65rem' }}>
                      {lead.stage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scheduled Follow-ups */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PhoneCall size={18} style={{ color: '#a855f7' }} />
              Upcoming Follow-ups
            </h3>
            <Link href="/crm/activities" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.upcomingActivities.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No pending follow-ups.</p>
            ) : (
              data.upcomingActivities.map((act) => (
                <div key={act._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', marginTop: '0.1rem' }}>
                    <Clock size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{act.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Lead: {act.leadId?.title || act.leadId?.contactName || 'N/A'}
                    </span>
                  </div>
                  {act.scheduledAt && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                      {new Date(act.scheduledAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
