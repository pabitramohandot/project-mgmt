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
  const [role, setRole] = useState('');
  const [clientLimit, setClientLimit] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchLimits = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        if (data.company?.clientLimit !== undefined) setClientLimit(data.company.clientLimit);
        if (data.clientCount !== undefined) setClientCount(data.clientCount);
      }
    } catch (err) {
      console.error('Failed to load user role/limits', err);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

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
  const [revealDetailWhatsapp, setRevealDetailWhatsapp] = useState(false);

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
    whatsapp: '',
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
    if (clientLimit > 0 && clientCount >= clientLimit) {
      showToast(`Client creation limit reached (${clientLimit}).`, 'error');
      return;
    }
    setClientForm({
      _id: '',
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
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
      whatsapp: client.whatsapp || '',
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
      setRevealDetailWhatsapp(false);
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
      fetchLimits();
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
          fetchLimits();
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
            {clientLimit > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.65rem',
                background: clientCount >= clientLimit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 174, 239, 0.06)',
                border: `1px solid ${clientCount >= clientLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 174, 239, 0.15)'}`,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: clientCount >= clientLimit ? '#ef4444' : 'var(--accent-primary)',
                marginTop: '0.5rem'
              }}>
                <Users size={12} />
                <span>Limit: {clientCount} / {clientLimit} Clients</span>
                {clientCount >= clientLimit && <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#ef4444', color: '#fff', marginLeft: '4px' }}>MAX REACHED</span>}
              </div>
            )}
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
                <th className="hide-mobile">Company</th>
                <th>Email</th>
                <th className="hide-mobile">Phone</th>
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
                  <td className="hide-mobile">
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
                  <td className="hide-mobile">
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
                      {role !== 'company_user' && (
                        <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: '8px' }} onClick={() => handleOpenEditModal(client)}>
                          <Edit size={14} />
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

      {/* Client Form Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay">
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">WhatsApp Number</label>
                  <input 
                    type="text" 
                    name="whatsapp"
                    className="form-input" 
                    placeholder="e.g., +91 9876543210"
                    value={clientForm.whatsapp || ''}
                    onChange={handleInputChange}
                  />
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
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Client Profile Detail</h2>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
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
                      {selectedClientData.client.whatsapp && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                          </svg>
                          <span>{revealDetailWhatsapp ? selectedClientData.client.whatsapp : maskPhone(selectedClientData.client.whatsapp)}</span>
                          <button 
                            onClick={() => setRevealDetailWhatsapp(!revealDetailWhatsapp)}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                            title={revealDetailWhatsapp ? "Hide WhatsApp" : "Show WhatsApp"}
                          >
                            {revealDetailWhatsapp ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </span>
                      )}
                      {selectedClientData.client.address && <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><MapPin size={14} style={{ marginTop: '2px' }} /> <span style={{ whiteSpace: 'pre-wrap' }}>{selectedClientData.client.address}</span></span>}
                    </div>

                    {/* Contact Actions for direct calling/chatting */}
                    {(selectedClientData.client.phone || selectedClientData.client.whatsapp) && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        {selectedClientData.client.phone && (
                          <a 
                            href={`tel:${selectedClientData.client.phone}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Phone size={12} /> Call
                          </a>
                        )}
                        {(selectedClientData.client.whatsapp || selectedClientData.client.phone) && (
                          <a 
                            href={`https://api.whatsapp.com/send?phone=${(selectedClientData.client.whatsapp || selectedClientData.client.phone).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.16 1.449 4.815 1.451 5.432.002 9.851-4.416 9.854-9.852.002-2.633-1.02-5.107-2.88-6.97C16.565 1.96 14.094.939 11.465.939c-5.437 0-9.857 4.418-9.859 9.856 0 1.76.47 3.47 1.365 4.978l-1.026 3.75 3.864-.986zm11.215-6.738c-.29-.144-1.711-.844-1.977-.94-.266-.097-.46-.144-.652.144-.193.289-.748.94-.917 1.133-.17.192-.338.217-.628.072-.29-.144-1.226-.452-2.335-1.442-.863-.77-1.447-1.72-1.616-2.01-.17-.29-.018-.447.127-.59.13-.129.29-.338.435-.507.145-.168.193-.289.29-.482.097-.193.048-.36-.024-.507-.072-.145-.652-1.57-.893-2.147-.234-.565-.47-.488-.652-.497-.17-.008-.362-.01-.555-.01-.193 0-.507.072-.772.36-.266.289-1.014.992-1.014 2.418 0 1.427 1.038 2.808 1.183 3.001.145.193 2.043 3.12 4.949 4.373.69.298 1.23.476 1.65.61.694.22 1.326.19 1.825.115.556-.083 1.711-.699 1.953-1.374.242-.675.242-1.253.17-1.374-.073-.12-.266-.193-.556-.34z"/>
                            </svg> WhatsApp
                          </a>
                        )}
                      </div>
                    )}
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

                {/* Modal Footer */}
                {role !== 'company_user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <button className="btn btn-danger" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDeleteClient(selectedClientData.client._id)}>
                      <Trash2 size={16} />
                      <span>Delete Profile</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
