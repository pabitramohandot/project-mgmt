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
  AlertCircle,
  ChevronDown,
  Check,
  Users,
  Copy,
  ExternalLink
} from 'lucide-react';

import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/components/NotificationProvider';

const getOverallStatus = (proj) => {
  const activeTypes = proj.projectType || [];
  if (activeTypes.length === 0) {
    return proj.status || 'Planning';
  }
  
  const statuses = [];
  const now = new Date();
  
  if (activeTypes.includes('Development')) {
    let devStatus = proj.devStatus || 'Planning';
    if (devStatus !== 'Completed' && proj.devEndDate && new Date(proj.devEndDate) < now) {
      devStatus = 'Pending';
    }
    statuses.push(devStatus);
  }
  
  if (activeTypes.includes('360 Deg Digital Marketing')) {
    let marketingStatus = proj.marketingStatus || 'Planning';
    if (marketingStatus !== 'Completed' && proj.marketingEndDate && new Date(proj.marketingEndDate) < now) {
      marketingStatus = 'Pending';
    }
    statuses.push(marketingStatus);
  }
  
  if (activeTypes.includes('Meta / Google Ads')) {
    let adsStatus = proj.adsStatus || 'Planning';
    if (adsStatus !== 'Completed' && proj.adsDate && new Date(proj.adsDate) < now) {
      adsStatus = 'Pending';
    }
    statuses.push(adsStatus);
  }
  
  if (activeTypes.includes('Design')) {
    let designStatus = proj.designStatus || 'Planning';
    if (designStatus !== 'Completed' && proj.designEndDate && new Date(proj.designEndDate) < now) {
      designStatus = 'Pending';
    }
    statuses.push(designStatus);
  }
  
  if (statuses.length === 0) {
    return proj.status || 'Planning';
  }
  
  if (statuses.includes('Pending')) return 'Pending';
  if (statuses.includes('Under Review')) return 'Under Review';
  if (statuses.includes('In Progress')) return 'In Progress';
  if (statuses.includes('Planning')) return 'Planning';
  return 'Completed';
};

