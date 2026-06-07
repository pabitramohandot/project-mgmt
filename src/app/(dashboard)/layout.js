'use client';

import { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Sidebar backdrop overlay on mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
