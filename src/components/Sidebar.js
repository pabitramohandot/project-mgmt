'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileSpreadsheet, LogOut, Users, AlertTriangle, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

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
    <aside className="sidebar no-print">
      <div className="logo">
        <LayoutDashboard size={28} />
        <span>IONETWEB Manager</span>
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
                <Link href={item.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
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
      
      {/* Logout Action */}
      <button 
        onClick={handleLogout}
        className="menu-item-logout"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
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
        <span>Logout</span>
      </button>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        v1.0.0 • Localhost Mode
      </div>

      <style jsx global>{`
        .menu-item-logout:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
        }
      `}</style>
    </aside>
  );
}
