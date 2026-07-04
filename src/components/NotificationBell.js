'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Video, Calendar, Clock, AlertCircle, X } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function NotificationBell({ userRole }) {
  const { showToast } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeModalReminder, setActiveModalReminder] = useState(null);
  const [activeModalNotificationId, setActiveModalNotificationId] = useState(null);
  const dropdownRef = useRef(null);
  const isFirstLoad = useRef(true);
  const previousNotifications = useRef([]);

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        
        // Check for new notifications to trigger browser push notifications
        if (!isFirstLoad.current && data.length > 0) {
          const prevIds = new Set(previousNotifications.current.map(n => n._id));
          const newUnread = data.filter(n => !n.isRead && !prevIds.has(n._id));

          if (newUnread.length > 0) {
            // Trigger browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
              newUnread.forEach(n => {
                new window.Notification("New Notification Alert", {
                  body: n.message,
                  icon: "https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png"
                });
              });
            }

            // Auto-trigger professional modal pop-up on page for any new reminder
            const reminderAlert = newUnread.find(n => n.reminderId);
            if (reminderAlert) {
              setActiveModalReminder(reminderAlert.reminderId);
              setActiveModalNotificationId(reminderAlert._id);
            }
          }
        }

        isFirstLoad.current = false;
        previousNotifications.current = data;
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
                  onClick={(e) => {
                    if (item.reminderId) {
                      setActiveModalReminder(item.reminderId);
                      setActiveModalNotificationId(item._id);
                    }
                    if (!item.isRead) {
                      handleMarkAsRead(item._id, e);
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    background: item.isRead ? 'transparent' : 'rgba(var(--accent-primary-rgb, 139, 92, 246), 0.02)',
                    cursor: 'pointer',
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

      {/* Professional Reminder Modal Popup */}
      {activeModalReminder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Badge */}
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} className="animate-bounce" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Meeting & Task Reminder</span>
              </div>
              <button 
                onClick={() => {
                  setActiveModalReminder(null);
                  setActiveModalNotificationId(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Details */}
            <div style={{ padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                  {activeModalReminder.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {activeModalReminder.message}
                </p>
              </div>

              {/* Time Configuration Metadata */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                {activeModalReminder.triggerDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} style={{ color: 'var(--accent-primary)' }} />
                    <strong>Scheduled Date:</strong>
                    <span>{new Date(activeModalReminder.triggerDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
                  </div>
                )}
                
                {activeModalReminder.triggerTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} style={{ color: 'var(--accent-primary)' }} />
                    <strong>Trigger Time:</strong>
                    <span>{activeModalReminder.triggerTime}</span>
                  </div>
                )}

                {activeModalReminder.recurrence && activeModalReminder.recurrence !== 'none' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} style={{ color: '#22c55e' }} />
                    <strong>Recurrence:</strong>
                    <span style={{ textTransform: 'capitalize' }}>{activeModalReminder.recurrence}</span>
                  </div>
                )}
              </div>

              {/* Meeting Link Call-To-Action */}
              {activeModalReminder.meetingUrl && (
                <a 
                  href={activeModalReminder.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <Video size={18} />
                  <span>Join Live Meeting Now</span>
                </a>
              )}
            </div>

            {/* Actions Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              <button 
                onClick={() => {
                  setActiveModalReminder(null);
                  setActiveModalNotificationId(null);
                }}
                className="btn btn-secondary"
                style={{ borderRadius: '10px', fontSize: '0.85rem' }}
              >
                Dismiss
              </button>
              {activeModalNotificationId && (
                <button 
                  onClick={async (e) => {
                    await handleMarkAsRead(activeModalNotificationId, e);
                    setActiveModalReminder(null);
                    setActiveModalNotificationId(null);
                  }}
                  className="btn btn-primary"
                  style={{ borderRadius: '10px', fontSize: '0.85rem', background: 'var(--accent-primary)' }}
                >
                  Mark as Read
                </button>
              )}
            </div>
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
