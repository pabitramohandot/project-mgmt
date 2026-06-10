'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Shield, CheckCircle2, Users, RefreshCw } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function ProfileSettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');

  const [activeTab, setActiveTab] = useState('account');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: '',
    companyEmailUser: '',
    companyEmailPass: '',
    companyEmailHasPassword: false
  });

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
          setCompanyName(data.company?.name || 'Workspace');
          setCompanyLogo(data.company?.logo || '');
          setCompanyUsers(data.companyUsers || []);
          setForm({
            username: data.username,
            email: data.email || '',
            whatsapp: data.whatsapp || '',
            password: '',
            confirmPassword: '',
            companyEmailUser: data.company?.emailSettings?.user || '',
            companyEmailPass: data.company?.emailSettings?.hasPassword ? '••••••••' : '',
            companyEmailHasPassword: !!data.company?.emailSettings?.hasPassword
          });
        }
      } catch (e) {
        console.error(e);
        showToast('Error loading profile settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadUserProfile();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (activeTab === 'account' && (form.password || form.confirmPassword)) {
      if (form.password !== form.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
      if (form.password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        email: form.email,
        whatsapp: form.whatsapp,
        password: form.password || undefined
      };

      if (role === 'company_admin' || role === 'superadmin') {
        payload.companyEmailUser = form.companyEmailUser;
        payload.companyEmailPass = form.companyEmailPass;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Account settings updated successfully!', 'success');
        setForm(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
        setTimeout(() => window.location.reload(), 800);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update profile settings.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving changes.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!form.companyEmailUser) {
      showToast('Please enter Gmail Username first', 'error');
      return;
    }
    if (!form.companyEmailPass) {
      showToast('Please enter Gmail App Password first', 'error');
      return;
    }

    try {
      setTestingSmtp(true);
      const res = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: form.companyEmailUser,
          pass: form.companyEmailPass
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('SMTP Connection Verified successfully!', 'success');
      } else {
        showToast(data.error || 'SMTP Connection Test failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection test failed: Network error', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading profile info...
      </div>
    );
  }

  // Get readable role badge text & color
  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'superadmin':
        return { text: 'Super Admin', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'company_admin':
        return { text: 'Company Admin', color: '#00aeef', bg: 'rgba(0, 174, 239, 0.15)' };
      default:
        return { text: 'Company User', color: '#f26522', bg: 'rgba(242, 101, 34, 0.15)' };
    }
  };

  const getRoleGradient = (roleName) => {
    switch (roleName) {
      case 'superadmin':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'company_admin':
        return 'linear-gradient(135deg, #00aeef 0%, #009fe3 100%)';
      default:
        return 'linear-gradient(135deg, #f26522 0%, #ea580c 100%)';
    }
  };

  const badge = getRoleBadge(role);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '950px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your personal account profile, contact credentials, and update password settings.</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="tab-container">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
        >
          <User size={16} />
          <span>Account Details</span>
        </button>

        {(role === 'company_admin' || role === 'superadmin') && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`tab-btn ${activeTab === 'smtp' ? 'active' : ''}`}
            >
              <Mail size={16} />
              <span>SMTP Integrations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>Team Members</span>
            </button>
          </>
        )}
      </div>

      <div className={activeTab === 'account' ? "grid-2col" : ""} style={{ display: activeTab === 'account' ? 'grid' : 'block', alignItems: 'start' }}>
        
        {/* Form Panel */}
        <div className="card" style={{ padding: '2.5rem', maxWidth: activeTab === 'account' ? '100%' : '680px' }}>
          <form onSubmit={handleFormSubmit}>
            
            {/* TAB 1: Account Details */}
            {activeTab === 'account' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <User size={18} style={{ color: 'var(--accent-primary)' }} />
                  Profile Details
                </h2>

                <div className="form-group">
                  <label className="form-label">Username (Read-Only)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                    value={form.username}
                    readOnly
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. name@domain.com"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">WhatsApp Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. +1234567890"
                      value={form.whatsapp}
                      onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '2rem 0' }}></div>

                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Lock size={18} style={{ color: 'var(--accent-secondary)' }} />
                  Change Password
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Leave these fields blank if you do not wish to change your password.
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Re-type new password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SMTP Integrations */}
            {activeTab === 'smtp' && (role === 'company_admin' || role === 'superadmin') && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Mail size={18} style={{ color: 'var(--accent-primary)' }} />
                  Custom Gmail SMTP Connection
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
                  Configure your company's outbound Gmail account and App Password so invoices and announcements are received directly from your email address.
                </p>

                <div style={{ 
                  background: 'rgba(0, 174, 239, 0.04)', 
                  border: '1px solid rgba(0, 174, 239, 0.15)', 
                  borderRadius: '12px', 
                  padding: '1rem', 
                  marginBottom: '1.5rem', 
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>🔒 Security Note & Guide:</strong>
                  Google requires a 16-character <strong>App Password</strong> rather than your primary Google password. 
                  To generate one, go to your <em>Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords</em>.
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gmail Username</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. billing@yourcompany.com"
                      value={form.companyEmailUser}
                      onChange={(e) => setForm(prev => ({ ...prev, companyEmailUser: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gmail App Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder={form.companyEmailHasPassword ? '••••••••' : 'Enter 16-character App Password'}
                      value={form.companyEmailPass}
                      onChange={(e) => setForm(prev => ({ ...prev, companyEmailPass: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="test-smtp-btn"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                  >
                    {testingSmtp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>{testingSmtp ? 'Testing Connection...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Team Members */}
            {activeTab === 'team' && (role === 'company_admin' || role === 'superadmin') && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Users size={18} style={{ color: 'var(--accent-primary)' }} />
                  Team Members ({companyUsers.length})
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
                  View the administrative staff and developer accounts linked to <strong style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{companyName}</strong>.
                </p>

                {role === 'company_admin' && (
                  <div style={{ 
                    background: 'rgba(242, 101, 34, 0.04)', 
                    border: '1px solid rgba(242, 101, 34, 0.15)', 
                    borderRadius: '12px', 
                    padding: '1rem', 
                    marginBottom: '1.5rem', 
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong style={{ color: 'var(--accent-secondary)', display: 'block', marginBottom: '4px' }}>💡 Workspace Management:</strong>
                    As a Company Admin, you can view your staff directory here. Credentials and access control can be managed by contacting the system Super Admin.
                  </div>
                )}

                <div className="team-list">
                  {companyUsers.map((u) => {
                    const initials = u.username ? u.username.slice(0, 2).toUpperCase() : 'U';
                    const userBadge = getRoleBadge(u.role);
                    const gradient = getRoleGradient(u.role);
                    return (
                      <div key={u.id} className="team-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: gradient,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{u.username}</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              {u.email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Mail size={12} style={{ opacity: 0.7 }} />
                                  <span>{u.email}</span>
                                </span>
                              )}
                              {u.whatsapp && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={12} style={{ opacity: 0.7 }} />
                                  <span>{u.whatsapp}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="badge" style={{ background: userBadge.bg, color: userBadge.color, fontSize: '0.7rem' }}>
                          {userBadge.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save Settings Form Submit */}
            {activeTab !== 'team' && (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '2rem', height: '42px', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                disabled={submitting}
              >
                <Save size={18} />
                <span>{submitting ? 'Saving changes...' : 'Save Settings'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Live Profile Info Card Preview */}
        {activeTab === 'account' && (
          <div style={{ position: 'sticky', top: '2rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', background: 'var(--bg-card)', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)` }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center', marginTop: '0.5rem' }}>
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                padding: '3px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {companyLogo ? (
                    <img 
                      src={companyLogo} 
                      alt="Company Logo" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        background: 'var(--bg-secondary)',
                        padding: '10px'
                      }} 
                    />
                  ) : (
                    form.username ? form.username.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {form.username || 'User'}
                </h3>
                <span className="badge" style={{ background: badge.bg, color: badge.color, fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                  {badge.text}
                </span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Shield size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Organization</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{companyName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Contact Email</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{form.email || 'No email specified'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Phone size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>WhatsApp Contact</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{form.whatsapp || 'No WhatsApp specified'}</div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <CheckCircle2 size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Real-time identity preview card.</span>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Styled JSX for Premium Animations and Effects */}
      <style jsx>{`
        .tab-container {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 2rem;
          padding: 0.35rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          width: fit-content;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.7rem 1.35rem;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          background: transparent;
          color: var(--text-secondary);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: var(--font-sans);
        }
        .tab-btn:hover {
          color: var(--text-primary);
          background: var(--border-color);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, var(--accent-primary) 0%, rgba(0, 174, 239, 0.8) 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px var(--accent-primary-glow);
        }
        .team-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 420px;
          overflow-y: auto;
          padding-right: 6px;
        }
        .team-list::-webkit-scrollbar {
          width: 5px;
        }
        .team-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .team-list::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 99px;
        }
        .team-list::-webkit-scrollbar-thumb:hover {
          background: var(--accent-primary);
        }
        .team-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border: 1px solid var(--border-color);
          border-radius: 16px;
        }
        .test-smtp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }
        .test-smtp-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          box-shadow: 0 2px 10px var(--accent-primary-glow);
        }
        .test-smtp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
