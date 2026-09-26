'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Handshake,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { formatCurrency as fmtCurrency } from '@/lib/currency';

export default function DealsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [leads, setLeads] = useState([]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const [res, meRes] = await Promise.all([
        fetch('/api/crm/leads'),
        fetch('/api/auth/me')
      ]);
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.company?.currency) setCompanyCurrency(meData.company.currency);
      }
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading deals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const formatCurrency = (val) => {
    return fmtCurrency(val || 0, companyCurrency);
  };

  // Metrics
  const activeDeals = leads.filter((l) => l.stage !== 'lost');
  const totalPipelineValue = activeDeals.reduce((acc, l) => acc + (l.value || 0), 0);
  const weightedValue = activeDeals.reduce((acc, l) => acc + (l.value || 0) * ((l.winProbability || 20) / 100), 0);
  const avgDealSize = activeDeals.length > 0 ? Math.round(totalPipelineValue / activeDeals.length) : 0;

  const handleStageChange = async (leadId, newStage) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        showToast('Deal stage updated', 'success');
        fetchDeals();
      }
    } catch (e) {
      showToast('Error updating deal', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <Handshake size={28} style={{ color: 'var(--accent-primary)' }} />
            Deals & Revenue Pipeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Monitor sales opportunities, deal sizes, closing dates, and weighted expected revenue.
          </p>
        </div>
        <Link href="/crm/leads?action=add" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
          <Plus size={16} /> Add New Opportunity
        </Link>
      </div>

      {/* Financial Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Active Opportunities</span>
            <span className="stat-value" style={{ fontSize: '2rem' }}>{activeDeals.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deals in sales pipeline</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Unweighted Pipeline</span>
            <span className="stat-value" style={{ fontSize: '2rem', color: 'var(--accent-primary)' }}>{formatCurrency(totalPipelineValue)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% deal sum</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#10b981' }}>Weighted Forecast</span>
            <span className="stat-value" style={{ fontSize: '2rem', color: '#10b981' }}>{formatCurrency(weightedValue)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adjusted by win prob %</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title" style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#a855f7' }}>Average Deal Size</span>
            <span className="stat-value" style={{ fontSize: '2rem', color: '#a855f7' }}>{formatCurrency(avgDealSize)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per active deal</span>
          </div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Deal Title</th>
              <th>Client / Contact</th>
              <th>Deal Value</th>
              <th>Win Prob %</th>
              <th>Weighted Value</th>
              <th>Stage</th>
              <th>Expected Close</th>
            </tr>
          </thead>
          <tbody>
            {activeDeals.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No active deals available.
                </td>
              </tr>
            ) : (
              activeDeals.map((deal) => {
                const prob = deal.winProbability || 20;
                const weighted = (deal.value || 0) * (prob / 100);
                return (
                  <tr key={deal._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{deal.title}</td>
                    <td>{deal.contactName} {deal.companyName ? `(${deal.companyName})` : ''}</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(deal.value)}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{prob}%</span></td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(weighted)}</td>
                    <td>
                      <select
                        value={deal.stage}
                        onChange={(e) => handleStageChange(deal._id, e.target.value)}
                        className="form-select"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                      >
                        <option value="new">New Lead</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="proposal">Proposal Sent</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {deal.expectedCloseDate
                        ? new Date(deal.expectedCloseDate).toLocaleDateString()
                        : 'Not set'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
