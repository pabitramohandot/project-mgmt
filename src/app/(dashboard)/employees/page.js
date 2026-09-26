'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  Clock, 
  ClipboardList, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  Coffee, 
  MapPin, 
  Shield, 
  ChevronRight, 
  Eye,
  Briefcase,
  UserCheck,
  Loader2,
  BarChart2,
  KeyRound,
  Sparkles,
  Filter,
  RotateCcw,
  Pencil,
  Save,
  CreditCard,
  DollarSign,
  Trash2,
  Plus,
  Building2,
  Landmark,
  FileText
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';

export default function EmployeesPage() {
  const { showToast } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [companyCurrency, setCompanyCurrency] = useState('INR');

  useEffect(() => {
    setMounted(true);
    async function loadCompanyCurrency() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const meData = await res.json();
          if (meData.company?.currency) {
            setCompanyCurrency(meData.company.currency);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCompanyCurrency();
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected Employee for Analysis Modal
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [empDetail, setEmpDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('overview'); // overview, attendance, tasks, logins

  // Edit Employee State
  const [editingEmp, setEditingEmp] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    whatsapp: '',
    customRoleId: '',
    password: '',
    salary: {
      basicSalary: 0,
      allowances: 0,
      deductions: 0,
      currency: 'INR'
    }
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      } else {
        showToast('Failed to load employee directory', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error fetching employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/superadmin/roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRoles(data);
      }
    } catch (e) {
      console.error('Fetch roles error:', e);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const openEmployeeAnalysis = async (empId) => {
    try {
      setSelectedEmpId(empId);
      setDetailLoading(true);
      setActiveModalTab('overview');
      const res = await fetch(`/api/employees/${empId}`);
      if (res.ok) {
        const data = await res.json();
        setEmpDetail(data);
      } else {
        showToast('Failed to load employee detail analytics', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading employee analytics', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmp(emp);
    const existingEarnings = emp.salary?.customEarnings?.length > 0
      ? emp.salary.customEarnings
      : [
          { label: 'HRA', amount: 7920 },
          { label: 'CONVEYANCE', amount: 1600 },
          { label: 'SPECIAL ALLOWANCE', amount: 3680 }
        ];
    const existingDeductions = emp.salary?.customDeductions?.length > 0
      ? emp.salary.customDeductions
      : [
          { label: 'GROUP MEDICAL INSURANCE', amount: 350 }
        ];

    setEditForm({
      username: emp.username || '',
      email: emp.email || '',
      whatsapp: emp.whatsapp || '',
      customRoleId: emp.customRole?._id || '',
      password: '',
      employeeNo: emp.employeeNo || '',
      designation: emp.designation || emp.category || '',
      department: emp.department || '',
      location: emp.location || '',
      bankName: emp.bankName || '',
      bankAccountNo: emp.bankAccountNo || '',
      panNumber: emp.panNumber || '',
      pfUan: emp.pfUan || '',
      joiningDate: emp.joiningDate || '',
      salary: {
        basicSalary: emp.salary?.basicSalary || 19800,
        currency: emp.salary?.currency || companyCurrency,
        customEarnings: existingEarnings,
        customDeductions: existingDeductions,
      }
    });
    setIsEditModalOpen(true);
  };

  const handleAddCustomEarning = () => {
    setEditForm(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        customEarnings: [...(prev.salary?.customEarnings || []), { label: '', amount: 0 }]
      }
    }));
  };

  const handleUpdateCustomEarning = (index, field, value) => {
    setEditForm(prev => {
      const updated = [...(prev.salary?.customEarnings || [])];
      updated[index] = { ...updated[index], [field]: field === 'amount' ? (Number(value) || 0) : value };
      return { ...prev, salary: { ...prev.salary, customEarnings: updated } };
    });
  };

  const handleRemoveCustomEarning = (index) => {
    setEditForm(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        customEarnings: (prev.salary?.customEarnings || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleAddCustomDeduction = () => {
    setEditForm(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        customDeductions: [...(prev.salary?.customDeductions || []), { label: '', amount: 0 }]
      }
    }));
  };

  const handleUpdateCustomDeduction = (index, field, value) => {
    setEditForm(prev => {
      const updated = [...(prev.salary?.customDeductions || [])];
      updated[index] = { ...updated[index], [field]: field === 'amount' ? (Number(value) || 0) : value };
      return { ...prev, salary: { ...prev.salary, customDeductions: updated } };
    });
  };

  const handleRemoveCustomDeduction = (index) => {
    setEditForm(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        customDeductions: (prev.salary?.customDeductions || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleSaveEmployeeEdit = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;

    try {
      setSavingEdit(true);

      const sumEarnings = (editForm.salary?.customEarnings || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const sumDeductions = (editForm.salary?.customDeductions || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const basic = Number(editForm.salary?.basicSalary) || 0;
      const net = Math.max(0, basic + sumEarnings - sumDeductions);

      const payload = {
        employeeId: editingEmp._id,
        username: editForm.username,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        customRoleId: editForm.customRoleId,
        password: editForm.password,
        employeeNo: editForm.employeeNo,
        designation: editForm.designation,
        department: editForm.department,
        location: editForm.location,
        bankName: editForm.bankName,
        bankAccountNo: editForm.bankAccountNo,
        panNumber: editForm.panNumber,
        pfUan: editForm.pfUan,
        joiningDate: editForm.joiningDate,
        salary: {
          basicSalary: basic,
          allowances: sumEarnings,
          deductions: sumDeductions,
          netSalary: net,
          currency: editForm.salary?.currency || companyCurrency,
          customEarnings: editForm.salary?.customEarnings || [],
          customDeductions: editForm.salary?.customDeductions || [],
        }
      };

      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Employee ${editForm.username} updated successfully!`, 'success');
        setIsEditModalOpen(false);
        fetchEmployees();
        if (selectedEmpId === editingEmp._id) {
          openEmployeeAnalysis(editingEmp._id);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update employee details', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Helper Badge Colors for Roles
  const getRoleBadgeClass = (roleStr, customRoleName) => {
    const role = (customRoleName || roleStr || '').toLowerCase();
    if (role.includes('admin') || role.includes('super')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
    if (role.includes('hr') || role.includes('manager')) return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
    if (role.includes('developer') || role.includes('engineer')) return { bg: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)' };
    if (role.includes('design')) return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
  };

  // Filtered List Logic
  const filteredEmployees = employees.filter((emp) => {
    const nameMatch = emp.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let roleMatch = true;
    if (roleFilter !== 'all') {
      const displayRole = (emp.customRoleName || emp.role || '').toLowerCase();
      roleMatch = displayRole.includes(roleFilter.toLowerCase());
    }

    let statusMatch = true;
    if (statusFilter === 'online') statusMatch = emp.isOnline;
    if (statusFilter === 'offline') statusMatch = !emp.isOnline;
    if (statusFilter === 'clocked_in') statusMatch = emp.todayStatus?.clockIn && !emp.todayStatus?.clockOut;

    return nameMatch && roleMatch && statusMatch;
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title">Employee Directory & Deep Analytics</h1>
          <p className="page-subtitle">Analyze attendance logs, task completion metrics, login audit history, and update staff details.</p>
        </div>
      </div>

      {/* Directory Filter & Search Controls Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search employee by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', height: '40px' }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ height: '40px', flex: 1 }}
            >
              <option value="all">All Staff Roles</option>
              <option value="company_admin">Company Admins</option>
              <option value="company_user">Company Users</option>
              {roles.map(r => (
                <option key={r._id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Activity Status Filter */}
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '40px', width: '100%' }}
          >
            <option value="all">All Activity Statuses</option>
            <option value="online">Online Now</option>
            <option value="clocked_in">Clocked In Today</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={28} style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }} />
          <div style={{ fontWeight: 600 }}>Loading employee directory...</div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3>No Employees Found</h3>
          <p>No employee records matched your filter settings.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredEmployees.map((emp) => {
            const roleStyle = getRoleBadgeClass(emp.role, emp.customRoleName || emp.category);
            const initials = emp.username ? emp.username.slice(0, 2).toUpperCase() : 'EM';
            const isCompanyAdmin = emp.role === 'company_admin';

            return (
              <div 
                key={emp._id} 
                className="card" 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  borderTop: isCompanyAdmin ? '3px solid var(--accent-primary)' : '1px solid var(--border-color)'
                }}
              >
                {/* Employee Header Block */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)`,
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 174, 239, 0.2)'
                        }}>
                          {initials}
                        </div>
                        {/* Live Online Dot */}
                        <span 
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '11px',
                            height: '11px',
                            borderRadius: '50%',
                            background: emp.isOnline ? '#10b981' : '#94a3b8',
                            border: '2px solid var(--bg-card)'
                          }} 
                          title={emp.isOnline ? 'Online Now' : 'Offline'}
                        />
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                          {emp.username}
                        </h3>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: roleStyle.bg,
                          color: roleStyle.color,
                          display: 'inline-block'
                        }}>
                          {emp.customRoleName || (isCompanyAdmin ? 'Company Admin' : (emp.category || 'Company User'))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Snippets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {emp.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Mail size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</span>
                      </div>
                    )}
                    {emp.whatsapp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>{emp.whatsapp}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      <CreditCard size={13} style={{ flexShrink: 0 }} />
                      <span>Net Pay: {formatCurrency(emp.salary?.netSalary || 0, emp.salary?.currency || companyCurrency)}/mo</span>
                    </div>
                  </div>

                  {/* Attendance & Tasks Quick Metrics */}
                  <div style={{
                    marginTop: '1.15rem',
                    paddingTop: '1rem',
                    borderTop: '1px dashed var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    textAlign: 'center',
                    gap: '0.25rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Present</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {emp.analytics?.totalPresent || 0} <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>days</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tasks</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {emp.analytics?.completedTasksCount || 0}/{emp.analytics?.assignedTasksCount || 0}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Hours</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {emp.analytics?.totalAttendanceHours || 0}h
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => openEmployeeAnalysis(emp._id)}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: '1px solid var(--accent-primary)',
                      background: 'rgba(0, 174, 239, 0.05)',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 174, 239, 0.05)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                  >
                    <Eye size={14} />
                    <span>Analyze</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(emp)}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.6rem',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Pencil size={14} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Employee Modal */}
      {mounted && isEditModalOpen && editingEmp && createPortal(
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '680px', width: '92vw', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Employee: {editingEmp.username}</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Configure Profile, Banking Details & Payslip Breakdown</span>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEmployeeEdit}>
              {/* SECTION 1: ACCOUNT & ORGANIZATION DETAILS */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserCheck size={15} />
                  <span>Account & Role Details</span>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.username}
                      onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Employee Code / ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. EMP-1002"
                      value={editForm.employeeNo}
                      onChange={(e) => setEditForm(prev => ({ ...prev, employeeNo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">WhatsApp Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Senior Software Engineer"
                      value={editForm.designation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Engineering / Product"
                      value={editForm.department}
                      onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Work Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Mumbai / Remote"
                      value={editForm.location}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
                      Assigned Role
                    </label>
                    <select
                      className="form-select"
                      value={editForm.customRoleId}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customRoleId: e.target.value }))}
                    >
                      <option value="">Standard Employee Role</option>
                      {roles.map((r) => (
                        <option key={r._id} value={r._id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Reset Password (Optional)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Leave blank to keep password"
                      value={editForm.password}
                      onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BANKING & STATUTORY DETAILS */}
              <div style={{ marginBottom: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Landmark size={15} />
                  <span>Banking & Statutory Details</span>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC Bank"
                      value={editForm.bankName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Bank Account No</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 50100293848123"
                      value={editForm.bankAccountNo}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bankAccountNo: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Joining Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.joiningDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">PAN Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. ABCDE1234F"
                      value={editForm.panNumber}
                      onChange={(e) => setEditForm(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">PF UAN</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 100928374651"
                      value={editForm.pfUan}
                      onChange={(e) => setEditForm(prev => ({ ...prev, pfUan: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SALARY BREAKDOWN & DYNAMIC COMPONENTS */}
              <div style={{ paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <DollarSign size={15} />
                    <span>Payslip Components & Breakdown</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                    Net Salary: {formatCurrency(
                      Math.max(0, (Number(editForm.salary?.basicSalary || 0) + (editForm.salary?.customEarnings || []).reduce((s, i) => s + (Number(i.amount) || 0), 0)) - (editForm.salary?.customDeductions || []).reduce((s, i) => s + (Number(i.amount) || 0), 0)),
                      editForm.salary?.currency || companyCurrency
                    )}
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Salary Currency</label>
                    <select
                      className="form-select"
                      value={editForm.salary?.currency || 'INR'}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        salary: { ...prev.salary, currency: e.target.value }
                      }))}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (AED)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">BASIC SALARY *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 19800"
                      value={editForm.salary?.basicSalary || ''}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        salary: { ...prev.salary, basicSalary: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* DYNAMIC EARNINGS BREAKDOWN */}
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>+ EARNING COMPONENTS (HRA, Conveyance, Special Allowance, etc.)</span>
                    <button
                      type="button"
                      onClick={handleAddCustomEarning}
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Plus size={12} />
                      <span>Add Earning</span>
                    </button>
                  </div>

                  {(editForm.salary?.customEarnings || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.8rem' }}
                        placeholder="Component Label (e.g. HRA)"
                        value={item.label}
                        onChange={(e) => handleUpdateCustomEarning(idx, 'label', e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.8rem' }}
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={(e) => handleUpdateCustomEarning(idx, 'amount', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomEarning(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* DYNAMIC DEDUCTIONS BREAKDOWN */}
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>- DEDUCTION COMPONENTS (Medical Insurance, PF, Tax, etc.)</span>
                    <button
                      type="button"
                      onClick={handleAddCustomDeduction}
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Plus size={12} />
                      <span>Add Deduction</span>
                    </button>
                  </div>

                  {(editForm.salary?.customDeductions || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.8rem' }}
                        placeholder="Deduction Label (e.g. PF)"
                        value={item.label}
                        onChange={(e) => handleUpdateCustomDeduction(idx, 'label', e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-input"
                        style={{ height: '34px', fontSize: '0.8rem' }}
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={(e) => handleUpdateCustomDeduction(idx, 'amount', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomDeduction(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '0.5rem', fontWeight: 700 }} disabled={savingEdit}>
                {savingEdit ? 'Saving Employee Profile...' : 'Save Employee Details & Payslip Config'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* DEEP EMPLOYEE ANALYTICS INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {mounted && selectedEmpId && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedEmpId(null)}>
          <div
            className="modal-content animate-fade-in"
            style={{
              maxWidth: '960px',
              width: '92vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden',
              borderRadius: '20px',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {empDetail?.employee?.username ? empDetail.employee.username.slice(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    {empDetail?.employee?.username || 'Employee Deep Analytics'}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {empDetail?.employee?.email || 'No email'} • Role: {empDetail?.employee?.customRoleName || empDetail?.employee?.role || 'Company Member'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmpId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.75rem 1.75rem',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)'
            }}>
              {[
                { id: 'overview', label: 'Overview Metrics', icon: BarChart2 },
                { id: 'salary', label: 'Salary & Compensation', icon: CreditCard },
                { id: 'attendance', label: 'Attendance Logs', icon: Clock },
                { id: 'tasks', label: 'Assigned Tasks', icon: ClipboardList },
                { id: 'logins', label: 'Security Audit', icon: KeyRound }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? 'var(--accent-primary-glow)' : 'transparent',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
              {detailLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={26} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
                  <div>Crunching employee analytics...</div>
                </div>
              ) : !empDetail ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load analytics details.</div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW METRICS */}
                  {activeModalTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Present Days</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{empDetail.metrics?.totalPresent || 0}</div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attendance Hours</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>{empDetail.metrics?.totalAttendanceHours || 0}h</div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Task Completion Rate</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{empDetail.metrics?.taskCompletionRate || 0}%</div>
                        </div>

                        <div className="card" style={{ padding: '1.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Tasks Assigned</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{empDetail.metrics?.assignedTasksCount || 0}</div>
                        </div>
                      </div>

                      {/* Additional Profile Meta */}
                      <div className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Employee Meta Info</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Username:</span> <strong>{empDetail.employee?.username}</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{empDetail.employee?.email || 'N/A'}</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>WhatsApp:</span> <strong>{empDetail.employee?.whatsapp || 'N/A'}</strong></div>
                          <div><span style={{ color: 'var(--text-secondary)' }}>Joined Date:</span> <strong>{new Date(empDetail.employee?.createdAt).toLocaleDateString()}</strong></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ATTENDANCE LOGS */}
                  {activeModalTab === 'attendance' && (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Attendance History ({empDetail.attendanceLogs?.length || 0})</h3>
                      {empDetail.attendanceLogs?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance records found for this employee.</div>
                      ) : (
                        <div className="table-container">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Total Work</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empDetail.attendanceLogs.map((log) => (
                                <tr key={log._id}>
                                  <td>{log.date}</td>
                                  <td>{log.clockIn ? new Date(log.clockIn).toLocaleTimeString() : '-'}</td>
                                  <td>{log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '-'}</td>
                                  <td>{Math.round((log.totalWorkMinutes || 0) / 60)} hrs</td>
                                  <td>
                                    <span className={`badge ${log.status === 'Present' ? 'badge-progress' : 'badge-planning'}`}>{log.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ASSIGNED TASKS */}
                  {activeModalTab === 'tasks' && (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Task Assignments ({empDetail.tasks?.length || 0})</h3>
                      {empDetail.tasks?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No tasks assigned to this employee.</div>
                      ) : (
                        <div className="table-container">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Task Title</th>
                                <th>Project</th>
                                <th>Priority</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empDetail.tasks.map((task, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{task.title}</td>
                                  <td>{task.projectName}</td>
                                  <td>
                                    <span className={`badge ${task.priority === 'High' ? 'badge-review' : 'badge-progress'}`}>{task.priority}</span>
                                  </td>
                                  <td>{task.columnName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SECURITY & LOGIN AUDIT */}
                  {activeModalTab === 'logins' && (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Login Audit Trail ({empDetail.loginHistory?.length || 0})</h3>
                      {empDetail.loginHistory?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No login history recorded.</div>
                      ) : (
                        <div className="table-container">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Login Time</th>
                                <th>IP Address</th>
                                <th>Browser / OS</th>
                                <th>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empDetail.loginHistory.map((log) => (
                                <tr key={log._id}>
                                  <td>{new Date(log.loginTime).toLocaleString()}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{log.ipAddress || '127.0.0.1'}</td>
                                  <td>{log.userAgent || 'Web Browser'}</td>
                                  <td>{log.duration ? `${Math.round(log.duration / 60)} mins` : 'Active / Session Open'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {/* TAB: SALARY & COMPENSATION BREAKDOWN */}
                  {activeModalTab === 'salary' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Top Net Salary Overview Card */}
                      <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(0, 174, 239, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)', border: '1px solid rgba(0, 174, 239, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Net Monthly Compensation
                            </span>
                            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                              {formatCurrency(empDetail.employee?.salary?.netSalary || 0, empDetail.employee?.salary?.currency || companyCurrency)}
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginLeft: '6px' }}>/ month</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Auto-calculated: (Basic Salary + Allowances) - Deductions
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              handleOpenEditModal(empDetail.employee);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                          >
                            <Pencil size={14} />
                            <span>Edit Salary Breakdown</span>
                          </button>
                        </div>
                      </div>

                      {/* Salary Breakdown 3 Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Basic Salary */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Basic Salary</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                            {formatCurrency(empDetail.employee?.salary?.basicSalary || 0, empDetail.employee?.salary?.currency || companyCurrency)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Base contractual pay</div>
                        </div>

                        {/* Allowances */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Allowances (+)</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                            +{formatCurrency(empDetail.employee?.salary?.allowances || 0, empDetail.employee?.salary?.currency || companyCurrency)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Housing, Transport, Perks</div>
                        </div>

                        {/* Deductions */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Deductions (-)</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                            -{formatCurrency(empDetail.employee?.salary?.deductions || 0, empDetail.employee?.salary?.currency || companyCurrency)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Taxes, Insurance, Withholding</div>
                        </div>
                      </div>

                      {/* Proportion Visualization Bar */}
                      <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>Compensation Ratio</div>
                        {(() => {
                          const basic = empDetail.employee?.salary?.basicSalary || 0;
                          const allow = empDetail.employee?.salary?.allowances || 0;
                          const totalComp = Math.max(1, basic + allow);
                          const basicPct = Math.round((basic / totalComp) * 100);
                          const allowPct = Math.round((allow / totalComp) * 100);
                          return (
                            <div>
                              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                                <div style={{ width: `${basicPct}%`, background: 'var(--accent-primary)', title: `Basic: ${basicPct}%` }}></div>
                                <div style={{ width: `${allowPct}%`, background: '#10b981', title: `Allowances: ${allowPct}%` }}></div>
                              </div>
                              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.85rem', fontSize: '0.78rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent-primary)' }}></div>
                                  <span>Basic Pay: <strong>{basicPct}%</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }}></div>
                                  <span>Allowances: <strong>{allowPct}%</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
