'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Calendar, 
  IndianRupee, 
  X, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/components/NotificationProvider';

export default function ProjectsPage() {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    clientName: '',
    clientEmail: '',
    client: '',
    quotePrice: '',
    finalPrice: '',
    hostingPrice: '',
    domainPrice: '',
    budget: '',
    status: 'Planning',
    startDate: '',
    endDate: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [quotationFile, setQuotationFile] = useState(null);

  const [clients, setClients] = useState([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [inlineClient, setInlineClient] = useState({ name: '', email: '' });

  const getClientAvatar = (name) => {
    if (!name) return { initials: '?', bg: 'hsl(260, 50%, 50%)' };
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();

    // Generate deterministic HSL color based on string hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    const s = 65; 
    const l = 45; 
    return {
      initials,
      bg: `hsl(${h}, ${s}%, ${l}%)`
    };
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchClients();
    }
  }, [isModalOpen]);

  const handleCreateInlineClient = async () => {
    if (!inlineClient.name || !inlineClient.email) {
      showToast("Name and Email are required for client profile", "error");
      return;
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineClient)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create client");
      }
      const newClientObj = await res.json();
      showToast("Client profile created", "success");
      await fetchClients();
      setNewProject(prev => ({
        ...prev,
        client: newClientObj._id,
        clientName: newClientObj.name,
        clientEmail: newClientObj.email
      }));
      setInlineClient({ name: '', email: '' });
      setIsAddClientOpen(false);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/projects', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (statusFilter) url.searchParams.append('status', statusFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProjects();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientName) {
      setFormError('Project Name and Client Name are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      let quotationData = null;
      if (quotationFile) {
        const formData = new FormData();
        formData.append('file', quotationFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) {
          throw new Error('Failed to upload quotation file');
        }
        const uploadData = await uploadRes.json();
        quotationData = {
          fileName: uploadData.fileName,
          filePath: uploadData.filePath
        };
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          quotePrice: newProject.quotePrice ? parseFloat(newProject.quotePrice) : 0,
          finalPrice: newProject.finalPrice ? parseFloat(newProject.finalPrice) : 0,
          hostingPrice: newProject.hostingPrice ? parseFloat(newProject.hostingPrice) : 0,
          domainPrice: newProject.domainPrice ? parseFloat(newProject.domainPrice) : 0,
          budget: (parseFloat(newProject.finalPrice) || 0) + (parseFloat(newProject.hostingPrice) || 0) + (parseFloat(newProject.domainPrice) || 0),
          startDate: newProject.startDate || undefined,
          endDate: newProject.endDate || undefined,
          quotation: quotationData || undefined
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create project');
      }

      // Reset form & close modal
      setNewProject({
        name: '',
        description: '',
        clientName: '',
        clientEmail: '',
        client: '',
        quotePrice: '',
        finalPrice: '',
        hostingPrice: '',
        domainPrice: '',
        budget: '',
        status: 'Planning',
        startDate: '',
        endDate: ''
      });
      setQuotationFile(null);
      showToast('Project created successfully', 'success');
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const handleWhatsAppShare = (project) => {
    const clientPhone = project.client?.phone;
    if (!clientPhone) {
      showToast(`Client ${project.clientName} has no phone number configured.`, 'error');
      return;
    }

    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      showToast(`Client ${project.clientName} has an invalid phone number.`, 'error');
      return;
    }

    const latestUpdate = project.statusUpdates && project.statusUpdates.length > 0
      ? project.statusUpdates[project.statusUpdates.length - 1].message
      : 'No updates yet';

    const compName = typeof window !== 'undefined' ? localStorage.getItem('company_name') || 'Workspace' : 'Workspace';
    const message = `Hi ${project.clientName},\n\nHere is the latest update for project *${project.name}*:\n"${latestUpdate}"\n\n- ${compName}`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Stats calculation
  const totalCount = projects.length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;
  const pendingCount = projects.filter(p => p.status === 'Pending').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Manage, track, and update all client development milestones.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>New Project</span>
          </button>
        </div>

        {/* Stats Summary strip */}
        {projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem'
          }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Projects</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '2px' }}>{totalCount}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>In Progress</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '2px', color: '#3b82f6' }}>{inProgressCount}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f97316', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending / Overdue</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '2px', color: '#f97316' }}>{pendingCount}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Completed</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '2px', color: '#10b981' }}>{completedCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar with Toggle */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search projects by name, description, client..." 
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '200px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* Projects Listing View */}
        {loading && projects.length === 0 ? (
          <div className="empty-state">
            <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
            <h3>Loading projects...</h3>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#ef4444' }}>
            <h3>Error loading projects</h3>
            <p>{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={48} />
            <h3>No projects found</h3>
            <p>Try refining your search or create a new project to get started.</p>
          </div>
        ) : (
          /* List Table Layout */
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Budget</th>
                  <th className="hide-mobile">Due Date</th>
                  <th className="hide-mobile">Status Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const latestUpdate = project.statusUpdates && project.statusUpdates.length > 0
                    ? project.statusUpdates[project.statusUpdates.length - 1]
                    : null;

                  return (
                    <tr key={project._id}>
                      <td>
                        <Link href={`/projects/${project._id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {project.name}
                        </Link>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.description || 'No description'}
                        </span>
                      </td>
                      <td>{project.clientName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatCurrency(project.budget)}</td>
                      <td className="hide-mobile">{project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN') : 'No Date'}</td>
                      <td className="hide-mobile" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {latestUpdate ? (
                          <span title={`${latestUpdate.message} (${new Date(latestUpdate.date).toLocaleDateString('en-IN')})`}>
                            {latestUpdate.message}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No status message</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`}>
                          {project.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <Link href={`/projects/${project._id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Details
                          </Link>
                          <button 
                            type="button"
                            onClick={() => handleWhatsAppShare(project)}
                            className="btn btn-whatsapp" 
                            style={{ 
                              padding: '0.35rem 0.75rem', 
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                            title="Send update via WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.16 1.449 4.815 1.451 5.432.002 9.851-4.416 9.854-9.852.002-2.633-1.02-5.107-2.88-6.97C16.565 1.96 14.094.939 11.465.939c-5.437 0-9.857 4.418-9.859 9.856 0 1.76.47 3.47 1.365 4.978l-1.026 3.75 3.864-.986zm11.215-6.738c-.29-.144-1.711-.844-1.977-.94-.266-.097-.46-.144-.652.144-.193.289-.748.94-.917 1.133-.17.192-.338.217-.628.072-.29-.144-1.226-.452-2.335-1.442-.863-.77-1.447-1.72-1.616-2.01-.17-.29-.018-.447.127-.59.13-.129.29-.338.435-.507.145-.168.193-.289.29-.482.097-.193.048-.36-.024-.507-.072-.145-.652-1.57-.893-2.147-.234-.565-.47-.488-.652-.497-.17-.008-.362-.01-.555-.01-.193 0-.507.072-.772.36-.266.289-1.014.992-1.014 2.418 0 1.427 1.038 2.808 1.183 3.001.145.193 2.043 3.12 4.949 4.373.69.298 1.23.476 1.65.61.694.22 1.326.19 1.825.115.556-.083 1.711-.699 1.953-1.374.242-.675.242-1.253.17-1.374-.073-.12-.266-.193-.556-.34z"/>
                            </svg>
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
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
                <label className="form-label">Project Name *</label>
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  required 
                  placeholder="e.g., E-Commerce Site Redesign"
                  value={newProject.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  name="description"
                  className="form-textarea" 
                  placeholder="Describe the scope of work..."
                  value={newProject.description}
                  onChange={handleInputChange}
                />
              </div>

              {/* Client Selection */}
              <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Select Client profile *</label>
                  <button 
                    type="button" 
                    onClick={() => setIsAddClientOpen(!isAddClientOpen)} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                  >
                    {isAddClientOpen ? 'Select Existing' : '+ New Client'}
                  </button>
                </div>

                {isAddClientOpen ? (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Client Name *</label>
                        <input 
                          type="text" 
                          placeholder="e.g., John Doe" 
                          className="form-input" 
                          value={inlineClient.name} 
                          onChange={(e) => setInlineClient({ ...inlineClient, name: e.target.value })} 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Client Email *</label>
                        <input 
                          type="email" 
                          placeholder="e.g., john@company.com" 
                          className="form-input" 
                          value={inlineClient.email} 
                          onChange={(e) => setInlineClient({ ...inlineClient, email: e.target.value })} 
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', marginTop: '0.25rem' }} 
                      onClick={handleCreateInlineClient}
                    >
                      Create & Select Client Profile
                    </button>
                  </div>
                ) : (
                  <div className="form-group">
                    <SearchableSelect
                      options={clients.map(c => ({
                        value: c._id,
                        label: c.name,
                        sublabel: `${c.company ? `${c.company} • ` : ''}${c.email}`,
                        searchText: `${c.name} ${c.company || ''} ${c.email}`
                      }))}
                      placeholder="Search and select client..."
                      required={true}
                      value={newProject.client || ''}
                      onChange={(clientId) => {
                        const selectedClientObj = clients.find(c => c._id === clientId);
                        setNewProject(prev => ({
                          ...prev,
                          client: clientId,
                          clientName: selectedClientObj ? selectedClientObj.name : '',
                          clientEmail: selectedClientObj ? selectedClientObj.email : ''
                        }));
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Pricing (₹)</label>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Quote Price</label>
                    <input
                      type="number"
                      name="quotePrice"
                      className="form-input"
                      placeholder="e.g., 60000"
                      value={newProject.quotePrice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Final Price</label>
                    <input
                      type="number"
                      name="finalPrice"
                      className="form-input"
                      placeholder="e.g., 50000"
                      value={newProject.finalPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Hosting Price</label>
                    <input
                      type="number"
                      name="hostingPrice"
                      className="form-input"
                      placeholder="e.g., 5000"
                      value={newProject.hostingPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Domain Price</label>
                    <input
                      type="number"
                      name="domainPrice"
                      className="form-input"
                      placeholder="e.g., 1500"
                      value={newProject.domainPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                {/* Auto-calculated grand total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Grand Total (Final + Hosting + Domain)</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                    ₹{((parseFloat(newProject.finalPrice) || 0) + (parseFloat(newProject.hostingPrice) || 0) + (parseFloat(newProject.domainPrice) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Upload Quotation Document</label>
                  <input 
                    type="file" 
                    className="form-input" 
                    onChange={(e) => setQuotationFile(e.target.files[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={newProject.status}
                    onChange={handleInputChange}
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>


              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    name="startDate"
                    className="form-input"
                    value={newProject.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date (Target)</label>
                  <input 
                    type="date" 
                    name="endDate"
                    className="form-input"
                    value={newProject.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
