'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building, Sparkles } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function NewCompanyPage() {
  const router = useRouter();
  const { showToast } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo: '',
    primaryColor: '#00aeef',
    secondaryColor: '#f26522',
    contactEmail: ''
  });

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const nameVal = e.target.value;
    setForm(prev => ({
      ...prev,
      name: nameVal,
      slug: generateSlug(nameVal)
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      showToast('Name and Slug are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/superadmin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          logo: form.logo,
          brandColors: {
            primary: form.primaryColor,
            secondary: form.secondaryColor
          },
          contactEmail: form.contactEmail
        })
      });

      if (res.ok) {
        showToast('Company created successfully!', 'success');
        router.push('/superadmin/companies');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to create company.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error submitting request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/superadmin/companies" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Register New Company</h1>
          <p className="page-subtitle">Configure tenant names, branding styles, and default email configurations.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Corporation"
                value={form.name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Slug / Route URL *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. acme-corp"
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                required
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. admin@acme.com"
                value={form.contactEmail}
                onChange={(e) => setForm(prev => ({ ...prev, contactEmail: e.target.value }))}
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
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.primaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
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
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.secondaryColor}
                    onChange={(e) => setForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', height: '42px' }}
              disabled={submitting}
            >
              {submitting ? 'Creating Company...' : 'Create Company Profile'}
            </button>
          </form>
        </div>

        {/* Live Mock Layout Preview Panel */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <Building size={16} style={{ color: form.primaryColor }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Mock Branding Preview</h3>
            </div>

            <div style={{ padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {form.logo ? (
                  <img src={form.logo} alt="Logo Preview" style={{ height: '20px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : null}
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{form.name || 'Company Name'}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn" style={{ flex: 1, background: form.primaryColor, color: '#fff', fontSize: '0.75rem', padding: '0.4rem' }}>
                  Primary Button
                </button>
                <button type="button" className="btn" style={{ flex: 1, background: 'transparent', border: `1px solid ${form.secondaryColor}`, color: form.secondaryColor, fontSize: '0.75rem', padding: '0.4rem' }}>
                  Secondary Border
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} style={{ color: form.secondaryColor }} />
              <span>Preview updates instantly as you customize colors.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
