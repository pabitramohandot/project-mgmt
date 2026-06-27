'use client';
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import QuickNotes from "./QuickNotes";
import { HelpCircle } from 'lucide-react';

export default function TopHeader({ user }) {
  if (!user) return null;

  return (
    <div className="desktop-top-header no-print" style={{
      display: 'none', // Will be overridden by media query for desktop
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 2.5rem',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      gap: '2rem'
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <GlobalSearch />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(2px)' }}>
          <QuickNotes />
        </div>
        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'} title="Help">
          <HelpCircle size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(2px)' }}>
          <NotificationBell userRole={user.role} />
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user.company?.logo && (
            <img 
              src={user.company.logo} 
              alt="Company Logo" 
              style={{ height: 'auto', maxHeight: '32px', width: 'auto', maxWidth: '120px', objectFit: 'contain', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}
            />
          )}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '2px' }}>
              {user.name || user.username}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              {user.company?.name && <span>{user.company.name}</span>}
              {user.company?.name && user.role && <span>•</span>}
              {user.role && <span style={{ textTransform: 'capitalize' }}>{user.role.replace(/_/g, ' ')}</span>}
            </div>
          </div>
          {user.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt="Profile" 
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
            />
          ) : (
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary-glow)', 
              color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1rem', border: '1px solid var(--accent-primary)'
            }}>
              {(user.name || user.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 1024px) {
          .desktop-top-header {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
