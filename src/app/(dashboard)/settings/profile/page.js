'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Shield, CheckCircle2 } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function ProfileSettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [form, setForm] = useState({
    username: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
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
          setForm({
            username: data.username,
            email: data.email || '',
            whatsapp: data.whatsapp || '',
            password: '',
            confirmPassword: ''
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

    if (form.password || form.confirmPassword) {
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
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          whatsapp: form.whatsapp,
          password: form.password || undefined
        })
      });

      if (res.ok) {
        showToast('Account settings updated successfully!', 'success');
        // Clear password fields
        setForm(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
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

  const badge = getRoleBadge(role);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your personal account profile, contact credentials, and update password settings.</p>
        </div>
      </div>

      <div className="grid-2col" style={{ alignItems: 'start' }}>
        
        {/* Form Panel */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleFormSubmit}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '1.5rem 0' }}></div>

            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} style={{ color: 'var(--accent-secondary)' }} />
              Change Password
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', height: '42px', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
              disabled={submitting}
            >
              <Save size={18} />
              <span>{submitting ? 'Saving changes...' : 'Save Settings'}</span>
            </button>
          </form>
        </div>

        {/* Live Profile Info Card Preview */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
              }}>
                {form.username ? form.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {form.username || 'User'}
                </h3>
                <span className="badge" style={{ background: badge.bg, color: badge.color, marginTop: '0.25rem' }}>
                  {badge.text}
                </span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Organization</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{companyName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contact Email</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, wordBreak: 'break-all' }}>{form.email || 'No email specified'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>WhatsApp Contact</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{form.whatsapp || 'No WhatsApp specified'}</div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }}></div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--accent-primary)' }} />
              <span>Real-time profile preview. Ensure info is accurate.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
