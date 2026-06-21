'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Bot, Plus, Trash2, History, Menu, Brain, Edit2, Check, X, RotateCw, Square } from 'lucide-react';

export default function AIChatBot() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toolStatus, setToolStatus] = useState(null); // Transient tool-call status
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  
  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const suggestions = [
    { label: '📊 Active Projects List', text: 'List all active projects in the workspace', autoSend: true },
    { label: '✉️ Unpaid Invoices List', text: 'Show all unpaid or outstanding invoices', autoSend: true },
    { label: '🔑 Domain/Hosting Expiries', text: 'Which domains or hostings are expiring soon?', autoSend: true },
    { label: '📝 Project Status Template', text: 'Generate 30-day status report of project ', autoSend: false }
  ];


  // 0. Fetch company context + configured providers on mount
  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && data.companyId) {
            setCompanyId(data.companyId);
          } else {
            setCompanyId('global');
          }
        } else {
          setCompanyId('global');
        }
      } catch (err) {
        console.error('Failed to load user info for AI Chat:', err);
        setCompanyId('global');
      }
    }

    loadCompany();

    // Auto-collapse sidebar on smaller screens
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        setSidebarOpen(false);
      }, 0);
    }
  }, []);

  // 1. Initial Load: Retrieve sessions from database
  useEffect(() => {
    if (!companyId) return;

    async function fetchSessions() {
      try {
        const res = await fetch('/api/chat/sessions');
        if (res.ok) {
          let data = await res.json();
          if (data.length === 0) {
            // Create a default initial session in the database
            const createRes = await fetch('/api/chat/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'New Chat Session' })
            });
            if (createRes.ok) {
              const defaultSession = await createRes.json();
              data = [defaultSession];
            }
          }
          setSessions(data);
          const sorted = [...data].sort((a, b) => new Date(b.updatedAt || b.timestamp) - new Date(a.updatedAt || a.timestamp));
          setCurrentSessionId(sorted[0].id || sorted[0]._id);
          setMessages(sorted[0].messages);
        }
      } catch (err) {
        console.error('Failed to fetch chat sessions:', err);
      } finally {
        setSessionLoaded(true);
      }
    }

    fetchSessions();
  }, [companyId]);

  // 2. Polling Hook for interrupted/background generations
  useEffect(() => {
    if (!companyId || !currentSessionId || messages.length === 0 || loading) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/chat/sessions');
          if (res.ok) {
            const latestSessions = await res.json();
            setSessions(latestSessions);
            const current = latestSessions.find(s => s.id === currentSessionId || s._id === currentSessionId);
            if (current && current.messages.length > messages.length) {
              setMessages(current.messages);
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [messages, currentSessionId, companyId, loading]);

  // 2.5. Tab Focus & Visibility Event Listeners to refresh chat history
  useEffect(() => {
    if (!companyId || !currentSessionId) return;

    const refreshChat = async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        if (res.ok) {
          const latestSessions = await res.json();
          setSessions(latestSessions);
          const current = latestSessions.find(s => s.id === currentSessionId || s._id === currentSessionId);
          if (current) {
            setMessages(current.messages);
          }
        }
      } catch (err) {
        console.error("Failed to refresh chat on visibility/focus change:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshChat();
      }
    };

    window.addEventListener('focus', refreshChat);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshChat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSessionId, companyId]);

  // 3. Scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // 4. Create New Chat Session
  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat Session' })
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id || newSession._id);
        setMessages(newSession.messages);
        setError(null);
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to create new chat session:', err);
    }
  };

  // 5. Select Chat Session
  const handleSelectSession = (id) => {
    const session = sessions.find(s => s.id === id || s._id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setError(null);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  // 6. Delete Chat Session
  const handleDeleteSession = async (e, id) => {
    e.stopPropagation(); // Prevent selecting the session

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const filtered = sessions.filter(s => s.id !== id && s._id !== id);
        setSessions(filtered);

        if (currentSessionId === id) {
          if (filtered.length > 0) {
            const nextSession = filtered[0];
            setCurrentSessionId(nextSession.id || nextSession._id);
            setMessages(nextSession.messages);
          } else {
            // If all sessions deleted, create a fresh one in DB
            const createRes = await fetch('/api/chat/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: 'New Chat Session' })
            });
            if (createRes.ok) {
              const defaultSession = await createRes.json();
              setSessions([defaultSession]);
              setCurrentSessionId(defaultSession.id || defaultSession._id);
              setMessages(defaultSession.messages);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // 6.5. Rename Chat Session
  const handleStartEdit = (e, id, currentTitle) => {
    e.stopPropagation(); // Prevent selecting the session
    setEditingSessionId(id);
    setEditingTitleText(currentTitle);
  };

  const handleSaveTitle = async (id) => {
    if (!editingTitleText.trim()) return;

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitleText.trim() })
      });
      if (res.ok) {
        const updatedSession = await res.json();
        setSessions(prev => prev.map(s => (s.id === id || s._id === id) ? updatedSession : s));
        setEditingSessionId(null);
      }
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  // 6.75. Stop Generating Answer
  const handleAbort = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setToolStatus(null);

    const stoppedMessage = { role: 'assistant', text: '_Generation stopped by user._' };
    const updated = messages.concat(stoppedMessage);
    setMessages(updated);

    try {
      await fetch(`/api/chat/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated })
      });
    } catch (e) {
      console.error("Failed to save abort state to DB:", e);
    }

    return updated;
  };

  // 7. Send Message (SSE Streaming)
  const handleSendMessage = async (textToSend, overrideMessages) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }
    setError(null);

    const userMessage = { role: 'user', text };
    const baseMessages = [...(overrideMessages || messages), userMessage];
    setMessages(baseMessages);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, message: text }),
        signal: controller.signal,
      });

      // Non-streaming error (400, 401, etc.)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      // SSE streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);

              if (data.text) {
                setToolStatus(null);
                fullText += data.text;
                setMessages([...baseMessages, { role: 'assistant', text: fullText }]);
              } else if (data.error) {
                throw new Error(data.error);
              } else if (data.name) {
                const toolLabels = {
                  listProjects: 'Retrieving projects...',
                  listInvoices: 'Retrieving invoices...',
                  listExpiringItems: 'Checking expiry records...',
                  getProjectStatus: 'Fetching project status...',
                  sendInvoiceToClient: 'Preparing invoice email...',
                  createNewClient: 'Registering client profile...',
                  createNewProject: 'Creating new project...',
                  addProjectTask: 'Adding task to project...',
                  completeProjectTask: 'Marking task as complete...',
                  updateProjectStatus: 'Updating project status...',
                  createNewInvoice: 'Generating invoice draft...',
                  updateInvoiceStatus: 'Updating invoice status...',
                  broadcastAnnouncement: 'Broadcasting announcement...',
                  submitUserFeedback: 'Submitting feedback...',
                  listAllFeedbacks: 'Retrieving feedback records...',
                  listAllClients: 'Retrieving client directory...',
                };
                setToolStatus(toolLabels[data.name] || 'Processing your request...');
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      }

      setToolStatus(null);
      if (!fullText.trim()) {
        setMessages([...baseMessages, { role: 'assistant', text: 'No response was generated. Please try again.' }]);
      }

      // Fetch latest sessions to update dynamic title & final history state from database
      const fetchRes = await fetch('/api/chat/sessions');
      if (fetchRes.ok) {
        const latestSessions = await fetchRes.json();
        setSessions(latestSessions);
        const current = latestSessions.find(s => s.id === currentSessionId || s._id === currentSessionId);
        if (current) {
          setMessages(current.messages);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted by user');
        return;
      }
      setError(err.message);
      setToolStatus(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleResendMessage = async (index) => {
    if (loading) return;

    const userMsg = messages[index];
    if (!userMsg || userMsg.role !== 'user') return;

    setError(null);
    setLoading(true);

    // Truncate messages: keep everything before this user message
    const truncated = messages.slice(0, index);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Overwrite database messages with the truncated list
      await fetch(`/api/chat/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: truncated })
      });

      const baseMessages = truncated.concat({ role: 'user', text: userMsg.text });
      setMessages(baseMessages);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, message: userMsg.text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);

              if (data.text) {
                setToolStatus(null);
                fullText += data.text;
                setMessages([...baseMessages, { role: 'assistant', text: fullText }]);
              } else if (data.error) {
                throw new Error(data.error);
              } else if (data.name) {
                const toolLabels = {
                  listProjects: 'Retrieving projects...',
                  listInvoices: 'Retrieving invoices...',
                  listExpiringItems: 'Checking expiry records...',
                  getProjectStatus: 'Fetching project status...',
                  sendInvoiceToClient: 'Preparing invoice email...',
                  createNewClient: 'Registering client profile...',
                  createNewProject: 'Creating new project...',
                  addProjectTask: 'Adding task to project...',
                  completeProjectTask: 'Marking task as complete...',
                  updateProjectStatus: 'Updating project status...',
                  createNewInvoice: 'Generating invoice draft...',
                  updateInvoiceStatus: 'Updating invoice status...',
                  broadcastAnnouncement: 'Broadcasting announcement...',
                  submitUserFeedback: 'Submitting feedback...',
                  listAllFeedbacks: 'Retrieving feedback records...',
                  listAllClients: 'Retrieving client directory...',
                };
                setToolStatus(toolLabels[data.name] || 'Processing your request...');
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      }

      setToolStatus(null);
      if (!fullText.trim()) {
        setMessages([...baseMessages, { role: 'assistant', text: 'No response was generated. Please try again.' }]);
      }

      // Fetch latest sessions to update dynamic title & final history state from database
      const fetchRes = await fetch('/api/chat/sessions');
      if (fetchRes.ok) {
        const latestSessions = await fetchRes.json();
        setSessions(latestSessions);
        const current = latestSessions.find(s => s.id === currentSessionId || s._id === currentSessionId);
        if (current) {
          setMessages(current.messages);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Resend request aborted by user');
        return;
      }
      setError(err.message);
      setToolStatus(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStartEditMessage = (index, text) => {
    setEditingMessageIndex(index);
    setEditingMessageText(text);
  };

  const handleSaveMessageEdit = async (index) => {
    if (!editingMessageText.trim()) return;

    try {
      const updatedMessages = [...messages];
      updatedMessages[index] = { ...updatedMessages[index], text: editingMessageText.trim() };
      
      setMessages(updatedMessages);
      setEditingMessageIndex(null);

      // Save updated messages list to database session
      await fetch(`/api/chat/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      // Resend
      await handleResendMessage(index);
    } catch (e) {
      console.error("Failed to save message edit:", e);
    }
  };

  // Markdown & Table parser
  const formatMarkdown = (text) => {
    if (!text) return '';
    
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings with theme variables
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin: 0.75rem 0 0.35rem 0; font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin: 1rem 0 0.5rem 0; font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin: 1.25rem 0 0.75rem 0; font-weight: 700; font-size: 1.15rem; color: var(--text-primary);">$1</h2>');

    // Accentuated bold text and inline code blocks
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-primary); font-weight: 600;">$1</strong>');
    html = html.replace(/`(.*?)`/g, '<code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85em; border: 1px solid var(--border-color); color: var(--accent-primary); font-weight: 500;">$1</code>');
    
    // List elements
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 1rem; list-style-type: disc; margin-bottom: 0.35rem; color: var(--text-primary);">$1</li>');
    html = html.replace(/(<li.*?>.*?<\/li>)+/g, '<ul style="margin: 0.5rem 0; padding-left: 0.5rem;">$&</ul>');

    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '<div style="overflow-x: auto; margin: 0.75rem 0;"><table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
        }
        
        if (line.includes('---') || line.includes('-|-')) {
          continue;
        }

        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        const cellTag = i === 0 || lines[0].includes('---') ? 'th' : 'td';
        const cellStyle = cellTag === 'th' 
          ? 'padding: 10px 12px; border-bottom: 2px solid var(--border-color); background: var(--table-header-bg); font-weight: 600; color: var(--text-primary);' 
          : 'padding: 10px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-secondary);';

        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<${cellTag} style="${cellStyle}">${cell}</${cellTag}>`;
        });
        tableHtml += '</tr>';
        
        lines[i] = '';
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</table></div>';
          lines[i] = tableHtml + '\n' + lines[i];
          tableHtml = '';
        }
      }
    }
    
    if (inTable) {
      tableHtml += '</table></div>';
      lines.push(tableHtml);
    }

    html = lines.filter(l => l !== '').join('<br/>');
    return html;
  };

  if (!sessionLoaded) {
    return (
      <div 
        className="ai-chat-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          gap: '1rem',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          minHeight: '400px'
        }}
      >
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Brain size={48} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))' }} />
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Loading your secure workspace assistant...
        </span>
      </div>
    );
  }

  return (
    <div 
      className="ai-chat-container"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '20px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)',
        // boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 0
      }}
    >
      {/* 1. History Sidebar */}
      <div 
        className={`ai-history-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: sidebarOpen ? '260px' : '0px',
          minWidth: sidebarOpen ? '260px' : '0px',
          borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none',
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* Sidebar Header: New Chat */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleNewChat}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-primary-glow)';
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.2)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent Chats
          </div>
          {sessions.map((s) => {
            const isSelected = s.id === currentSessionId;
            const isEditing = s.id === editingSessionId;

            if (isEditing) {
              return (
                <div
                  key={s.id}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--accent-primary)',
                    marginBottom: '0.25rem',
                  }}
                >
                  <input
                    type="text"
                    value={editingTitleText}
                    onChange={(e) => setEditingTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(s.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.825rem',
                      outline: 'none',
                      padding: '2px 4px',
                      minWidth: 0,
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleSaveTitle(s.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                      }}
                      title="Save Title"
                    >
                      <Check size={14} style={{ color: '#10b981' }} />
                    </button>
                    <button
                      onClick={(e) => handleCancelEdit(e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                      }}
                      title="Cancel"
                    >
                      <X size={14} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.75rem',
                  borderRadius: isSelected ? '0 8px 8px 0' : '8px',
                  background: isSelected ? 'var(--accent-primary-glow)' : 'transparent',
                  border: isSelected ? '1px solid var(--border-color)' : '1px solid transparent',
                  borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  paddingLeft: isSelected ? 'calc(0.75rem - 3px)' : '0.75rem',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                  marginBottom: '0.25rem',
                  transition: 'all 0.2s',
                }}
                className="session-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1 }}>
                  <History size={14} style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    fontWeight: isSelected ? 600 : 400
                  }}>
                    {s.title}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={(e) => handleStartEdit(e, s.id, s.title)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    className="edit-session-btn"
                    title="Rename Session"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    className="delete-session-btn"
                    title="Delete Session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Chat Pane */}
      <div 
        className="ai-chat-pane"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'transparent',
          minHeight: 0
        }}
      >
        {/* Chat Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Toggle Chat History"
            >
              <Menu size={16} />
            </button>
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <Brain size={20} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.45))' }} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Workspace Assistant</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={10} style={{ color: '#10b981' }} />by Pabitra Mohan
              </span>
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          minHeight: 0
        }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={index}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  flexDirection: isUser ? 'row' : 'row-reverse'
                }} className="user-message-group">
                  <span style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    opacity: 0.65,
                    alignSelf: 'center',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}>
                    {msg.createdAt 
                      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  
                  {editingMessageIndex === index ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '0.85rem 1.25rem',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--accent-primary)',
                      minWidth: '250px'
                    }}>
                      <textarea
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.875rem',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: '60px',
                          width: '100%'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingMessageIndex(null)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: '4px 8px'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveMessageEdit(index)}
                          style={{
                            background: 'var(--accent-primary)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            fontWeight: 600
                          }}
                        >
                          Save & Resend
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      style={{
                        padding: '0.85rem 1.25rem',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: isUser ? 'linear-gradient(135deg, var(--accent-primary) 0%, #1d4ed8 100%)' : 'var(--bg-secondary)',
                        border: isUser ? 'none' : '1px solid var(--border-color)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        boxShadow: isUser ? '0 4px 12px rgba(0, 174, 239, 0.15)' : '0 4px 15px rgba(0, 0, 0, 0.04)'
                      }}
                      dangerouslySetInnerHTML={{ __html: isUser ? msg.text : formatMarkdown(msg.text) }}
                    />
                  )}
                </div>
                {isUser ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    alignSelf: 'flex-end',
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    padding: '0 4px',
                    marginTop: '2px'
                  }}>
                    <span>You</span>
                    <button 
                      onClick={() => handleStartEditMessage(index, msg.text)}
                      disabled={loading}
                      title="Edit message"
                      style={{
                        background: 'rgba(255, 255, 255, 0.14)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '5px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        opacity: 0.8
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleResendMessage(index)}
                      disabled={loading}
                      title="Resend/retry from this message"
                      style={{
                        background: 'rgba(255, 255, 255, 0.14)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '5px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        opacity: 0.8
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                    >
                      <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                ) : (
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    alignSelf: 'flex-start',
                    padding: '0 4px',
                    marginTop: '2px'
                  }}>
                    Assistant
                  </span>
                )}
              </div>
            );
          })}

          {((messages[messages.length - 1]?.role === 'user' && !loading) || loading) && (
            <div style={{
              alignSelf: 'flex-start',
              display: 'flex',
              gap: '0.65rem',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '0.75rem 1.1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              maxWidth: '320px'
            }}>
              <span className="dot-pulse" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {toolStatus || (loading ? 'Analysing your request...' : 'AI is generating response in background...')}
              </span>
            </div>
          )}

          {error && (
            <div style={{ 
              alignSelf: 'stretch', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.65rem', 
              alignItems: 'flex-start', 
              background: 'rgba(239, 68, 68, 0.08)', 
              padding: '1rem', 
              borderRadius: '12px', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444', 
              fontSize: '0.825rem' 
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 600 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              <a 
                href="mailto:ionetweb@gmail.com" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ef4444',
                  color: '#ffffff',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginTop: '0.25rem',
                  marginLeft: '1.5rem',
                  transition: 'opacity 0.2s',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                Contact Admin
              </a>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div style={{
            padding: '0 1.5rem 0.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Suggestions</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {suggestions.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (chip.autoSend) {
                      handleSendMessage(chip.text);
                    } else {
                      setInputValue(chip.text);
                    }
                  }}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary-glow)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--accent-primary-glow)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <input 
            type="text"
            placeholder="Type a message or command (e.g. status report of project X)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                let updated = undefined;
                if (loading) {
                  updated = await handleAbort();
                }
                handleSendMessage(undefined, updated);
              }
            }}
            className="ai-chat-input"
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          />
          {loading && !inputValue.trim() ? (
            <button 
              onClick={handleAbort}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
              }}
              title="Stop generating"
            >
              <Square size={16} fill="#ffffff" />
            </button>
          ) : (
            <button 
              onClick={async () => {
                let updated = undefined;
                if (loading) {
                  updated = await handleAbort();
                }
                handleSendMessage(undefined, updated);
              }}
              disabled={!inputValue.trim()}
              style={{
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: !inputValue.trim() ? 0.6 : 1
              }}
              title={loading ? "Stop & Send new message" : "Send message"}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .resend-message-btn {
          color: #ffffff !important;
        }
        [data-theme="light"] .resend-message-btn {
          color: #000000 !important;
        }
        .user-message-group:hover .resend-message-btn {
          opacity: 0.7 !important;
        }
        .resend-message-btn:hover {
          opacity: 1 !important;
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.08) !important;
        }
        [data-theme="light"] .resend-message-btn:hover {
          color: #000000 !important;
          background: rgba(0, 0, 0, 0.05) !important;
        }
        .session-row:hover {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
        }
        .session-row:hover .delete-session-btn,
        .session-row:hover .edit-session-btn {
          opacity: 0.6 !important;
        }
        .delete-session-btn:hover {
          opacity: 1 !important;
          color: #ef4444 !important;
        }
        .edit-session-btn:hover {
          opacity: 1 !important;
          color: var(--accent-primary) !important;
        }
        
        .ai-chat-input:focus {
          border-color: var(--accent-primary) !important;
          box-shadow: 0 0 0 3px var(--accent-primary-glow) !important;
        }
        
        .dot-pulse {
          position: relative;
          left: -9999px;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: var(--accent-primary);
          color: var(--accent-primary);
          box-shadow: 9999px 0 0 0 var(--accent-primary);
          animation: dotPulse 1.5s infinite linear;
          margin-right: 15px;
          margin-left: 5px;
        }

        @keyframes dotPulse {
          0% {
            box-shadow: 9999px 0 0 -2px var(--accent-primary);
          }
          30%,
          100% {
            box-shadow: 9999px 0 0 2px var(--accent-primary);
          }
        }

        @media (max-width: 768px) {
          .ai-history-sidebar.open {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            height: 100%;
            z-index: 100;
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
          }
        }
      `}</style>
    </div>
  );
}
