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
  AlertCircle 
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

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
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

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Invoice marked as ${newStatus}`, 'success');
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

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate invoice');
      }

      setIsModalOpen(false);
      setInvoiceForm({
        project: '',
        dueDate: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        taxRate: 0,
        discountRate: 0,
        status: 'Draft',
        notes: ''
      });
      showToast('Invoice generated successfully', 'success');
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

  const selectedProjectObj = projects.find(p => p._id === invoiceForm.project);

  return (
    <>
      <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Generate invoices, calculate taxes, and track payment receipts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <select 
          className="form-select" 
          style={{ width: '200px' }}
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
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Project</th>
                <th>Client</th>
                <th>Issued</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <Link href={`/invoices/${inv._id}`} style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td>
                    {inv.project ? (
                      <Link href={`/projects/${inv.project._id}`} style={{ color: 'var(--text-primary)' }}>
                        {inv.project.name}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Direct Invoice</span>
                    )}
                  </td>
                  <td>{inv.clientName}</td>
                  <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon Receipt'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCurrency(inv.total)}</td>
                  <td>
                    <span className={`badge badge-${inv.status.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {inv.status !== 'Paid' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                          onClick={() => handleStatusChange(inv._id, 'Paid')}
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
                        className="btn btn-danger" 
                        style={{ padding: '0.35rem', borderRadius: '8px' }}
                        onClick={() => handleDeleteInvoice(inv._id)}
                      >
                        <Trash2 size={12} />
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

      {/* Invoice Generator Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setIsModalOpen(false);
          router.replace('/invoices');
        }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Generate Invoice</h2>
              <button onClick={() => {
                setIsModalOpen(false);
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
                  router.replace('/invoices');
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
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
