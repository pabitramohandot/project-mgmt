'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  IndianRupee, 
  X, 
  Trash2, 
  Check, 
  Clock, 
  AlertCircle,
  Edit,
  Share2
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/components/NotificationProvider';

function InvoicesContent() {
  const { showToast, showConfirm } = useNotification();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedProjectId = searchParams.get('projectId');

  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('project'); // 'project' or 'client'
  const [role, setRole] = useState('');

  useEffect(() => {
    async function getRole() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        }
      } catch (err) {
        console.error('Failed to get user role:', err);
      }
    }
    getRole();
  }, []);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [sharingInvoice, setSharingInvoice] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceForm, setInvoiceForm] = useState({
    project: '',
    client: '',
    dueDate: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
    taxRate: 0,
    discountRate: 0,
    status: 'Draft',
    notes: ''
  });

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error('Failed to load clients list', e);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
    fetchClients();

    if (preselectedProjectId) {
      setInvoiceForm(prev => ({ ...prev, project: preselectedProjectId }));
      setActiveTab('project');
      setIsModalOpen(true);
    }
  }, [preselectedProjectId, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/invoices', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to load projects list', err);
    }
  };

  const handleStatusChange = async (invoiceId, newStatus, paymentMethod = '') => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'Paid') {
        payload.paymentMethod = paymentMethod;
      }
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Invoice marked as ${newStatus}`, 'success');
      setIsPaymentModalOpen(false);
      fetchInvoices();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    showConfirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete invoice');
          showToast('Invoice deleted successfully', 'success');
          fetchInvoices();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };
  const handleOpenEditModal = (inv) => {
    setEditingInvoiceId(inv._id);
    setInvoiceForm({
      project: inv.project?._id || inv.project || '',
      client: inv.client?._id || inv.client || '',
      dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '',
      items: (inv.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      })),
      taxRate: inv.taxRate || 0,
      discountRate: inv.discountRate || 0,
      status: inv.status || 'Draft',
      notes: inv.notes || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };
  
  const handleOpenShareModal = (inv) => {
    setSharingInvoice(inv);
    setShareEmail(inv.clientEmail || '');
    const clientObj = clients.find(c => c._id === inv.client);
    setSharePhone(clientObj?.phone || clientObj?.whatsapp || '');
    setIsShareModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    if (!sharingInvoice) return;
    const formattedDueDate = sharingInvoice.dueDate 
      ? new Date(sharingInvoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Upon Receipt';
    const projectName = sharingInvoice.projectName || sharingInvoice.project?.name || 'your project';
    const message = `Hi, please find the invoice ${sharingInvoice.invoiceNumber} for ${projectName} in your mail.\n\n*Please Make your Payment before Due Date: ${formattedDueDate}*`;
    const encodedText = encodeURIComponent(message);
    const cleanPhone = sharePhone.replace(/[^\d+]/g, "");
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    if (!sharingInvoice) return;
    setIsShareModalOpen(false);
    showToast('Generating PDF and sending email...', 'info');
    router.push(`/invoices/${sharingInvoice._id}?send=true`);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setInvoiceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...invoiceForm.items];
    updatedItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setInvoiceForm(prev => ({ ...prev, items: updatedItems }));
  };

  const handleAddItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (invoiceForm.items.length === 1) return;
    const updatedItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceForm.project) {
      setFormError('Please select a project');
      return;
    }
    if (invoiceForm.items.some(item => !item.description || item.rate <= 0)) {
      setFormError('Please fill in all item descriptions and rates');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const url = editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : '/api/invoices';
      const method = editingInvoiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save invoice');
      }

      setIsModalOpen(false);
      setEditingInvoiceId(null);
      setInvoiceForm({
        project: '',
        client: '',
        dueDate: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        taxRate: 0,
        discountRate: 0,
        status: 'Draft',
        notes: ''
      });
      showToast(editingInvoiceId ? 'Invoice updated successfully' : 'Invoice generated successfully', 'success');
      router.replace('/invoices');
      fetchInvoices();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = subtotal * (invoiceForm.taxRate / 100);
  const discountAmount = subtotal * (invoiceForm.discountRate / 100);
  const grandTotal = subtotal + taxAmount - discountAmount;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const companyName = (inv.projectName || inv.project?.name || '').toLowerCase();
    const invoiceNo = (inv.invoiceNumber || '').toLowerCase();
    const clientName = (inv.clientName || inv.client?.name || '').toLowerCase();
    const issueDateStr = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString().toLowerCase() : '';
    const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString().toLowerCase() : 'upon receipt';

    return companyName.includes(query) ||
           invoiceNo.includes(query) ||
           clientName.includes(query) ||
           issueDateStr.includes(query) ||
           dueDateStr.includes(query);
  });

  const selectedProjectObj = projects.find(p => p._id === invoiceForm.project);

  return (
    <>
      <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Generate invoices, calculate taxes, and track payment receipts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingInvoiceId(null);
          setInvoiceForm({
            project: '',
            client: '',
            dueDate: '',
            items: [{ description: '', quantity: 1, rate: 0 }],
            taxRate: 0,
            discountRate: 0,
            status: 'Draft',
            notes: ''
          });
          setFormError(null);
          setIsModalOpen(true);
        }}>
          <Plus size={18} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', width: '100%' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <Search 
            size={16} 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
          />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by invoice no, company, client or dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%', borderRadius: '8px', fontSize: '0.9rem', height: '40px' }}
          />
        </div>
        <select 
          className="form-select" 
          style={{ width: '200px', height: '40px', borderRadius: '8px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      {loading && invoices.length === 0 ? (
        <div className="empty-state">
          <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
          <h3>Loading invoices...</h3>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <h3>Error loading invoices</h3>
          <p>{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No invoices generated</h3>
          <p>Create an invoice from this page or directly inside a project.</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <Search size={48} style={{ color: 'var(--text-secondary)' }} />
          <h3>No matching invoices found</h3>
          <p>Try refining your search query or clear the filter.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th className="hide-mobile">Project</th>
                <th>Client</th>
                <th className="hide-mobile">Issued</th>
                <th className="hide-mobile">Due Date</th>
                <th>Total</th>
                <th className="hide-mobile">Payment Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <Link href={`/invoices/${inv._id}`} style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="hide-mobile">
                    {inv.project ? (
                      <Link href={`/projects/${inv.project._id}`} style={{ color: 'var(--text-primary)' }}>
                        {inv.project.name}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Direct Invoice</span>
                    )}
                  </td>
                  <td>{inv.clientName}</td>
                  <td className="hide-mobile">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="hide-mobile">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon Receipt'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCurrency(inv.total)}</td>
                  <td className="hide-mobile">
                    {inv.status === 'Paid' ? (
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {inv.paymentMethod || '—'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    {role !== 'company_user' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {inv.status !== 'Paid' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                            onClick={() => {
                              setSelectedInvoiceId(inv._id);
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            <Check size={12} style={{ marginRight: '2px' }} /> Paid
                          </button>
                        )}
                        {inv.status === 'Draft' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                            onClick={() => router.push(`/invoices/${inv._id}?send=true`)}
                          >
                            Send Mail
                          </button>
                        )}
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem', borderRadius: '8px', color: 'var(--accent-primary)', borderColor: 'rgba(0, 174, 239, 0.2)' }}
                          onClick={() => handleOpenShareModal(inv)}
                          title="Share Invoice"
                        >
                          <Share2 size={12} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem', borderRadius: '8px' }}
                          onClick={() => handleOpenEditModal(inv)}
                          title="Edit Invoice"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.35rem', borderRadius: '8px' }}
                          onClick={() => handleDeleteInvoice(inv._id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Invoice Generator Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingInvoiceId ? 'Edit Invoice' : 'Generate Invoice'}</h2>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingInvoiceId(null);
                router.replace('/invoices');
              }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Link Project *</label>
                  <SearchableSelect
                    options={projects.map(p => ({
                      value: p._id,
                      label: p.name,
                      sublabel: `Client: ${p.clientName}`,
                      searchText: `${p.name} ${p.clientName}`
                    }))}
                    placeholder="Search and link project..."
                    required={true}
                    value={invoiceForm.project}
                    onChange={(val) => {
                      setInvoiceForm(prev => ({ ...prev, project: val }));
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input 
                    type="date" 
                    name="dueDate" 
                    className="form-input" 
                    value={invoiceForm.dueDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              {selectedProjectObj && (() => {
                const projectClientObj = clients.find(c => c._id === selectedProjectObj.client) || 
                                         clients.find(c => c.name.toLowerCase() === selectedProjectObj.clientName.toLowerCase());
                return (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>CLIENT BILLING INFO (AUTO-FILLED)</h4>
                    {projectClientObj?.company ? (
                      <>
                        <strong>Company Name:</strong> {projectClientObj.company} <br />
                        <strong>Billing Address:</strong> {projectClientObj.address || 'N/A'}
                      </>
                    ) : (
                      <>
                        <strong>Client Name:</strong> {selectedProjectObj.clientName} <br />
                        <strong>Client Email:</strong> {selectedProjectObj.clientEmail || 'N/A'}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Dynamic Items List */}
              <div className="items-list-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4>Line Items</h4>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleAddItem}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                {invoiceForm.items.map((item, index) => (
                  <div className="invoice-item-row" key={index}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Description *</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Frontend Development" 
                        className="form-input"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty *</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="form-input"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate (₹) *</label>
                      <input 
                        type="number" 
                        min="0" 
                        placeholder="Hour rate or flat" 
                        className="form-input"
                        required
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ padding: '0.65rem', borderRadius: '10px' }}
                      disabled={invoiceForm.items.length === 1}
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Tax & Discount Inputs & Notes */}
              <div className="form-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tax Rate (%)</label>
                      <input 
                        type="number" 
                        name="taxRate" 
                        min="0"
                        className="form-input" 
                        value={invoiceForm.taxRate}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discount (%)</label>
                      <input 
                        type="number" 
                        name="discountRate" 
                        min="0"
                        className="form-input" 
                        value={invoiceForm.discountRate}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes / Payment Terms</label>
                    <textarea 
                      name="notes" 
                      placeholder="e.g. Bank transfer info, payment due within 15 days..." 
                      className="form-textarea"
                      style={{ minHeight: '80px' }}
                      value={invoiceForm.notes}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                {/* Calculation Summary Widget */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: 'fit-content' }}>
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Calculation</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tax ({invoiceForm.taxRate}%):</span>
                      <span style={{ color: '#ef4444' }}>+{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Discount ({invoiceForm.discountRate}%):</span>
                      <span style={{ color: '#10b981' }}>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <span>Grand Total:</span>
                    <span style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsModalOpen(false);
                  setEditingInvoiceId(null);
                  router.replace('/invoices');
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingInvoiceId ? 'Save Invoice' : 'Generate Invoice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Method Selector Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Select Payment Method</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Specify how the client paid this invoice:
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Payment Type</label>
              <select 
                className="form-select"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleStatusChange(selectedInvoiceId, 'Paid', selectedPaymentMethod)} 
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
              >
                Confirm & Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {isShareModalOpen && sharingInvoice && (
        <div className="modal-overlay" onClick={() => { setIsShareModalOpen(false); setSharingInvoice(null); }}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Share Invoice {sharingInvoice.invoiceNumber}</h2>
              <button onClick={() => { setIsShareModalOpen(false); setSharingInvoice(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Share the public link of this invoice with the client via WhatsApp or Email.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>WhatsApp Number</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. +919988776655"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Email Address</label>
              <input 
                type="email" 
                className="form-input"
                placeholder="e.g. client@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleShareWhatsApp} 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 600 }}
              >
                Share on WhatsApp
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleShareEmail} 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}
              >
                Share via Email
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setIsShareModalOpen(false); setSharingInvoice(null); }}
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="empty-state"><h3>Loading invoices...</h3></div>}>
      <InvoicesContent />
    </Suspense>
  );
}
