'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, Plus, CheckCircle2, Clock, Loader2, X, Trash2, Rocket, Award, ShieldCheck, ChevronRight, UserPlus, Mail, Lock, Phone, Briefcase, Building, Calendar, Users, Send, Copy, Share2, Shield } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function OnboardingPage() {
  const { showToast, showConfirm } = useNotification();
  const [mounted, setMounted] = useState(false);
  const [onboardings, setOnboardings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCredModalOpen, setIsCredModalOpen] = useState(false);
  const [credEmployee, setCredEmployee] = useState(null);
  const [sendingCred, setSendingCred] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [onboardMode, setOnboardMode] = useState('new'); // 'new' or 'existing'

  const [form, setForm] = useState({
    username: '',
    email: '',
    whatsapp: '',
    password: '',
    customRoleId: '',
    targetUserId: '',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    startDate: new Date().toISOString().split('T')[0],
    mentor: 'HR Team'
  });

  const isAdmin = !currentUser || currentUser?.role === 'company_admin' || currentUser?.role === 'superadmin' || currentUser?.category === 'Company Admin' || currentUser?.category === 'Super Admin';
  const employeeLimit = currentUser?.company?.employeeLimit || currentUser?.employeeLimit || 0;
  const employeeCount = currentUser?.employeeCount || employees.length;

  const fetchData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user || meData || null);
      }

      const [onboardingRes, empRes, rolesRes] = await Promise.all([
        fetch('/api/onboarding'),
        fetch('/api/employees'),
        fetch('/api/superadmin/roles')
      ]);

      if (onboardingRes.ok) {
        const oData = await onboardingRes.json();
        setOnboardings(oData.onboardings || []);
        if (oData.onboardings?.length > 0 && !selectedRecord) {
          setSelectedRecord(oData.onboardings[0]);
        }
      }

      if (empRes.ok) {
        const eData = await empRes.json();
        setEmployees(eData.employees || []);
        if (eData.employees?.length > 0) {
          setForm(prev => ({ ...prev, targetUserId: eData.employees[0]._id }));
        }
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (Array.isArray(rolesData)) {
          setRoles(rolesData);
          if (rolesData.length > 0) {
            setForm(prev => ({ ...prev, customRoleId: rolesData[0]._id }));
          }
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading onboarding records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const handleOpenOnboardModal = () => {
    if (currentUser?.role === 'company_admin' && employeeLimit > 0 && employeeCount >= employeeLimit) {
      showToast(`Employee creation limit reached (${employeeCount}/${employeeLimit} max). Please contact Superadmin to increase your employee quota.`, 'error');
      return;
    }
    setIsModalOpen(true);
  };

  const handleStartOnboarding = async (e) => {
    e.preventDefault();

    let payload = {};
    if (onboardMode === 'new') {
      if (currentUser?.role === 'company_admin' && employeeLimit > 0 && employeeCount >= employeeLimit) {
        showToast(`Employee creation limit reached (${employeeCount}/${employeeLimit} max). Please contact Superadmin.`, 'error');
        return;
      }
      if (!form.username || !form.password || !form.startDate) {
        showToast('Username, Password, and Start Date are required', 'error');
        return;
      }
      payload = {
        createAccount: true,
        newEmployee: {
          username: form.username,
          email: form.email,
          whatsapp: form.whatsapp,
          password: form.password,
          customRoleId: form.customRoleId
        },
        jobTitle: form.jobTitle,
        department: form.department,
        startDate: form.startDate,
        mentor: form.mentor
      };
    } else {
      if (!form.targetUserId || !form.startDate) {
        showToast('Please select employee and start date', 'error');
        return;
      }
      payload = {
        createAccount: false,
        targetUserId: form.targetUserId,
        jobTitle: form.jobTitle,
        department: form.department,
        startDate: form.startDate,
        mentor: form.mentor
      };
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(onboardMode === 'new' ? `Employee created & login info sent to ${form.email || form.username}!` : 'Employee onboarding workflow initiated!', 'success');
        setIsModalOpen(false);
        setForm({
          username: '',
          email: '',
          whatsapp: '',
          password: '',
          customRoleId: roles[0]?._id || '',
          targetUserId: employees[0]?._id || '',
          jobTitle: 'Software Engineer',
          department: 'Engineering',
          startDate: new Date().toISOString().split('T')[0],
          mentor: 'HR Team'
        });
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to initiate onboarding', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCredentialsEmail = async (empId) => {
    try {
      setSendingCred(true);
      const res = await fetch('/api/employees/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Login credentials email dispatched successfully!', 'success');
        setIsCredModalOpen(false);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to send login credentials email', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSendingCred(false);
    }
  };

  const handleToggleTask = async (onboardingId, taskId, currentStatus) => {
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingId,
          taskId,
          completed: !currentStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.onboarding) {
          setSelectedRecord(data.onboarding);
          setOnboardings(prev => prev.map(o => o._id === data.onboarding._id ? data.onboarding : o));
        }
        showToast('Onboarding step updated!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update step', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const handleDeleteOnboarding = (id, name) => {
    showConfirm({
      title: 'Remove Onboarding Workflow',
      message: `Are you sure you want to remove onboarding workflow for "${name}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/onboarding?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Onboarding record removed', 'success');
            setSelectedRecord(null);
            fetchData();
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to remove onboarding', 'error');
        }
      }
    });
  };

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', category: 'Pre-boarding' });

  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [infoForm, setInfoForm] = useState({ jobTitle: '', department: '', startDate: '', mentor: '' });

  const handleOpenAddTask = (category = 'Pre-boarding') => {
    setNewTaskForm({ title: '', category });
    setIsAddTaskModalOpen(true);
  };

  const handleOpenEditInfo = () => {
    if (!selectedRecord) return;
    setInfoForm({
      jobTitle: selectedRecord.jobTitle || 'Software Engineer',
      department: selectedRecord.department || 'Engineering',
      startDate: selectedRecord.startDate || new Date().toISOString().split('T')[0],
      mentor: selectedRecord.mentor || 'HR Team'
    });
    setIsEditInfoModalOpen(true);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim() || !selectedRecord) return;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_task',
          onboardingId: selectedRecord._id,
          title: newTaskForm.title,
          category: newTaskForm.category || 'Pre-boarding'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onboarding) {
          setSelectedRecord(data.onboarding);
          setOnboardings(prev => prev.map(o => o._id === data.onboarding._id ? data.onboarding : o));
        }
        showToast('New task item added to checklist!', 'success');
        setIsAddTaskModalOpen(false);
        setNewTaskForm({ title: '', category: newTaskForm.category || 'Pre-boarding' });
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add task', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim() || !selectedRecord) return;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_task',
          onboardingId: selectedRecord._id,
          taskId: editingTask._id,
          title: editingTask.title,
          category: editingTask.category
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onboarding) {
          setSelectedRecord(data.onboarding);
          setOnboardings(prev => prev.map(o => o._id === data.onboarding._id ? data.onboarding : o));
        }
        showToast('Task updated successfully!', 'success');
        setIsEditTaskModalOpen(false);
        setEditingTask(null);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update task', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const handleDeleteTask = (taskId, taskTitle) => {
    showConfirm({
      title: 'Delete Task Item',
      message: `Are you sure you want to delete "${taskTitle}" from the checklist?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/onboarding', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete_task',
              onboardingId: selectedRecord._id,
              taskId
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.onboarding) {
              setSelectedRecord(data.onboarding);
              setOnboardings(prev => prev.map(o => o._id === data.onboarding._id ? data.onboarding : o));
            }
            showToast('Task removed from checklist', 'success');
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete task', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to delete task', 'error');
        }
      }
    });
  };

  const handleEditInfoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_info',
          onboardingId: selectedRecord._id,
          jobTitle: infoForm.jobTitle,
          department: infoForm.department,
          startDate: infoForm.startDate,
          mentor: infoForm.mentor
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onboarding) {
          setSelectedRecord(data.onboarding);
          setOnboardings(prev => prev.map(o => o._id === data.onboarding._id ? data.onboarding : o));
        }
        showToast('Workflow details updated!', 'success');
        setIsEditInfoModalOpen(false);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update workflow info', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const completedCount = onboardings.filter(o => o.status === 'Completed').length;
  const inProgressCount = onboardings.filter(o => o.status === 'In Progress').length;
  const avgProgress = onboardings.length > 0 ? Math.round(onboardings.reduce((sum, o) => sum + (o.progress || 0), 0) / onboardings.length) : 0;

  // Gather categories for the selected record
  const defaultCategories = ['Pre-boarding', 'Day 1', 'Week 1', 'Month 1'];
  const allCategories = selectedRecord
    ? Array.from(new Set([...defaultCategories, ...(selectedRecord.tasks || []).map(t => t.category || 'Pre-boarding')]))
    : defaultCategories;

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Employee Onboarding & Orientation</h1>
          <p className="page-subtitle">Add new team members with detailed credentials, assign Superadmin roles, initialize onboarding checklists, and send login info.</p>
          
          {/* Employee Limit Tracker Badge */}
          {employeeLimit > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              background: employeeCount >= employeeLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 174, 239, 0.1)',
              border: `1px solid ${employeeCount >= employeeLimit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 174, 239, 0.3)'}`,
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: employeeCount >= employeeLimit ? '#ef4444' : 'var(--accent-primary)',
              marginTop: '0.5rem'
            }}>
              <Users size={14} />
              <span>Superadmin Quota: {employeeCount} / {employeeLimit} Employees</span>
              {employeeCount >= employeeLimit && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '4px' }}>MAX REACHED</span>}
            </div>
          )}
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleOpenOnboardModal}>
            <UserPlus size={18} />
            <span>Onboard New Employee</span>
          </button>
        )}
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Onboardings</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{inProgressCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed Onboardings</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{completedCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Completion Rate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgProgress}%</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
          <div>Loading onboarding records...</div>
        </div>
      ) : onboardings.length === 0 ? (
        <div className="card" style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Rocket size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3>No Active Onboardings</h3>
          <p>{isAdmin ? 'Click "Onboard New Employee" to register team members and create orientation workflows.' : 'You have no active onboarding checklist assigned.'}</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleOpenOnboardModal}>
              <UserPlus size={18} />
              <span>Onboard New Employee</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
          {/* Left: Employees List */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              Team Onboardings ({onboardings.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {onboardings.map((item) => {
                const isSel = selectedRecord?._id === item._id;
                const empRoleName = item.userId?.customRole?.name || item.userId?.category || 'Employee';
                return (
                  <button
                    key={item._id}
                    onClick={() => setSelectedRecord(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: isSel ? 'var(--accent-primary)' : 'var(--border-color)',
                      background: isSel ? 'var(--accent-primary-glow)' : 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.userId?.username || 'New Hire'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.jobTitle} • {empRoleName}</div>
                      <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden', minWidth: '80px' }}>
                          <div style={{ width: `${item.progress}%`, height: '100%', background: item.progress === 100 ? '#10b981' : 'var(--accent-primary)' }}></div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.progress === 100 ? '#10b981' : 'var(--accent-primary)' }}>{item.progress}%</span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: isSel ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Checklist */}
          {selectedRecord && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className={`badge ${selectedRecord.status === 'Completed' ? 'badge-progress' : 'badge-planning'}`}>{selectedRecord.status}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Date: <strong>{selectedRecord.startDate}</strong></span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Onboarding Checklist: {selectedRecord.userId?.username || 'Employee'}</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Role: <strong style={{ color: 'var(--accent-primary)' }}>{selectedRecord.userId?.customRole?.name || selectedRecord.userId?.category || 'Employee'}</strong> ({selectedRecord.department}) • Mentor: <strong>{selectedRecord.mentor}</strong>
                  </div>
                  {selectedRecord.userId?.email && <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '2px' }}>{selectedRecord.userId.email} {selectedRecord.userId?.whatsapp ? `• WhatsApp: ${selectedRecord.userId.whatsapp}` : ''}</div>}
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenAddTask('Pre-boarding')}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Plus size={15} />
                      <span>Add Task</span>
                    </button>

                    <button
                      onClick={handleOpenEditInfo}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Briefcase size={15} />
                      <span>Edit Info</span>
                    </button>

                    <button
                      onClick={() => {
                        setCredEmployee(selectedRecord.userId);
                        setIsCredModalOpen(true);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', color: 'var(--accent-primary)', fontSize: '0.8rem' }}
                    >
                      <Send size={15} />
                      <span>Send Login Info</span>
                    </button>

                    <button
                      onClick={() => handleDeleteOnboarding(selectedRecord._id, selectedRecord.userId?.username || 'Employee')}
                      className="btn btn-secondary"
                      style={{ color: '#ef4444', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Trash2 size={15} />
                      <span>Delete Workflow</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span>Orientation Progress</span>
                  <span style={{ color: selectedRecord.progress === 100 ? '#10b981' : 'var(--accent-primary)' }}>{selectedRecord.progress}% Completed</span>
                </div>
                <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${selectedRecord.progress}%`, height: '100%', background: selectedRecord.progress === 100 ? '#10b981' : 'linear-gradient(90deg, var(--accent-primary) 0%, #8b5cf6 100%)', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>

              {/* Phases Checklist */}
              {allCategories.map((cat) => {
                const catTasks = selectedRecord.tasks?.filter(t => t.category === cat) || [];
                if (catTasks.length === 0 && !isAdmin) return null;

                return (
                  <div key={cat} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PHASE: {cat}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenAddTask(cat)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          <Plus size={13} />
                          <span>Add Item</span>
                        </button>
                      )}
                    </div>

                    {catTasks.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        No items in this phase yet. {isAdmin ? 'Click "+ Add Item" above to add one.' : ''}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {catTasks.map((t) => (
                          <div
                            key={t._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              background: t.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                              border: '1px solid',
                              borderColor: t.completed ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div
                              onClick={() => handleToggleTask(selectedRecord._id, t._id, t.completed)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                checked={t.completed}
                                onChange={() => {}} // handled by parent container onClick
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                              />
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: t.completed ? 600 : 500,
                                textDecoration: t.completed ? 'line-through' : 'none',
                                color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)'
                              }}>
                                {t.title}
                              </span>
                            </div>

                            {isAdmin && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.75rem' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask({ _id: t._id, title: t.title, category: t.category || cat });
                                    setIsEditTaskModalOpen(true);
                                  }}
                                  title="Edit Task Title"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Briefcase size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(t._id, t.title);
                                  }}
                                  title="Delete Task Item"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Start Onboarding Modal */}
      {mounted && isModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Onboard Team Member</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setOnboardMode('new')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: onboardMode === 'new' ? 'var(--accent-primary)' : 'transparent',
                  color: onboardMode === 'new' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                + Create & Onboard New Employee
              </button>
              <button
                type="button"
                onClick={() => setOnboardMode('existing')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: onboardMode === 'existing' ? 'var(--accent-primary)' : 'transparent',
                  color: onboardMode === 'existing' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Select Existing Member
              </button>
            </div>

            <form onSubmit={handleStartOnboarding}>
              {onboardMode === 'new' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Employee Username *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. johndoe"
                      value={form.username}
                      onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Corporate Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">WhatsApp Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="+1234567890"
                        value={form.whatsapp}
                        onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Initial Password *</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} style={{ color: 'var(--accent-primary)' }} />
                        Role *
                      </label>
                      <select
                        className="form-select"
                        value={form.customRoleId}
                        onChange={(e) => setForm(prev => ({ ...prev, customRoleId: e.target.value }))}
                        required
                      >
                        {roles.length === 0 ? (
                          <option value="">Standard Employee Role</option>
                        ) : (
                          roles.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Select Existing Employee *</label>
                  <select
                    className="form-select"
                    value={form.targetUserId}
                    onChange={(e) => setForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.username} ({emp.email || 'No email'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.jobTitle}
                    onChange={(e) => setForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="e.g. Senior Developer"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={form.department}
                    onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.startDate}
                    onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Mentor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.mentor}
                    onChange={(e) => setForm(prev => ({ ...prev, mentor: e.target.value }))}
                    placeholder="e.g. HR Team / Senior Lead"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }} disabled={submitting}>
                {submitting ? 'Creating & Initializing...' : 'Create Employee & Start Onboarding'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Send Credentials Modal */}
      {mounted && isCredModalOpen && credEmployee && createPortal(
        <div className="modal-overlay" onClick={() => setIsCredModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Send Login Credentials</h2>
              <button onClick={() => setIsCredModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{credEmployee.username}</div>
              {credEmployee.email && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Email: {credEmployee.email}</div>}
              {credEmployee.whatsapp && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>WhatsApp: {credEmployee.whatsapp}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => handleSendCredentialsEmail(credEmployee._id || credEmployee.id)}
                className="btn btn-primary"
                style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={sendingCred}
              >
                {sendingCred ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                <span>{sendingCred ? 'Sending Email...' : `Email Credentials to ${credEmployee.email || 'Employee'}`}</span>
              </button>

              <button
                onClick={() => {
                  const info = `Login URL: ${window.location.origin}/login\nUsername: ${credEmployee.username}\nContact HR for password reset if needed.`;
                  navigator.clipboard.writeText(info);
                  showToast('Login info copied to clipboard!', 'success');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Copy size={16} />
                <span>Copy Login Info Text</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Task Modal */}
      {mounted && isAddTaskModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsAddTaskModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Add Onboarding Task Item</h2>
              <button onClick={() => setIsAddTaskModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddTask}>
              <div className="form-group">
                <label className="form-label">Task Description / Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Set up VPN access and security credentials"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phase / Category</label>
                <select
                  className="form-select"
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Pre-boarding">Pre-boarding</option>
                  <option value="Day 1">Day 1</option>
                  <option value="Week 1">Week 1</option>
                  <option value="Month 1">Month 1</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }}>
                Save & Add Task
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Task Modal */}
      {mounted && isEditTaskModalOpen && editingTask && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => { setIsEditTaskModalOpen(false); setEditingTask(null); }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Edit Task Item</h2>
              <button onClick={() => { setIsEditTaskModalOpen(false); setEditingTask(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditTaskSubmit}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phase / Category</label>
                <select
                  className="form-select"
                  value={editingTask.category}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Pre-boarding">Pre-boarding</option>
                  <option value="Day 1">Day 1</option>
                  <option value="Week 1">Week 1</option>
                  <option value="Month 1">Month 1</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }}>
                Update Task Item
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Workflow Info Modal */}
      {mounted && isEditInfoModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsEditInfoModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Edit Onboarding Workflow Details</h2>
              <button onClick={() => setIsEditInfoModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditInfoSubmit}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={infoForm.jobTitle}
                    onChange={(e) => setInfoForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={infoForm.department}
                    onChange={(e) => setInfoForm(prev => ({ ...prev, department: e.target.value }))}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={infoForm.startDate}
                    onChange={(e) => setInfoForm(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Mentor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={infoForm.mentor}
                    onChange={(e) => setInfoForm(prev => ({ ...prev, mentor: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }}>
                Save Workflow Details
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
