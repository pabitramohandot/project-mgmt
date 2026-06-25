'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Building, X, Clock, Trash2, Search } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function UsersPage() {
  const { showToast, showConfirm } = useNotification();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalRoles, setGlobalRoles] = useState([]);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'company_user',
    companyId: '',
    customRole: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, companiesRes, rolesRes] = await Promise.all([
        fetch('/api/superadmin/users'),
        fetch('/api/superadmin/companies'),
        fetch('/api/superadmin/roles')
      ]);

      if (usersRes.ok && companiesRes.ok && rolesRes.ok) {
        const usersData = await usersRes.json();
        const companiesData = await companiesRes.json();
        const rolesData = await rolesRes.json();
        setUsers(usersData);
        setCompanies(companiesData);
        setGlobalRoles(rolesData);
        if (companiesData.length > 0) {
          setForm(prev => ({ ...prev, companyId: companiesData[0]._id }));
        }
      } else {
        showToast('Failed to fetch users, companies, or roles', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading registry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCurrentUser();
  }, []);

  const handleDeleteUser = (id, username) => {
    showConfirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${username}"? This will permanently delete the user account and their authored feedback. This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/superadmin/users/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('User deleted successfully', 'success');
            fetchData();
          } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete user', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting user', 'error');
        }
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.role) {
      showToast('All fields are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          companyId: form.role === 'superadmin' ? null : form.companyId,
          customRole: form.role === 'company_user' ? (form.customRole || null) : null
        })
      });

      if (res.ok) {
        showToast('User created successfully!', 'success');
        setIsModalOpen(false);
        setForm(prev => ({ ...prev, username: '', password: '', customRole: '' }));
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to create user.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error submitting user request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Role Filter
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;



    // Search Query (username, company, role)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const usernameMatch = u.username?.toLowerCase().includes(query);
      const companyNameMatch = u.companyId?.name?.toLowerCase().includes(query);
      const roleMatch = u.role?.toLowerCase().replace('_', ' ').includes(query);
      
      if (!usernameMatch && !companyNameMatch && !roleMatch) return false;
    }

    return true;
  });

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Super Admin: Users</h1>
            <p className="page-subtitle">Configure credentials, role privileges, and assign staff members to companies.</p>
          </div>
          <div>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              <Plus size={18} />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search users by username, role, or company..." 
              className="form-input"
              style={{ paddingLeft: '2.75rem', height: '40px', borderRadius: '10px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ 
                minWidth: '150px', 
                height: '40px', 
                padding: '0.5rem 0.75rem', 
                fontSize: '0.875rem', 
                borderRadius: '10px', 
                background: 'var(--bg-card)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="company_admin">Company Admin</option>
              <option value="company_user">Company User</option>
            </select>

          </div>
        </div>

        <div className="card" style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading users registry...
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ color: 'var(--text-muted)' }} />
              <h3>No Users Found</h3>
              <p>Create user credentials and link them to corporate workspaces.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Create User
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3>No matching users found</h3>
              <p>Try refining your search query or filters.</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Assigned Company</th>
                    <th>Access Role</th>
                    <th>Registration Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                            {u.username.substring(0, 1).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td>
                        {u.role === 'superadmin' ? (
                          <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Global (All Companies)</span>
                        ) : u.companyId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building size={14} style={{ color: 'var(--accent-primary)' }} />
                            <span>{u.companyId.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          u.role === 'superadmin' ? 'badge-review' : 
                          u.role === 'company_admin' ? 'badge-progress' : 
                          'badge-planning'
                        }`} style={{ fontSize: '0.7rem' }}>
                          {u.role === 'company_user' && u.customRole ? u.customRole.name : u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <Clock size={12} />
                          <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {currentUser && currentUser.userId !== u._id ? (
                          <button
                            onClick={() => handleDeleteUser(u._id, u.username)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', gap: '4px', color: 'var(--status-overdue)' }}
                            title="Delete User"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Active Session</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} style={{ color: 'var(--accent-primary)' }} />
                <h2 style={{ fontSize: '1.2rem' }}>Create User</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. johndoe"
                  value={form.username}
                  onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="e.g. ••••••••"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Access Role *</label>
                <select
                  className="form-select"
                  value={form.customRole ? form.customRole : form.role}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'superadmin' || val === 'company_admin' || val === 'company_user') {
                      setForm(prev => ({ ...prev, role: val, customRole: '' }));
                    } else {
                      setForm(prev => ({ ...prev, role: 'company_user', customRole: val }));
                    }
                  }}
                  required
                >
                  <optgroup label="System Roles">
                    <option value="company_user">Company User (Default permissions)</option>
                    <option value="company_admin">Company Admin (Full company access)</option>
                    <option value="superadmin">Super Admin (Full global access)</option>
                  </optgroup>
                  {globalRoles.filter(r => !r.isSystem).length > 0 && (
                    <optgroup label="Custom Roles">
                      {globalRoles.filter(r => !r.isSystem).map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Permissions Preview Card */}
                {(() => {
                  const selectedVal = form.customRole || form.role;
                  let title = '';
                  let badgeText = '';
                  let badgeColor = '';
                  let p = null;

                  if (selectedVal === 'superadmin') {
                    title = 'Super Admin';
                    badgeText = 'Full Global Access';
                    badgeColor = 'var(--status-overdue)';
                    p = {
                      ai_agent: 'write', clients: 'write', invoices: 'write', credentials: 'write', pending_tasks: 'write', announcements: 'write', branding: 'write',
                      project_details: 'write', project_credential: 'write', project_links: 'write', project_pricing: 'write', project_invoice: 'write', project_status: 'write', project_tasks: 'write', project_calendar: 'write'
                    };
                  } else if (selectedVal === 'company_admin') {
                    title = 'Company Admin';
                    badgeText = 'Company Access';
                    badgeColor = 'var(--status-progress)';
                    const dbRole = globalRoles.find(r => r.name === 'Company Admin');
                    p = dbRole ? dbRole.permissions : {
                      ai_agent: 'write', clients: 'write', invoices: 'write', credentials: 'write', pending_tasks: 'write', announcements: 'write', branding: 'write',
                      project_details: 'write', project_credential: 'write', project_links: 'write', project_pricing: 'write', project_invoice: 'write', project_status: 'write', project_tasks: 'write', project_calendar: 'write'
                    };
                  } else if (selectedVal === 'company_user') {
                    title = 'Company User (Default)';
                    badgeText = 'Standard Access';
                    badgeColor = 'var(--status-planning)';
                    const dbRole = globalRoles.find(r => r.name === 'Company User (Default)');
                    p = dbRole ? dbRole.permissions : {
                      ai_agent: 'read', clients: 'read', invoices: 'read', credentials: 'none', pending_tasks: 'read', announcements: 'read', branding: 'none',
                      project_details: 'read', project_credential: 'none', project_links: 'read', project_pricing: 'read', project_invoice: 'read', project_status: 'write', project_tasks: 'write', project_calendar: 'write'
                    };
                  } else {
                    const dbRole = globalRoles.find(r => r._id === selectedVal);
                    if (dbRole) {
                      title = `${dbRole.name} Role`;
                      badgeText = 'Custom Access';
                      badgeColor = 'var(--accent-primary)';
                      p = dbRole.permissions;
                    }
                  }

                  if (!p) return null;

                  const formatLevel = (lvl) => {
                    if (lvl === 'write') return 'Write Access';
                    if (lvl === 'read') return 'Read Only';
                    return 'No Access';
                  };

                  const items = [
                    { name: 'Projects Details & Timeline', level: formatLevel(p.project_details) },
                    { name: 'Project Credentials/Secrets', level: formatLevel(p.project_credential) },
                    { name: 'Project Bookmarks & Links', level: formatLevel(p.project_links) },
                    { name: 'Project Finances & Invoices', level: formatLevel(p.project_invoice || p.project_pricing) },
                    { name: 'Project Checklist & Tasks', level: formatLevel(p.project_tasks) },
                    { name: 'Clients & Billing registries', level: formatLevel(p.invoices || p.clients) },
                    { name: 'Credentials Vault', level: formatLevel(p.credentials) },
                    { name: 'AI Chat Assistant', level: formatLevel(p.ai_agent) }
                  ];

                  return (
                    <div className="animate-fade-in" style={{
                      marginTop: '1.25rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>{title} Access Summary</span>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '6px', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: `1px solid ${badgeColor}`, 
                          color: badgeColor,
                          fontWeight: 600
                        }}>{badgeText}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {items.map((item, idx) => {
                          let levelColor = 'var(--text-muted)';
                          if (item.level === 'Write Access') {
                            levelColor = 'var(--status-progress)';
                          } else if (item.level === 'Read Only') {
                            levelColor = 'var(--accent-secondary)';
                          } else if (item.level === 'No Access') {
                            levelColor = 'var(--text-muted)';
                          }
                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                              <span style={{ fontWeight: 500, color: levelColor }}>{item.level}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {form.role !== 'superadmin' && (
                <div className="form-group animate-fade-in">
                  <label className="form-label">Assign Tenant Company *</label>
                  {companies.length === 0 ? (
                    <div style={{ padding: '0.5rem', color: 'var(--status-overdue)', fontSize: '0.8rem' }}>
                      Please create a company first before registering company users.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={form.companyId}
                      onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                      required={form.role !== 'superadmin'}
                    >
                      {companies.map((comp) => (
                        <option key={comp._id} value={comp._id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', height: '40px' }}
                disabled={submitting || (form.role !== 'superadmin' && companies.length === 0)}
              >
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
