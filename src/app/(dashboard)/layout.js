'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import FooterFeedback from "@/components/FooterFeedback";
import NotificationBell from "@/components/NotificationBell";
import { Menu, ShieldAlert } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [isSuspended, setIsSuspended] = useState(false);

  // Route-guard check based on user permissions
  const hasPageAccess = () => {
    if (!user) return true; // Let user data load first
    if (user.role === 'superadmin') return true;

    // Block Employee category from direct URLs
    if (user.category === 'Employee') {
      if (
        pathname.startsWith('/clients') ||
        pathname.startsWith('/invoices') ||
        pathname.startsWith('/settings/branding') ||
        pathname.startsWith('/settings/profile')
      ) {
        return false;
      }
    }

    const p = user.permissions || {};
    if (pathname.startsWith('/superadmin') && user.role !== 'superadmin') return false;
    if (pathname.startsWith('/ai-agents') && p.ai_agent === 'none') return false;
    if (pathname.startsWith('/clients') && p.clients === 'none') return false;
    if (pathname.startsWith('/invoices') && p.invoices === 'none') return false;
    if (pathname.startsWith('/credentials') && p.credentials === 'none') return false;
    if (pathname.startsWith('/tasks') && p.pending_tasks === 'none') return false;
    if (pathname.startsWith('/announcements') && p.announcements === 'none') return false;
    if (pathname.startsWith('/settings/branding') && p.branding === 'none') return false;
    return true;
  };

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(saved);
  }, []);

  useEffect(() => {
    async function loadUser() {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('session_active')) {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
          console.error('Session clearance error:', e);
        }
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 403) {
          const data = await res.json();
          if (data.suspended) {
            setIsSuspended(true);
            return;
          }
        }
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          if (data.company?.name) {
            localStorage.setItem('company_name', data.company.name);
          }
          if (data.company?.brandColors) {
            document.documentElement.style.setProperty('--accent-primary', data.company.brandColors.primary || '#00aeef');
            document.documentElement.style.setProperty('--accent-secondary', data.company.brandColors.secondary || '#f26522');
          }
        }
      } catch (e) {
        console.error('Failed to load user info:', e);
      }
    }
    loadUser();
  }, []);

  // Periodic polling check to detect real-time suspension
  useEffect(() => {
    if (!user || user.role === 'superadmin' || isSuspended) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 403) {
          const data = await res.json();
          if (data.suspended) {
            setIsSuspended(true);
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Failed to run periodic session validation:', e);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [user, isSuspended]);

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem('sidebar_collapsed', String(newValue));
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header no-print">
        <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Toggle menu">
          <Menu size={24} />
        </button>
        <div className="mobile-logo">
          <span>{user?.company?.name || 'Workspace'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}>
          <NotificationBell userRole={user?.role} />
        </div>
      </header>

      {/* Sidebar with visibility states */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        user={user}
        company={user?.company}
      />

      {/* Sidebar backdrop overlay on mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
        {hasPageAccess() ? (
          children
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            color: 'var(--text-secondary)',
            gap: '1.25rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <ShieldAlert size={48} style={{ color: 'var(--status-overdue)', opacity: 0.8 }} />
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Access Denied</h2>
              <p style={{ fontSize: '0.875rem' }}>You do not have the required permissions to access this page.</p>
            </div>
          </div>
        )}
      </main>

      {user?.role && user.role !== 'superadmin' && <FooterFeedback />}

      {/* Glassmorphic Non-dismissible Warning Modal overlay */}
      {isSuspended && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: 'rgba(3, 7, 11, 0.75)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            padding: '2.5rem',
            background: 'rgba(12, 21, 32, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.1)',
            borderRadius: '24px',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              marginBottom: '1.5rem',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.75rem 0', color: '#ffffff' }}>
              Workspace Suspended
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
              Your company account has been suspended by the platform administrator. Access to projects, invoices, and operations is locked. Please contact support or your company administrator for details.
            </p>
            <button
              onClick={() => window.location.href = '/login?suspended=true'}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '12px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Return to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
