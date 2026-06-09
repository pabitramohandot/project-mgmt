'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Building, X, Clock } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function UsersPage() {
  const { showToast } = useNotification();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'company_user',
    companyId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, companiesRes] = await Promise.all([
        fetch('/api/superadmin/users'),
        fetch('/api/superadmin/companies')
      ]);

      if (usersRes.ok && companiesRes.ok) {
        const usersData = await usersRes.json();
        const companiesData = await companiesRes.json();
        setUsers(usersData);
        setCompanies(companiesData);
        if (companiesData.length > 0) {
          setForm(prev => ({ ...prev, companyId: companiesData[0]._id }));
        }
      } else {
        showToast('Failed to fetch users or companies', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading registry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          companyId: form.role === 'superadmin' ? null : form.companyId
        })
      });

      if (res.ok) {
        showToast('User created successfully!', 'success');
        setIsModalOpen(false);
        setForm(prev => ({ ...prev, username: '', password: '' }));
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
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Assigned Company</th>
                    <th>Access Role</th>
                    <th>Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
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
                        <span className={`badge ${u.role === 'superadmin' ? 'badge-review' : u.role === 'company_admin' ? 'badge-progress' : 'badge-planning'}`} style={{ fontSize: '0.7rem' }}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <Clock size={12} />
                          <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
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
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="company_user">Company User</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
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
