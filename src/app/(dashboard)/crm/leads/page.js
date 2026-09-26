'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  Download,
  Trash2,
  Edit,
  User,
  Building,
  Check,
  Clock,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { formatCurrency as fmtCurrency } from '@/lib/currency';

const STAGES = [
  { key: 'new', label: 'New Lead', color: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { key: 'qualified', label: 'Qualified', color: '#06b6d4' },
  { key: 'proposal', label: 'Proposal Sent', color: '#f59e0b' },
  { key: 'negotiation', label: 'Negotiation', color: '#ec4899' },
  { key: 'won', label: 'Won', color: '#10b981' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
];

const SOURCES = ['Website', 'Referral', 'LinkedIn', 'WhatsApp', 'Cold Call', 'Event', 'Email Campaign', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function LeadsPageContent() {
  const { showToast, showConfirm } = useNotification();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    contactName: '',
    email: '',
    phone: '',
    companyName: '',
    designation: '',
    value: 0,
    currency: 'USD',
    stage: 'new',
    source: 'Website',
    priority: 'Medium',
    assignedTo: '',
    winProbability: 20,
    expectedCloseDate: '',
    notes: '',
  });

  // Activity modal inside lead detail
  const [activityForm, setActivityForm] = useState({
    type: 'Call',
    title: '',
    description: '',
    scheduledAt: '',
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        showToast('Failed to fetch leads', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  // Open Lead Details Modal
  const openLeadDetails = async (lead) => {
    try {
      const res = await fetch(`/api/crm/leads/${lead._id}`);
      if (res.ok) {
        const fullLead = await res.json();
        setSelectedLead(fullLead);
        setIsDetailModalOpen(true);
      } else {
        setSelectedLead(lead);
        setIsDetailModalOpen(true);
      }
    } catch (e) {
      setSelectedLead(lead);
      setIsDetailModalOpen(true);
    }
  };

  // Stage change handler
  const handleStageChange = async (leadId, newStage) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        showToast(`Lead moved to ${newStage.toUpperCase()}`, 'success');
        fetchLeads();
        if (selectedLead && selectedLead._id === leadId) {
          openLeadDetails({ ...selectedLead, stage: newStage });
        }
      } else {
        showToast('Failed to update stage', 'error');
      }
    } catch (e) {
      showToast('Error updating stage', 'error');
    }
  };

  // Convert Lead to Client & Project
  const handleConvertLead = async (leadId) => {
    const confirmed = await showConfirm(
      'Convert Lead',
      'Are you sure you want to convert this won lead into a formal Client & Project?'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createProject: true }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Lead converted successfully!', 'success');
        setIsDetailModalOpen(false);
        fetchLeads();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to convert lead', 'error');
      }
    } catch (e) {
      showToast('Error converting lead', 'error');
    }
  };

  // Save Lead
  const handleSaveLead = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing ? `/api/crm/leads/${selectedLead._id}` : '/api/crm/leads';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(isEditing ? 'Lead updated' : 'New lead created!', 'success');
        setIsAddModalOpen(false);
        setIsEditing(false);
        setFormData({
          title: '',
          contactName: '',
          email: '',
          phone: '',
          companyName: '',
          designation: '',
          value: 0,
          currency: 'USD',
          stage: 'new',
          source: 'Website',
          priority: 'Medium',
          assignedTo: '',
          winProbability: 20,
          expectedCloseDate: '',
          notes: '',
        });
        fetchLeads();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save lead', 'error');
      }
    } catch (e) {
      showToast('Error saving lead', 'error');
    }
  };

  // Delete Lead
  const handleDeleteLead = async (id) => {
    const confirmed = await showConfirm('Delete Lead', 'Are you sure you want to delete this lead?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Lead deleted', 'success');
        setIsDetailModalOpen(false);
        fetchLeads();
      } else {
        showToast('Failed to delete lead', 'error');
      }
    } catch (e) {
      showToast('Error deleting lead', 'error');
    }
  };

  // Add Activity Log
  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!selectedLead || !activityForm.title) return;

    try {
      const res = await fetch(`/api/crm/leads/${selectedLead._id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityForm,
          isDone: !activityForm.scheduledAt,
        }),
      });

      if (res.ok) {
        showToast('Activity logged!', 'success');
        setActivityForm({ type: 'Call', title: '', description: '', scheduledAt: '' });
        openLeadDetails(selectedLead);
      } else {
        showToast('Failed to log activity', 'error');
      }
    } catch (e) {
      showToast('Error logging activity', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Title', 'Contact Person', 'Email', 'Phone', 'Company', 'Value', 'Stage', 'Source', 'Priority'];
    const rows = filteredLeads.map((l) => [
      `"${l.title || ''}"`,
      `"${l.contactName || ''}"`,
      `"${l.email || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.companyName || ''}"`,
      l.value || 0,
      `"${l.stage || ''}"`,
      `"${l.source || ''}"`,
      `"${l.priority || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchSearch =
        !search ||
        lead.title?.toLowerCase().includes(search.toLowerCase()) ||
        lead.contactName?.toLowerCase().includes(search.toLowerCase()) ||
        lead.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        lead.email?.toLowerCase().includes(search.toLowerCase());

      const matchStage = !filterStage || lead.stage === filterStage;
      const matchSource = !filterSource || lead.source === filterSource;
      const matchPriority = !filterPriority || lead.priority === filterPriority;

      return matchSearch && matchStage && matchSource && matchPriority;
    });
  }, [leads, search, filterStage, filterSource, filterPriority]);

  const [companyCurrency, setCompanyCurrency] = useState('INR');

  useEffect(() => {
    async function fetchCompanyCurrency() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.company?.currency) setCompanyCurrency(data.company.currency);
        }
      } catch (e) {}
    }
    fetchCompanyCurrency();
  }, []);

  const formatCurrency = (val, curr) => {
    return fmtCurrency(val || 0, curr || companyCurrency);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <Layers size={28} style={{ color: 'var(--accent-primary)' }} />
            Lead Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Organize sales opportunities, move leads across stage columns, and close deals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.25rem', borderRadius: '10px', display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('kanban')}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                background: viewMode === 'kanban' ? 'var(--accent-primary-glow)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: viewMode === 'kanban' ? '1px solid var(--accent-primary)' : 'none',
                borderRadius: '8px'
              }}
            >
              <LayoutGrid size={15} /> Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                background: viewMode === 'table' ? 'var(--accent-primary-glow)' : 'transparent',
                color: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: viewMode === 'table' ? '1px solid var(--accent-primary)' : 'none',
                borderRadius: '8px'
              }}
            >
              <List size={15} /> Table
            </button>
          </div>

          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '0.65rem 1rem' }}>
            <Download size={16} /> Export CSV
          </button>

          <button
            onClick={() => {
              setIsEditing(false);
              setFormData({
                title: '',
                contactName: '',
                email: '',
                phone: '',
                companyName: '',
                designation: '',
                value: 0,
                currency: 'USD',
                stage: 'new',
                source: 'Website',
                priority: 'Medium',
                assignedTo: '',
                winProbability: 20,
                expectedCloseDate: '',
                notes: '',
              });
              setIsAddModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search leads by title, contact, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', height: '40px' }}
          />
        </div>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '40px' }}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '40px' }}
        >
          <option value="">All Sources</option>
          {SOURCES.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="form-select"
          style={{ width: 'auto', height: '40px' }}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {(search || filterStage || filterSource || filterPriority) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterStage('');
              setFilterSource('');
              setFilterPriority('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Content: Kanban or Table */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '600px' }}>
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
            const totalStageValue = stageLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);

            return (
              <div
                key={stage.key}
                style={{
                  width: '300px',
                  minWidth: '300px',
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{stage.label}</span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', fontSize: '0.7rem' }}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(totalStageValue)}</span>
                </div>

                {/* Cards Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', maxHeight: '680px' }}>
                  {stageLeads.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No leads in stage</span>
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead._id}
                        onClick={() => openLeadDetails(lead)}
                        className="card"
                        style={{
                          padding: '1rem',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justify: 'space-between', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                            {lead.title}
                          </h4>
                          <span
                            className="badge"
                            style={{
                              background: lead.priority === 'Urgent' || lead.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.06)',
                              color: lead.priority === 'Urgent' || lead.priority === 'High' ? '#ef4444' : 'var(--text-secondary)',
                              fontSize: '0.65rem'
                            }}
                          >
                            {lead.priority}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{lead.contactName}</span>
                          </div>
                          {lead.companyName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building size={13} style={{ color: 'var(--text-muted)' }} />
                              <span>{lead.companyName}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {formatCurrency(lead.value, lead.currency)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                            {lead.stage === 'won' && !lead.convertedToClientId && (
                              <button
                                onClick={() => handleConvertLead(lead._id)}
                                className="btn btn-primary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                              >
                                Convert
                              </button>
                            )}

                            <select
                              value={lead.stage}
                              onChange={(e) => handleStageChange(lead._id, e.target.value)}
                              className="form-select"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  Move: {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Lead Title / Deal</th>
                <th>Contact Person</th>
                <th>Company</th>
                <th>Deal Value</th>
                <th>Stage</th>
                <th>Source</th>
                <th>Priority</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} style={{ cursor: 'pointer' }} onClick={() => openLeadDetails(lead)}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div>{lead.title}</div>
                      {lead.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{lead.email}</div>}
                    </td>
                    <td>{lead.contactName}</td>
                    <td>{lead.companyName || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(lead.value, lead.currency)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead._id, e.target.value)}
                        className="form-select"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{lead.source}</td>
                    <td>
                      <span className="badge" style={{ background: lead.priority === 'Urgent' || lead.priority === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: lead.priority === 'Urgent' || lead.priority === 'High' ? '#ef4444' : 'var(--text-secondary)' }}>
                        {lead.priority}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        {lead.stage === 'won' && !lead.convertedToClientId && (
                          <button onClick={() => handleConvertLead(lead._id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                            Convert
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setFormData({
                              title: lead.title || '',
                              contactName: lead.contactName || '',
                              email: lead.email || '',
                              phone: lead.phone || '',
                              companyName: lead.companyName || '',
                              designation: lead.designation || '',
                              value: lead.value || 0,
                              currency: lead.currency || 'USD',
                              stage: lead.stage || 'new',
                              source: lead.source || 'Website',
                              priority: lead.priority || 'Medium',
                              assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
                              winProbability: lead.winProbability || 20,
                              expectedCloseDate: lead.expectedCloseDate
                                ? new Date(lead.expectedCloseDate).toISOString().slice(0, 10)
                                : '',
                              notes: lead.notes || '',
                            });
                            setIsEditing(true);
                            setIsAddModalOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem', borderRadius: '6px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteLead(lead._id)} className="btn btn-danger" style={{ padding: '0.3rem', borderRadius: '6px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT LEAD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {isEditing ? 'Edit Lead' : 'Create New Lead'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Lead Title / Deal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign Proposal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+1 555 0192"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Estimated Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="form-select"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="form-select"
                  >
                    {SOURCES.map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="form-select"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Description</label>
                <textarea
                  rows="3"
                  placeholder="Add notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAILS DRAWER MODAL */}
      {isDetailModalOpen && selectedLead && (
        <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }}>
          <div className="modal-content" style={{ maxWidth: '580px', height: '100vh', maxHeight: '100vh', borderRadius: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', uppercase: true }}>Lead Details</span>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.3rem', fontWeight: 700 }}>{selectedLead.title}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {selectedLead.stage === 'won' && (
              <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#10b981' }}>Lead Won!</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Convert lead into Client profile & Project.</p>
                </div>
                {selectedLead.convertedToClientId ? (
                  <span className="badge badge-completed">Already Converted</span>
                ) : (
                  <button onClick={() => handleConvertLead(selectedLead._id)} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                    Convert to Client
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="form-label" style={{ marginBottom: '0.5rem' }}>Pipeline Stage</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {STAGES.map((s) => {
                  const isCurrent = selectedLead.stage === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleStageChange(selectedLead._id, s.key)}
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        background: isCurrent ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {isCurrent && <Check size={13} />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Contact</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLead.contactName}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Company</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLead.companyName || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Email</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLead.email || '-'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLead.phone || '-'}</span>
              </div>
            </div>

            {/* Log Activity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }} /> Log Call / Note
              </h4>
              <form onSubmit={handleAddActivity} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  required
                  placeholder="Activity title (e.g. Follow-up Call)"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="form-input"
                />
                <textarea
                  rows="2"
                  placeholder="Discussion details..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                  Post Activity
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
      }
    >
      <LeadsPageContent />
    </Suspense>
  );
}
