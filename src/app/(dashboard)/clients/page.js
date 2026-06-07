'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  X, 
  Trash2, 
  Edit, 
  Briefcase, 
  FileText, 
  Clock, 
  AlertCircle,
  Eye,
  EyeOff,
  IndianRupee
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

const maskEmail = (email) => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 3) {
    return local.substring(0, 1) + '*'.repeat(local.length - 1) + '@' + domain;
  }
  if (local.length <= 6) {
    return local.substring(0, 2) + '***' + local.substring(local.length - 1) + '@' + domain;
  }
  return local.substring(0, 3) + '*****' + local.slice(-3) + '@' + domain;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('+91')) {
    const local = clean.slice(3);
    if (local.length >= 5) {
      return `+91 ${local.substring(0, 2)}*****${local.slice(-3)}`;
    }
  }
  if (clean.length >= 7) {
    return `${clean.substring(0, 3)}*****${clean.slice(-3)}`;
  }
  return phone;
};

export default function ClientsPage() {
  const { showToast, showConfirm } = useNotification();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState(null); // includes { client, projects, invoices }
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Masking states
  const [revealedEmails, setRevealedEmails] = useState({});
  const [revealedPhones, setRevealedPhones] = useState({});
  const [revealDetailEmail, setRevealDetailEmail] = useState(false);
  const [revealDetailPhone, setRevealDetailPhone] = useState(false);

  const toggleEmailVisibility = (clientId) => {
    setRevealedEmails(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const togglePhoneVisibility = (clientId) => {
    setRevealedPhones(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  // Form state
  const [clientForm, setClientForm] = useState({
    _id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/clients', window.location.origin);
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClients();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreateModal = () => {
    setClientForm({
      _id: '',
      name: '',
      email: '',
      phone: '',
      company: '',
      address: ''
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setClientForm({
      _id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || ''
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = async (clientId) => {
    try {
      setLoadingDetails(true);
      setIsDetailModalOpen(true);
      setSelectedClientData(null);
      setRevealDetailEmail(false);
      setRevealDetailPhone(false);
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to load client details');
      const data = await res.json();
      setSelectedClientData(data);
    } catch (err) {
      showToast(err.message, 'error');
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.email) {
      setFormError('Name and Email are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      
      const isEditing = !!clientForm._id;
      const url = isEditing ? `/api/clients/${clientForm._id}` : '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';

      // Exclude _id from the body when creating (empty string _id causes Mongoose CastError)
      const { _id, ...clientData } = clientForm;
      const body = isEditing ? clientForm : clientData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save client');
      }

      showToast(isEditing ? 'Client profile updated' : 'Client profile created', 'success');
      setIsFormModalOpen(false);
      fetchClients();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    showConfirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/clients/${clientId}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to delete client');
          }
          showToast('Client profile deleted', 'success');
          setIsDetailModalOpen(false);
          fetchClients();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Clients</h1>
            <p className="page-subtitle">Manage client profiles, contact information, and billing histories.</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>New Client</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search clients by name, email, company..." 
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Clients Grid */}
        {loading && clients.length === 0 ? (
          <div className="empty-state">
            <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
            <h3>Loading clients...</h3>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#ef4444' }}>
            <h3>Error loading clients</h3>
            <p>{error}</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No clients found</h3>
            <p>Add a client profile to link projects and invoices.</p>
          </div>
        ) : (
          <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client._id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {client.name}
                    </span>
                  </td>
                  <td>
                    {client.company ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        <Building size={14} style={{ color: 'var(--accent-secondary)' }} />
                        {client.company}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <Mail size={14} />
                      <span>{revealedEmails[client._id] ? client.email : maskEmail(client.email)}</span>
                      <button 
                        onClick={() => toggleEmailVisibility(client._id)}
                        style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={revealedEmails[client._id] ? "Hide Email" : "Show Email"}
                      >
                        {revealedEmails[client._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </span>
                  </td>
                  <td>
                    {client.phone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Phone size={14} />
                        <span>{revealedPhones[client._id] ? client.phone : maskPhone(client.phone)}</span>
                        <button 
                          onClick={() => togglePhoneVisibility(client._id)}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={revealedPhones[client._id] ? "Hide Phone" : "Show Phone"}
                        >
                          {revealedPhones[client._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleViewDetails(client._id)}>
                        <Eye size={14} /> Profile
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: '8px' }} onClick={() => handleOpenEditModal(client)}>
                        <Edit size={14} />
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

      {/* Client Form Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{clientForm._id ? 'Edit Client Profile' : 'Add New Client'}</h2>
              <button onClick={() => setIsFormModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  required 
                  placeholder="e.g., Jane Smith"
                  value={clientForm.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client Email *</label>
                  <input 
                    type="email" 
                    name="email"
                    className="form-input" 
                    required 
                    placeholder="e.g., jane@company.com"
                    value={clientForm.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    name="phone"
                    className="form-input" 
                    placeholder="e.g., +91 9876543210"
                    value={clientForm.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input 
                  type="text" 
                  name="company"
                  className="form-input" 
                  placeholder="e.g., Acme Corporation"
                  value={clientForm.company}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea 
                  name="address"
                  className="form-textarea" 
                  placeholder="Billing address details..."
                  value={clientForm.address}
                  onChange={handleInputChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {isDetailModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Client Profile Detail</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedClientData && (
                  <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem' }} onClick={() => handleDeleteClient(selectedClientData.client._id)}>
                    <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
                  </button>
                )}
                <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Clock className="animate-spin" size={36} style={{ color: 'var(--accent-primary)' }} />
                <p>Loading profile details...</p>
              </div>
            ) : selectedClientData ? (
              <div>
                {/* Client header information */}
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedClientData.client.name}</h3>
                    {selectedClientData.client.company && (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
                        <Building size={14} /> {selectedClientData.client.company}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} />
                        <span>{revealDetailEmail ? selectedClientData.client.email : maskEmail(selectedClientData.client.email)}</span>
                        <button 
                          onClick={() => setRevealDetailEmail(!revealDetailEmail)}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                          title={revealDetailEmail ? "Hide Email" : "Show Email"}
                        >
                          {revealDetailEmail ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </span>
                      {selectedClientData.client.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={14} />
                          <span>{revealDetailPhone ? selectedClientData.client.phone : maskPhone(selectedClientData.client.phone)}</span>
                          <button 
                            onClick={() => setRevealDetailPhone(!revealDetailPhone)}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                            title={revealDetailPhone ? "Hide Phone" : "Show Phone"}
                          >
                            {revealDetailPhone ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </span>
                      )}
                      {selectedClientData.client.address && <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><MapPin size={14} style={{ marginTop: '2px' }} /> <span style={{ whiteSpace: 'pre-wrap' }}>{selectedClientData.client.address}</span></span>}
                    </div>
                  </div>

                  {/* Financial Stats Widget */}
                  {(() => {
                    const totalBilled = selectedClientData.invoices.reduce((sum, inv) => sum + inv.total, 0);
                    const totalOutstanding = selectedClientData.invoices
                      .filter(inv => inv.status !== 'Paid')
                      .reduce((sum, inv) => sum + inv.total, 0);
                    return (
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', borderLeft: '3px solid var(--accent-primary)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL PROJECTS</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedClientData.projects.length}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL INVOICED</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{formatCurrency(totalBilled)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>OUTSTANDING DUE</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalOutstanding)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Subsections Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
                  {/* Linked Projects */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={18} style={{ color: 'var(--accent-primary)' }} /> Linked Projects ({selectedClientData.projects.length})
                    </h3>
                    {selectedClientData.projects.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No projects created for this client.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedClientData.projects.map(p => (
                          <div key={p._id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Link href={`/projects/${p._id}`} onClick={() => setIsDetailModalOpen(false)} style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', hover: { color: 'var(--accent-primary)' } }}>
                                {p.name}
                              </Link>
                              <span className={`badge badge-${p.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '0.65rem', marginTop: '4px', display: 'inline-block' }}>{p.status}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCurrency(p.budget)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Linked Invoices */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={18} style={{ color: 'var(--accent-secondary)' }} /> Invoices ({selectedClientData.invoices.length})
                    </h3>
                    {selectedClientData.invoices.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No invoices generated for this client.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedClientData.invoices.map(inv => (
                          <div key={inv._id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', padding: '0.85rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Link href={`/invoices/${inv._id}`} onClick={() => setIsDetailModalOpen(false)} style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                {inv.invoiceNumber}
                              </Link>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Issued: {new Date(inv.issueDate).toLocaleDateString()}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'block', fontWeight: 600 }}>{formatCurrency(inv.total)}</span>
                              <span className={`badge badge-${inv.status.toLowerCase()}`} style={{ fontSize: '0.65rem', marginTop: '2px', display: 'inline-block' }}>{inv.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
