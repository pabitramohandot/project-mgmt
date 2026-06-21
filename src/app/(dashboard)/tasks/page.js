'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Server, 
  CheckCircle,
  Briefcase, 
  ArrowRight,
  Filter,
  Globe,
  Calendar
} from 'lucide-react';

export default function PendingTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch tasks data');
        const data = await res.json();
        setTasks(data.pendingTasks || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'invoice_draft') return task.type === 'invoice_draft';
    if (filter === 'hosting_expiry') return task.type === 'hosting_expiry';
    if (filter === 'domain_expiry') return task.type === 'domain_expiry';
    if (filter === 'project_pending') return task.type === 'project_pending';
    if (filter === 'calendar_pending') return task.type === 'calendar_pending';
    return true;
  });

  const getTaskStyles = (type) => {
    switch (type) {
      case 'hosting_expiry':
        return {
          icon: Server,
          color: '#ec4899',
          bgLight: 'rgba(236, 72, 153, 0.1)',
          badgeText: 'HOSTING EXPIRY'
        };
      case 'domain_expiry':
        return {
          icon: Globe,
          color: '#8b5cf6',
          bgLight: 'rgba(139, 92, 246, 0.1)',
          badgeText: 'DOMAIN EXPIRY'
        };
      case 'project_pending':
        return {
          icon: Briefcase,
          color: '#f59e0b',
          bgLight: 'rgba(245, 158, 11, 0.1)',
          badgeText: 'PROJECT OVERDUE'
        };
      case 'invoice_draft':
        return {
          icon: FileText,
          color: '#3b82f6',
          bgLight: 'rgba(59, 130, 246, 0.1)',
          badgeText: 'INVOICE DRAFT'
        };
      case 'calendar_pending':
        return {
          icon: Calendar,
          color: '#06b6d4',
          bgLight: 'rgba(6, 182, 212, 0.1)',
          badgeText: 'POST PENDING'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'var(--accent-primary)',
          bgLight: 'rgba(139, 92, 246, 0.1)',
          badgeText: 'ACTION REQUIRED'
        };
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Tasks</h1>
          <p className="page-subtitle">Action required items regarding invoices, project statuses, and system hosting dates.</p>
        </div>
      </div>

      {/* Filter and Stats Segment */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFilter('all')} 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            All ({tasks.length})
          </button>
          <button 
            onClick={() => setFilter('invoice_draft')} 
            className={`btn ${filter === 'invoice_draft' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Draft Invoices ({tasks.filter(t => t.type === 'invoice_draft').length})
          </button>
          <button 
            onClick={() => setFilter('hosting_expiry')} 
            className={`btn ${filter === 'hosting_expiry' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Hosting Expiry ({tasks.filter(t => t.type === 'hosting_expiry').length})
          </button>
          <button 
            onClick={() => setFilter('domain_expiry')} 
            className={`btn ${filter === 'domain_expiry' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Domain Expiry ({tasks.filter(t => t.type === 'domain_expiry').length})
          </button>
          <button 
            onClick={() => setFilter('project_pending')} 
            className={`btn ${filter === 'project_pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Overdue Projects ({tasks.filter(t => t.type === 'project_pending').length})
          </button>
          <button 
            onClick={() => setFilter('calendar_pending')} 
            className={`btn ${filter === 'calendar_pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            Pending Posts ({tasks.filter(t => t.type === 'calendar_pending').length})
          </button>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} />
          <span>Showing {filteredTasks.length} tasks</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
          <h3>Loading your tasks...</h3>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <AlertTriangle size={48} />
          <h3>Error loading tasks</h3>
          <p>{error}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} style={{ color: '#10b981' }} />
          <h3>All caught up!</h3>
          <p>No pending tasks found for the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTasks.map((task) => {
            const styles = getTaskStyles(task.type);
            const TaskIcon = styles.icon;

            return (
              <div 
                key={`${task.type}-${task.id}`} 
                className="card pending-task-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  borderLeft: `4px solid ${styles.color}`,
                  background: 'var(--bg-card)',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
                  <div style={{
                    background: styles.bgLight,
                    color: styles.color,
                    padding: '0.75rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TaskIcon size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: `${styles.color}20`, color: styles.color, fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                        {styles.badgeText}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Dated: {new Date(task.date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {task.title}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                      {task.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Link href={task.link} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span>Resolve Action</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
