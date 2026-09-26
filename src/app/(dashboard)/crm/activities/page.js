'use client';

import { useState, useEffect } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function ActivitiesPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'completed', 'all'

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/activities');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading activities', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleToggleDone = async (id, currentDone) => {
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDone: !currentDone }),
      });
      if (res.ok) {
        showToast(!currentDone ? 'Marked as completed' : 'Re-opened activity', 'success');
        fetchActivities();
      }
    } catch (e) {
      showToast('Failed to update activity status', 'error');
    }
  };

  const filtered = activities.filter((act) => {
    if (filterType && act.type !== filterType) return false;
    if (filterStatus === 'pending' && act.isDone) return false;
    if (filterStatus === 'completed' && !act.isDone) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <PhoneCall size={28} style={{ color: 'var(--accent-primary)' }} />
            CRM Activities & Follow-ups
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Schedule and complete calls, meetings, follow-ups, and interaction notes with leads.
          </p>
        </div>

        {/* Status Tab Switch */}
        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.25rem', borderRadius: '10px', display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)' }}>
          {['pending', 'completed', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                background: filterStatus === st ? 'var(--accent-primary-glow)' : 'transparent',
                color: filterStatus === st ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: filterStatus === st ? '1px solid var(--accent-primary)' : 'none',
                borderRadius: '8px'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '38px' }}
        >
          <option value="">All Activity Types</option>
          <option value="Call">Call</option>
          <option value="Meeting">Meeting</option>
          <option value="Email">Email</option>
          <option value="Note">Note</option>
          <option value="Task">Task</option>
          <option value="Status Change">Status Change</option>
        </select>
      </div>

      {/* Activity List */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={28} style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No activities found matching criteria.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((act) => (
              <div key={act._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => handleToggleDone(act._id, act.isDone)}
                  style={{
                    marginTop: '0.15rem',
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: act.isDone ? '#10b981' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {act.isDone && <CheckCircle2 size={16} />}
                </button>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="badge" style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', fontSize: '0.65rem' }}>
                      {act.type}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: act.isDone ? 'line-through' : 'none' }}>
                      {act.title}
                    </h4>
                  </div>

                  {act.description && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{act.description}</p>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {act.leadId && (
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Lead: {act.leadId.title || act.leadId.contactName}
                      </span>
                    )}
                    {act.performedBy && <span>By: {act.performedBy.name || act.performedBy.email}</span>}
                  </div>
                </div>

                {act.scheduledAt && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                    {new Date(act.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
