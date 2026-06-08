'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileSpreadsheet, LogOut, Users, AlertTriangle, Megaphone, X, Key, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(activeTheme);
  }, []);

  const toggleTheme = (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.pendingTasks) {
            setPendingCount(data.pendingTasks.length);
          }
        }
      } catch (e) {
        console.error('Failed to fetch pending count for sidebar:', e);
      }
    }
    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: Briefcase },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileSpreadsheet },
    { name: 'Credentials', path: '/credentials', icon: Key },
    { name: 'Pending Tasks', path: '/tasks', icon: AlertTriangle, badge: pendingCount },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <aside className={`sidebar no-print ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Mobile Close Button */}
      <button className="mobile-sidebar-close" onClick={onClose} aria-label="Close menu">
        <X size={20} />
      </button>

      {/* Sidebar Toggle Button (Desktop/Tablet) */}
      <button onClick={onToggleCollapse} className="sidebar-toggle-btn" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="logo" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <LayoutDashboard size={28} />
        {!isCollapsed && <span>IONETWEB</span>}
      </div>
      <nav style={{ flex: 1 }}>
        <ul className="menu-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.path);

            return (
              <li key={item.name} className={`menu-item ${isActive ? 'active' : ''}`}>
                <Link 
                  href={item.path} 
                  onClick={onClose} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: isCollapsed ? 'center' : 'space-between', 
                    alignItems: 'center', 
                    width: '100%',
                    padding: isCollapsed ? '0.7rem 0' : undefined
                  }}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '0.75rem', position: 'relative' }}>
                    <Icon size={20} />
                    {isCollapsed && item.badge > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#fbbf24',
                        border: '1.5px solid var(--bg-secondary)'
                      }} />
                    )}
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && item.badge > 0 && (
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      lineHeight: 1
                    }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Theme Toggle */}
      <div style={{
        display: 'flex',
        flexDirection: isCollapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.4rem',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        marginBottom: '1rem',
        gap: '0.4rem',
        width: '100%'
      }}>
        <button
          onClick={() => toggleTheme('light')}
          title={isCollapsed ? "Day Mode" : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCollapsed ? '0' : '6px',
            padding: '0.45rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: theme === 'light' ? 'var(--accent-primary)' : 'transparent',
            color: theme === 'light' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          <Sun size={14} />
          {!isCollapsed && <span>Day</span>}
        </button>
        <button
          onClick={() => toggleTheme('dark')}
          title={isCollapsed ? "Night Mode" : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCollapsed ? '0' : '6px',
            padding: '0.45rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: theme === 'dark' ? 'var(--accent-primary)' : 'transparent',
            color: theme === 'dark' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          <Moon size={14} />
          {!isCollapsed && <span>Night</span>}
        </button>
      </div>

      {/* Logout Action */}
      <button 
        onClick={handleLogout}
        className="menu-item-logout"
        title={isCollapsed ? "Logout" : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? '0' : '0.75rem',
          padding: isCollapsed ? '0.85rem 0' : '0.85rem 1rem',
          borderRadius: '12px',
          background: 'transparent',
          border: 'none',
          color: '#f87171',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          fontSize: '0.95rem',
          fontWeight: 500,
          marginBottom: '1rem',
          transition: 'all 0.2s ease'
        }}
      >
        <LogOut size={20} />
        {!isCollapsed && <span>Logout</span>}
      </button>

      {!isCollapsed && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          v1.0.0 • Localhost Mode
        </div>
      )}

      <style jsx global>{`
        .menu-item-logout:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
        }
      `}</style>
    </aside>
  );
}
