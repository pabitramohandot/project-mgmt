'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Phone, Lock, Save, Shield, CheckCircle2, Users, RefreshCw, Plus, X, Copy, ExternalLink, BarChart2, Palette, Layout, Sparkles, CreditCard, QrCode, Calendar as CalendarIcon, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function ProfileSettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState('');
  const [userPermissions, setUserPermissions] = useState({});
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [employeeLimit, setEmployeeLimit] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  
  // Employee Creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    username: '',
    password: '',
    customRole: ''
  });

  const [activeTab, setActiveTab] = useState('account');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [expandedPanel, setExpandedPanel] = useState('smtp');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [playChime, setPlayChime] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setNotificationPermission(window.Notification.permission);
      }
      const savedChime = localStorage.getItem('play_reminder_chime');
      setPlayChime(savedChime !== 'false');
    }
  }, []);

  const handleToggleChime = () => {
    const newVal = !playChime;
    setPlayChime(newVal);
    localStorage.setItem('play_reminder_chime', String(newVal));
    showToast(`Notification sound chime ${newVal ? 'enabled' : 'disabled'}.`, 'success');
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast('Browser notifications successfully enabled!', 'success');
      } else if (permission === 'denied') {
        showToast('Browser notifications blocked. Please enable them in browser settings.', 'warning');
      }
    }
  };

  const handleTestPopup = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trigger-test-reminder'));
    }
  };

  const [form, setForm] = useState({
    username: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: '',
    companyEmailUser: '',
    companyEmailPass: '',
    companyEmailHasPassword: false,
    companyEmailHost: '',
    companyEmailPort: 465,
    companyEmailSecure: true,
    companyEmailProviderType: 'gmail',
    companyLogo: '',
    uploadCode: '',
    brandingTagline: '',
    brandingPrimaryColor: '#00aeef',
    brandingSecondaryColor: '#f26522',
    bankDetails: '',
    bankQrCode: '',
  });

  const loadUserProfile = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        setUserPermissions(data.permissions || {});
        setCompanyName(data.company?.name || 'Workspace');
        setCompanyLogo(data.company?.logo || '');
        setCompanyUsers(data.companyUsers || []);
        if (data.company?.employeeLimit !== undefined) setEmployeeLimit(data.company.employeeLimit);
        if (data.employeeCount !== undefined) setEmployeeCount(data.employeeCount);
        setForm({
          username: data.username,
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          password: '',
          confirmPassword: '',
          companyEmailUser: data.company?.emailSettings?.user || '',
          companyEmailPass: data.company?.emailSettings?.hasPassword ? '••••••••' : '',
          companyEmailHasPassword: !!data.company?.emailSettings?.hasPassword,
          companyEmailHost: data.company?.emailSettings?.host || '',
          companyEmailPort: data.company?.emailSettings?.port || 465,
          companyEmailSecure: data.company?.emailSettings?.secure !== false,
          companyEmailProviderType: data.company?.emailSettings?.providerType || 'gmail',
          companyLogo: data.company?.logo || '',
          uploadCode: data.uploadCode || '',
          brandingTagline: data.company?.tagline || '',
          brandingPrimaryColor: data.company?.brandColors?.primary || '#00aeef',
          brandingSecondaryColor: data.company?.brandColors?.secondary || '#f26522',
          bankDetails: data.company?.bankDetails || '',
          bankQrCode: data.company?.bankQrCode || '',
        });

        if (data.role === 'company_admin') {
          try {
            const rolesRes = await fetch('/api/superadmin/roles');
            if (rolesRes.ok) {
              const rolesData = await rolesRes.json();
              setAvailableRoles(rolesData);
            }
          } catch (err) {
            console.error("Failed to load roles", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading profile settings', 'error');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
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
        payload.companyEmailHost = form.companyEmailHost;
        payload.companyEmailPort = Number(form.companyEmailPort) || 465;
        payload.companyEmailSecure = form.companyEmailSecure;
        payload.companyEmailProviderType = form.companyEmailProviderType;
        payload.companyLogo = form.companyLogo;
        payload.brandingTagline = form.brandingTagline;
        payload.brandingPrimaryColor = form.brandingPrimaryColor;
        payload.brandingSecondaryColor = form.brandingSecondaryColor;
        payload.bankDetails = form.bankDetails;
        payload.bankQrCode = form.bankQrCode;
      }

      if (role === 'superadmin') {
        payload.uploadCode = form.uploadCode;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Account settings updated successfully!', 'success');
        if (role === 'company_admin' || role === 'superadmin') {
          document.documentElement.style.setProperty('--accent-primary', form.brandingPrimaryColor);
          document.documentElement.style.setProperty('--accent-secondary', form.brandingSecondaryColor);
          setCompanyLogo(form.companyLogo);
        }
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
      showToast('Please enter Username first', 'error');
      return;
    }
    if (!form.companyEmailPass) {
      showToast('Please enter Password first', 'error');
      return;
    }

    try {
      setTestingSmtp(true);
      const res = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: form.companyEmailUser,
          pass: form.companyEmailPass,
          host: form.companyEmailHost,
          port: Number(form.companyEmailPort) || 465,
          secure: form.companyEmailSecure,
          providerType: form.companyEmailProviderType
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

  const handleToggleGoogleCalendar = async () => {
    if (googleConnected) {
      setConnectingGoogle(true);
      try {
        const res = await fetch('/api/auth/google/disconnect', { method: 'POST' });
        if (res.ok) {
          setGoogleConnected(false);
          setGoogleEmail('');
          localStorage.setItem('google_calendar_connected', 'false');
          showToast('Google Calendar disconnected successfully.', 'success');
        } else {
          showToast('Failed to disconnect Google Calendar.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Network error disconnecting Google Calendar.', 'error');
      } finally {
        setConnectingGoogle(false);
      }
    } else {
      setConnectingGoogle(true);
      window.location.href = '/api/auth/google';
    }
  };

  useEffect(() => {
    async function checkGoogleStatus() {
      try {
        const res = await fetch('/api/auth/google/status');
        if (res.ok) {
          const data = await res.json();
          setGoogleConnected(data.connected);
          setGoogleEmail(data.email || '');
          localStorage.setItem('google_calendar_connected', data.connected ? 'true' : 'false');
        }
      } catch (err) {
        console.error('Failed to check Google status:', err);
      }
    }
    checkGoogleStatus();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('google_connected') === 'true') {
        showToast('Google Calendar connected successfully!', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('error')) {
        showToast(`Failed to connect Google Calendar: ${params.get('error')}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.username || !newEmployee.password || !newEmployee.customRole) {
      showToast('Username, password, and role are required', 'error');
      return;
    }
    try {
      setCreatingEmployee(true);
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newEmployee.username,
          password: newEmployee.password,
          customRole: newEmployee.customRole,
          role: 'company_user'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Employee created successfully!', 'success');
        setIsCreateModalOpen(false);
        setNewEmployee({ username: '', password: '', customRole: '' });
        await loadUserProfile(false);
      } else {
        showToast(data.error || 'Failed to create employee', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating employee', 'error');
    } finally {
      setCreatingEmployee(false);
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
    <div className="animate-fade-in" style={{ width: '100%' }}>
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
              onClick={() => setActiveTab('banking')}
              className={`tab-btn ${activeTab === 'banking' ? 'active' : ''}`}
            >
              <CreditCard size={16} />
              <span>Banking Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`tab-btn ${activeTab === 'smtp' ? 'active' : ''}`}
            >
              <LinkIcon size={16} />
              <span>Integrations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>Team Members</span>
            </button>
            {role === 'superadmin' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('platform_code')}
                  className={`tab-btn ${activeTab === 'platform_code' ? 'active' : ''}`}
                >
                  <Lock size={16} />
                  <span>Platform Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analysis')}
                  className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
                >
                  <BarChart2 size={16} />
                  <span>Analysis</span>
                </button>
              </>
            )}
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
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Email Address
                      {(role === 'admin' || role === 'company_admin') && (
                        <span title="Email is locked for Company Admins as it is linked to integrations and system notifications." style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          background: '#fef3c7', color: '#92400e',
                          fontSize: '0.68rem', fontWeight: 600,
                          padding: '1px 6px', borderRadius: '99px',
                          border: '1px solid #fde68a', cursor: 'default'
                        }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          Read-Only
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. name@domain.com"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      readOnly={role === 'admin' || role === 'company_admin'}
                      title={role === 'admin' || role === 'company_admin' ? 'Email is locked for Company Admins. It is used for integrations and cannot be changed.' : ''}
                      style={role === 'admin' || role === 'company_admin' ? { background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', cursor: 'not-allowed' } : {}}
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

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0 1.5rem 0' }}></div>

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

                {/* Company Branding Settings */}
                {(role === 'company_admin' || role === 'superadmin') && (
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0 1.5rem 0' }}></div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      <Palette size={18} style={{ color: 'var(--accent-primary)' }} />
                      Company Branding Settings
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      Configure custom brand colors and logos to personalize your workspace interface.
                    </p>

                    <div className="form-group">
                      <label className="form-label">Active Company (Read-Only)</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                        value={companyName}
                        readOnly
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label">Company Logo URL</label>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          placeholder="e.g. https://domain.com/logo.png"
                          value={form.companyLogo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => ({ ...prev, companyLogo: val }));
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.65rem 1rem' }}
                          onClick={() => setIsUploadModalOpen(true)}
                        >
                          <ExternalLink size={16} />
                          <span>Get URL</span>
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Tagline / Subtitle</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Development & Consulting Services"
                        value={form.brandingTagline}
                        onChange={(e) => setForm(prev => ({ ...prev, brandingTagline: e.target.value }))}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Primary Accent Color</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="color"
                            className="form-input"
                            style={{ width: "45px", height: "38px", padding: "2px", cursor: "pointer" }}
                            value={form.brandingPrimaryColor}
                            onChange={(e) => setForm((prev) => ({ ...prev, brandingPrimaryColor: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={form.brandingPrimaryColor}
                            onChange={(e) => setForm((prev) => ({ ...prev, brandingPrimaryColor: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Secondary Accent Color</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="color"
                            className="form-input"
                            style={{ width: "45px", height: "38px", padding: "2px", cursor: "pointer" }}
                            value={form.brandingSecondaryColor}
                            onChange={(e) => setForm((prev) => ({ ...prev, brandingSecondaryColor: e.target.value }))}
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={form.brandingSecondaryColor}
                            onChange={(e) => setForm((prev) => ({ ...prev, brandingSecondaryColor: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Integrations */}
            {activeTab === 'smtp' && (role === 'company_admin' || role === 'superadmin') && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Accordion Item 1: SMTP Mail Integration */}
                <div style={{
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease'
                }}>
                  {/* Header Row */}
                  <div 
                    onClick={() => setExpandedPanel(expandedPanel === 'smtp' ? null : 'smtp')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      background: expandedPanel === 'smtp' ? 'var(--bg-secondary, #f9fafb)' : 'transparent',
                      userSelect: 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if (expandedPanel !== 'smtp') e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseOut={(e) => { if (expandedPanel !== 'smtp') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(0, 174, 239, 0.08)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Mail size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>SMTP Outbound Mail</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Send alerts and invoice notifications directly from your own account.</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        background: form.companyEmailUser ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: form.companyEmailUser ? '#10b981' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: form.companyEmailUser ? '#10b981' : '#6b7280' }} />
                        {form.companyEmailUser ? 'Active' : 'Unconfigured'}
                      </span>
                      {expandedPanel === 'smtp' ? <ChevronUp size={16} style={{ color: '#9ca3af' }} /> : <ChevronDown size={16} style={{ color: '#9ca3af' }} />}
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  {expandedPanel === 'smtp' && (
                    <div style={{ padding: '1.75rem', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Email Provider Type</label>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="providerType" 
                              value="gmail" 
                              checked={form.companyEmailProviderType === 'gmail'}
                              onChange={() => setForm(prev => ({ ...prev, companyEmailProviderType: 'gmail' }))}
                            />
                            <span>Gmail / Google Workspace</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="providerType" 
                              value="custom" 
                              checked={form.companyEmailProviderType === 'custom'}
                              onChange={() => setForm(prev => ({ ...prev, companyEmailProviderType: 'custom' }))}
                            />
                            <span>Custom SMTP (Zoho, cPanel, etc.)</span>
                          </label>
                        </div>
                      </div>

                      {form.companyEmailProviderType === 'gmail' ? (
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
                      ) : (
                        <div style={{ 
                          background: 'rgba(16, 185, 129, 0.04)', 
                          border: '1px solid rgba(16, 185, 129, 0.15)', 
                          borderRadius: '12px', 
                          padding: '1rem', 
                          marginBottom: '1.5rem', 
                          fontSize: '0.82rem',
                          lineHeight: '1.5',
                          color: 'var(--text-secondary)'
                        }}>
                          <strong style={{ color: '#10b981', display: 'block', marginBottom: '4px' }}>⚙️ Custom SMTP Settings Help:</strong>
                          Enter the SMTP details provided by your host (e.g. Zoho Mail or cPanel). 
                          Typically, port <strong>465</strong> requires <strong>SSL/TLS (Secure)</strong> checked, while port <strong>587</strong> or <strong>25</strong> uses standard connections.
                        </div>
                      )}

                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">
                            {form.companyEmailProviderType === 'gmail' ? 'Gmail Username' : 'SMTP Username'}
                          </label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="e.g. billing@yourcompany.com"
                            value={form.companyEmailUser}
                            onChange={(e) => setForm(prev => ({ ...prev, companyEmailUser: e.target.value }))}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">
                            {form.companyEmailProviderType === 'gmail' ? 'Gmail App Password' : 'SMTP Password'}
                          </label>
                          <input
                            type="password"
                            className="form-input"
                            placeholder={form.companyEmailHasPassword ? '••••••••' : 'Enter account password'}
                            value={form.companyEmailPass}
                            onChange={(e) => setForm(prev => ({ ...prev, companyEmailPass: e.target.value }))}
                          />
                        </div>
                      </div>

                      {form.companyEmailProviderType === 'custom' && (
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1.25rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">SMTP Host</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. smtp.zoho.com"
                              value={form.companyEmailHost}
                              onChange={(e) => setForm(prev => ({ ...prev, companyEmailHost: e.target.value }))}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">SMTP Port</label>
                            <input
                              type="number"
                              className="form-input"
                              placeholder="465"
                              value={form.companyEmailPort}
                              onChange={(e) => setForm(prev => ({ ...prev, companyEmailPort: e.target.value }))}
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Secure</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              <input 
                                type="checkbox" 
                                checked={form.companyEmailSecure}
                                onChange={(e) => setForm(prev => ({ ...prev, companyEmailSecure: e.target.checked }))}
                              />
                              <span>SSL / TLS</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', gap: '1rem' }}>
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
                          <span>{testingSmtp ? 'Testing...' : 'Test Connection'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleFormSubmit}
                          style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                        >
                          <Save size={14} style={{ marginRight: '6px' }} />
                          <span>Save SMTP Settings</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion Item 2: Google Calendar Integration */}
                <div style={{
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease'
                }}>
                  {/* Header Row */}
                  <div 
                    onClick={() => setExpandedPanel(expandedPanel === 'google' ? null : 'google')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      background: expandedPanel === 'google' ? 'var(--bg-secondary, #f9fafb)' : 'transparent',
                      userSelect: 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if (expandedPanel !== 'google') e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseOut={(e) => { if (expandedPanel !== 'google') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(26, 115, 232, 0.08)',
                        color: '#1a73e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Google Calendar & Meet</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Auto-generate Google Meet links, sync agendas, and invite attendees.</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        background: googleConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: googleConnected ? '#10b981' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: googleConnected ? '#10b981' : '#6b7280' }} />
                        {googleConnected ? 'Connected' : 'Disconnected'}
                      </span>
                      {expandedPanel === 'google' ? <ChevronUp size={16} style={{ color: '#9ca3af' }} /> : <ChevronDown size={16} style={{ color: '#9ca3af' }} />}
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  {expandedPanel === 'google' && (
                    <div style={{ padding: '1.75rem', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Synchronize your meeting schedules directly with Google Calendar to streamline workflow automation.
                      </p>

                      <div style={{ 
                        border: '1px solid var(--border-color, #e5e7eb)', 
                        borderRadius: '12px', 
                        padding: '1.25rem', 
                        background: '#f9fafb',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Integration Account Info</span>
                          <span style={{ fontSize: '0.82rem', color: googleConnected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {googleConnected ? googleEmail || 'No Account Linked' : 'No Account Linked'}
                          </span>
                        </div>

                        {googleConnected && (
                          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>Selected Calendar:</span>
                              <strong style={{ color: 'var(--text-primary)' }}>Primary Workspace Calendar</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>API Sync State:</span>
                              <strong style={{ color: '#10b981' }}>Active (Real-time)</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {role === 'superadmin' || userPermissions.google_meet === 'write' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={handleToggleGoogleCalendar}
                            disabled={connectingGoogle}
                            style={{
                              background: googleConnected ? 'transparent' : 'var(--accent-primary, #ea580c)',
                              color: googleConnected ? 'var(--text-primary, #111827)' : '#ffffff',
                              border: googleConnected ? '1px solid var(--border-color, #e5e7eb)' : 'none',
                              padding: '0.6rem 1.25rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              boxShadow: googleConnected ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)',
                              transition: 'opacity 0.2s',
                              height: 'auto'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {connectingGoogle ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <CalendarIcon size={14} />
                            )}
                            <span>
                              {connectingGoogle 
                                ? 'Connecting Google...' 
                                : googleConnected 
                                  ? 'Disconnect Account' 
                                  : 'Connect Google Calendar'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <button
                            type="button"
                            disabled
                            style={{
                              background: '#cbd5e1',
                              color: '#64748b',
                              border: 'none',
                              padding: '0.6rem 1.25rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'not-allowed',
                              height: 'auto'
                            }}
                          >
                            <Shield size={14} />
                            <span>Contact Admin to Connect</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Accordion Item 3: Browser Notifications & Sound */}
                <div style={{
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  marginTop: '1.25rem'
                }}>
                  {/* Header Row */}
                  <div 
                    onClick={() => setExpandedPanel(expandedPanel === 'notifications' ? null : 'notifications')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      background: expandedPanel === 'notifications' ? 'var(--bg-secondary, #f9fafb)' : 'transparent',
                      userSelect: 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if (expandedPanel !== 'notifications') e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseOut={(e) => { if (expandedPanel !== 'notifications') e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        color: '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Bell size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Browser Notifications</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Manage meeting popups, audio chimes, and system alert permissions.</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                        background: notificationPermission === 'granted' ? 'rgba(16, 185, 129, 0.1)' : notificationPermission === 'denied' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: notificationPermission === 'granted' ? '#10b981' : notificationPermission === 'denied' ? '#ef4444' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textTransform: 'capitalize'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: notificationPermission === 'granted' ? '#10b981' : notificationPermission === 'denied' ? '#ef4444' : '#6b7280' }} />
                        {notificationPermission}
                      </span>
                      {expandedPanel === 'notifications' ? <ChevronUp size={16} style={{ color: '#9ca3af' }} /> : <ChevronDown size={16} style={{ color: '#9ca3af' }} />}
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  {expandedPanel === 'notifications' && (
                    <div style={{ padding: '1.75rem', borderTop: '1px solid var(--border-color, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                        Configure how alerts and scheduled reminders are dispatched to your browser screen and audio speakers.
                      </p>

                      {/* Request Permission Control */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e5e7eb)', gap: '1rem' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>System Screen Alerts</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Deliver push notifications directly to the desktop sidebar notifications tray.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={handleTestPopup}
                            style={{
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s',
                              height: 'auto'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            Test Popup
                          </button>
                          <button
                            type="button"
                            onClick={handleRequestNotificationPermission}
                            disabled={notificationPermission === 'granted'}
                            style={{
                              background: notificationPermission === 'granted' ? '#f1f5f9' : 'var(--accent-primary, #ea580c)',
                              color: notificationPermission === 'granted' ? '#94a3b8' : '#ffffff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: notificationPermission === 'granted' ? 'default' : 'pointer',
                              transition: 'opacity 0.2s',
                              height: 'auto'
                            }}
                            onMouseOver={(e) => { if (notificationPermission !== 'granted') e.currentTarget.style.opacity = '0.9'; }}
                            onMouseOut={(e) => { if (notificationPermission !== 'granted') e.currentTarget.style.opacity = '1'; }}
                          >
                            {notificationPermission === 'granted' ? 'Allowed' : 'Enable Alerts'}
                          </button>
                        </div>
                      </div>

                      {/* Audio Chime Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Audio Reminder Chime</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Play a 1-second chime sound when a scheduled reminder popup triggers.</span>
                        </div>
                        <div 
                          onClick={handleToggleChime}
                          style={{
                            width: '40px',
                            height: '24px',
                            borderRadius: '12px',
                            background: playChime ? 'var(--accent-primary, #ea580c)' : '#cbd5e1',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: playChime ? 'flex-end' : 'flex-start',
                            transition: 'background-color 0.2s ease',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.2s ease'
                          }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: Team Members */}
            {activeTab === 'team' && (role === 'company_admin' || role === 'superadmin') && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
                    <Users size={18} style={{ color: 'var(--accent-primary)' }} />
                    Team Members ({companyUsers.length})
                  </h2>
                  {role === 'company_admin' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                      onClick={() => {
                        if (employeeLimit > 0 && employeeCount >= employeeLimit) {
                          showToast(`Employee creation limit reached (${employeeLimit}).`, 'error');
                        } else {
                          setIsCreateModalOpen(true);
                        }
                      }}
                    >
                      <Plus size={14} />
                      <span>Create Employee</span>
                    </button>
                  )}
                </div>
                
                {role === 'company_admin' && employeeLimit > 0 && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.65rem',
                    background: employeeCount >= employeeLimit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 174, 239, 0.06)',
                    border: `1px solid ${employeeCount >= employeeLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 174, 239, 0.15)'}`,
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: employeeCount >= employeeLimit ? '#ef4444' : 'var(--accent-primary)',
                    marginBottom: '1rem'
                  }}>
                    <Users size={12} />
                    <span>Limit: {employeeCount} / {employeeLimit} Employees</span>
                    {employeeCount >= employeeLimit && <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#ef4444', color: '#fff', marginLeft: '4px' }}>MAX REACHED</span>}
                  </div>
                )}

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

            {/* TAB 4: Platform Access Code */}
            {activeTab === 'platform_code' && role === 'superadmin' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Lock size={18} style={{ color: 'var(--accent-secondary)' }} />
                  Platform Access Code Settings
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
                  Configure the global passcode required by users to authenticate on the uploading platform.
                </p>

                <div className="form-group" style={{ maxWidth: '400px' }}>
                  <label className="form-label">Access Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.uploadCode}
                    onChange={(e) => setForm(prev => ({ ...prev, uploadCode: e.target.value }))}
                    placeholder="e.g. ABC012"
                    style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: Analysis */}
            {activeTab === 'analysis' && role === 'superadmin' && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <BarChart2 size={18} style={{ color: 'var(--accent-secondary)' }} />
                  Analysis
                </h2>
                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <BarChart2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Analysis Dashboard Coming Soon</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This section is currently under construction and will feature advanced analytics soon.</p>
                </div>
              </div>
            )}

            {/* TAB 6: Banking Details */}
            {activeTab === 'banking' && (role === 'company_admin' || role === 'superadmin') && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <CreditCard size={18} style={{ color: 'var(--accent-primary)' }} />
                  Banking Details
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
                  Add your bank account details and payment QR code. These will appear at the bottom of every generated invoice.
                </p>

                {/* Bank Details Textarea */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={14} style={{ color: 'var(--accent-primary)' }} />
                    Bank Account Details
                  </label>
                  <textarea
                    className="form-input"
                    rows={7}
                    style={{
                      resize: 'vertical',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      lineHeight: '1.7',
                      minHeight: '150px',
                    }}
                    placeholder={`Bank Name: HDFC Bank\nAccount Name: Your Company Pvt. Ltd.\nAccount Number: 1234567890\nIFSC Code: HDFC0001234\nBranch: Mumbai Main Branch\nAccount Type: Current`}
                    value={form.bankDetails}
                    onChange={(e) => setForm(prev => ({ ...prev, bankDetails: e.target.value }))}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    This text will be displayed on the invoice. You can include all payment instructions here.
                  </p>
                </div>

                {/* QR Code URL */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <QrCode size={14} style={{ color: 'var(--accent-primary)' }} />
                    Payment QR Code Image URL
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder="e.g. https://domain.com/your-upi-qr.png"
                      value={form.bankQrCode}
                      onChange={(e) => setForm(prev => ({ ...prev, bankQrCode: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.65rem 1rem' }}
                      onClick={() => setIsUploadModalOpen(true)}
                    >
                      <ExternalLink size={16} />
                      <span>Get URL</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Upload your UPI / bank QR code image and paste the URL here. It will be shown on the invoice.
                  </p>
                </div>

                {/* Live Preview of QR Code */}
                {form.bankQrCode && (
                  <div style={{
                    background: 'rgba(0, 174, 239, 0.04)',
                    border: '1px solid rgba(0, 174, 239, 0.15)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                  }}>
                    <img
                      src={form.bankQrCode}
                      alt="Payment QR Code Preview"
                      style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '6px', border: '1px solid rgba(0,0,0,0.08)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        QR Code Preview
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        This QR image will appear on generated invoices for quick payment.
                      </p>
                    </div>
                  </div>
                )}
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
      
      {/* Live Mock Layout Preview Panel for Branding */}
      {activeTab === 'branding' && (
        <div style={{ position: "sticky", top: "2rem" }}>
          <div
            className="card"
            style={{
              background: "rgba(255,255,255,0.01)",
              borderStyle: "dashed",
              padding: "2.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <Layout size={16} style={{ color: form.brandingPrimaryColor }} />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                Live Mock Preview
              </h3>
            </div>

            <div
              style={{
                padding: "1.5rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {form.companyLogo ? (
                  <img
                    src={form.companyLogo}
                    alt="Branded Logo Preview"
                    style={{ height: "auto", maxHeight: "22px", width: "auto", objectFit: "contain" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "4px",
                      background: form.brandingPrimaryColor,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                    }}
                  >
                    LO
                  </div>
                )}
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {companyName || "Company Name"}
                </span>
              </div>
              <div
                style={{ height: "1px", background: "var(--border-color)" }}
              ></div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    background: form.brandingPrimaryColor,
                    color: "#fff",
                    fontSize: "0.75rem",
                    padding: "0.4rem",
                  }}
                >
                  Branded Button
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: `1px solid ${form.brandingSecondaryColor}`,
                    color: form.brandingSecondaryColor,
                    fontSize: "0.75rem",
                    padding: "0.4rem",
                  }}
                >
                  Branded Border
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: "1.1rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={12} style={{ color: form.brandingSecondaryColor }} />
              <span>Watch your brand identity update dynamically.</span>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Employee Creation Modal */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Create New Employee</h2>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g., employee_username"
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="Enter temporary password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role *</label>
                <select 
                  className="form-select" 
                  required
                  value={newEmployee.customRole}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, customRole: e.target.value }))}
                  disabled={availableRoles.length === 0}
                >
                  <option value="">
                    {availableRoles.length === 0 ? "No custom roles available" : "Select Custom Role"}
                  </option>
                  {availableRoles.map(roleOpt => (
                    <option key={roleOpt._id} value={roleOpt._id}>{roleOpt.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingEmployee}>
                  {creatingEmployee ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Upload Platform Access Modal */}
      {isUploadModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setIsUploadModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', padding: '2rem', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Access Uploading Platform
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Access Code</label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'var(--bg-secondary)', 
                  border: '1.5px dashed var(--accent-primary)', 
                  borderRadius: '12px', 
                  padding: '0.75rem 1.25rem',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
                    {form.uploadCode || 'ABC012'}
                  </span>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ 
                      padding: '0.4rem 0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      fontSize: '0.78rem', 
                      fontWeight: 600, 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)' 
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(form.uploadCode || 'ABC012');
                      showToast('Access code copied to clipboard', 'success');
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div style={{ 
                fontSize: '0.82rem', 
                color: 'var(--text-secondary)', 
                background: 'var(--accent-primary-glow)', 
                padding: '0.85rem 1.15rem', 
                borderRadius: '10px', 
                borderLeft: '4px solid var(--accent-primary)',
                lineHeight: '1.5'
              }}>
                <strong>Note:</strong> To access the site, copy the access code above.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 600 }} onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </button>
                <a 
                  href="https://uploads.worklanceai.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 600 }}
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  <span>Go to Site</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      , document.body)}



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
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
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
          color: #ffffff !important;
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
