'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  IndianRupee, 
  Mail, 
  User, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/components/NotificationProvider';

export default function ProjectDetailPage() {
  const { showToast, showConfirm } = useNotification();
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Task checklist state
  const [newTaskName, setNewTaskName] = useState('');
  const [newStatusUpdate, setNewStatusUpdate] = useState('');
  const [addingUpdate, setAddingUpdate] = useState(false);
  
  // Edit project state
  const [isEditing, setIsEditing] = useState(false);
  const [editQuotationFile, setEditQuotationFile] = useState(null);
  const [editForm, setEditForm] = useState({
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
    status: '',
    startDate: '',
    endDate: '',
    hostingExpiry: '',
    domainExpiry: '',
    credentials: [],
    quotation: null
  });
  const [updating, setUpdating] = useState(false);

  const [clients, setClients] = useState([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [inlineClient, setInlineClient] = useState({ name: '', email: '' });
  
  // Credentials view state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

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
      setEditForm(prev => ({
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

  const fetchProjectData = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      setProject(data.project);
      setInvoices(data.invoices);
      
      // Initialize edit form
      setEditForm({
        name: data.project.name,
        description: data.project.description ?? '',
        clientName: data.project.clientName,
        clientEmail: data.project.clientEmail ?? '',
        client: data.project.client ?? '',
        quotePrice: data.project.quotePrice ?? '',
        finalPrice: data.project.finalPrice ?? '',
        hostingPrice: data.project.hostingPrice ?? '',
        domainPrice: data.project.domainPrice ?? '',
        budget: data.project.budget ?? 0,
        status: data.project.status,
        startDate: data.project.startDate ? new Date(data.project.startDate).toISOString().substring(0, 10) : '',
        endDate: data.project.endDate ? new Date(data.project.endDate).toISOString().substring(0, 10) : '',
        hostingExpiry: data.project.hostingExpiry ? new Date(data.project.hostingExpiry).toISOString().substring(0, 10) : '',
        domainExpiry: data.project.domainExpiry ? new Date(data.project.domainExpiry).toISOString().substring(0, 10) : '',
        credentials: data.project.credentials ?? [],
        quotation: data.project.quotation ?? null
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredential = () => {
    setEditForm(prev => ({
      ...prev,
      credentials: [...prev.credentials, { type: 'Other', label: '', username: '', password: '', loginUrl: '', notes: '' }]
    }));
  };

  const handleRemoveCredential = (index) => {
    const updated = editForm.credentials.filter((_, i) => i !== index);
    setEditForm(prev => ({ ...prev, credentials: updated }));
  };

  const handleCredentialChange = (index, field, value) => {
    setEditForm(prev => {
      const updated = prev.credentials.map((cred, i) => {
        if (i === index) {
          return { ...cred, [field]: value };
        }
        return cred;
      });
      return { ...prev, credentials: updated };
    });
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (key) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getExpiryStatus = (dateString) => {
    if (!dateString) return null;
    const diffTime = new Date(dateString) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'warning';
    return 'ok';
  };

  useEffect(() => {
    if (id) {
      fetchProjectData();
      fetchClients();
    }
  }, [id]);

  useEffect(() => {
    if (project && clients.length > 0 && !editForm.client) {
      const matchingClient = clients.find(
        c => c.name.toLowerCase() === project.clientName?.toLowerCase()
      );
      if (matchingClient) {
        setEditForm(prev => ({ ...prev, client: matchingClient._id }));
      }
    }
  }, [project, clients, editForm.client]);

  useEffect(() => {
    if (project) {
      const compName = typeof window !== 'undefined' ? localStorage.getItem('company_name') || 'Workspace' : 'Workspace';
      document.title = `${project.name} (${project.status}) | ${compName} Manager`;
    }
  }, [project]);

  const handleAddStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatusUpdate.trim()) return;
    try {
      setAddingUpdate(true);
      const updatedList = [...(project.statusUpdates || []), { message: newStatusUpdate.trim(), date: new Date() }];
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusUpdates: updatedList }),
      });
      if (!res.ok) throw new Error('Failed to post status update');
      const updatedProject = await res.json();
      setProject(updatedProject);
      setNewStatusUpdate('');
      showToast('Status update posted successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingUpdate(false);
    }
  };

  const handleDeleteStatusUpdate = async (updateId) => {
    showConfirm({
      title: 'Remove Status Update',
      message: 'Are you sure you want to remove this status update from history?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const updatedList = project.statusUpdates.filter(u => u._id !== updateId);
          const res = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statusUpdates: updatedList }),
          });
          if (!res.ok) throw new Error('Failed to delete status update');
          const updatedProject = await res.json();
          setProject(updatedProject);
          showToast('Status update removed', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const handleToggleTask = async (taskId, completed) => {
    if (!project) return;
    
    const updatedTasks = project.tasks.map(task => 
      task._id === taskId ? { ...task, completed: !completed } : task
    );

    // Optimistic UI update
    setProject(prev => ({ ...prev, tasks: updatedTasks }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) throw new Error('Failed to update task');
    } catch (err) {
      console.error(err);
      // Revert back on error
      fetchProjectData();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskName.trim() || !project) return;

    const newTask = { name: newTaskName.trim(), completed: false };
    const updatedTasks = [...(project.tasks || []), newTask];

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) throw new Error('Failed to add task');
      const updatedProject = await res.json();
      setProject(updatedProject);
      setNewTaskName('');
      showToast('Task added successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not add task. Please try again.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!project) return;
    
    const updatedTasks = project.tasks.filter(task => task._id !== taskId);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) throw new Error('Failed to delete task');
      const updatedProject = await res.json();
      setProject(updatedProject);
      showToast('Task deleted successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not delete task.', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);

      let quotationData = editForm.quotation;
      if (editQuotationFile) {
        const formData = new FormData();
        formData.append('file', editQuotationFile);
        
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

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(({
          ...editForm,
          quotePrice: editForm.quotePrice !== '' && editForm.quotePrice !== null ? parseFloat(editForm.quotePrice) : null,
          finalPrice: editForm.finalPrice !== '' && editForm.finalPrice !== null ? parseFloat(editForm.finalPrice) : null,
          hostingPrice: editForm.hostingPrice !== '' && editForm.hostingPrice !== null ? parseFloat(editForm.hostingPrice) : null,
          domainPrice: editForm.domainPrice !== '' && editForm.domainPrice !== null ? parseFloat(editForm.domainPrice) : null,
          // Only recompute budget if at least one pricing field is filled in.
          // Otherwise preserve the existing project budget (prevents wiping old projects).
          budget: (() => {
            const fp = editForm.finalPrice !== '' && editForm.finalPrice !== null ? parseFloat(editForm.finalPrice) || 0 : null;
            const hp = editForm.hostingPrice !== '' && editForm.hostingPrice !== null ? parseFloat(editForm.hostingPrice) || 0 : null;
            const dp = editForm.domainPrice !== '' && editForm.domainPrice !== null ? parseFloat(editForm.domainPrice) || 0 : null;
            const hasPricing = fp !== null || hp !== null || dp !== null;
            return hasPricing ? (fp || 0) + (hp || 0) + (dp || 0) : (project.budget || 0);
          })(),
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          hostingExpiry: editForm.hostingExpiry || null,
          domainExpiry: editForm.domainExpiry || null,
          quotation: quotationData
        })),
      });

      if (!res.ok) throw new Error('Failed to update project');
      const updatedProject = await res.json();
      setProject(updatedProject);
      
      // Update form state with new saved values
      setEditForm({
        name: updatedProject.name,
        description: updatedProject.description ?? '',
        clientName: updatedProject.clientName,
        clientEmail: updatedProject.clientEmail ?? '',
        client: updatedProject.client ?? '',
        quotePrice: updatedProject.quotePrice ?? '',
        finalPrice: updatedProject.finalPrice ?? '',
        hostingPrice: updatedProject.hostingPrice ?? '',
        domainPrice: updatedProject.domainPrice ?? '',
        budget: updatedProject.budget ?? 0,
        status: updatedProject.status,
        startDate: updatedProject.startDate ? new Date(updatedProject.startDate).toISOString().substring(0, 10) : '',
        endDate: updatedProject.endDate ? new Date(updatedProject.endDate).toISOString().substring(0, 10) : '',
        hostingExpiry: updatedProject.hostingExpiry ? new Date(updatedProject.hostingExpiry).toISOString().substring(0, 10) : '',
        domainExpiry: updatedProject.domainExpiry ? new Date(updatedProject.domainExpiry).toISOString().substring(0, 10) : '',
        credentials: updatedProject.credentials ?? [],
        quotation: updatedProject.quotation ?? null
      });

      setEditQuotationFile(null);
      showToast('Project details updated successfully', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    showConfirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This will also delete all associated invoices and cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) throw new Error('Failed to delete project');
          showToast('Project deleted successfully', 'success');
          router.push('/projects');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h3>Loading project details...</h3>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="empty-state" style={{ color: '#ef4444' }}>
        <AlertCircle size={48} />
        <h3>Error Loading Project</h3>
        <p>{error || 'Project not found'}</p>
        <Link href="/projects" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Projects
        </Link>
      </div>
    );
  }

  const completedTasks = project.tasks ? project.tasks.filter(t => t.completed).length : 0;
  const totalTasks = project.tasks ? project.tasks.length : 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <>
      <div className="animate-fade-in">
      {/* Back navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Main Details and Checklist Grid */}
      <div className="project-detail-grid">
        
        {/* Project info card */}
        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            {isEditing ? (
              <form id="project-edit-form" onSubmit={handleEditSubmit}>
                <div className="project-edit-card-header">
                  <h3>Edit Project Details</h3>
                  <div className="hide-mobile" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setIsEditing(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={updating}>
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editForm.name} 
                    required
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-textarea" 
                    value={editForm.description} 
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
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
                      <div className="form-row" style={{ gap: '0.75rem' }}>
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
                        value={editForm.client || ''}
                        onChange={(clientId) => {
                          const selectedClientObj = clients.find(c => c._id === clientId);
                          setEditForm(prev => ({
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
                        className="form-input"
                        value={editForm.quotePrice}
                        onChange={(e) => setEditForm({ ...editForm, quotePrice: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Final Price</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.finalPrice}
                        onChange={(e) => setEditForm({ ...editForm, finalPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Hosting Price</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.hostingPrice}
                        onChange={(e) => setEditForm({ ...editForm, hostingPrice: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Domain Price</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.domainPrice}
                        onChange={(e) => setEditForm({ ...editForm, domainPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Grand Total (Final + Hosting + Domain)</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                      ₹{((parseFloat(editForm.finalPrice) || 0) + (parseFloat(editForm.hostingPrice) || 0) + (parseFloat(editForm.domainPrice) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={editForm.startDate} 
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date (Target)</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={editForm.endDate} 
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>


                <div className="form-row" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Hosting Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={editForm.hostingExpiry} 
                      onChange={(e) => setEditForm({ ...editForm, hostingExpiry: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Domain Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={editForm.domainExpiry} 
                      onChange={(e) => setEditForm({ ...editForm, domainExpiry: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Quotation upload section */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>QUOTATION DOCUMENT</h4>
                  {editForm.quotation ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        📄 {editForm.quotation.fileName}
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setEditForm(prev => ({ ...prev, quotation: null }))}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input 
                        type="file" 
                        className="form-input" 
                        onChange={(e) => setEditQuotationFile(e.target.files[0] || null)}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      />
                      {editQuotationFile && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '0.25rem' }}>
                          Selected: {editQuotationFile.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit Credentials sub-form */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Project Credentials</h3>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={handleAddCredential}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Add Credential
                    </button>
                  </div>

                  {editForm.credentials.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '1.5rem 0' }}>No credentials added yet.</p>
                  ) : (
                    editForm.credentials.map((cred, index) => (
                      <div key={index} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>CREDENTIAL #{index + 1}</span>
                          <button type="button" className="btn btn-danger" style={{ padding: '0.25rem', borderRadius: '6px' }} onClick={() => handleRemoveCredential(index)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Credential Type</label>
                            <select className="form-select" value={cred.type || 'Other'} onChange={(e) => handleCredentialChange(index, 'type', e.target.value)}>
                              <option value="Hosting">Hosting</option>
                              <option value="Domain">Domain</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Label (e.g. Hostinger, GoDaddy)</label>
                            <input type="text" className="form-input" value={cred.label || ''} onChange={(e) => handleCredentialChange(index, 'label', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '0.5rem' }}>
                          <div className="form-group">
                            <label className="form-label">Username</label>
                            <input type="text" className="form-input" value={cred.username || ''} onChange={(e) => handleCredentialChange(index, 'username', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="text" className="form-input" value={cred.password || ''} onChange={(e) => handleCredentialChange(index, 'password', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '0.5rem' }}>
                          <div className="form-group">
                            <label className="form-label">Login URL</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="e.g. https://admin.example.com"
                              value={cred.loginUrl || ''} 
                              onChange={(e) => handleCredentialChange(index, 'loginUrl', e.target.value)} 
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={cred.notes || ''} onChange={(e) => handleCredentialChange(index, 'notes', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </form>
            ) : (
              <div>
                <div className="project-detail-card-header">
                  <div>
                    <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`} style={{ marginBottom: '0.75rem' }}>
                      {project.status}
                    </span>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{project.name}</h2>
                  </div>
                  {role !== 'company_user' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setIsEditing(true)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={handleDeleteProject}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.5rem', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>
                  {project.description || 'No description provided for this project.'}
                </p>

                {/* Project Metadata Details */}
                <div className="project-metadata-grid">
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CLIENT DETAILS</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <User size={14} style={{ color: 'var(--text-secondary)' }} />
                        <strong>{project.clientName}</strong>
                      </span>
                      {project.clientEmail && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <Mail size={14} />
                          {project.clientEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TIMELINE & PRICING</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span>
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </span>
                      {project.quotePrice > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <IndianRupee size={13} />
                          Quote: {formatCurrency(project.quotePrice)}
                        </span>
                      )}
                      {project.finalPrice > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <IndianRupee size={13} />
                          Final: {formatCurrency(project.finalPrice)}
                        </span>
                      )}
                      {project.hostingPrice > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <IndianRupee size={13} />
                          Hosting: {formatCurrency(project.hostingPrice)}
                        </span>
                      )}
                      {project.domainPrice > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <IndianRupee size={13} />
                          Domain: {formatCurrency(project.domainPrice)}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-secondary)', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                        <IndianRupee size={14} />
                        <strong>Total: {formatCurrency(project.budget)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry Details Section */}
                <div className="project-expiry-grid">
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>HOSTING EXPIRY</h4>
                    {project.hostingExpiry ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {new Date(project.hostingExpiry).toLocaleDateString()}
                        </span>
                        {(() => {
                          const status = getExpiryStatus(project.hostingExpiry);
                          if (status === 'expired') return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}><AlertTriangle size={10} /> Expired</span>;
                          if (status === 'warning') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}><AlertTriangle size={10} /> Expiring Soon</span>;
                          return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}>Active</span>;
                        })()}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Not configured</span>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>DOMAIN EXPIRY</h4>
                    {project.domainExpiry ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {new Date(project.domainExpiry).toLocaleDateString()}
                        </span>
                        {(() => {
                          const status = getExpiryStatus(project.domainExpiry);
                          if (status === 'expired') return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}><AlertTriangle size={10} /> Expired</span>;
                          if (status === 'warning') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}><AlertTriangle size={10} /> Expiring Soon</span>;
                          return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}>Active</span>;
                        })()}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Not configured</span>
                    )}
                  </div>
                </div>

                {/* Quotation Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>QUOTATION DOCUMENT</h4>
                  {project.quotation && project.quotation.filePath ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139, 92, 246, 0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1rem', width: 'fit-content' }}>
                      <span style={{ fontSize: '1.1rem' }}>📄</span>
                      <a href={project.quotation.filePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        {project.quotation.fileName}
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No quotation uploaded. Click Edit to add.</span>
                  )}
                </div>

                {/* Credentials Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>PROJECT CREDENTIALS</h4>
                  {(!project.credentials || project.credentials.length === 0) ? (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No credentials stored. Click Edit to add.</span>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      {project.credentials.map((cred, index) => {
                        const passwordKey = `cred_${index}`;
                        const isVisible = visiblePasswords[passwordKey];
                        const isCopied = copiedKey === passwordKey;
                        return (
                          <div key={index} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {cred.type} - {cred.label || 'Details'}
                              </span>
                              {cred.notes && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cred.notes}</span>
                              )}
                            </div>
                            
                            <div className="project-cred-grid" style={{ fontSize: '0.85rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Username</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{cred.username || 'N/A'}</span>
                                  {cred.username && (
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }} 
                                      onClick={() => handleCopy(cred.username, `user_${index}`)}
                                    >
                                      {copiedKey === `user_${index}` ? <Check size={10} style={{ color: '#10b981' }} /> : <Copy size={10} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Password</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontFamily: isVisible ? 'monospace' : 'inherit', fontWeight: 500, wordBreak: 'break-all' }}>
                                    {isVisible ? (cred.password || 'N/A') : '••••••••'}
                                  </span>
                                  {cred.password && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }} 
                                        onClick={() => togglePasswordVisibility(passwordKey)}
                                      >
                                        {isVisible ? <EyeOff size={10} /> : <Eye size={10} />}
                                      </button>
                                      <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }} 
                                        onClick={() => handleCopy(cred.password, passwordKey)}
                                      >
                                        {copiedKey === passwordKey ? <Check size={10} style={{ color: '#10b981' }} /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {cred.loginUrl && (
                                <div style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Login URL</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <a 
                                      href={cred.loginUrl.startsWith('http') ? cred.loginUrl : `https://${cred.loginUrl}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontWeight: 500, wordBreak: 'break-all' }}
                                    >
                                      {cred.loginUrl}
                                    </a>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }} 
                                      onClick={() => handleCopy(cred.loginUrl, `url_${index}`)}
                                    >
                                      {copiedKey === `url_${index}` ? <Check size={10} style={{ color: '#10b981' }} /> : <Copy size={10} />}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project Invoices section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Associated Invoices</h3>
              <Link 
                href={{ pathname: '/invoices', query: { projectId: project._id } }} 
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                <span>New Invoice</span>
              </Link>
            </div>

            {invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No invoices generated for this project yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice No.</th>
                      <th>Issued Date</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td>
                          <Link href={`/invoices/${inv._id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', hover: { textDecoration: 'underline' } }}>
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 500 }}>{formatCurrency(inv.total)}</td>
                        <td>
                          <span className={`badge badge-${inv.status.toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Task Checklist Panel */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3>Task Checklist</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Track milestones and steps to project completion.</p>

          {/* Progress Indicator */}
          <div style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span>Completion Progress</span>
              <strong>{taskProgress}%</strong>
            </div>
            <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${taskProgress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '9999px', transition: 'width 0.3s ease' }}></div>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {completedTasks} of {totalTasks} items completed
            </div>
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Add a new milestone or task..." 
              className="form-input"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>
              <Plus size={18} />
            </button>
          </form>

          {/* Tasks List */}
          <div className="task-list">
            {(!project.tasks || project.tasks.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No tasks created yet.
              </div>
            ) : (
              project.tasks.map((task) => (
                <div className="task-item" key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}
                    onClick={() => handleToggleTask(task._id, task.completed)}
                  >
                    {task.completed ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-secondary)' }} />
                    )}
                    <span className={`task-name ${task.completed ? 'completed' : ''}`} style={{ fontSize: '0.95rem' }}>
                      {task.name}
                    </span>
                  </div>
                  {role !== 'company_user' && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={() => handleDeleteTask(task._id)}
                      className="delete-task-btn"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Updates Feed Panel */}
        <div className="card" style={{ height: 'fit-content', marginTop: '1.25rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>Status Update Log</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>Log project milestones and status updates date-wise.</p>

          {/* Add Status Update Form */}
          <form onSubmit={handleAddStatusUpdate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input 
              type="text" 
              placeholder="Post a new status update..." 
              className="form-input"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              value={newStatusUpdate}
              onChange={(e) => setNewStatusUpdate(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }} disabled={addingUpdate}>
              <Plus size={16} />
            </button>
          </form>

          {/* Updates History Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {(!project.statusUpdates || project.statusUpdates.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No status updates logged yet.
              </div>
            ) : (
              [...project.statusUpdates].reverse().map((update) => (
                <div key={update._id} style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  padding: '0.75rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                      {new Date(update.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {role !== 'company_user' && (
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleDeleteStatusUpdate(update._id)}
                        className="delete-task-btn"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                    {update.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      </div>

      {isEditing && (
        <div className="sticky-actions-bar">
          <div className="sticky-actions-content">
            <button type="button" className="btn btn-secondary" style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }} onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" form="project-edit-form" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }} disabled={updating}>
              {updating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .delete-task-btn:hover {
          color: #ef4444 !important;
        }
      `}</style>
    </>
  );
}
