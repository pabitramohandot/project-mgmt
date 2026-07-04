'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Plus, X, Trash2, Key, HelpCircle, Save, Check, Eye, EyeOff, XCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

const GLOBAL_PERMISSIONS = [
  { key: 'ai_agent', label: 'AI Agent', desc: 'Access to the persistent AI Chat Assistant' },
  { key: 'clients', label: 'Clients Directory', desc: 'Access to corporate client records' },
  { key: 'invoices', label: 'Invoices & Billing', desc: 'Access to financial invoicing and email bills' },
  { key: 'credentials', label: 'Credentials Vault', desc: 'Access to global hosting and server passwords' },
  { key: 'pending_tasks', label: 'Pending Tasks Feed', desc: 'Access to automated system expiry alerts' },
  { key: 'announcements', label: 'Announcements', desc: 'Access to post system-wide notices' },
  { key: 'branding', label: 'Branding Settings', desc: 'Access to configure branding logo and colors' },
  { key: 'reminders', label: 'Reminders', desc: 'Access to configure or view company-wide reminders' },
];

const PROJECT_PERMISSIONS = [
  { key: 'project_details', label: 'Project Details Tab', desc: 'View basic details and timeline category' },
  { key: 'project_credential', label: 'Project Credentials Tab', desc: 'View server/database passwords within a project' },
  { key: 'project_links', label: 'Project Links Tab', desc: 'View or manage bookmark links for a project' },
  { key: 'project_pricing', label: 'Pricing Tab', desc: 'View quotation, ledger, and financials' },
  { key: 'project_invoice', label: 'Invoice Tab', desc: 'View invoices linked to a project' },
  { key: 'project_status', label: 'Status Tab', desc: 'View or post project progress status log' },
  { key: 'project_tasks', label: 'Task List Tab', desc: 'View, add, and complete checklist milestones' },
  { key: 'project_calendar', label: 'Content Calendar Tab', desc: 'Manage visual copy planning calendar' },
];

const SYSTEM_ROLES = [
  {
    _id: 'sys_superadmin',
    name: 'Super Admin',
    isSystem: true,
    isReadOnly: true,
    category: 'Admin',
    permissions: {
      ai_agent: 'write', clients: 'write', invoices: 'write', credentials: 'write', pending_tasks: 'write', announcements: 'write', branding: 'write', reminders: 'write',
      project_details: 'write', project_credential: 'write', project_links: 'write', project_pricing: 'write', project_invoice: 'write', project_status: 'write', project_tasks: 'write', project_calendar: 'write'
    }
  }
];

