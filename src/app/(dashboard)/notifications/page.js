'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CalendarDays, 
  Clock, 
  Video,
  Check
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function NotificationsPage() {
  const { showToast } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to load notifications');
      const data = await res.json();
      setNotifications(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        showToast('Notification marked as read', 'success');
      } else {
        throw new Error('Failed to update notification');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast('All notifications marked as read', 'success');
      } else {
        throw new Error('Failed to update notifications');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={28} style={{ color: 'var(--accent-primary)' }} />
            <span>All Notifications</span>
          </h1>
          <p className="page-subtitle">View and manage all system alerts, updates, and meeting reminders.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAllAsRead} 
            className="btn btn-secondary"
            style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Check size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'all' ? 'rgba(0, 174, 239, 0.1)' : 'transparent',
            border: 'none',
            color: filter === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: filter === 'all' ? 700 : 500,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          All ({notifications.length})
        </button>
        <button 
          onClick={() => setFilter('unread')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'unread' ? 'rgba(0, 174, 239, 0.1)' : 'transparent',
            border: 'none',
            color: filter === 'unread' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: filter === 'unread' ? 700 : 500,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Unread ({notifications.filter(n => !n.isRead).length})
        </button>
        <button 
          onClick={() => setFilter('read')}
          style={{
            padding: '0.5rem 1rem',
            background: filter === 'read' ? 'rgba(0, 174, 239, 0.1)' : 'transparent',
            border: 'none',
            color: filter === 'read' ? 'var(--text-secondary)' : 'var(--text-secondary)',
            fontWeight: filter === 'read' ? 700 : 500,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Read ({notifications.filter(n => n.isRead).length})
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
          <h3 style={{ marginTop: '1rem' }}>Loading notifications...</h3>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <AlertTriangle size={48} />
          <h3>Error loading notifications</h3>
          <p>{error}</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={48} style={{ color: '#10b981', opacity: 0.7 }} />
          <h3>No notifications</h3>
          <p>You are all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredNotifications.map((item) => (
            <div 
              key={item._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                gap: '1rem',
                transition: 'border-color 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: item.isRead ? 'transparent' : 'var(--accent-primary)',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    fontWeight: item.isRead ? 400 : 600,
                    lineHeight: 1.4
                  }}>
                    {item.message}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      {new Date(item.createdAt).toLocaleString('en-IN', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </span>
                    {item.reminderId && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-secondary)' }}>
                        <Video size={12} />
                        Calendar Event Reminder
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!item.isRead && (
                <button 
                  onClick={() => handleMarkAsRead(item._id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
