'use client';

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import FooterFeedback from "@/components/FooterFeedback";
import NotificationBell from "@/components/NotificationBell";
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(saved);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
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
        {children}
      </main>

      {user?.role && user.role !== 'superadmin' && <FooterFeedback />}
    </div>
  );
}