export default function RolesPage() {
  const { showToast, showConfirm } = useNotification();
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCategory, setNewRoleCategory] = useState('Employee');
  const [creating, setCreating] = useState(false);

  // Edit state
  const [activeRole, setActiveRole] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [editCategory, setEditCategory] = useState('Employee');
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/roles');
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(data);
      } else {
        showToast('Failed to load roles list', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error fetching roles registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showToast('Role name is required', 'error');
      return;
    }

    try {
      setCreating(true);
      
      const defaultPerms = {};
      [...GLOBAL_PERMISSIONS, ...PROJECT_PERMISSIONS].forEach(p => {
        defaultPerms[p.key] = 'none';
      });

      // Populate default permissions based on the role category
      if (newRoleCategory === 'Admin') {
        [...GLOBAL_PERMISSIONS, ...PROJECT_PERMISSIONS].forEach(p => {
          defaultPerms[p.key] = 'write';
        });
      } else if (newRoleCategory === 'Management') {
        [...GLOBAL_PERMISSIONS, ...PROJECT_PERMISSIONS].forEach(p => {
          defaultPerms[p.key] = 'read';
        });
      } else {
        // Employee default permissions
        defaultPerms.ai_agent = 'read';
        defaultPerms.credentials = 'read';
        defaultPerms.pending_tasks = 'read';
        defaultPerms.announcements = 'read';
        defaultPerms.reminders = 'read';
        defaultPerms.project_details = 'read';
        defaultPerms.project_credential = 'read';
        defaultPerms.project_links = 'read';
        defaultPerms.project_status = 'read';
        defaultPerms.project_tasks = 'write';
        defaultPerms.project_calendar = 'write';
      }

      const res = await fetch('/api/superadmin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          category: newRoleCategory,
          permissions: defaultPerms,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Role "${newRoleName}" created successfully!`, 'success');
        setIsCreateOpen(false);
        setNewRoleName('');
        setNewRoleCategory('Employee');
        fetchRoles();
        if (data.role) {
          handleSelectRoleForEdit(data.role);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create role', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving new role', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectRoleForEdit = (role) => {
    setActiveRole(role);
    setEditPermissions(role.permissions || {});
    setEditCategory(role.category || 'Employee');
  };

  const handlePermissionChange = (key, val) => {
    if (activeRole?.isReadOnly) return; // Prevent changing read-only roles
    setEditPermissions(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSavePermissions = async () => {
    if (!activeRole || activeRole.isReadOnly) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/superadmin/roles/${activeRole._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeRole.name,
          category: editCategory,
          permissions: editPermissions,
        }),
      });

      if (res.ok) {
        showToast('Permissions saved successfully!', 'success');
        fetchRoles();
        setActiveRole(prev => ({ ...prev, category: editCategory, permissions: editPermissions }));
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save permissions', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (id, name) => {
    showConfirm({
      title: 'Delete Global Role',
      message: `Are you sure you want to delete the role "${name}"? Any user assigned to this role will automatically revert to default standard permissions. This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/superadmin/roles/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Role deleted successfully', 'success');
            if (activeRole?._id === id) {
              setActiveRole(null);
            }
            fetchRoles();
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete role', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting role', 'error');
        }
      },
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={28} style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 8px rgba(0, 174, 239, 0.45))' }} />
            <span>Super Admin: Roles & Access</span>
          </h1>
          <p className="page-subtitle">Configure custom access roles and toggle dynamic feature tab permissions globally.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)', boxShadow: '0 4px 15px rgba(0, 174, 239, 0.25)', height: '40px', borderRadius: '12px' }}>
          <Plus size={16} />
          <span>Create Role</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }} className="responsive-grid">
        {/* Left Side: Roles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
          {/* System Roles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Roles
            </h3>
            {/* 1. Hardcoded Presets */}
            {SYSTEM_ROLES.map((r) => {
              const isActive = activeRole?._id === r._id;
              return (
                <div
                  key={r._id}
                  onClick={() => handleSelectRoleForEdit(r)}
                  style={{
                    background: isActive ? 'rgba(0, 174, 239, 0.05)' : 'var(--bg-card)',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  className="role-card-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      S
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.name}</strong>
                        <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', fontWeight: 600 }}>{r.category || 'Admin'}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Built-in System preset (Read-only)</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Database System Presets */}
            {customRoles.filter(r => r.isSystem).map((r) => {
              const isActive = activeRole?._id === r._id;
              return (
                <div
                  key={r._id}
                  onClick={() => handleSelectRoleForEdit(r)}
                  style={{
                    background: isActive ? 'rgba(0, 174, 239, 0.05)' : 'var(--bg-card)',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  className="role-card-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-color)'
                    }}>
                      {r.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.name}</strong>
                        <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: r.category === 'Admin' ? 'rgba(0, 174, 239, 0.1)' : r.category === 'Management' ? 'rgba(242, 101, 34, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: r.category === 'Admin' ? 'var(--accent-primary)' : r.category === 'Management' ? 'var(--accent-secondary)' : '#a855f7', fontWeight: 600 }}>{r.category || 'Employee'}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>System preset (Editable)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Roles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Custom Roles
            </h3>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading custom roles...
              </div>
            ) : customRoles.filter(r => !r.isSystem).length === 0 ? (
              <div style={{ padding: '2.5rem 1.15rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '16px', background: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>No custom roles created.</span>
                <button onClick={() => setIsCreateOpen(true)} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', borderRadius: '10px' }}>
                  + Add Custom Role
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {customRoles.filter(r => !r.isSystem).map((r) => {
                  const isActive = activeRole?._id === r._id;
                  return (
                    <div
                      key={r._id}
                      onClick={() => handleSelectRoleForEdit(r)}
                      style={{
                        background: isActive ? 'rgba(0, 174, 239, 0.05)' : 'var(--bg-card)',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '1.15rem',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: isActive ? '0 8px 24px rgba(0, 174, 239, 0.12)' : 'none',
                      }}
                      className="role-card-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isActive ? 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)' : 'rgba(255,255,255,0.03)',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          transition: 'all 0.25s ease',
                          border: isActive ? 'none' : '1px solid var(--border-color)'
                        }}>
                          {r.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.9rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.name}</strong>
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: r.category === 'Admin' ? 'rgba(0, 174, 239, 0.1)' : r.category === 'Management' ? 'rgba(242, 101, 34, 0.1)' : 'rgba(168, 85, 247, 0.1)', color: r.category === 'Admin' ? 'var(--accent-primary)' : r.category === 'Management' ? 'var(--accent-secondary)' : '#a855f7', fontWeight: 600 }}>{r.category || 'Employee'}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                            {Object.values(r.permissions || {}).filter(p => p !== 'none').length} active modules
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(r._id, r.name);
                        }}
                        className="delete-role-btn"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete Role"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Permissions Settings Matrix */}
        <div className="card" style={{ padding: '2rem', minHeight: '500px', display: 'flex', flexDirection: 'column', borderRadius: '20px' }}>
          {!activeRole ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1.25rem', padding: '4rem 2rem' }}>
              <ShieldAlert size={56} style={{ opacity: 0.15, color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem', fontSize: '1.05rem', fontWeight: 600 }}>Configure Role Access Rights</h4>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>Select a System or Custom role from the directory to review and customize their module permissions.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {/* Header inside settings panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Access: {activeRole.name}</span>
                    {activeRole.isReadOnly && (
                      <span className="badge badge-planning" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', height: 'fit-content', borderRadius: '4px' }}>System Default (Read Only)</span>
                    )}
                    {activeRole.isSystem && !activeRole.isReadOnly && (
                      <span className="badge badge-progress" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', height: 'fit-content', borderRadius: '4px' }}>System Preset (Editable)</span>
                    )}
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {activeRole.isReadOnly 
                      ? 'Predefined, read-only system access levels. These permissions are fixed.'
                      : 'Toggle read/write capabilities below. Click Save to apply.'
                    }
                  </p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Role Category:</span>
                    {activeRole.isSystem ? (
                      <span className="badge badge-planning" style={{ fontSize: '0.75rem', textTransform: 'uppercase', borderRadius: '4px' }}>
                        {activeRole.category || 'Employee'}
                      </span>
                    ) : (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="form-select"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', width: '150px', height: '30px', borderRadius: '6px' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Management">Management</option>
                        <option value="Employee">Employee</option>
                      </select>
                    )}
                  </div>
                </div>
                {!activeRole.isReadOnly && (
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ display: 'flex', gap: '8px', padding: '0.6rem 1.25rem', borderRadius: '10px', height: '38px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)', boxShadow: '0 4px 12px rgba(0,174,239,0.2)' }}
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Section 1: Global Modules */}
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                  1. Global Sidebar Pages
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {GLOBAL_PERMISSIONS.map((perm) => (
                    <div
                      key={perm.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        transition: 'border-color 0.2s ease',
                        opacity: activeRole.isReadOnly ? 0.8 : 1
                      }}
                      className="perm-row"
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{perm.label}</strong>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.3 }}>{perm.desc}</p>
                      </div>

                      {/* Segmented capsule controls */}
                      <div style={{
                        display: 'flex',
                        background: 'rgba(0, 0, 0, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '24px',
                        padding: '4px',
                        gap: '2px',
                        pointerEvents: activeRole.isReadOnly ? 'none' : 'auto'
                      }}>
                        {['none', 'read', 'write'].map((level) => {
                          const isSelected = editPermissions[perm.key] === level;
                          let activeStyle = {};
                          if (isSelected) {
                            if (level === 'none') {
                              activeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' };
                            } else if (level === 'read') {
                              activeStyle = { background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', border: '1px solid rgba(0, 174, 239, 0.25)' };
                            } else if (level === 'write') {
                              activeStyle = { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' };
                            }
                          }
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handlePermissionChange(perm.key, level)}
                              disabled={activeRole.isReadOnly}
                              style={{
                                border: '1px solid transparent',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                padding: '0.45rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                cursor: activeRole.isReadOnly ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                minWidth: '75px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                opacity: isSelected ? 1 : 0.4,
                                ...activeStyle,
                              }}
                            >
                              {level === 'none' && <XCircle size={10} />}
                              {level === 'read' && <Eye size={10} />}
                              {level === 'write' && <CheckCircle2 size={10} />}
                              <span>{level}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Project Tabs */}
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                  2. Inside Project Tabs
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {PROJECT_PERMISSIONS.map((perm) => (
                    <div
                      key={perm.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        transition: 'border-color 0.2s ease',
                        opacity: activeRole.isReadOnly ? 0.8 : 1
                      }}
                      className="perm-row"
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{perm.label}</strong>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.3 }}>{perm.desc}</p>
                      </div>

                      {/* Segmented capsule controls */}
                      <div style={{
                        display: 'flex',
                        background: 'rgba(0, 0, 0, 0.05)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '24px',
                        padding: '4px',
                        gap: '2px',
                        pointerEvents: activeRole.isReadOnly ? 'none' : 'auto'
                      }}>
                        {['none', 'read', 'write'].map((level) => {
                          const isSelected = editPermissions[perm.key] === level;
                          let activeStyle = {};
                          if (isSelected) {
                            if (level === 'none') {
                              activeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' };
                            } else if (level === 'read') {
                              activeStyle = { background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', border: '1px solid rgba(0, 174, 239, 0.25)' };
                            } else if (level === 'write') {
                              activeStyle = { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' };
                            }
                          }
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handlePermissionChange(perm.key, level)}
                              disabled={activeRole.isReadOnly}
                              style={{
                                border: '1px solid transparent',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                padding: '0.45rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                cursor: activeRole.isReadOnly ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                minWidth: '75px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                opacity: isSelected ? 1 : 0.4,
                                ...activeStyle,
                              }}
                            >
                              {level === 'none' && <XCircle size={10} />}
                              {level === 'read' && <Eye size={10} />}
                              {level === 'write' && <CheckCircle2 size={10} />}
                              <span>{level}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              {!activeRole.isReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ display: 'flex', gap: '8px', minWidth: '160px', padding: '0.65rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)', boxShadow: '0 4px 12px rgba(0,174,239,0.2)' }}
                  >
                    {saving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Permissions</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay"
          style={{
            background: 'rgba(255, 255, 255, 0.01)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
        >
          <div
            className="modal-content animate-fade-in"
            style={{
              maxWidth: '440px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)',
              borderRadius: '24px',
              padding: '2.25rem',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close */}
            <button
              onClick={() => setIsCreateOpen(false)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              className="modal-close-btn"
            >
              <X size={16} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' }}>
              <div style={{
                background: 'var(--accent-primary-glow)',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={22} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Create Global Role</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>Role will be available platform-wide</p>
              </div>
            </div>

            <form onSubmit={handleCreateRole}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>Role Name *</label>
                
                <div style={{ position: 'relative' }}>
                  <Shield size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Designer, Marketing Manager"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    required
                    autoFocus
                    style={{
                      paddingLeft: '2.75rem',
                      height: '42px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block', lineHeight: 1.3 }}>
                  This will create a role available across all client organizations.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>Role Category *</label>
                <select
                  value={newRoleCategory}
                  onChange={(e) => setNewRoleCategory(e.target.value)}
                  className="form-select"
                  style={{
                    height: '42px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    padding: '0 1rem'
                  }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Management">Management</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)',
                  boxShadow: '0 4px 15px var(--accent-primary-glow)',
                  fontWeight: 700,
                  color: '#ffffff'
                }}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Role'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      <style jsx>{`
        .role-card-item:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: var(--text-muted) !important;
          transform: translateY(-1px);
        }
        .delete-role-btn:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
        .modal-close-btn:hover {
          color: var(--text-primary) !important;
          background: rgba(255, 255, 255, 0.08) !important;
          transform: rotate(90deg);
        }
        .perm-row:hover {
          border-color: var(--border-color-hover) !important;
          background: rgba(255, 255, 255, 0.015) !important;
        }
      `}</style>
    </div>
  );
}
