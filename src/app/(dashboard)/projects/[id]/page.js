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
  AlertTriangle,
  ChevronDown,
  X
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
  
  if (statuses.length === 0) {
    return proj.status || 'Planning';
  }
  
  if (statuses.includes('Pending')) return 'Pending';
  if (statuses.includes('Under Review')) return 'Under Review';
  if (statuses.includes('In Progress')) return 'In Progress';
  if (statuses.includes('Planning')) return 'Planning';
  return 'Completed';
};

export default function ProjectDetailPage() {
  const { showToast, showConfirm } = useNotification();
  const getSubcategoriesList = (type) => {
    switch (type) {
      case 'Development':
        return ['Education', 'Shopping', 'GYM', 'Wedding', 'Real Estate', 'Healthcare', 'Restaurant/Food', 'Travel', 'Portfolio', 'Corporate'];
      case '360 Deg Digital Marketing':
        return ['SEO', 'SMO', 'GBP'];
      case 'Meta / Google Ads':
        return ['Meta Ads', 'Google Ads'];
      default:
        return [];
    }
  };
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('');
  const [activeTab, setActiveTab] = useState('details');

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
    devStatus: 'Planning',
    marketingStatus: 'Planning',
    adsStatus: 'Planning',
    startDate: '',
    endDate: '',
    devStartDate: '',
    devEndDate: '',
    marketingStartDate: '',
    marketingEndDate: '',
    adsDate: '',
    hostingExpiry: '',
    domainExpiry: '',
    credentials: [],
    quotation: null,
    projectType: [],
    subcategories: [],
    contentCalendar: []
  });
  const [updating, setUpdating] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [isViewCalendarOpen, setIsViewCalendarOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [calendarMonthFilter, setCalendarMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [postForm, setPostForm] = useState({
    scheduledDate: '',
    postType: 'Static',
    topic: '',
    content: '',
    hashtags: '',
    visual: '',
    platforms: [],
    status: 'Pending'
  });

  const [clients, setClients] = useState([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [inlineClient, setInlineClient] = useState({ name: '', email: '' });
  
  // Credentials view state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [fourDaysThreshold] = useState(() => new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));

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
        devStatus: data.project.devStatus ?? 'Planning',
        marketingStatus: data.project.marketingStatus ?? 'Planning',
        adsStatus: data.project.adsStatus ?? 'Planning',
        startDate: data.project.startDate ? new Date(data.project.startDate).toISOString().substring(0, 10) : '',
        endDate: data.project.endDate ? new Date(data.project.endDate).toISOString().substring(0, 10) : '',
        devStartDate: data.project.devStartDate ? new Date(data.project.devStartDate).toISOString().substring(0, 10) : '',
        devEndDate: data.project.devEndDate ? new Date(data.project.devEndDate).toISOString().substring(0, 10) : '',
        marketingStartDate: data.project.marketingStartDate ? new Date(data.project.marketingStartDate).toISOString().substring(0, 10) : '',
        marketingEndDate: data.project.marketingEndDate ? new Date(data.project.marketingEndDate).toISOString().substring(0, 10) : '',
        adsDate: data.project.adsDate ? new Date(data.project.adsDate).toISOString().substring(0, 10) : '',
        hostingExpiry: data.project.hostingExpiry ? new Date(data.project.hostingExpiry).toISOString().substring(0, 10) : '',
        domainExpiry: data.project.domainExpiry ? new Date(data.project.domainExpiry).toISOString().substring(0, 10) : '',
        credentials: data.project.credentials ?? [],
        quotation: data.project.quotation ?? null,
        projectType: Array.isArray(data.project.projectType)
          ? data.project.projectType
          : (data.project.projectType ? [data.project.projectType] : []),
        subcategories: data.project.subcategories ?? [],
        contentCalendar: data.project.contentCalendar ?? []
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

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.scheduledDate) {
      showToast('Scheduled date is required', 'error');
      return;
    }

    const scheduledDateObj = new Date(postForm.scheduledDate);
    const year = scheduledDateObj.getFullYear();
    const month = String(scheduledDateObj.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`; // automatically compute month e.g. "2026-06"

    const postData = {
      ...postForm,
      ideation: postForm.topic,
      caption: postForm.content,
      description: postForm.visual,
      month: monthStr,
      scheduledDate: scheduledDateObj.toISOString(),
    };

    let updatedCalendar = [];
    if (currentPost && currentPost._id) {
      // Edit mode
      updatedCalendar = (project.contentCalendar || []).map(p => 
        p._id === currentPost._id ? { ...postData, _id: currentPost._id } : p
      );
    } else {
      // Add mode
      updatedCalendar = [...(project.contentCalendar || []), postData];
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentCalendar: updatedCalendar }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to save content calendar post');
      }
      const updatedProject = await res.json();
      setProject(updatedProject);
      
      // Update local editForm to avoid overwriting on later project edits
      setEditForm(prev => ({
        ...prev,
        contentCalendar: updatedProject.contentCalendar || []
      }));

      setIsAddPostModalOpen(false);
      setCurrentPost(null);
      setPostForm({ scheduledDate: '', postType: 'Static', topic: '', content: '', hashtags: '', visual: '', platforms: [], status: 'Pending' });
      showToast(currentPost ? 'Post updated successfully' : 'Post scheduled successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    showConfirm({
      title: 'Delete Calendar Post',
      message: 'Are you sure you want to delete this scheduled post?',
      type: 'danger',
      onConfirm: async () => {
        const updatedCalendar = (project.contentCalendar || []).filter(p => p._id !== postId);
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentCalendar: updatedCalendar }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || 'Failed to delete post');
          }
          const updatedProject = await res.json();
          setProject(updatedProject);

          setEditForm(prev => ({
            ...prev,
            contentCalendar: updatedProject.contentCalendar || []
          }));

          showToast('Post removed from content calendar', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return 'N/A';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getMonthsOptions = () => {
    const months = new Set();
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    (project.contentCalendar || []).forEach(post => {
      if (post.month) {
        months.add(post.month);
      }
    });
    return Array.from(months).sort();
  };

  const handleExportCalendar = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) {
      showToast('From and To dates are required for export', 'error');
      return;
    }

    const fromDateObj = new Date(fromDateStr);
    const toDateObj = new Date(toDateStr);
    fromDateObj.setHours(0, 0, 0, 0);
    toDateObj.setHours(23, 59, 59, 999);

    const filteredPosts = (project.contentCalendar || [])
      .filter(post => {
        const d = new Date(post.scheduledDate);
        return d >= fromDateObj && d <= toDateObj;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (filteredPosts.length === 0) {
      showToast('No posts found to export for the selected date range', 'error');
      return;
    }

    const headers = [
      'Post ID',
      'Date',
      'Day',
      'Status',
      'Post Type',
      'Topic',
      'Content',
      'Visual/Reference link',
      'Hashtags',
      'Target post'
    ];

    const rows = filteredPosts.map(post => {
      const scheduledDateObj = new Date(post.scheduledDate);
      const d = scheduledDateObj;
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const dayStr = scheduledDateObj.toLocaleDateString('en-IN', { weekday: 'long' });
      const platformsStr = (post.platforms || []).join(', ');
      
      const escape = (text) => {
        if (text === null || text === undefined) return '';
        // Strip emojis
        const stripped = String(text).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u2600-\u27BF|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "");
        if (stripped.includes(',') || stripped.includes('\n') || stripped.includes('"')) {
          return `"${stripped.replace(/"/g, '""')}"`;
        }
        return stripped;
      };

      return [
        escape(post._id || ''),
        escape(dateStr),
        escape(dayStr),
        escape(post.status || 'Pending'),
        escape(post.postType || 'Static'),
        escape(post.topic || post.ideation || ''),
        escape(post.content || post.caption || ''),
        escape(post.visual || post.description || ''),
        escape(post.hashtags || ''),
        escape(platformsStr)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fromStrFormatted = new Date(fromDateStr).toLocaleDateString('en-IN').replace(/\//g, '-');
    const toStrFormatted = new Date(toDateStr).toLocaleDateString('en-IN').replace(/\//g, '-');
    const filename = `${project.name.replace(/\s+/g, '_')}_Content_Calendar_${fromStrFormatted}_to_${toStrFormatted}.csv`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Content calendar exported successfully as CSV', 'success');
  };

  const openExportModal = () => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (calendarMonthFilter) {
      const parts = calendarMonthFilter.split('-');
      if (parts.length === 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    }
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
    setExportFromDate(firstDay);
    setExportToDate(lastDay);
    setIsExportModalOpen(true);
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleImportCalendar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = event.target.result;
        
        // Strip UTF-8 BOM if present
        if (text.startsWith('\ufeff')) {
          text = text.substring(1);
        }

        const lines = parseCSV(text);
        if (lines.length < 2) {
          showToast('CSV is empty or invalid', 'error');
          return;
        }

        const headers = lines[0];
        const headerMap = {};
        headers.forEach((h, idx) => {
          const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          headerMap[norm] = idx;
        });

        const getValue = (row, keyVariants) => {
          for (const variant of keyVariants) {
            const idx = headerMap[variant];
            if (idx !== undefined && row[idx] !== undefined) {
              return row[idx].trim();
            }
          }
          return '';
        };

        const parseDateString = (dateStr, timeStr) => {
          if (!dateStr) return null;
          const cleanStr = dateStr.trim();
          
          let resultDate = null;

          // Try split by common delimiters
          let parts = [];
          if (cleanStr.includes('/')) {
            parts = cleanStr.split('/');
          } else if (cleanStr.includes('-')) {
            parts = cleanStr.split('-');
          } else if (cleanStr.includes('.')) {
            parts = cleanStr.split('.');
          }

          if (parts.length === 3) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);

            if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
              if (parts[0].length === 4) {
                // YYYY-MM-DD
                resultDate = new Date(p0, p1 - 1, p2);
              } else {
                // DD-MM-YYYY
                let yr = p2;
                if (yr < 100) yr += 2000;
                resultDate = new Date(yr, p1 - 1, p0);
              }
            }
          }

          // Fallback to built-in Date parser
          if (!resultDate || isNaN(resultDate.getTime())) {
            const d = new Date(cleanStr);
            if (!isNaN(d.getTime())) {
              resultDate = d;
            }
          }

          if (!resultDate || isNaN(resultDate.getTime())) {
            return null;
          }

          // Combine with timeStr if present
          let hours = 12;
          let minutes = 0;
          if (timeStr) {
            const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (match) {
              hours = parseInt(match[1], 10);
              minutes = parseInt(match[2], 10);
              const ampm = match[3];
              if (ampm) {
                if (ampm.toUpperCase() === 'PM' && hours < 12) {
                  hours += 12;
                } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
                  hours = 0;
                }
              }
            }
          }

          resultDate.setHours(hours, minutes, 0, 0);
          return resultDate;
        };

        const currentCalendar = [...(project.contentCalendar || [])];
        let newCount = 0;
        let updateCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length === 1 && row[0] === '') continue;

          const postId = getValue(row, ['postid', 'id']);
          const dateStr = getValue(row, ['date', 'scheduleddate', 'dateday']);
          const status = getValue(row, ['status']);
          const postType = getValue(row, ['posttype', 'type']);
          const topic = getValue(row, ['topic', 'ideationbrief', 'ideation', 'brief']);
          const content = getValue(row, ['content', 'caption']);
          const hashtags = getValue(row, ['hashtags']);
          const visual = getValue(row, ['visualreferencelink', 'visual', 'descriptioninternalnotes', 'description', 'notes', 'internalnotes']);
          const targetPostRaw = getValue(row, ['targetpost', 'platforms']);

          if (!dateStr) continue;

          // Strip day name suffix if present (e.g. "16/06/2026 (Tuesday)")
          const cleanDateStr = dateStr.replace(/\s*\(.*?\)\s*/g, '').trim();

          const parsedDate = parseDateString(cleanDateStr, null);
          if (!parsedDate) continue;

          const year = parsedDate.getFullYear();
          const monthStr = `${year}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;

          const platforms = targetPostRaw
            ? targetPostRaw.split(',').map(p => {
                const clean = p.trim().toLowerCase();
                if (clean === 'instagram' || clean === 'ig') return 'Instagram';
                if (clean === 'facebook' || clean === 'fb') return 'Facebook';
                if (clean === 'youtube' || clean === 'yt') return 'Youtube';
                if (clean === 'linkedin' || clean === 'li') return 'LinkedIn';
                if (clean === 'twitter' || clean === 'tw') return 'Twitter';
                if (clean === 'gbp' || clean === 'google business' || clean === 'google business profile') return 'GBP';
                return '';
              }).filter(Boolean)
            : [];

          let normStatus = 'Pending';
          const cleanStatus = status.trim().toLowerCase();
          if (cleanStatus === 'posted' || cleanStatus === 'completed' || cleanStatus === 'published') {
            normStatus = 'Posted';
          } else if (cleanStatus === 'design approved' || cleanStatus === 'approved' || cleanStatus === 'ready') {
            normStatus = 'Design Approved';
          } else if (cleanStatus === 'design done' || cleanStatus === 'done') {
            normStatus = 'Design Done';
          } else {
            normStatus = 'Pending';
          }

          let normPostType = 'Static';
          if (postType) {
            const cleanPostType = postType.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanPostType === 'static') normPostType = 'Static';
            else if (cleanPostType === 'motion') normPostType = 'Motion';
            else if (cleanPostType === 'reel') normPostType = 'Reel';
            else if (cleanPostType === 'carousel') normPostType = 'Carousel';
            else if (cleanPostType === 'motiongraphicwishpost') normPostType = 'Motion Graphic Wish Post';
            else if (cleanPostType === 'wishpost') normPostType = 'Wish post';
          }

          const postData = {
            scheduledDate: parsedDate.toISOString(),
            month: monthStr,
            platforms,
            status: normStatus,
            postType: normPostType,
            topic,
            content,
            visual,
            hashtags,
            // Legacy fallbacks
            ideation: topic,
            caption: content,
            description: visual
          };

          let matchIdx = -1;
          if (postId) {
            matchIdx = currentCalendar.findIndex(p => p._id === postId);
          }

          if (matchIdx !== -1) {
            currentCalendar[matchIdx] = {
              ...currentCalendar[matchIdx],
              ...postData
            };
            updateCount++;
          } else {
            currentCalendar.push(postData);
            newCount++;
          }
        }

        if (newCount === 0 && updateCount === 0) {
          showToast('No valid calendar posts found in CSV', 'error');
          return;
        }

        const res = await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentCalendar: currentCalendar }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Failed to import and save content calendar');
        }
        const updatedProject = await res.json();
        setProject(updatedProject);
        setEditForm(prev => ({
          ...prev,
          contentCalendar: updatedProject.contentCalendar || []
        }));

        showToast(`Imported calendar: ${newCount} added, ${updateCount} updated`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleQuickStatusChange = async (postId, newStatus) => {
    const updatedCalendar = (project.contentCalendar || []).map(post => {
      if (post._id === postId) {
        return { ...post, status: newStatus };
      }
      return post;
    });

    // Optimistic UI update
    setProject(prev => ({
      ...prev,
      contentCalendar: updatedCalendar
    }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentCalendar: updatedCalendar }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to update status');
      }
      const updatedProject = await res.json();
      setProject(updatedProject);
      setEditForm(prev => ({
        ...prev,
        contentCalendar: updatedProject.contentCalendar || []
      }));
      showToast('Status updated successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      fetchProjectData(); // revert
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Posted':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Design Approved':
        return { bg: 'rgba(0, 174, 239, 0.12)', color: '#00aeef', border: 'rgba(0, 174, 239, 0.3)' };
      case 'Design Done':
        return { bg: 'rgba(242, 101, 34, 0.12)', color: '#f26522', border: 'rgba(242, 101, 34, 0.3)' };
      case 'Pending':
      default:
        return { bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', border: 'rgba(217, 119, 6, 0.3)' };
    }
  };

  const renderPostSummaryCard = (post) => {
    const platformMeta = {
      Instagram: { label: 'IG', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.2)' },
      Facebook: { label: 'FB', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)' },
      LinkedIn: { label: 'LI', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)' },
      Youtube: { label: 'YT', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)' },
      Twitter: { label: 'TW', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.08)', border: 'rgba(14, 165, 233, 0.2)' },
      GBP: { label: 'GBP', color: '#f26522', bg: 'rgba(242, 101, 34, 0.08)', border: 'rgba(242, 101, 34, 0.2)' }
    };

    const statusStyle = getStatusStyle(post.status);
    const scheduledDateObj = new Date(post.scheduledDate);
    const weekday = scheduledDateObj.toLocaleDateString('en-IN', { weekday: 'long' });
    const dateStr = scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const timeStr = scheduledDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
      <div 
        key={post._id} 
        style={{ 
          padding: '0.45rem 0.75rem', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
          borderRadius: '8px'
        }}
        className="post-summary-strip post-summary-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Date & Time display */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {dateStr} • {weekday}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '1px' }}>
              {timeStr}
            </span>
          </div>

          {/* Platform badges */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', width: '48px' }}>
            {post.platforms && post.platforms.map(p => {
              const meta = platformMeta[p] || { label: p.substring(0, 2).toUpperCase(), color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)', border: 'var(--border-color)' };
              return (
                <span 
                  key={p} 
                  style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: 700, 
                    color: meta.color, 
                    background: meta.bg, 
                    border: `1px solid ${meta.border}`, 
                    padding: '1px 3px', 
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    lineHeight: '1.1'
                  }}
                  title={p}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Content details (Truncated) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(0, 174, 239, 0.1)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(0, 174, 239, 0.2)',
              whiteSpace: 'nowrap'
            }}>
              {post.postType || 'Static'}
            </span>
            <span 
              style={{ 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden', 
                whiteSpace: 'nowrap' 
              }} 
              title={`Topic: ${post.topic || post.ideation || ''}`}
            >
              {post.topic || post.ideation || 'No Topic'}
            </span>
          </div>
          {(post.content || post.caption) && (
            <div 
              style={{ 
                fontSize: '0.74rem', 
                color: 'var(--text-secondary)', 
                textOverflow: 'ellipsis', 
                overflow: 'hidden', 
                whiteSpace: 'nowrap' 
              }} 
              title={`Content: ${post.content || post.caption}`}
            >
              {post.content || post.caption}
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <select 
            value={post.status} 
            onChange={(e) => handleQuickStatusChange(post._id, e.target.value)}
            style={{ 
              fontSize: '0.65rem', 
              padding: '0.125rem 1.25rem 0.125rem 0.35rem', 
              textTransform: 'none', 
              lineHeight: '1', 
              borderRadius: '4px',
              fontWeight: 600,
              border: `1px solid ${statusStyle.border}`,
              background: `${statusStyle.bg} url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusStyle.color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.25rem center / 0.55rem`,
              color: statusStyle.color,
              cursor: 'pointer',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              height: '22px'
            }}
          >
            <option value="Pending" style={{ background: 'var(--bg-secondary)', color: '#94a3b8' }}>Pending</option>
            <option value="Design Done" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-secondary)' }}>Design Done</option>
            <option value="Design Approved" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>Design Approved</option>
            <option value="Posted" style={{ background: 'var(--bg-secondary)', color: '#10b981' }}>Posted</option>
          </select>
          
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            <button 
              type="button" 
              className="icon-btn-edit"
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                borderRadius: '4px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
              onClick={() => {
                setCurrentPost(post);
                const localDate = new Date(post.scheduledDate);
                const offset = localDate.getTimezoneOffset();
                const adjustedDate = new Date(localDate.getTime() - (offset*60*1000));
                const formattedDate = adjustedDate.toISOString().substring(0, 16);
                setPostForm({
                  scheduledDate: formattedDate,
                  postType: post.postType || 'Static',
                  topic: post.topic || post.ideation || '',
                  content: post.content || post.caption || '',
                  hashtags: post.hashtags || '',
                  visual: post.visual || post.description || '',
                  platforms: post.platforms || [],
                  status: post.status || 'Pending'
                });
                setIsAddPostModalOpen(true);
              }}
              title="Edit Post"
            >
              <Edit size={13} />
            </button>
            <button 
              type="button" 
              className="icon-btn-delete"
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                borderRadius: '4px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
              onClick={() => handleDeletePost(post._id)}
              title="Delete Post"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
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

      // Calculate overall project startDate and endDate based on category-specific dates
      const startDates = [];
      const endDates = [];
      if (editForm.projectType.includes('Development')) {
        if (editForm.devStartDate) startDates.push(new Date(editForm.devStartDate));
        if (editForm.devEndDate) endDates.push(new Date(editForm.devEndDate));
      }
      if (editForm.projectType.includes('360 Deg Digital Marketing')) {
        if (editForm.marketingStartDate) startDates.push(new Date(editForm.marketingStartDate));
        if (editForm.marketingEndDate) endDates.push(new Date(editForm.marketingEndDate));
      }
      if (editForm.projectType.includes('Meta / Google Ads')) {
        if (editForm.adsDate) {
          startDates.push(new Date(editForm.adsDate));
          endDates.push(new Date(editForm.adsDate));
        }
      }
      const calculatedStartDate = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;
      const calculatedEndDate = endDates.length > 0 ? new Date(Math.min(...endDates)) : null;

      const calculatedOverallStatus = getOverallStatus({
        projectType: editForm.projectType,
        status: editForm.status,
        devStatus: editForm.devStatus,
        marketingStatus: editForm.marketingStatus,
        adsStatus: editForm.adsStatus,
        devEndDate: editForm.devEndDate,
        marketingEndDate: editForm.marketingEndDate,
        adsDate: editForm.adsDate
      });

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
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
          status: calculatedOverallStatus,
          devStatus: editForm.devStatus || 'Planning',
          marketingStatus: editForm.marketingStatus || 'Planning',
          adsStatus: editForm.adsStatus || 'Planning',
          devStartDate: editForm.devStartDate || null,
          devEndDate: editForm.devEndDate || null,
          marketingStartDate: editForm.marketingStartDate || null,
          marketingEndDate: editForm.marketingEndDate || null,
          adsDate: editForm.adsDate || null,
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
        devStatus: updatedProject.devStatus ?? 'Planning',
        marketingStatus: updatedProject.marketingStatus ?? 'Planning',
        adsStatus: updatedProject.adsStatus ?? 'Planning',
        startDate: updatedProject.startDate ? new Date(updatedProject.startDate).toISOString().substring(0, 10) : '',
        endDate: updatedProject.endDate ? new Date(updatedProject.endDate).toISOString().substring(0, 10) : '',
        devStartDate: updatedProject.devStartDate ? new Date(updatedProject.devStartDate).toISOString().substring(0, 10) : '',
        devEndDate: updatedProject.devEndDate ? new Date(updatedProject.devEndDate).toISOString().substring(0, 10) : '',
        marketingStartDate: updatedProject.marketingStartDate ? new Date(updatedProject.marketingStartDate).toISOString().substring(0, 10) : '',
        marketingEndDate: updatedProject.marketingEndDate ? new Date(updatedProject.marketingEndDate).toISOString().substring(0, 10) : '',
        adsDate: updatedProject.adsDate ? new Date(updatedProject.adsDate).toISOString().substring(0, 10) : '',
        hostingExpiry: updatedProject.hostingExpiry ? new Date(updatedProject.hostingExpiry).toISOString().substring(0, 10) : '',
        domainExpiry: updatedProject.domainExpiry ? new Date(updatedProject.domainExpiry).toISOString().substring(0, 10) : '',
        credentials: updatedProject.credentials ?? [],
        quotation: updatedProject.quotation ?? null,
        projectType: Array.isArray(updatedProject.projectType)
          ? updatedProject.projectType
          : (updatedProject.projectType ? [updatedProject.projectType] : []),
        subcategories: updatedProject.subcategories ?? [],
        contentCalendar: updatedProject.contentCalendar ?? []
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

  const tabs = [
    { id: 'details', label: 'Project Details' },
    { id: 'credentials', label: 'Project Credential' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'invoices', label: 'Invoice' },
    { id: 'status', label: 'Status' },
    { id: 'tasks', label: 'Task List' },
    { id: 'calendar', label: 'Content Calendar' }
  ];

  const invoicesList = [...invoices].sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
  const paidTotal = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingTotal = invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const billingProgress = totalInvoiced > 0 ? Math.round((paidTotal / totalInvoiced) * 100) : 0;

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

        {/* Persistent Page Header */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: '1.2' }}>{project.name}</h1>
                <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em', lineHeight: '1', transform: 'translateY(1px)' }}>
                  {project.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.92rem', margin: 0, whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                {project.description || 'No description provided for this project.'}
              </p>
            </div>
            {role !== 'company_user' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                {!isEditing ? (
                  <>
                    <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }} onClick={() => setIsEditing(true)}>
                      <Edit size={16} />
                      <span>Edit Details</span>
                    </button>
                    <button className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem' }} onClick={handleDeleteProject}>
                      <Trash2 size={16} />
                      <span>Delete Project</span>
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button type="submit" form="project-edit-form" className="btn btn-primary" disabled={updating}>
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-nav-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents wrapper */}
        <div style={{ marginBottom: '3rem' }}>
          {isEditing ? (
            <form id="project-edit-form" onSubmit={handleEditSubmit}>
              {/* Tab 1: Project Details (Edit Mode) */}
              {activeTab === 'details' && (
                <div className="card animate-fade-in">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Edit Details Info</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }} className="responsive-grid">
                    {/* Left Column: Category, Name, Desc, Client & Quotation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
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
                              color: editForm.projectType.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                          >
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {editForm.projectType.length > 0
                                ? editForm.projectType.join(', ')
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
                                {['Development', '360 Deg Digital Marketing', 'Meta / Google Ads'].map(type => {
                                  const isChecked = editForm.projectType.includes(type);
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
                                              updatedTypes = editForm.projectType.filter(t => t !== type);
                                            } else {
                                              updatedTypes = [...editForm.projectType, type];
                                            }
                                            const newSubs = editForm.subcategories.filter(sub => {
                                              return updatedTypes.some(t => getSubcategoriesList(t).includes(sub));
                                            });
                                            setEditForm(prev => ({
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

                        {Array.isArray(editForm.projectType) && editForm.projectType.length > 0 && (
                          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.8rem' }}>Select Subcategories</label>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
                              gap: '0.5rem', 
                              background: 'rgba(0, 0, 0, 0.2)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '8px', 
                              padding: '0.5rem' 
                            }}>
                              {editForm.projectType.flatMap(type => getSubcategoriesList(type)).map(sub => {
                                const isChecked = editForm.subcategories.includes(sub);
                                return (
                                  <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const updated = isChecked
                                          ? editForm.subcategories.filter(s => s !== sub)
                                          : [...editForm.subcategories, sub];
                                        setEditForm(prev => ({
                                          ...prev,
                                          subcategories: updated
                                        }));
                                      }}
                                      style={{ width: '12px', height: '12px', borderRadius: '2px', cursor: 'pointer' }}
                                    />
                                    <span style={{ userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
                                  </label>
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
                          className="form-input" 
                          value={editForm.name} 
                          required
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Description</label>
                        <textarea 
                          className="form-textarea" 
                          style={{ minHeight: '120px' }}
                          value={editForm.description} 
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
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

                      {/* Quotation upload section */}
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                        <label className="form-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Quotation Document</label>
                        {editForm.quotation ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              📄 {editForm.quotation.fileName}
                            </span>
                            <button 
                              type="button" 
                              className="btn btn-danger" 
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem', flexShrink: 0 }}
                              onClick={() => setEditForm(prev => ({ ...prev, quotation: null }))}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input 
                              type="file" 
                              className="form-input" 
                              onChange={(e) => setEditQuotationFile(e.target.files[0] || null)}
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            />
                            {editQuotationFile && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '0.25rem', margin: 0 }}>
                                Selected: {editQuotationFile.name}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right Column: Categories, Timelines & Expiries */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* Category-Specific Dates Section */}
                      {((editForm.projectType.includes('Development')) || 
                        (editForm.projectType.includes('360 Deg Digital Marketing')) || 
                        (editForm.projectType.includes('Meta / Google Ads'))) && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                          <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 600, color: 'var(--accent-primary)' }}>Category Timelines</label>
                          
                          {editForm.projectType.includes('Development') && (
                            <div style={{ marginBottom: '1rem', borderBottom: (editForm.projectType.includes('360 Deg Digital Marketing') || editForm.projectType.includes('Meta / Google Ads')) ? '1px dashed var(--border-color)' : 'none', paddingBottom: (editForm.projectType.includes('360 Deg Digital Marketing') || editForm.projectType.includes('Meta / Google Ads')) ? '1rem' : '0' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Development Timeline</span>
                              <div className="form-row" style={{ gap: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                                  <input 
                                    type="date" 
                                    className="form-input"
                                    value={editForm.devStartDate}
                                    onChange={(e) => setEditForm({ ...editForm, devStartDate: e.target.value })}
                                  />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date (Target)</label>
                                  <input 
                                    type="date" 
                                    className="form-input"
                                    value={editForm.devEndDate}
                                    onChange={(e) => setEditForm({ ...editForm, devEndDate: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Development Status</label>
                                <select 
                                  className="form-select"
                                  value={editForm.devStatus || 'Planning'}
                                  onChange={(e) => setEditForm({ ...editForm, devStatus: e.target.value })}
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

                          {editForm.projectType.includes('360 Deg Digital Marketing') && (
                            <div style={{ marginBottom: editForm.projectType.includes('Meta / Google Ads') ? '1rem' : '0', borderBottom: editForm.projectType.includes('Meta / Google Ads') ? '1px dashed var(--border-color)' : 'none', paddingBottom: editForm.projectType.includes('Meta / Google Ads') ? '1rem' : '0' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>360° Digital Marketing Timeline</span>
                              <div className="form-row" style={{ gap: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
                                  <input 
                                    type="date" 
                                    className="form-input"
                                    value={editForm.marketingStartDate}
                                    onChange={(e) => setEditForm({ ...editForm, marketingStartDate: e.target.value })}
                                  />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date (Target)</label>
                                  <input 
                                    type="date" 
                                    className="form-input"
                                    value={editForm.marketingEndDate}
                                    onChange={(e) => setEditForm({ ...editForm, marketingEndDate: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Marketing Status</label>
                                <select 
                                  className="form-select"
                                  value={editForm.marketingStatus || 'Planning'}
                                  onChange={(e) => setEditForm({ ...editForm, marketingStatus: e.target.value })}
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

                          {editForm.projectType.includes('Meta / Google Ads') && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Google / Meta Ads Timeline</span>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Campaign Date</label>
                                <input 
                                  type="date" 
                                  className="form-input"
                                  value={editForm.adsDate}
                                  onChange={(e) => setEditForm({ ...editForm, adsDate: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Ads Status</label>
                                <select 
                                  className="form-select"
                                  value={editForm.adsStatus || 'Planning'}
                                  onChange={(e) => setEditForm({ ...editForm, adsStatus: e.target.value })}
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
                        {editForm.projectType.length === 0 && (
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>Project Status</label>
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
                        )}

                        <div className="form-row" style={{ gap: '0.75rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Hosting Expiry Date</label>
                            <input 
                              type="date" 
                              className="form-input" 
                              value={editForm.hostingExpiry} 
                              onChange={(e) => setEditForm({ ...editForm, hostingExpiry: e.target.value })} 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Domain Expiry Date</label>
                            <input 
                              type="date" 
                              className="form-input" 
                              value={editForm.domainExpiry} 
                              onChange={(e) => setEditForm({ ...editForm, domainExpiry: e.target.value })} 
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Project Credentials (Edit Mode) */}
              {activeTab === 'credentials' && (
                <div className="card animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Project Credentials</h3>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={handleAddCredential}>
                      <Plus size={14} style={{ marginRight: '4px' }} /> Add Credential
                    </button>
                  </div>

                  {editForm.credentials.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '2rem 0' }}>No credentials added yet.</p>
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
                            <label className="form-label">Label (e.g. GoDaddy, Hostinger)</label>
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
              )}

              {/* Tab 3: Pricing (Edit Mode) */}
              {activeTab === 'pricing' && (
                <div className="card animate-fade-in">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Edit Pricing</h3>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Quote Price (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.quotePrice}
                        onChange={(e) => setEditForm({ ...editForm, quotePrice: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Final Price (₹)</label>
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
                      <label className="form-label">Hosting Price (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.hostingPrice}
                        onChange={(e) => setEditForm({ ...editForm, hostingPrice: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Domain Price (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.domainPrice}
                        onChange={(e) => setEditForm({ ...editForm, domainPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Grand Total (Final + Hosting + Domain)</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.15rem' }}>
                      ₹{((parseFloat(editForm.finalPrice) || 0) + (parseFloat(editForm.hostingPrice) || 0) + (parseFloat(editForm.domainPrice) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <>
              {/* Tab 1: Project Details (View Mode) */}
              {activeTab === 'details' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }} className="responsive-grid">
                  {/* Left Column: Project Type, Subcategory, Name, Description, Client Profile & Quotation */}
                  <div className="card">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>Project Information</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      
                      {project.projectType && project.projectType.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Project Category & Subcategory</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {(Array.isArray(project.projectType) ? project.projectType : [project.projectType]).map(type => (
                                <strong key={type} className="badge" style={{ 
                                  background: 'rgba(139, 92, 246, 0.08)', 
                                  color: 'var(--accent-secondary)', 
                                  fontSize: '0.75rem', 
                                  padding: '0.2rem 0.5rem', 
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  fontWeight: 600 
                                }}>
                                  {type}
                                </strong>
                              ))}
                            </div>
                            {project.subcategories && project.subcategories.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.15rem' }}>
                                {project.subcategories.map(sub => (
                                  <span key={sub} className="badge" style={{ 
                                    background: 'rgba(0, 174, 239, 0.08)', 
                                    color: 'var(--accent-primary)', 
                                    fontSize: '0.75rem', 
                                    padding: '0.25rem 0.6rem', 
                                    borderRadius: '6px', 
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    border: '1px solid rgba(0, 174, 239, 0.15)',
                                    letterSpacing: 'normal'
                                  }}>
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Project Name</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{project.name}</strong>
                      </div>

                      {project.description && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Description</span>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {project.description}
                          </p>
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Client Details</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} style={{ color: 'var(--text-secondary)' }} />
                          <strong style={{ fontSize: '0.95rem' }}>{project.clientName}</strong>
                        </div>
                        {project.clientEmail && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <Mail size={14} />
                            <span>{project.clientEmail}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Quotation Document</span>
                        {project.quotation && project.quotation.filePath ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139, 92, 246, 0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem 0.75rem', width: 'fit-content' }}>
                            <span>📄</span>
                            <a href={project.quotation.filePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                              {project.quotation.fileName}
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No quotation uploaded.</span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Right Column: Category Timelines, Project Status, Hosting & Domain Expiry */}
                  <div className="card">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>Timelines & Resources</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      
                      {/* Show generic Project Timeline only if no category dates are set */}
                      {!(
                        (project.projectType?.includes('Development') && (project.devStartDate || project.devEndDate)) ||
                        (project.projectType?.includes('360 Deg Digital Marketing') && (project.marketingStartDate || project.marketingEndDate)) ||
                        (project.projectType?.includes('Meta / Google Ads') && project.adsDate)
                      ) && (project.startDate || project.endDate) && (
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Project Timeline</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                            <span>
                              {project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN') : 'N/A'} - {project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN') : 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Category Specific Timelines */}
                      {project.projectType && (project.projectType.includes('Development') || 
                       project.projectType.includes('360 Deg Digital Marketing') || 
                       project.projectType.includes('Meta / Google Ads')) && (
                        <div style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Category Timelines</span>
                          
                          {project.projectType.includes('Development') && (project.devStartDate || project.devEndDate) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent-primary)', minWidth: '95px' }}>Development:</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
                                {project.devStartDate ? new Date(project.devStartDate).toLocaleDateString('en-IN') : 'N/A'} - {project.devEndDate ? new Date(project.devEndDate).toLocaleDateString('en-IN') : 'N/A'}
                              </span>
                              <span className={`badge badge-${(project.devStatus || 'Planning').toLowerCase().replace(' ', '')}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', borderRadius: '4px' }}>
                                {project.devStatus || 'Planning'}
                              </span>
                            </div>
                          )}

                          {project.projectType.includes('360 Deg Digital Marketing') && (project.marketingStartDate || project.marketingEndDate) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: 'var(--accent-secondary)', minWidth: '95px' }}>Marketing:</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
                                {project.marketingStartDate ? new Date(project.marketingStartDate).toLocaleDateString('en-IN') : 'N/A'} - {project.marketingEndDate ? new Date(project.marketingEndDate).toLocaleDateString('en-IN') : 'N/A'}
                              </span>
                              <span className={`badge badge-${(project.marketingStatus || 'Planning').toLowerCase().replace(' ', '')}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', borderRadius: '4px' }}>
                                {project.marketingStatus || 'Planning'}
                              </span>
                            </div>
                          )}

                          {project.projectType.includes('Meta / Google Ads') && project.adsDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#a855f7', minWidth: '95px' }}>Ads Date:</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
                                {new Date(project.adsDate).toLocaleDateString('en-IN')}
                              </span>
                              <span className={`badge badge-${(project.adsStatus || 'Planning').toLowerCase().replace(' ', '')}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem', borderRadius: '4px' }}>
                                {project.adsStatus || 'Planning'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Overall Status</span>
                        <span className={`badge badge-${project.status.toLowerCase().replace(' ', '')}`} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em', lineHeight: '1' }}>
                          {project.status}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }} className="responsive-grid">
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Hosting Expiry</span>
                          {project.hostingExpiry ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {new Date(project.hostingExpiry).toLocaleDateString('en-IN')}
                              </span>
                              {(() => {
                                const status = getExpiryStatus(project.hostingExpiry);
                                if (status === 'expired') return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Expired</span>;
                                if (status === 'warning') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Soon</span>;
                                return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Active</span>;
                              })()}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Not configured</span>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>Domain Expiry</span>
                          {project.domainExpiry ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {new Date(project.domainExpiry).toLocaleDateString('en-IN')}
                              </span>
                              {(() => {
                                const status = getExpiryStatus(project.domainExpiry);
                                if (status === 'expired') return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Expired</span>;
                                if (status === 'warning') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Soon</span>;
                                return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>Active</span>;
                              })()}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Not configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Project Credentials (View Mode) */}
              {activeTab === 'credentials' && (
                <div className="card animate-fade-in">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontWeight: 600 }}>Project Credentials</h3>
                  {(!project.credentials || project.credentials.length === 0) ? (
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No credentials stored. Click Edit to add.</span>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="responsive-grid">
                      {project.credentials.map((cred, index) => {
                        const passwordKey = `cred_${index}`;
                        const isVisible = visiblePasswords[passwordKey];
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
              )}

              {/* Tab 3: Pricing (View Mode) */}
              {activeTab === 'pricing' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Pricing Cards Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Quote Price</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatCurrency(project.quotePrice || 0)}</strong>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-secondary)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Final Price</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatCurrency(project.finalPrice || 0)}</strong>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #a855f7' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Hosting Price</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatCurrency(project.hostingPrice || 0)}</strong>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #06b6d4' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Domain Price</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatCurrency(project.domainPrice || 0)}</strong>
                    </div>
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ec4899', background: 'rgba(236, 72, 153, 0.02)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Grand Total</span>
                      <strong style={{ fontSize: '1.25rem', color: '#ec4899' }}>{formatCurrency(project.budget || 0)}</strong>
                    </div>
                  </div>

                  {/* Payment Progress and Statement stats */}
                  <div className="card responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Billing Progress Summary</h3>
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          <span>Invoiced Amount Billed</span>
                          <strong>{billingProgress}% Paid</strong>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                          <div style={{ width: `${billingProgress}%`, height: '100%', background: '#10b981', borderRadius: '9999px', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>Total Invoiced: {formatCurrency(totalInvoiced)}</span>
                          <span>Remaining Balance: {formatCurrency(Math.max(0, totalInvoiced - paidTotal))}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paid Invoices Amount</span>
                        <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{formatCurrency(paidTotal)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Invoices Amount</span>
                        <strong style={{ color: '#f59e0b', fontSize: '0.95rem' }}>{formatCurrency(pendingTotal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Statement Table */}
                  <div className="card">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Financial Statement Ledger</h3>
                    {invoicesList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No transactions found for this project statement.
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Activity / Reference</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Billed Amount</th>
                              <th style={{ textAlign: 'right' }}>Paid Credit</th>
                              <th style={{ textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoicesList.map((inv) => (
                              <tr key={inv._id}>
                                <td>{new Date(inv.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td>
                                  <Link href={`/invoices/${inv._id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', hover: { textDecoration: 'underline' } }}>
                                    Invoice #{inv.invoiceNumber}
                                  </Link>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Billing Issue</td>
                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(inv.total)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: inv.status === 'Paid' ? '#10b981' : 'var(--text-muted)' }}>
                                  {inv.status === 'Paid' ? formatCurrency(inv.total) : '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
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
              )}

              {/* Tab 4: Associated Invoices (View Mode) */}
              {activeTab === 'invoices' && (
                <div className="card animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Associated Invoices</h3>
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
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
              )}

              {/* Tab 5: Status Updates Feed (View Mode) */}
              {activeTab === 'status' && (
                <div className="card animate-fade-in" style={{ height: 'fit-content' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(!project.statusUpdates || project.statusUpdates.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
              )}

              {/* Tab 6: Task Checklist Panel (View Mode) */}
              {activeTab === 'tasks' && (
                <div className="card animate-fade-in" style={{ height: 'fit-content' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Task Checklist</h3>
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
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
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
              )}

              {/* Tab 7: Content Calendar Panel */}
              {activeTab === 'calendar' && (
                <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Content Calendar</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: 0, marginTop: '2px' }}>Plan visual designs, copy, hashtags and schedule posts.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Month:</span>
                        <select
                          className="form-select"
                          value={calendarMonthFilter}
                          onChange={(e) => setCalendarMonthFilter(e.target.value)}
                          style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 1.75rem 0.35rem 0.6rem', fontSize: '0.8rem', height: '32px' }}
                        >
                          {getMonthsOptions().map(m => (
                            <option key={m} value={m}>{formatMonthDisplay(m)}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '32px' }}
                        onClick={openExportModal}
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '32px' }}
                        onClick={() => document.getElementById('csv-import-file-input').click()}
                      >
                        Import CSV
                      </button>
                      <input 
                        type="file"
                        id="csv-import-file-input"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleImportCalendar}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: '32px' }}
                        onClick={() => {
                          setIsViewCalendarOpen(true);
                        }}
                      >
                        View Calendar
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '32px' }}
                        onClick={() => {
                          setCurrentPost(null);
                          setPostForm({ scheduledDate: '', postType: 'Static', topic: '', content: '', hashtags: '', visual: '', platforms: [], status: 'Pending' });
                          setIsAddPostModalOpen(true);
                        }}
                      >
                        <Plus size={14} />
                        <span>Add Post</span>
                      </button>
                    </div>
                  </div>

                  {/* Upcoming and Completed Posts Summary Rows */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="responsive-grid">
                    {/* Left Column: Upcoming Posts (Next 4 Days / Min 4) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                        Upcoming Posts (Next 4 Days)
                      </h4>
                      {(() => {
                        const upcomingAll = (project.contentCalendar || [])
                          .filter(post => post.status !== 'Posted')
                          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

                        const within4Days = upcomingAll.filter(post => new Date(post.scheduledDate) <= fourDaysThreshold);
                        
                        const upcoming = within4Days.length < 4 ? upcomingAll.slice(0, 4) : within4Days;

                        if (upcoming.length === 0) {
                          return (
                            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No upcoming posts scheduled.
                            </div>
                          );
                        }

                        return upcoming.map(post => renderPostSummaryCard(post));
                      })()}
                    </div>

                    {/* Right Column: 4 Completed Posts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                        Completed Posts (Max 4)
                      </h4>
                      {(() => {
                        const completed = (project.contentCalendar || [])
                          .filter(post => post.status === 'Posted')
                          .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
                          .slice(0, 4);

                        if (completed.length === 0) {
                          return (
                            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No completed posts yet.
                            </div>
                          );
                        }

                        return completed.map(post => renderPostSummaryCard(post));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .delete-task-btn:hover {
          color: #ef4444 !important;
        }
        .icon-btn-edit {
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .icon-btn-edit:hover {
          color: var(--accent-primary) !important;
          background: rgba(0, 174, 239, 0.08) !important;
        }
        .icon-btn-delete {
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .icon-btn-delete:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.08) !important;
        }
        .post-summary-strip {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .post-summary-strip:hover {
          background: rgba(255, 255, 255, 0.025) !important;
          border-color: var(--accent-primary-glow) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .tabs-nav-container {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.75rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 2px;
        }
        .tabs-nav-container::-webkit-scrollbar {
          display: none;
        }
        .tab-nav-btn {
          padding: 0.7rem 1.15rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.925rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s ease;
          border-radius: 6px 6px 0 0;
        }
        .tab-nav-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        .tab-nav-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
          background: rgba(139, 92, 246, 0.05);
        }
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
          .tab-nav-btn {
            padding: 0.55rem 0.9rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
      {/* Add / Edit Post Modal */}
      {isAddPostModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{currentPost ? 'Edit Post' : 'Schedule Content Post'}</h3>
              <button onClick={() => { setIsAddPostModalOpen(false); setCurrentPost(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={postForm.scheduledDate}
                    onChange={(e) => setPostForm({ ...postForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Post Type</label>
                  <select
                    className="form-select"
                    value={postForm.postType || 'Static'}
                    onChange={(e) => setPostForm({ ...postForm, postType: e.target.value })}
                  >
                    <option value="Static">Static</option>
                    <option value="Motion">Motion</option>
                    <option value="Reel">Reel</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Motion Graphic Wish Post">Motion Graphic Wish Post</option>
                    <option value="Wish post">Wish post</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Publishing Status</label>
                  <select
                    className="form-select"
                    value={postForm.status}
                    onChange={(e) => setPostForm({ ...postForm, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Design Done">Design Done</option>
                    <option value="Design Approved">Design Approved</option>
                    <option value="Posted">Posted</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Topic *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Describe the graphic direction or topic for the designer..."
                  required
                  value={postForm.topic}
                  onChange={(e) => setPostForm({ ...postForm, topic: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Write post content / caption..."
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hashtags</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. #marketing #business #growth"
                  value={postForm.hashtags}
                  onChange={(e) => setPostForm({ ...postForm, hashtags: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visual / Reference link</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
                  placeholder="Provide reference links, target audience, or design notes..."
                  value={postForm.visual}
                  onChange={(e) => setPostForm({ ...postForm, visual: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Target Channels</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                  {['Instagram', 'Facebook', 'Youtube', 'LinkedIn', 'Twitter'].map(plat => {
                    const isChecked = postForm.platforms.includes(plat);
                    return (
                      <label key={plat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? postForm.platforms.filter(p => p !== plat)
                              : [...postForm.platforms, plat];
                            setPostForm({ ...postForm, platforms: updated });
                          }}
                          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                        />
                        <span style={{ userSelect: 'none' }}>{plat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsAddPostModalOpen(false); setCurrentPost(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {currentPost ? 'Save Changes' : 'Schedule Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Calendar Modal */}
      {isViewCalendarOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Monthly Calendar Planner</h3>
              <button onClick={() => setIsViewCalendarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter Month:</span>
                <select
                  className="form-select"
                  value={calendarMonthFilter}
                  onChange={(e) => setCalendarMonthFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '180px', padding: '0.4rem 0.75rem' }}
                >
                  {getMonthsOptions().map(m => (
                    <option key={m} value={m}>{formatMonthDisplay(m)}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={openExportModal}
                >
                  Export CSV
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    setCurrentPost(null);
                    const now = new Date();
                    const year = calendarMonthFilter ? parseInt(calendarMonthFilter.split('-')[0]) : now.getFullYear();
                    const month = calendarMonthFilter ? parseInt(calendarMonthFilter.split('-')[1]) : (now.getMonth() + 1);
                    const defaultDate = new Date(year, month - 1, now.getDate(), 12, 0);
                    const formattedDate = new Date(defaultDate.getTime() - (defaultDate.getTimezoneOffset()*60*1000)).toISOString().substring(0, 16);
                    setPostForm({
                      scheduledDate: formattedDate,
                      postType: 'Static',
                      topic: '',
                      content: '',
                      hashtags: '',
                      visual: '',
                      platforms: [],
                      status: 'Pending'
                    });
                    setIsAddPostModalOpen(true);
                  }}
                >
                  <Plus size={14} style={{ marginRight: '3px' }} /> Schedule Post
                </button>
              </div>
            </div>

            {(() => {
              if (!calendarMonthFilter) return null;
              const [yearStr, monthStr] = calendarMonthFilter.split('-');
              const year = parseInt(yearStr, 10);
              const month = parseInt(monthStr, 10) - 1;

              const numDays = new Date(year, month + 1, 0).getDate();
              const firstDayIndex = new Date(year, month, 1).getDay();

              const cells = [];
              for (let i = 0; i < firstDayIndex; i++) {
                cells.push({ day: null, date: null });
              }
              for (let day = 1; day <= numDays; day++) {
                const dateObj = new Date(year, month, day);
                cells.push({ day, date: dateObj });
              }
              while (cells.length % 7 !== 0) {
                cells.push({ day: null, date: null });
              }

              return (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Weekday headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)' }}>
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                      <div key={d} style={{ textAlign: 'center', padding: '0.5rem 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', maxHeight: '60vh', overflowY: 'auto' }}>
                    {cells.map((cell, idx) => {
                      if (!cell.day) {
                        return (
                          <div key={`empty-${idx}`} style={{ background: 'rgba(255, 255, 255, 0.01)', minHeight: '90px' }} />
                        );
                      }

                      const dayPosts = (project.contentCalendar || []).filter(post => {
                        const postDate = new Date(post.scheduledDate);
                        return postDate.getFullYear() === year &&
                               postDate.getMonth() === month &&
                               postDate.getDate() === cell.day;
                      }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

                      return (
                        <div 
                          key={`day-${cell.day}`} 
                          style={{ 
                            background: 'var(--bg-primary)', 
                            minHeight: '90px', 
                            padding: '0.35rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px',
                            position: 'relative',
                            border: '1px solid rgba(255,255,255,0.01)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dayPosts.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                              {cell.day}
                            </span>
                            <button
                              type="button"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.6
                              }}
                              onClick={() => {
                                setCurrentPost(null);
                                const defaultDate = new Date(year, month, cell.day, 12, 0);
                                const formattedDate = new Date(defaultDate.getTime() - (defaultDate.getTimezoneOffset()*60*1000)).toISOString().substring(0, 16);
                                setPostForm({
                                  scheduledDate: formattedDate,
                                  postType: 'Static',
                                  topic: '',
                                  content: '',
                                  hashtags: '',
                                  visual: '',
                                  platforms: [],
                                  status: 'Pending'
                                });
                                setIsAddPostModalOpen(true);
                              }}
                              title="Schedule Post"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                            {dayPosts.map(post => {
                              const statusStyle = getStatusStyle(post.status);
                              const timeStr = new Date(post.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                              return (
                                <div
                                  key={post._id}
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    background: statusStyle.bg,
                                    color: statusStyle.color,
                                    border: `1px solid ${statusStyle.border}`,
                                    cursor: 'pointer',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                    display: 'block',
                                    lineHeight: '1.2'
                                  }}
                                  onClick={() => {
                                    setCurrentPost(post);
                                    const localDate = new Date(post.scheduledDate);
                                    const offset = localDate.getTimezoneOffset();
                                    const adjustedDate = new Date(localDate.getTime() - (offset*60*1000));
                                    const formattedDate = adjustedDate.toISOString().substring(0, 16);
                                    setPostForm({
                                      scheduledDate: formattedDate,
                                      postType: post.postType || 'Static',
                                      topic: post.topic || post.ideation || '',
                                      content: post.content || post.caption || '',
                                      hashtags: post.hashtags || '',
                                      visual: post.visual || post.description || '',
                                      platforms: post.platforms || [],
                                      status: post.status || 'Pending'
                                    });
                                    setIsAddPostModalOpen(true);
                                  }}
                                  title={`${timeStr} | ${post.postType || 'Static'} | Topic: ${post.topic || post.ideation || 'N/A'}`}
                                >
                                  {/* Small label for time and post type */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.55rem', opacity: 0.85, marginBottom: '2px', borderBottom: '1px dashed rgba(0,0,0,0.05)', paddingBottom: '2px' }}>
                                    <span>{post.postType || 'Static'}</span>
                                    <span>{timeStr}</span>
                                  </div>
                                  {/* Full wrapping text */}
                                  <div style={{ fontWeight: 600 }}>
                                    {post.topic || post.ideation || 'Untitled'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* Export Date Range Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Export Content Calendar</h3>
              <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsExportModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    handleExportCalendar(exportFromDate, exportToDate);
                    setIsExportModalOpen(false);
                  }}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
