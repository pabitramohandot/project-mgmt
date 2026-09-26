'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, CheckCircle2, XCircle, Clock, Filter, Search, Loader2, FileText, Check, X, ShieldAlert } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function LeaveManagementPage() {
  const { showToast, showConfirm } = useNotification();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const isAdmin = currentUser?.role === 'company_admin' || currentUser?.role === 'superadmin' || currentUser?.category === 'Company Admin' || currentUser?.category === 'Super Admin';

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user || meData || null);
      }

      const res = await fetch('/api/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showToast('Leave request submitted successfully!', 'success');
        setIsModalOpen(false);
        setForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
        fetchLeaves();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit leave request', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leaveId, status) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, status })
      });

      if (res.ok) {
        showToast(`Leave request ${status.toLowerCase()} successfully`, 'success');
        fetchLeaves();
      } else {
        const err = await res.json();
        showToast(err.error || 'Operation failed', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;

  const filteredLeaves = leaves.filter(l => {
    if (activeTab === 'pending') return l.status === 'Pending';
    if (activeTab === 'approved') return l.status === 'Approved';
    if (activeTab === 'rejected') return l.status === 'Rejected';
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Leave Management & Self Service</h1>
          <p className="page-subtitle">Apply for paid time off, track leave balances, and manage approval requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Requests</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Approved Leaves</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{approvedCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Casual Leave Balance</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>12 Days</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sick Leave Balance</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>7 Days</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'all' ? 'var(--accent-primary-glow)' : 'transparent',
            color: activeTab === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'all' ? 600 : 500,
            cursor: 'pointer'
          }}
        >
          All Requests ({leaves.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'pending' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
            color: activeTab === 'pending' ? '#f59e0b' : 'var(--text-secondary)',
            fontWeight: activeTab === 'pending' ? 600 : 500,
            cursor: 'pointer'
          }}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'approved' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
            color: activeTab === 'approved' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: activeTab === 'approved' ? 600 : 500,
            cursor: 'pointer'
          }}
        >
          Approved ({approvedCount})
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
            <div>Loading leave records...</div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h3>No Leave Requests</h3>
            <p>Click &quot;Apply for Leave&quot; to request time off.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.userId?.username || item.appliedBy}</td>
                    <td>{item.leaveType}</td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        <strong>{item.startDate}</strong> to <strong>{item.endDate}</strong>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reason}</td>
                    <td>
                      <span className={`badge ${item.status === 'Approved' ? 'badge-progress' : item.status === 'Pending' ? 'badge-planning' : 'badge-review'}`}>
                        {item.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {item.status === 'Pending' && (
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleUpdateStatus(item._id, 'Approved')}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(item._id, 'Rejected')}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {mounted && typeof document !== 'undefined' && document.body && isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Apply for Leave</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select
                  className="form-select"
                  value={form.leaveType}
                  onChange={(e) => setForm(prev => ({ ...prev, leaveType: e.target.value }))}
                >
                  <option value="Casual Leave">Casual Leave (12 left)</option>
                  <option value="Sick Leave">Sick Leave (7 left)</option>
                  <option value="Annual Leave">Annual Leave (15 left)</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.endDate}
                    onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="State the reason for leave..."
                  value={form.reason}
                  onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