export default function ProjectsPage() {
  const { showToast } = useNotification();
  const getSubcategoriesList = (type) => {
    switch (type) {
      case 'Development':
        return ['Education', 'Shopping', 'GYM', 'Wedding', 'Real Estate', 'Healthcare', 'Restaurant/Food', 'Travel', 'Portfolio', 'Corporate'];
      case '360 Deg Digital Marketing':
        return ['SEO', 'SMO', 'GBP'];
      case 'Meta / Google Ads':
        return ['Meta Ads', 'Google Ads'];
      case 'Design':
        return ['Static', 'Motion', 'Real', 'Brand Identity', 'UI/UX', 'Print Design'];
      default:
        return [];
    }
  };
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userCategory, setUserCategory] = useState('');
  const [projectLimit, setProjectLimit] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [newCustomSubs, setNewCustomSubs] = useState({
    'Development': '',
    '360 Deg Digital Marketing': '',
    'Meta / Google Ads': '',
    'Design': ''
  });
  const [newShowCustomInput, setNewShowCustomInput] = useState({
    'Development': false,
    '360 Deg Digital Marketing': false,
    'Meta / Google Ads': false,
    'Design': false
  });
  
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
    devPrice: '',
    marketingPrice: '',
    adsPrice: '',
    designPrice: '',
    budget: '',
    status: 'Planning',
    devStatus: 'Planning',
    marketingStatus: 'Planning',
    adsStatus: 'Planning',
    designStatus: 'Planning',
    startDate: '',
    endDate: '',
    projectType: [],
    subcategories: [],
    devStartDate: '',
    devEndDate: '',
    marketingStartDate: '',
    marketingEndDate: '',
    adsDate: '',
    designStartDate: '',
    designEndDate: '',
    hostingExpiry: '',
    domainExpiry: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [quotationFile, setQuotationFile] = useState(null);
  const [quotationUrl, setQuotationUrl] = useState('');
  const [uploadCode, setUploadCode] = useState('ABC012');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const [clients, setClients] = useState([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [inlineClient, setInlineClient] = useState({ name: '', email: '' });

  // Company users for employee assignment
  const [companyUsers, setCompanyUsers] = useState([]);
  const [newProjectEmployees, setNewProjectEmployees] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

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
      // Fetch company users for assignment
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
        if (data) {
          if (data.companyUsers) setCompanyUsers(data.companyUsers);
          if (data.uploadCode) setUploadCode(data.uploadCode);
        }
      }).catch(() => {});
    } else {
      // Reset employee selection on close
      setNewProjectEmployees([]);
      setShowEmployeeDropdown(false);
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

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          if (data.category) setUserCategory(data.category);
          if (data.company?.projectLimit !== undefined) setProjectLimit(data.company.projectLimit);
          if (data.projectCount !== undefined) setProjectCount(data.projectCount);
        }
      })
      .catch(() => {});
  }, []);

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
          fileName: quotationFile.name,
          filePath: uploadData.url,
        };
      } else if (quotationUrl.trim()) {
        quotationData = {
          fileName: quotationUrl.split('/').pop() || 'Quotation Document',
          filePath: quotationUrl.trim(),
        };
      }

      // Calculate overall project startDate and endDate based on category-specific dates
      const startDates = [];
      const endDates = [];
      if (newProject.projectType.includes('Development')) {
        if (newProject.devStartDate) startDates.push(new Date(newProject.devStartDate));
        if (newProject.devEndDate) endDates.push(new Date(newProject.devEndDate));
      }
      if (newProject.projectType.includes('360 Deg Digital Marketing')) {
        if (newProject.marketingStartDate) startDates.push(new Date(newProject.marketingStartDate));
        if (newProject.marketingEndDate) endDates.push(new Date(newProject.marketingEndDate));
      }
      if (newProject.projectType.includes('Meta / Google Ads')) {
        if (newProject.adsDate) {
          startDates.push(new Date(newProject.adsDate));
          endDates.push(new Date(newProject.adsDate));
        }
      }
      if (newProject.projectType.includes('Design')) {
        if (newProject.designStartDate) startDates.push(new Date(newProject.designStartDate));
        if (newProject.designEndDate) endDates.push(new Date(newProject.designEndDate));
      }
      const calculatedStartDate = startDates.length > 0 ? new Date(Math.min(...startDates)) : undefined;
      const calculatedEndDate = endDates.length > 0 ? new Date(Math.min(...endDates)) : undefined;

      const calculatedOverallStatus = getOverallStatus({
        projectType: newProject.projectType,
        status: newProject.status,
        devStatus: newProject.devStatus,
        marketingStatus: newProject.marketingStatus,
        adsStatus: newProject.adsStatus,
        designStatus: newProject.designStatus,
        devEndDate: newProject.devEndDate,
        marketingEndDate: newProject.marketingEndDate,
        adsDate: newProject.adsDate,
        designEndDate: newProject.designEndDate
      });

      const calculatedFinalPrice = (parseFloat(newProject.hostingPrice) || 0) + 
                                  (parseFloat(newProject.domainPrice) || 0) + 
                                  (parseFloat(newProject.devPrice) || 0) + 
                                  (parseFloat(newProject.marketingPrice) || 0) + 
                                  (parseFloat(newProject.adsPrice) || 0) + 
                                  (parseFloat(newProject.designPrice) || 0);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          quotePrice: newProject.quotePrice ? parseFloat(newProject.quotePrice) : 0,
          finalPrice: calculatedFinalPrice,
          hostingPrice: newProject.hostingPrice ? parseFloat(newProject.hostingPrice) : 0,
          domainPrice: newProject.domainPrice ? parseFloat(newProject.domainPrice) : 0,
          devPrice: newProject.devPrice ? parseFloat(newProject.devPrice) : 0,
          marketingPrice: newProject.marketingPrice ? parseFloat(newProject.marketingPrice) : 0,
          adsPrice: newProject.adsPrice ? parseFloat(newProject.adsPrice) : 0,
          designPrice: newProject.designPrice ? parseFloat(newProject.designPrice) : 0,
          budget: calculatedFinalPrice,
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
          status: calculatedOverallStatus,
          devStatus: newProject.devStatus,
          marketingStatus: newProject.marketingStatus,
          adsStatus: newProject.adsStatus,
          designStatus: newProject.designStatus,
          devStartDate: newProject.devStartDate || undefined,
          devEndDate: newProject.devEndDate || undefined,
          marketingStartDate: newProject.marketingStartDate || undefined,
          marketingEndDate: newProject.marketingEndDate || undefined,
          adsDate: newProject.adsDate || undefined,
          designStartDate: newProject.designStartDate || undefined,
          designEndDate: newProject.designEndDate || undefined,
          hostingExpiry: newProject.hostingExpiry || undefined,
          domainExpiry: newProject.domainExpiry || undefined,
          quotation: quotationData || undefined
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create project');
      }

      const createdProject = await res.json();

      // If employees were selected, assign them
      if (newProjectEmployees.length > 0 && createdProject._id) {
        await fetch(`/api/projects/${createdProject._id}/assign`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeIds: newProjectEmployees }),
        }).catch(() => {}); // non-blocking
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
        devPrice: '',
        marketingPrice: '',
        adsPrice: '',
        designPrice: '',
        budget: '',
        status: 'Planning',
        devStatus: 'Planning',
        marketingStatus: 'Planning',
        adsStatus: 'Planning',
        designStatus: 'Planning',
        startDate: '',
        endDate: '',
        projectType: [],
        subcategories: [],
        devStartDate: '',
        devEndDate: '',
        marketingStartDate: '',
        marketingEndDate: '',
        adsDate: '',
        designStartDate: '',
        designEndDate: '',
        hostingExpiry: '',
        domainExpiry: ''
      });
      setNewCustomSubs({
        'Development': '',
        '360 Deg Digital Marketing': '',
        'Meta / Google Ads': '',
        'Design': ''
      });
      setNewShowCustomInput({
        'Development': false,
        '360 Deg Digital Marketing': false,
        'Meta / Google Ads': false,
        'Design': false
      });
      setQuotationFile(null);
      setNewProjectEmployees([]);
      setShowEmployeeDropdown(false);
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
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Manage, track, and update all client development milestones.</p>
            {projectLimit > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.65rem',
                background: projectCount >= projectLimit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 174, 239, 0.06)',
                border: `1px solid ${projectCount >= projectLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 174, 239, 0.15)'}`,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: projectCount >= projectLimit ? '#ef4444' : 'var(--accent-primary)',
                marginTop: '0.5rem'
              }}>
                <Briefcase size={12} />
                <span>Limit: {projectCount} / {projectLimit} Projects</span>
                {projectCount >= projectLimit && <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#ef4444', color: '#fff', marginLeft: '4px' }}>MAX REACHED</span>}
              </div>
            )}
          </div>
          {userCategory !== 'Employee' && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (projectLimit > 0 && projectCount >= projectLimit) {
                  showToast(`Project creation limit reached (${projectLimit}).`, 'error');
                } else {
                  setIsModalOpen(true);
                }
              }}
            >
              <Plus size={18} />
              <span>New Project</span>
            </button>
          )}
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
        ) : userCategory === 'Employee' ? (
          /* Cards Layout: 4 cards in a row */
          <>
            <div className="project-cards-grid">
              {projects.map((project) => {
                const latestUpdate = project.statusUpdates && project.statusUpdates.length > 0
                  ? project.statusUpdates[project.statusUpdates.length - 1]
                  : null;

                return (
                  <div key={project._id} className="project-premium-card">
                    <div className="project-card-header">
                      <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', textTransform: 'uppercase' }}>
                        {project.status}
                      </span>
                    </div>
                    <Link href={`/projects/${project._id}`} className="project-card-name-link">
                      {project.name}
                    </Link>
                    <p className="project-card-description">
                      {project.description || 'No description provided.'}
                    </p>
                    <div className="project-card-status-section">
                      <span className="status-label">Latest Status Update:</span>
                      <p className="status-message-text" title={latestUpdate ? latestUpdate.message : 'No updates yet'}>
                        {latestUpdate ? latestUpdate.message : 'No updates yet'}
                      </p>
                      {latestUpdate && (
                        <span className="status-time">
                          {new Date(latestUpdate.date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <style jsx global>{`
              .project-cards-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 1.25rem;
                margin-top: 1.5rem;
                width: 100%;
              }
              @media (max-width: 1200px) {
                .project-cards-grid {
                  grid-template-columns: repeat(3, 1fr);
                }
              }
              @media (max-width: 900px) {
                .project-cards-grid {
                  grid-template-columns: repeat(2, 1fr);
                }
              }
              @media (max-width: 600px) {
                .project-cards-grid {
                  grid-template-columns: 1fr;
                }
              }
              .project-premium-card {
                background: var(--bg-card, rgba(30, 41, 59, 0.7));
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
                border-radius: 12px;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                position: relative;
                overflow: hidden;
              }
              .project-premium-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, var(--accent-primary, #00aeef), var(--accent-secondary, #f26522));
                opacity: 0.8;
              }
              .project-premium-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 174, 239, 0.15);
                border-color: rgba(0, 174, 239, 0.4);
              }
              .project-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .project-card-name-link {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--accent-primary, #00aeef);
                text-decoration: none;
                transition: color 0.2s;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .project-card-name-link:hover {
                color: var(--text-primary, #ffffff);
              }
              .project-card-description {
                font-size: 0.82rem;
                color: var(--text-secondary, #94a3b8);
                line-height: 1.5;
                margin: 0;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                height: 2.45rem;
              }
              .project-card-status-section {
                margin-top: auto;
                padding-top: 0.75rem;
                border-top: 1px dashed var(--border-color, rgba(255, 255, 255, 0.08));
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
              }
              .status-label {
                font-size: 0.72rem;
                color: var(--text-muted, #64748b);
                text-transform: uppercase;
                font-weight: 600;
                letter-spacing: 0.05em;
              }
              .status-message-text {
                font-size: 0.85rem;
                color: var(--text-primary, #ffffff);
                margin: 0;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .status-time {
                font-size: 0.7rem;
                color: var(--text-muted, #64748b);
                align-self: flex-end;
              }
            `}</style>
          </>
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
                  <th>Category & Status</th>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {project.projectType && project.projectType.length > 0 ? (
                            project.projectType.map(type => {
                              let catLabel = type === '360 Deg Digital Marketing' ? 'Marketing' : (type === 'Meta / Google Ads' ? 'Ads' : (type === 'Design' ? 'Design' : 'Dev'));
                              let catStatus = 'Planning';
                              if (type === 'Development') catStatus = project.devStatus || 'Planning';
                              else if (type === '360 Deg Digital Marketing') catStatus = project.marketingStatus || 'Planning';
                              else if (type === 'Meta / Google Ads') catStatus = project.adsStatus || 'Planning';
                              else if (type === 'Design') catStatus = project.designStatus || 'Planning';
                              
                              return (
                                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-start' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '65px' }}>{catLabel}:</span>
                                  <span className={`badge badge-${catStatus.toLowerCase().replace(' ', '')}`} style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                                    {catStatus}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}>
                              {project.status}
                            </span>
                          )}
                        </div>
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
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }} className="responsive-grid">
                
                {/* Left Column: Project Type, Subcategory, Name, Description, Client & Quotation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Project Type & Subcategory Selection */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', position: 'relative' }}>
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Project Type *</label>
                      <button
                        type="button"
                        className="form-select animate-fade-in"
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          textAlign: 'left',
                          background: 'rgba(255, 255, 255, 0.03)',
                          cursor: 'pointer',
                          width: '100%',
                          minHeight: '38px',
                          color: newProject.projectType.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}
                        onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      >
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {newProject.projectType.length > 0
                            ? newProject.projectType.join(', ')
                            : 'Select Project Types'}
                        </span>
                        <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      </button>

                      {isTypeDropdownOpen && (
                        <>
                          <div 
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                            onClick={() => setIsTypeDropdownOpen(false)}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            zIndex: 999, 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px', 
                            marginTop: '4px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                            padding: '0.4rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem'
                          }}>
                             {['Development', '360 Deg Digital Marketing', 'Meta / Google Ads', 'Design'].map(type => {
                              const isChecked = newProject.projectType.includes(type);
                              return (
                                <label
                                  key={type}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    background: isChecked ? 'rgba(0, 174, 239, 0.08)' : 'transparent',
                                    color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    margin: 0
                                  }}
                                  className="type-dropdown-item"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        let updatedTypes;
                                        if (isChecked) {
                                          updatedTypes = newProject.projectType.filter(t => t !== type);
                                        } else {
                                          updatedTypes = [...newProject.projectType, type];
                                        }
                                        const newSubs = newProject.subcategories.filter(sub => {
                                          const isPre = updatedTypes.some(t => getSubcategoriesList(t).includes(sub));
                                          if (isPre) return true;
                                          return updatedTypes.some(t => newShowCustomInput[t] && newCustomSubs[t].trim() === sub);
                                        });
                                        setNewProject(prev => ({
                                          ...prev,
                                          projectType: updatedTypes,
                                          subcategories: newSubs
                                        }));
                                      }}
                                      style={{ width: '14px', height: '14px', borderRadius: '3px', cursor: 'pointer' }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span style={{ userSelect: 'none' }}>{type}</span>
                                  </div>
                                  {isChecked && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {Array.isArray(newProject.projectType) && newProject.projectType.length > 0 && (
                      <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.8rem' }}>Select Subcategories</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {newProject.projectType.map(type => {
                            const subs = getSubcategoriesList(type);
                            return (
                              <div key={type} style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                padding: '0.85rem'
                              }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                  {type}
                                </span>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
                                  gap: '0.5rem'
                                }}>
                                  {subs.map(sub => {
                                    const isChecked = newProject.subcategories.includes(sub);
                                    return (
                                      <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', margin: 0 }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            const updated = isChecked
                                              ? newProject.subcategories.filter(s => s !== sub)
                                              : [...newProject.subcategories, sub];
                                            setNewProject(prev => ({
                                              ...prev,
                                              subcategories: updated
                                            }));
                                          }}
                                          style={{ width: '13px', height: '13px', borderRadius: '3px', cursor: 'pointer' }}
                                        />
                                        <span style={{ userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub}>{sub}</span>
                                      </label>
                                    );
                                  })}
                                  {/* Others option */}
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', margin: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={newShowCustomInput[type] || false}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setNewShowCustomInput(prev => ({ ...prev, [type]: checked }));
                                        if (!checked) {
                                          const currentCustomVal = newCustomSubs[type];
                                          if (currentCustomVal) {
                                            setNewProject(prev => ({
                                              ...prev,
                                              subcategories: prev.subcategories.filter(s => s !== currentCustomVal.trim())
                                            }));
                                          }
                                        } else {
                                          const currentCustomVal = newCustomSubs[type];
                                          if (currentCustomVal && currentCustomVal.trim()) {
                                            setNewProject(prev => ({
                                              ...prev,
                                              subcategories: [...prev.subcategories, currentCustomVal.trim()]
                                            }));
                                          }
                                        }
                                      }}
                                      style={{ width: '13px', height: '13px', borderRadius: '3px', cursor: 'pointer' }}
                                    />
                                    <span style={{ userSelect: 'none' }}>Others</span>
                                  </label>
                                </div>
                                {newShowCustomInput[type] && (
                                  <input
                                    type="text"
                                    placeholder="Specify other subcategory..."
                                    className="form-input"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', marginTop: '0.5rem', height: 'auto' }}
                                    value={newCustomSubs[type] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const oldVal = newCustomSubs[type];
                                      setNewCustomSubs(prev => ({ ...prev, [type]: val }));
                                      
                                      setNewProject(prev => {
                                        let updated = prev.subcategories.filter(s => s !== oldVal.trim());
                                        if (val.trim()) {
                                          updated = [...updated, val.trim()];
                                        }
                                        return { ...prev, subcategories: updated };
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Project Name *</label>
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

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                    <textarea 
                      name="description"
                      className="form-textarea" 
                      style={{ minHeight: '120px' }}
                      placeholder="Describe the scope of work..."
                      value={newProject.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Client Selection */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Select Client profile *</label>
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
                      <div className="form-group" style={{ marginBottom: 0 }}>
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
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Pricing (₹)</label>
                    </div>
                    
                    <div className="form-row" style={{ gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Quote Price (₹)</label>
                        <input
                          type="number"
                          name="quotePrice"
                          className="form-input"
                          placeholder="e.g., 60000"
                          value={newProject.quotePrice}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Final Price (₹) <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>(Auto-calculated)</span></label>
                        <input
                          type="number"
                          name="finalPrice"
                          className="form-input"
                          style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                          disabled
                          value={
                            (parseFloat(newProject.hostingPrice) || 0) +
                            (parseFloat(newProject.domainPrice) || 0) +
                            (parseFloat(newProject.devPrice) || 0) +
                            (parseFloat(newProject.marketingPrice) || 0) +
                            (parseFloat(newProject.adsPrice) || 0) +
                            (parseFloat(newProject.designPrice) || 0)
                          }
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                      <label className="form-label" style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final Price Breakdown</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hosting Cost</label>
                          <input
                            type="number"
                            name="hostingPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.hostingPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Domain Cost</label>
                          <input
                            type="number"
                            name="domainPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.domainPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Development Cost</label>
                          <input
                            type="number"
                            name="devPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.devPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>360 Deg Marketing Cost</label>
                          <input
                            type="number"
                            name="marketingPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.marketingPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Meta/Google Ads Cost</label>
                          <input
                            type="number"
                            name="adsPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.adsPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Design Cost</label>
                          <input
                            type="number"
                            name="designPrice"
                            className="form-input"
                            placeholder="0"
                            value={newProject.designPrice}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotation upload section */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label className="form-label" style={{ display: 'block', fontWeight: 600, marginBottom: 0 }}>Quotation Document</label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Upload File</span>
                        <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '9999px', padding: '0.05rem 0.4rem', fontWeight: 600, letterSpacing: '0.03em' }}>Coming Soon</span>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📁</span>
                        <span>File upload is currently unavailable. Use the URL option below.</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                      <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Enter Document URL</span>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ flex: 1 }}
                          placeholder="e.g. https://domain.com/quotation.pdf"
                          value={quotationUrl}
                          onChange={(e) => {
                            setQuotationUrl(e.target.value);
                            setQuotationFile(null); // Clear file if URL typed
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0 1rem' }}
                          onClick={() => setIsUploadModalOpen(true)}
                        >
                          <ExternalLink size={14} />
                          <span>Get URL</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Timelines, Status & Expiry Dates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Category-Specific Dates Section */}
                  {((newProject.projectType.includes('Development')) || 
                    (newProject.projectType.includes('360 Deg Digital Marketing')) || 
                    (newProject.projectType.includes('Meta / Google Ads')) ||
                    (newProject.projectType.includes('Design'))) && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                      <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 600, color: 'var(--accent-primary)' }}>Category Timelines</label>
                      
                      {newProject.projectType.includes('Development') && (
                        <div style={{ marginBottom: '1rem', borderBottom: (newProject.projectType.includes('360 Deg Digital Marketing') || newProject.projectType.includes('Meta / Google Ads') || newProject.projectType.includes('Design')) ? '1px dashed var(--border-color)' : 'none', paddingBottom: (newProject.projectType.includes('360 Deg Digital Marketing') || newProject.projectType.includes('Meta / Google Ads') || newProject.projectType.includes('Design')) ? '1rem' : '0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Development Timeline</span>
                          <div className="form-row" style={{ gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                              <input 
                                type="date" 
                                name="devStartDate"
                                className="form-input"
                                value={newProject.devStartDate}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date (Target)</label>
                              <input 
                                type="date" 
                                name="devEndDate"
                                className="form-input"
                                value={newProject.devEndDate}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Development Status</label>
                            <select 
                              name="devStatus"
                              className="form-select"
                              value={newProject.devStatus}
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
                      )}

                      {newProject.projectType.includes('360 Deg Digital Marketing') && (
                        <div style={{ marginBottom: (newProject.projectType.includes('Meta / Google Ads') || newProject.projectType.includes('Design')) ? '1rem' : '0', borderBottom: (newProject.projectType.includes('Meta / Google Ads') || newProject.projectType.includes('Design')) ? '1px dashed var(--border-color)' : 'none', paddingBottom: (newProject.projectType.includes('Meta / Google Ads') || newProject.projectType.includes('Design')) ? '1rem' : '0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>360° Digital Marketing Timeline</span>
                          <div className="form-row" style={{ gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                              <input 
                                type="date" 
                                name="marketingStartDate"
                                className="form-input"
                                value={newProject.marketingStartDate}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date (Target)</label>
                              <input 
                                type="date" 
                                name="marketingEndDate"
                                className="form-input"
                                value={newProject.marketingEndDate}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Marketing Status</label>
                            <select 
                              name="marketingStatus"
                              className="form-select"
                              value={newProject.marketingStatus}
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
                      )}

                      {newProject.projectType.includes('Meta / Google Ads') && (
                        <div style={{ marginBottom: newProject.projectType.includes('Design') ? '1rem' : '0', borderBottom: newProject.projectType.includes('Design') ? '1px dashed var(--border-color)' : 'none', paddingBottom: newProject.projectType.includes('Design') ? '1rem' : '0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Google / Meta Ads Timeline</span>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Campaign Date</label>
                            <input 
                              type="date" 
                              name="adsDate"
                              className="form-input"
                              value={newProject.adsDate}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Ads Status</label>
                            <select 
                              name="adsStatus"
                              className="form-select"
                              value={newProject.adsStatus}
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
                      )}

                      {newProject.projectType.includes('Design') && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Design Timeline</span>
                          <div className="form-row" style={{ gap: '0.75rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                              <input 
                                type="date" 
                                name="designStartDate"
                                className="form-input"
                                value={newProject.designStartDate}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date (Target)</label>
                              <input 
                                type="date" 
                                name="designEndDate"
                                className="form-input"
                                value={newProject.designEndDate}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Design Status</label>
                            <select 
                              name="designStatus"
                              className="form-select"
                              value={newProject.designStatus}
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
                      )}
                    </div>
                  )}

                  {/* Status & Expiry Dates */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {newProject.projectType.length === 0 && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Project Status</label>
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
                    )}

                    <div className="form-row" style={{ gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Hosting Expiry Date</label>
                        <input 
                          type="date" 
                          name="hostingExpiry"
                          className="form-input" 
                          value={newProject.hostingExpiry} 
                          onChange={handleInputChange} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Domain Expiry Date</label>
                        <input 
                          type="date" 
                          name="domainExpiry"
                          className="form-input" 
                          value={newProject.domainExpiry} 
                          onChange={handleInputChange} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assign Team Members */}
                  {companyUsers.filter(u => u.role !== 'company_admin').length > 0 && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        <Users size={14} style={{ color: 'var(--accent-primary)' }} />
                        Assign Team Members
                      </label>

                      {/* Selected chips */}
                      {newProjectEmployees.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          {newProjectEmployees.map(eid => {
                            const u = companyUsers.find(u => u.id === eid);
                            if (!u) return null;
                            return (
                              <div key={eid} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0,174,239,0.12)', border: '1px solid rgba(0,174,239,0.3)', color: 'var(--accent-primary)', borderRadius: '20px', padding: '0.2rem 0.55rem 0.2rem 0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                {u.username}
                                <button type="button" onClick={() => setNewProjectEmployees(prev => prev.filter(id => id !== eid))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', opacity: 0.7 }}>×</button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dropdown toggle button */}
                      <button
                        type="button"
                        className="form-select"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                        onClick={() => setShowEmployeeDropdown(p => !p)}
                      >
                        <span>{newProjectEmployees.length > 0 ? `${newProjectEmployees.length} member${newProjectEmployees.length > 1 ? 's' : ''} selected` : 'Click to select team members'}</span>
                        <ChevronDown size={14} />
                      </button>

                      {showEmployeeDropdown && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowEmployeeDropdown(false)} />
                          <div style={{ position: 'relative', zIndex: 999, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '200px', overflowY: 'auto' }}>
                            {companyUsers.filter(u => u.role !== 'company_admin').map(user => {
                              const isChecked = newProjectEmployees.includes(user.id);
                              return (
                                <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', cursor: 'pointer', background: isChecked ? 'rgba(0,174,239,0.08)' : 'transparent', margin: 0 }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => setNewProjectEmployees(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} style={{ width: '14px', height: '14px' }} onClick={e => e.stopPropagation()} />
                                  <span style={{ fontSize: '0.85rem', color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: isChecked ? 600 : 400 }}>{user.username}</span>
                                  {user.email && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{user.email}</span>}
                                  {isChecked && <Check size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>

              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
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

      {/* Upload Platform Access Modal */}
      {isUploadModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUploadModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', padding: '2rem', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Access Uploading Platform
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Access Code</label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'var(--bg-secondary)', 
                  border: '1.5px dashed var(--accent-primary)', 
                  borderRadius: '12px', 
                  padding: '0.75rem 1.25rem',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
                    {uploadCode}
                  </span>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ 
                      padding: '0.4rem 0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontSize: '0.78rem', 
                      fontWeight: 600, 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)' 
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(uploadCode);
                      showToast('Access code copied to clipboard', 'success');
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div style={{ 
                fontSize: '0.82rem', 
                color: 'var(--text-secondary)', 
                background: 'var(--accent-primary-glow)', 
                padding: '0.85rem 1.15rem', 
                borderRadius: '10px', 
                borderLeft: '4px solid var(--accent-primary)',
                lineHeight: '1.5'
              }}>
                <strong>Note:</strong> To access the site, copy the access code above.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 600 }} onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </button>
                <a 
                  href="https://uploads.worklanceai.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 600 }}
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  <span>Go to Site</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
