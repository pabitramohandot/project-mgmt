'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, Folder, ExternalLink, Trash2, Loader2, X, Download, ShieldCheck } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function HRDocumentsPage() {
  const { showToast, showConfirm } = useNotification();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [form, setForm] = useState({
    name: '',
    category: 'Company Policy',
    fileUrl: '',
    notes: ''
  });

  const isAdmin = currentUser?.role === 'company_admin' || currentUser?.role === 'superadmin' || currentUser?.category === 'Company Admin' || currentUser?.category === 'Super Admin';

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user || meData || null);
      }

      const res = await fetch('/api/hr-documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading documents vault', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!form.name || !form.fileUrl) {
      showToast('Document Name and File URL are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/hr-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showToast('Document uploaded to vault!', 'success');
        setIsModalOpen(false);
        setForm({ name: '', category: 'Company Policy', fileUrl: '', notes: '' });
        fetchDocuments();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add document', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoc = (id, name) => {
    showConfirm({
      title: 'Delete Document',
      message: `Are you sure you want to delete document "${name}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hr-documents?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Document removed', 'success');
            fetchDocuments();
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to delete document', 'error');
        }
      }
    });
  };

  const filteredDocs = documents.filter(d => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">HR & Employee Documents Vault</h1>
          <p className="page-subtitle">Centralized repository for company policies, offer letters, contracts, and tax documents.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Folder size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Files</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{documents.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Company Policies</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{documents.filter(d => d.category === 'Company Policy').length}</div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {['all', 'Company Policy', 'Offer Letter', 'Contract', 'Tax Form', 'ID Proof'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: categoryFilter === cat ? 'var(--accent-primary-glow)' : 'var(--bg-card)',
              color: categoryFilter === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: categoryFilter === cat ? 600 : 400,
              cursor: 'pointer'
            }}
          >
            {cat === 'all' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
            <div>Loading document vault...</div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Folder size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h3>No Documents Found</h3>
            <p>Documents uploaded by company HR will appear here.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-progress" style={{ fontSize: '0.72rem' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink size={14} />
                          <span>View Document</span>
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteDoc(item._id, item.name)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mounted && typeof document !== 'undefined' && document.body && isModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Upload Document to Vault</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddDocument}>
              <div className="form-group">
                <label className="form-label">Document Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Employee Code of Conduct 2026"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Company Policy">Company Policy</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Contract">Contract & Agreement</option>
                  <option value="Tax Form">Tax Form</option>
                  <option value="ID Proof">ID Proof</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">File URL *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. https://domain.com/files/policy.pdf"
                  value={form.fileUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }} disabled={submitting}>
                {submitting ? 'Uploading...' : 'Save Document'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
