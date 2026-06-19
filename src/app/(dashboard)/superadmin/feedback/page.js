'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/components/NotificationProvider';
import { MessageSquare, Bug, Lightbulb, X, Clock, ExternalLink, ShieldAlert, Loader2, Trash2, Search } from 'lucide-react';

export default function SuperAdminFeedbackPage() {
  const { showToast, showConfirm } = useNotification();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'bug' | 'feature'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [statusVal, setStatusVal] = useState('');
  const [notesVal, setNotesVal] = useState('');

  // Fetch all feedback reports
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      } else {
        showToast('Failed to load feedback logs.', 'error');
      }
    } catch (error) {
      console.error('Fetch feedback error:', error);
      showToast('Error loading feedback data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleOpenDetail = (feedback) => {
    setSelectedFeedback(feedback);
    setStatusVal(feedback.status);
    setNotesVal(feedback.adminNotes || '');
  };

  const handleCloseDetail = () => {
    setSelectedFeedback(null);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/feedback/${selectedFeedback._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusVal,
          adminNotes: notesVal
        })
      });

      if (res.ok) {
        showToast('Feedback status updated successfully.', 'success');
        handleCloseDetail();
        fetchFeedbacks(); // Refresh grid
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update feedback.', 'error');
      }
    } catch (error) {
      console.error('Update feedback error:', error);
      showToast('Error updating status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFeedback = (id) => {
    showConfirm({
      title: 'Delete Feedback',
      message: 'Are you sure you want to delete this feedback report? This will permanently delete the report and any associated notifications. This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/feedback/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Feedback deleted successfully.', 'success');
            fetchFeedbacks();
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete feedback.', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting feedback.', 'error');
        }
      }
    });
  };

  const filteredFeedbacks = feedbacks.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const descMatch = item.description?.toLowerCase().includes(query);
      const companyMatch = item.companyId?.name?.toLowerCase().includes(query);
      const submitterMatch = item.userId?.username?.toLowerCase().includes(query);
      if (!descMatch && !companyMatch && !submitterMatch) return false;
    }
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'resolved': return 'badge-completed';
      case 'in-progress': return 'badge-in-progress';
      case 'rejected': return 'badge-failed';
      default: return 'badge-pending';
    }
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="empty-state">
        <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h3>Loading feedback entries...</h3>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Feedback & Reports</h1>
          <p className="page-subtitle">Inspect bugs reported and feature requested by tenant companies.</p>
        </div>
      </div>

      {/* Type Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem'
      }}>
        <button 
          onClick={() => setFilter('all')} 
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
        >
          All ({feedbacks.length})
        </button>
        <button 
          onClick={() => setFilter('bug')} 
          className={`btn ${filter === 'bug' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '0.4rem 1rem', 
            borderRadius: '8px', 
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Bug size={14} />
          <span>Bugs ({feedbacks.filter(f => f.type === 'bug').length})</span>
        </button>
        <button 
          onClick={() => setFilter('feature')} 
          className={`btn ${filter === 'feature' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '0.4rem 1rem', 
            borderRadius: '8px', 
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Lightbulb size={14} />
          <span>Features ({feedbacks.filter(f => f.type === 'feature').length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input 
            type="text" 
            placeholder="Search feedback by description, submitter or company..." 
            className="form-input"
            style={{ paddingLeft: '2.75rem', height: '40px', borderRadius: '10px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns on the right */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ 
              minWidth: '150px', 
              height: '40px', 
              padding: '0.5rem 0.75rem', 
              fontSize: '0.875rem', 
              borderRadius: '10px', 
              background: 'var(--bg-card)', 
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="card" style={{ padding: '0' }}>
        {filteredFeedbacks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <h3>No feedback submissions found</h3>
            <p>Submissions will list here when client accounts file bugs or requested improvements.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Company</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Submitter</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Details Summary</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      {item.type === 'bug' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Bug size={14} />
                          <span>Bug</span>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Lightbulb size={14} />
                          <span>Feature</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {item.companyId?.name || 'Deleted Company'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      {item.userId?.username || 'Deleted User'}
                    </td>
                    <td style={{ padding: '1rem', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleOpenDetail(item)} 
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteFeedback(item._id)} 
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', color: 'var(--status-overdue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Delete Feedback"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Details Modal */}
      {selectedFeedback && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedFeedback.type === 'bug' ? <Bug size={22} style={{ color: '#ef4444' }} /> : <Lightbulb size={22} style={{ color: '#eab308' }} />}
                <span>{selectedFeedback.type === 'bug' ? 'Bug Report Details' : 'Feature Request Details'}</span>
              </h2>
              <button onClick={handleCloseDetail} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Company</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedFeedback.companyId?.name || 'Unknown'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Submitter</span>
                <strong style={{ fontSize: '0.9rem' }}>{selectedFeedback.userId?.username || 'Unknown'} ({selectedFeedback.userId?.email || 'N/A'})</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Submitted On</span>
                <strong style={{ fontSize: '0.9rem' }}>{new Date(selectedFeedback.createdAt).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                {selectedFeedback.type === 'bug' ? (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Select Page</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>{selectedFeedback.page || 'N/A'}</strong>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Reference URL</span>
                    {selectedFeedback.referenceUrl ? (
                      <a href={selectedFeedback.referenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Link</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <strong style={{ fontSize: '0.9rem' }}>N/A</strong>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</h4>
              <p style={{ 
                fontSize: '0.95rem', 
                lineHeight: 1.5, 
                background: 'rgba(255,255,255,0.01)', 
                padding: '0.75rem 1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap'
              }}>{selectedFeedback.description}</p>
            </div>

            {/* Screenshot Preview */}
            {selectedFeedback.screenshot && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Uploaded Image</h4>
                <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <img 
                    src={selectedFeedback.screenshot} 
                    alt="Feedback attachments" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '200px' }} 
                  />
                  <a 
                    href={selectedFeedback.screenshot} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Zoom</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}

            {/* Admin Controls */}
            <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={18} style={{ color: 'var(--accent-secondary)' }} />
                <span>Admin Resolution Controls</span>
              </h3>

              <div className="grid-2col" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Status *</label>
                  <select 
                    className="form-input" 
                    required 
                    value={statusVal} 
                    onChange={(e) => setStatusVal(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Admin Response Notes</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  placeholder="Type updates or notes here to share with the company..."
                  value={notesVal} 
                  onChange={(e) => setNotesVal(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCloseDetail} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  Close
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={updating}
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-primary)'
                  }}
                >
                  {updating && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
