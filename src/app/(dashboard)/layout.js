'use client';

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(saved);
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
          <span>IONETWEB</span>
        </div>
        <div style={{ width: 24 }}></div> {/* Balance placeholder */}
      </header>

      {/* Sidebar with visibility states */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Sidebar backdrop overlay on mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}
