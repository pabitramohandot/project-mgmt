'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function NotificationBell({ userRole }) {
  const { showToast } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    if (userRole && userRole !== 'superadmin') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (!userRole || userRole === 'superadmin') return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef} className="no-print">
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="btn-notification"
        aria-label="Toggle notifications"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          position: 'relative',
          transition: 'all 0.2s ease',
          padding: 0
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.6rem',
            fontWeight: 700,
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-secondary)',
            lineHeight: 1
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="notifications-dropdown animate-fade-in" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '300px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            <strong style={{ fontSize: '0.8rem' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item._id}
                  onClick={(e) => !item.isRead && handleMarkAsRead(item._id, e)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    background: item.isRead ? 'transparent' : 'rgba(var(--accent-primary-rgb, 139, 92, 246), 0.02)',
                    cursor: item.isRead ? 'default' : 'pointer',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    transition: 'all 0.2s'
                  }}
                  className="notification-item-row"
                >
                  {!item.isRead && (
                    <span style={{
                      width: '6px',
                      height: '6px',
                      background: 'var(--accent-primary)',
                      borderRadius: '50%',
                      marginTop: '5px',
                      flexShrink: 0
                    }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '0.78rem',
                      margin: 0,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                      fontWeight: item.isRead ? 400 : 500
                    }}>{item.message}</p>
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                      display: 'block'
                    }}>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 480px) {
          :global(.notifications-dropdown) {
            right: -10px !important;
            width: calc(100vw - 32px) !important;
            max-width: 300px !important;
          }
        }
      `}</style>
    </div>
  );
}
