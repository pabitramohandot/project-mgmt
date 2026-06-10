'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Layout, Save, Lock } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function BrandingSettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('');

  const [form, setForm] = useState({
    name: '',
    logo: '',
    primaryColor: '#00aeef',
    secondaryColor: '#f26522'
  });

  useEffect(() => {
    async function loadCompanyBranding() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const uData = await res.json();
          setRole(uData.role);
          if (uData.company) {
            setForm({
              name: uData.company.name,
              logo: uData.company.logo || '',
              primaryColor: uData.company.brandColors?.primary || '#00aeef',
              secondaryColor: uData.company.brandColors?.secondary || '#f26522'
            });
          }
        }
      } catch (e) {
        console.error(e);
        showToast('Error loading branding settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadCompanyBranding();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (role !== 'company_admin' && role !== 'superadmin') {
      showToast('Only Company Admins can edit branding settings.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: form.logo,
          brandColors: {
            primary: form.primaryColor,
            secondary: form.secondaryColor
          }
        })
      });

      if (res.ok) {
        showToast('Branding settings updated successfully!', 'success');
        // Update CSS variables immediately in real time
        document.documentElement.style.setProperty('--accent-primary', form.primaryColor);
        document.documentElement.style.setProperty('--accent-secondary', form.secondaryColor);
        // Reload page to ensure everything reflects correctly
        setTimeout(() => window.location.reload(), 800);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save settings.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving changes.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = role !== 'company_admin' && role !== 'superadmin';

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading branding profiles...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Company Branding Settings</h1>
          <p className="page-subtitle">Configure custom primary and secondary accents and upload corporate logos for your tenant dashboard.</p>
        </div>
      </div>

      {isReadOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          <Lock size={16} />
          <span>You have read-only access. Only Company Administrators can modify brand styles.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Form Panel */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label">Active Company (Read-Only)</label>
              <input
                type="text"
                className="form-input"
                style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                value={form.name}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logo Image URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. https://domain.com/logo.png"
                value={form.logo}
                onChange={(e) => setForm(prev => ({ ...prev, logo: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="color"
                    className="form-input"
                    style={{ width: '45px', height: '38px', padding: '2px', cursor: 'pointer' }}
                    value={form.primaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                    disabled={isReadOnly}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.primaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Secondary Color</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="color"
                    className="form-input"
                    style={{ width: '45px', height: '38px', padding: '2px', cursor: 'pointer' }}
                    value={form.secondaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    disabled={isReadOnly}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.secondaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>

            {!isReadOnly && (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', height: '42px', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                disabled={submitting}
              >
                <Save size={18} />
                <span>{submitting ? 'Saving changes...' : 'Save Branding Config'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Live Mock Layout Preview Panel */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <Layout size={16} style={{ color: form.primaryColor }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Live Mock Preview</h3>
            </div>

            <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {form.logo ? (
                  <img src={form.logo} alt="Branded Logo Preview" style={{ height: '22px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: form.primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    LO
                  </div>
                )}
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{form.name || 'Company Name'}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn" style={{ flex: 1, background: form.primaryColor, color: '#fff', fontSize: '0.75rem', padding: '0.4rem' }}>
                  Branded Button
                </button>
                <button type="button" className="btn" style={{ flex: 1, background: 'transparent', border: `1px solid ${form.secondaryColor}`, color: form.secondaryColor, fontSize: '0.75rem', padding: '0.4rem' }}>
                  Branded Border
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1.1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: form.secondaryColor }} />
              <span>Watch your brand identity update dynamically.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
