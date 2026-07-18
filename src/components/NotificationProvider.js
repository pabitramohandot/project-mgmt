'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export default function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'info' or 'danger'
    onConfirm: null,
    onCancel: null,
  });

  // Register service worker for PWA support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('PWA Service Worker registration failed:', err);
        });
    }
  }, []);

  // Toast functions
  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirm functions
  const showConfirm = useCallback(({ title, message, type = 'info', onConfirm, onCancel }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closeConfirm();
      },
      onCancel: () => {
        if (onCancel) onCancel();
        closeConfirm();
      },
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast Overlay */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-card toast-${toast.type}`}>
              <div className="toast-icon">
                {getToastIcon(toast.type)}
              </div>
              <div className="toast-content">{toast.message}</div>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>
                <X size={14} />
              </button>
              <div className="toast-progress" />
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="confirm-overlay" onClick={confirmState.onCancel}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <div className={`confirm-title-icon ${confirmState.type === 'danger' ? 'confirm-danger' : ''}`}>
                {confirmState.type === 'danger' ? <AlertTriangle size={20} /> : <Info size={20} />}
              </div>
              <h3 className="confirm-title">{confirmState.title}</h3>
            </div>
            <div className="confirm-message">{confirmState.message}</div>
            <div className="confirm-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} 
                onClick={confirmState.onCancel}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={confirmState.type === 'danger' ? 'btn btn-danger' : 'btn btn-primary'} 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} 
                onClick={confirmState.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
