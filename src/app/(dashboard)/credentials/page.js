'use client';

import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  LockKeyhole, 
  Unlock, 
  Edit, 
  Trash2, 
  X, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function CredentialsPage() {
  const { showToast, showConfirm } = useNotification();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Vault data state
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    _id: '',
    title: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });

  // UX toggles
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Check sessionStorage on mount
  useEffect(() => {
    const cachedPasscode = sessionStorage.getItem('vault_passcode');
    if (cachedPasscode) {
      const verifyCachedPasscode = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/credentials', {
            headers: {
              'x-vault-passcode': cachedPasscode
            }
          });
          if (res.ok) {
            const data = await res.json();
            setCredentials(data);
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('vault_passcode');
          }
        } catch (err) {
          console.error('Failed to verify cached passcode:', err);
          sessionStorage.removeItem('vault_passcode');
        } finally {
          setLoading(false);
        }
      };
      verifyCachedPasscode();
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch list of credentials
  const fetchCredentials = async () => {
    const activePasscode = sessionStorage.getItem('vault_passcode');
    if (!activePasscode) return;
    
    try {
      setLoading(true);
      const url = new URL('/api/credentials', window.location.origin);
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url.toString(), {
        headers: {
          'x-vault-passcode': activePasscode
        }
      });
      if (!res.ok) throw new Error('Failed to load credentials');
      const data = await res.json();
      setCredentials(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    if (isAuthenticated) {
      const delayDebounceFn = setTimeout(() => {
        fetchCredentials();
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, isAuthenticated]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passcode) return;

    try {
      setUnlocking(true);
      setPasscodeError('');
      
      const res = await fetch('/api/credentials', {
        headers: {
          'x-vault-passcode': passcode
        }
      });

      if (!res.ok) {
        throw new Error('Invalid passcode. Access denied.');
      }

      const data = await res.json();
      setCredentials(data);
      sessionStorage.setItem('vault_passcode', passcode);
      setIsAuthenticated(true);
      showToast('Vault unlocked successfully', 'success');
    } catch (err) {
      setPasscodeError(err.message);
      showToast(err.message, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('vault_passcode');
    setIsAuthenticated(false);
    setPasscode('');
    setCredentials([]);
    setVisiblePasswords({});
    showToast('Vault locked', 'info');
  };

  const handleCopy = (text, fieldName, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(`${fieldName}-${id}`);
    showToast(`${fieldName} copied to clipboard`, 'success');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreateModal = () => {
    setCredentialForm({
      _id: '',
      title: '',
      username: '',
      password: '',
      url: '',
      notes: ''
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cred) => {
    setCredentialForm({
      _id: cred._id,
      title: cred.title,
      username: cred.username || '',
      password: cred.password || '',
      url: cred.url || '',
      notes: cred.notes || ''
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentialForm.title) {
      setFormError('Title/Service name is required');
      return;
    }

    const activePasscode = sessionStorage.getItem('vault_passcode');
    if (!activePasscode) {
      showToast('Session expired. Please re-authenticate.', 'error');
      setIsAuthenticated(false);
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const isEditing = !!credentialForm._id;
      const url = isEditing ? `/api/credentials/${credentialForm._id}` : '/api/credentials';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-vault-passcode': activePasscode
        },
        body: JSON.stringify(credentialForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save credential');
      }

      showToast(isEditing ? 'Credential updated successfully' : 'Credential created successfully', 'success');
      setIsFormModalOpen(false);
      fetchCredentials();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    const activePasscode = sessionStorage.getItem('vault_passcode');
    if (!activePasscode) return;

    showConfirm({
      title: 'Delete Credential',
      message: 'Are you sure you want to delete this credential profile? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/credentials/${id}`, {
            method: 'DELETE',
            headers: {
              'x-vault-passcode': activePasscode
            }
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to delete credential');
          }

          showToast('Credential deleted', 'success');
          fetchCredentials();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  // Render Loading Overlay on mount checks
  if (loading && !isAuthenticated) {
    return (
      <div className="empty-state">
        <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h3>Accessing security vault...</h3>
      </div>
    );
  }

  // Render Gate Passcode screen
  if (!isAuthenticated) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)', padding: '1rem', borderRadius: '50%', marginBottom: '1.25rem', boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)' }}>
              <LockKeyhole size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Security Vault Lock</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This section contains sensitive developer keys and login credentials. Enter the vault access passcode to unlock.
            </p>
          </div>

          <form onSubmit={handleUnlock}>
            {passcodeError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{passcodeError}</span>
              </div>
            )}

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Master Access Passcode</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter passcode..."
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  style={{ paddingRight: '2.5rem', letterSpacing: showPasscode ? 'normal' : '0.25em' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1.5rem' }} disabled={unlocking}>
              {unlocking ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  <span>Unlocking Vault...</span>
                </>
              ) : (
                <>
                  <Unlock size={16} />
                  <span>Unlock Vault</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Full Vault Dashboard
  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={28} style={{ color: 'var(--accent-primary)' }} />
              <span>Credentials Vault</span>
            </h1>
            <p className="page-subtitle">Secure storage for development server credentials, API keys, and configurations.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleLock}>
              Lock Vault
            </button>
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={18} />
              <span>Add Credential</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search credentials by title, username, notes..." 
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Credentials Grid/Table */}
        {loading && credentials.length === 0 ? (
          <div className="empty-state">
            <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
            <h3>Searching the vault...</h3>
          </div>
        ) : credentials.length === 0 ? (
          <div className="empty-state" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
            <Key size={48} style={{ color: 'var(--text-muted)' }} />
            <h3>No credentials found</h3>
            <p>Add a credential profile (database log, hosting portal, domain registrar) to get started.</p>
          </div>
        ) : (
          <div className="table-container" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Title / Service Name</th>
                  <th>Username / Email</th>
                  <th>Password</th>
                  <th className="hide-mobile">Website URL</th>
                  <th className="hide-mobile">Notes</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred._id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cred.title}</span>
                    </td>
                    <td>
                      {cred.username ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <span>{cred.username}</span>
                          <button
                            onClick={() => handleCopy(cred.username, 'Username', cred._id)}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Copy Username"
                          >
                            {copiedId === `Username-${cred._id}` ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                          </button>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      {cred.password ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontFamily: visiblePasswords[cred._id] ? 'inherit' : 'monospace', letterSpacing: visiblePasswords[cred._id] ? 'normal' : '0.15em', color: visiblePasswords[cred._id] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {visiblePasswords[cred._id] ? cred.password : '••••••••'}
                          </span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => togglePasswordVisibility(cred._id)}
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title={visiblePasswords[cred._id] ? "Hide Password" : "Show Password"}
                            >
                              {visiblePasswords[cred._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => handleCopy(cred.password, 'Password', cred._id)}
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Copy Password"
                            >
                              {copiedId === `Password-${cred._id}` ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td className="hide-mobile">
                      {cred.url ? (
                        <a 
                          href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--accent-secondary)', textDecoration: 'none' }}
                        >
                          <span>Go to link</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td className="hide-mobile" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cred.notes ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} title={cred.notes}>
                          {cred.notes}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: '8px' }} onClick={() => handleOpenEditModal(cred)} title="Edit Credential">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem', borderRadius: '8px', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)' }} onClick={() => handleDelete(cred._id)} title="Delete Credential">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credential Form Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {credentialForm._id ? 'Edit Credential Profile' : 'Add New Credential'}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
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
                <label className="form-label">Title / Service Name *</label>
                <input 
                  type="text" 
                  name="title"
                  className="form-input" 
                  required 
                  placeholder="e.g., cPanel Hosting Portal"
                  value={credentialForm.title}
                  onChange={(e) => setCredentialForm({ ...credentialForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username / Email / Login Name</label>
                <input 
                  type="text" 
                  name="username"
                  className="form-input" 
                  placeholder="e.g., admin_user"
                  value={credentialForm.username}
                  onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password / Secret Key</label>
                <input 
                  type="text" 
                  name="password"
                  className="form-input" 
                  placeholder="e.g., Pass123!"
                  value={credentialForm.password}
                  onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Website URL</label>
                <input 
                  type="text" 
                  name="url"
                  className="form-input" 
                  placeholder="e.g., https://cpanel.domain.com"
                  value={credentialForm.url}
                  onChange={(e) => setCredentialForm({ ...credentialForm, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  name="notes"
                  className="form-textarea" 
                  placeholder="Port settings, security questions, notes..."
                  value={credentialForm.notes}
                  onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
