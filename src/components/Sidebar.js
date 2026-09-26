'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileSpreadsheet, LogOut, Users, AlertTriangle, Megaphone, X, Key, Sun, Moon, ChevronLeft, ChevronRight, Building, Palette, ShieldCheck, User, MessageSquare, Bot, Brain, Shield, ClipboardList, TrendingUp, Bell, ChevronDown, ChevronUp, Calendar, CreditCard, FileText, Rocket, Target, Handshake, PhoneCall, Contact, PieChart, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, user, company }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [theme, setTheme] = useState('light');
  const [expandedSubmenus, setExpandedSubmenus] = useState({});

  const toggleSubmenu = (menuName) => {
    setExpandedSubmenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
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
    { name: 'AI Agent', path: '/ai-agents', icon: Brain, tag: 'Featured' },
    {
      name: 'CRM',
      icon: Target,
      isSubmenu: true,
      submenu: [
        { name: 'CRM Dashboard', path: '/crm/dashboard', icon: PieChart },
        { name: 'Leads Board', path: '/crm/leads', icon: Layers },
        { name: 'Deals Pipeline', path: '/crm/deals', icon: Handshake },
        { name: 'Activities', path: '/crm/activities', icon: PhoneCall },
        { name: 'Contacts', path: '/crm/contacts', icon: Contact },
      ]
    },
    {
      name: 'HR Management',
      icon: Users,
      isSubmenu: true,
      submenu: [
        { name: 'HR Dashboard', path: '/hr-dashboard', icon: LayoutDashboard },
        { name: 'Onboarding', path: '/onboarding', icon: Rocket },
        { name: 'Employees', path: '/employees', icon: Users },
        { name: 'Attendance', path: '/attendance', icon: ClipboardList },
        { name: 'Leave Management', path: '/leaves', icon: Calendar },
        { name: 'Payroll', path: '/payroll', icon: CreditCard },
        { name: 'Holidays', path: '/holidays', icon: Sun },
        { name: 'Performance', path: '/performance', icon: TrendingUp },
        { name: 'Documents', path: '/documents', icon: FileText },
      ]
    },
    { name: 'Projects', path: '/projects', icon: Briefcase },
    { name: 'All Tasks', path: '/tasks', icon: ClipboardList },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileSpreadsheet },
    { name: 'Credentials', path: '/credentials', icon: Key },
    { name: 'Pending Tasks', path: '/pending-tasks', icon: AlertTriangle, badge: pendingCount },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Reminders', path: '/reminders', icon: Bell },
  ];

  if (user?.role === 'superadmin') {
    menuItems.push(
      {
        name: 'Organization',
        icon: ShieldCheck,
        isSubmenu: true,
        submenu: [
          { name: 'Companies', path: '/superadmin/companies', icon: Building },
          { name: 'Roles', path: '/superadmin/roles', icon: Shield },
          { name: 'Users', path: '/superadmin/users', icon: ShieldCheck },
          { name: 'Registration', path: '/superadmin/register', icon: ClipboardList }
        ]
      },
      { name: 'Feedback', path: '/superadmin/feedback', icon: MessageSquare },
      { name: 'AI Settings', path: '/superadmin/ai-settings', icon: Key }
    );
  }



  menuItems.push(
    { name: 'Account Settings', path: '/settings/profile', icon: User }
  );

  // Auto-expand any submenu if an active child route is loaded
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.isSubmenu && item.submenu?.some(s => pathname.startsWith(s.path))) {
        setExpandedSubmenus(prev => ({ ...prev, [item.name]: true }));
      }
    });
  }, [pathname]);

  const filteredMenuItems = menuItems.map(item => {
    if (!item.isSubmenu) return item;
    const filteredSub = item.submenu.filter(subItem => {
      if (user?.role === 'superadmin') return true;
      if (user?.category === 'Employee') {
        if (subItem.path === '/employees') return false;
        if (subItem.path === '/hr-dashboard') return false;
        if (subItem.path === '/onboarding') return false;
      }
      return true;
    });
    return { ...item, submenu: filteredSub };
  }).filter(item => {
    if (user?.role === 'superadmin') return true;
    if (item.isSubmenu && item.submenu.length === 0) return false;

    // Hide Clients, Invoices, Branding, Account Settings, Announcements for Employee category
    if (user?.category === 'Employee') {
      if (
        item.path === '/clients' || 
        item.path === '/invoices' || 
        item.path === '/announcements' || 
        item.path === '/settings/profile'
      ) {
        return false;
      }
    }

    const p = user?.permissions || {};
    if (item.name === 'CRM' || item.path?.startsWith('/crm')) return p.crm && p.crm !== 'none';
    if (item.path === '/ai-agents') return p.ai_agent && p.ai_agent !== 'none';
    if (item.path === '/clients') return p.clients && p.clients !== 'none';
    if (item.path === '/invoices') return p.invoices && p.invoices !== 'none';
    if (item.path === '/credentials') return p.credentials && p.credentials !== 'none';
    if (item.path === '/tasks') return p.project_tasks && p.project_tasks !== 'none';
    if (item.path === '/performance') return true; // Accessible to all employees/managers
    if (item.path === '/pending-tasks') return p.pending_tasks && p.pending_tasks !== 'none';
    if (item.path === '/announcements') return p.announcements && p.announcements !== 'none';
    if (item.path === '/reminders') return p.reminders && p.reminders !== 'none';
    if (item.path === '/settings/branding') return p.branding && p.branding !== 'none';
    return true;
  });

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        sessionStorage.removeItem('session_active');
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
        <img src="https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png" alt="Worklance Logo" style={{ height: '32px', objectFit: 'contain' }} />
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <ul className="menu-list">
          {!user ? (
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="menu-item" style={{ padding: isCollapsed ? '0.7rem 0' : '0.85rem 1rem', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '0.75rem', width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                  <div className="skeleton skeleton-avatar" style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0 }}></div>
                  {!isCollapsed && <div className="skeleton skeleton-text" style={{ width: `${(i % 3) * 15 + 45}%`, margin: 0, height: '14px' }}></div>}
                </div>
              </li>
            ))
          ) : (
            filteredMenuItems.map((item) => {
              // Handle Submenu Rendering
              if (item.isSubmenu) {
                if (isCollapsed) {
                  // If collapsed, render sub-items flat
                  return item.submenu.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname.startsWith(subItem.path);
                    return (
                      <li key={subItem.name} className={`menu-item ${isSubActive ? 'active' : ''}`}>
                        <Link 
                          href={subItem.path} 
                          onClick={onClose} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            width: '100%',
                            padding: '0.7rem 0'
                          }}
                          title={subItem.name}
                        >
                          <SubIcon size={20} />
                        </Link>
                      </li>
                    );
                  });
                }

                const MainIcon = item.icon;
                const isExpanded = !!expandedSubmenus[item.name];
                const isAnySubActive = item.submenu.some(subItem => pathname.startsWith(subItem.path));
                return (
                  <li key={item.name} className="menu-item-group" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.2rem' }}>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        background: isAnySubActive ? 'rgba(0, 174, 239, 0.08)' : isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.65rem 0.85rem',
                        color: isAnySubActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: isAnySubActive ? 600 : 500,
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isAnySubActive) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isAnySubActive) {
                          e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MainIcon size={19} style={{ color: isAnySubActive ? 'var(--accent-primary)' : 'inherit' }} />
                        <span style={{ whiteSpace: 'nowrap', fontWeight: isAnySubActive ? 600 : 500 }}>{item.name}</span>
                      </div>
                      <div style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isAnySubActive ? 'var(--accent-primary)' : 'var(--text-muted)'
                      }}>
                        <ChevronDown size={15} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <ul style={{ 
                        listStyle: 'none', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.15rem', 
                        paddingLeft: '0.5rem', 
                        borderLeft: '2px solid rgba(0, 174, 239, 0.18)', 
                        marginLeft: '1.1rem', 
                        marginTop: '0.2rem',
                        marginBottom: '0.3rem'
                      }}>
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = pathname.startsWith(subItem.path);
                          return (
                            <li key={subItem.name} className={`menu-item ${isSubActive ? 'active' : ''}`} style={{ listStyle: 'none' }}>
                              <Link 
                                href={subItem.path} 
                                onClick={onClose}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '0.45rem 0.6rem',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSubActive ? 600 : 400,
                                  color: isSubActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                  background: isSubActive ? 'rgba(0, 174, 239, 0.12)' : 'transparent',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.18s ease',
                                  textDecoration: 'none'
                                }}
                              >
                                <SubIcon size={15} style={{ color: isSubActive ? 'var(--accent-primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
                                <span style={{ whiteSpace: 'nowrap' }}>{subItem.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              // Standard Item rendering
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
                      {item.path === '/ai-agents' ? (
                        <Brain 
                          size={20} 
                          style={{ 
                            color: '#ef4444', 
                            filter: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.45))'
                          }} 
                        />
                      ) : (
                        <Icon size={20} />
                      )}
                      {isCollapsed && item.badge > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: '1.5px solid var(--bg-secondary)'
                        }} />
                      )}
                      {isCollapsed && item.tag && (
                        <span className="shimmer-tag" style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          border: '1.5px solid var(--bg-secondary)',
                          boxShadow: '0 0 6px var(--accent-primary)'
                        }} />
                      )}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{item.name}</span>
                          {item.tag && (
                            <span 
                              className="shimmer-tag"
                              style={{
                              color: '#ffffff',
                              fontSize: '0.58rem',
                              fontWeight: '800',
                              padding: '0.15rem 0.35rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                              lineHeight: 1,
                              boxShadow: '0 0 8px rgba(0, 174, 239, 0.4)'
                            }}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!isCollapsed && item.badge > 0 && (
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        lineHeight: 1
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })

          )}
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
          v2.1.0 • You are using BETA version
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
