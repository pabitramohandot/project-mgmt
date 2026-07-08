'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Tone 1 (A5 chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Tone 2 (E5 chime, starts slightly later and fades at 1s)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.1);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);
      osc2.start(now + 0.1);
      osc2.stop(now + 1.0);
    } catch (e) {
      console.error('AudioContext sound playback failed:', e);
    }
  };

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
            console.log('[Notification Debug] newUnread notifications detected:', newUnread);
            // Trigger browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
              newUnread.forEach(n => {
                new window.Notification("New Notification Alert", {
                  body: n.message,
                  icon: "https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png"
                });
              });
            }

            // Play the 1-second chime sound if enabled
            if (typeof window !== 'undefined' && localStorage.getItem('play_reminder_chime') !== 'false') {
              playNotificationSound();
            }

            // Auto-trigger professional modal pop-up on page for any new reminder
            const reminderAlert = newUnread.find(n => n.reminderId);
            console.log('[Notification Debug] reminderAlert found:', reminderAlert);
            if (reminderAlert) {
              console.log('[Notification Debug] Setting activeModalReminder to:', reminderAlert.reminderId);
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
    if (userRole) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // Listen to custom test trigger event from settings page
  useEffect(() => {
    const handleTestTrigger = () => {
      console.log('[Notification Debug] Test reminder triggered via custom event');
      const testReminder = {
        title: 'Test Meeting Notification',
        description: 'This is a sample description to demonstrate how the professional meeting reminder popup is shown on your screen.',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        meetingUrl: 'https://meet.google.com/test-meet-link'
      };
      setActiveModalReminder(testReminder);
      setActiveModalNotificationId('test-notification');
      
      // Play sound if enabled
      if (typeof window !== 'undefined' && localStorage.getItem('play_reminder_chime') !== 'false') {
        playNotificationSound();
      }
    };

    window.addEventListener('trigger-test-reminder', handleTestTrigger);
    return () => window.removeEventListener('trigger-test-reminder', handleTestTrigger);
  }, []);

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

  if (!userRole) return null;

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
              notifications.slice(0, 5).map((item, index) => (
                <div 
                  key={item._id}
                  onClick={(e) => {
                    const targetReminder = item.reminderId || {
                      title: item.message.startsWith('[Reminder]') 
                        ? item.message.replace('[Reminder] ', '').split(':')[0] 
                        : 'Notification Alert',
                      description: item.message,
                      date: item.createdAt,
                      time: item.message.includes('Starting at') 
                        ? item.message.split('Starting at')[1].split('(')[0].trim() 
                        : ''
                    };
                    setActiveModalReminder(targetReminder);
                    setActiveModalNotificationId(item._id);
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
          {notifications.length > 0 && (
            <div style={{
              padding: '10px',
              textAlign: 'center',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              <Link 
                href="/notifications" 
                onClick={() => setShowNotifications(false)}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-block'
                }}
              >
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Professional Reminder Modal Popup */}
      {activeModalReminder && typeof document !== 'undefined' && createPortal(
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
            background: '#f8fafc',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 30px 60px -15px rgba(15, 23, 42, 0.3)',
            position: 'relative',
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            {/* Floating Bell Icon on Top-Left */}
            <div style={{
              position: 'absolute',
              top: '-32px',
              left: '-24px',
              zIndex: 10
            }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', filter: 'drop-shadow(0 10px 15px rgba(234, 179, 8, 0.4))' }}>
                <span style={{ fontSize: '48px', display: 'block', transform: 'rotate(-10deg)' }} className="animate-bounce">🔔</span>
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '5px',
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #f8fafc'
                }}>1</span>
              </div>
            </div>

            {/* Red Circle Close Button on Top-Right */}
            <button 
              onClick={() => {
                setActiveModalReminder(null);
                setActiveModalNotificationId(null);
              }}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#ef4444',
                border: 'none',
                color: '#ffffff',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(239, 68, 68, 0.3)',
                zIndex: 11
              }}
            >
              <X size={14} strokeWidth={3} />
            </button>

            {/* Body Details */}
            <div style={{ padding: '2.5rem 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.75rem 0', textAlign: 'center' }}>
                App Notification
              </h3>
              
              <div style={{ textAlign: 'center', width: '100%' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                  {activeModalReminder.title}
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.45 }}>
                  {activeModalReminder.description || 'No description provided'}
                </p>

                {/* Date and Time block */}
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#475569',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: '1px solid #e2e8f0',
                  margin: '0 auto'
                }}>
                  {activeModalReminder.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} style={{ color: '#8b5cf6' }} />
                      <strong>Date:</strong>
                      <span>{new Date(activeModalReminder.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                    </div>
                  )}
                  {activeModalReminder.time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} style={{ color: '#8b5cf6' }} />
                      <strong>Time:</strong>
                      <span>{activeModalReminder.time}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Grid separated by Borders */}
            <div style={{
              display: 'flex',
              borderTop: '1px solid #e2e8f0',
              width: '100%',
              background: '#f8fafc',
              borderBottomLeftRadius: '28px',
              borderBottomRightRadius: '28px',
              overflow: 'hidden'
            }}>
              {activeModalReminder.meetingUrl ? (
                <a 
                  href={activeModalReminder.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '1rem',
                    color: '#16a34a',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                    borderRight: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f0fdf4'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <Video size={16} />
                  Accept
                </a>
              ) : (
                <button 
                  onClick={() => {
                    setActiveModalReminder(null);
                    setActiveModalNotificationId(null);
                  }}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '1rem',
                    color: '#16a34a',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    background: 'transparent',
                    border: 'none',
                    borderRight: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f0fdf4'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Accept
                </button>
              )}

              <button 
                onClick={async (e) => {
                  if (activeModalNotificationId) {
                    await handleMarkAsRead(activeModalNotificationId, e);
                  }
                  setActiveModalReminder(null);
                  setActiveModalNotificationId(null);
                }}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '1rem',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Decline
              </button>
            </div>
          </div>
        </div>,
        document.body
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
