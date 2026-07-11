'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Mail, Phone, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function RegisterRequestsPage() {
  const { showToast, showConfirm } = useNotification();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/register');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
      } else {
        showToast('Failed to fetch registration requests', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading registration requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/superadmin/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        showToast(`Request marked as ${newStatus}`, 'success');
        fetchRequests();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating status', 'error');
    }
  };

  const handleDeleteRequest = (id, name) => {
    showConfirm({
      title: 'Delete Request',
      message: `Are you sure you want to delete the registration request from "${name}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/superadmin/register?id=${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Request deleted successfully', 'success');
            fetchRequests();
          } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete request', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting request', 'error');
        }
      }
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.mobile.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-completed';
      case 'contacted': return 'badge-progress';
      case 'rejected': return 'badge-overdue';
      default: return 'badge-planning';
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Registration</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
            View and manage onboarding requests from the sign-up page.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex justify-between items-center gap-4" style={{
        background: 'var(--bg-card)',
        padding: '1.25rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, company..."
            className="form-input"
            style={{ paddingLeft: '2.75rem', width: '100%', height: '44px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select
            className="form-input"
            style={{ width: '160px', height: '44px', background: 'var(--bg-card)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <span style={{ color: 'var(--text-muted)' }}>Loading registration requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No requests found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search filters.' : 'No sign-up queries have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive" style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Requested On</th>
                <th style={{ padding: '1rem' }}>Contact Info</th>
                <th style={{ padding: '1rem' }}>Company Details</th>
                <th style={{ padding: '1rem' }}>Size</th>
                <th style={{ padding: '1rem' }}>Source</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                  {/* Requested On */}
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{req.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <Mail size={12} />
                      <a href={`mailto:${req.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{req.email}</a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      <Phone size={12} />
                      <a href={`tel:${req.mobile}`} style={{ color: 'inherit', textDecoration: 'none' }}>{req.mobile}</a>
                    </div>
                  </td>

                  {/* Company Details */}
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {req.companyName}
                    </div>
                  </td>

                  {/* Size */}
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {req.employees} emp
                  </td>

                  {/* Source */}
                  <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {req.source}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <span className={`badge ${getStatusBadgeClass(req.status)}`} style={{ textTransform: 'capitalize' }}>
                      {req.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Mark Contacted */}
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(req._id, 'contacted')}
                          title="Mark as Contacted"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#00aeef',
                            padding: '0.25rem'
                          }}
                        >
                          <MessageSquare size={18} />
                        </button>
                      )}

                      {/* Approve */}
                      {req.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(req._id, 'approved')}
                          title="Approve"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#10b981',
                            padding: '0.25rem'
                          }}
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}

                      {/* Reject */}
                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(req._id, 'rejected')}
                          title="Reject"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '0.25rem'
                          }}
                        >
                          <XCircle size={18} />
                        </button>
                      )}

                      {/* Divider */}
                      <span style={{ borderLeft: '1px solid var(--border-color)', height: '14px', margin: '0 0.25rem' }}></span>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteRequest(req._id, req.name)}
                        title="Delete Request"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: '0.25rem'
                        }}
                      >
                        <Trash2 size={18} />
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
  );
}
