'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Bot, Plus, Trash2, History, Menu, Brain, Edit2, Check, X, ChevronDown } from 'lucide-react';

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
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [configuredProviders, setConfiguredProviders] = useState([]);
  
  const chatEndRef = useRef(null);

  const suggestions = [
    { label: '📊 Active Projects List', text: 'List all active projects in the workspace', autoSend: true },
    { label: '✉️ Unpaid Invoices List', text: 'Show all unpaid or outstanding invoices', autoSend: true },
    { label: '🔑 Domain/Hosting Expiries', text: 'Which domains or hostings are expiring soon?', autoSend: true },
    { label: '📝 Project Status Template', text: 'Generate 30-day status report of project ', autoSend: false }
  ];

  const PROVIDER_META = {
    auto: { label: 'Auto Select', color: '#a855f7' },
    gemini: { label: 'Google Gemini', color: '#4285F4' },
    openai: { label: 'OpenAI GPT', color: '#10a37f' },
    claude: { label: 'Claude', color: '#D97757' },
    nvidia: { label: 'NVIDIA NIM', color: '#76B900' },
  };

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

    async function loadProviders() {
      try {
        const res = await fetch('/api/settings/ai-keys');
        if (res.ok) {
          const data = await res.json();
          const configured = Object.entries(data.providers || {})
            .filter(([, v]) => v.configured)
            .map(([k]) => k);
          setConfiguredProviders(configured);
        }
      } catch (e) {
        console.error('Failed to load AI providers:', e);
      }
    }

    loadCompany();
    loadProviders();
  }, []);

  // 1. Initial Load: Retrieve sessions from localStorage
  useEffect(() => {
    if (!companyId) return;

    const storageKey = `ai_chat_sessions_${companyId}`;
    const saved = localStorage.getItem(storageKey);
    let parsed = [];
    try {
      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse chat sessions:', e);
    }

    if (parsed.length === 0) {
      // Create a default initial session
      const initialSessionId = `session_${Date.now()}`;
      const defaultSession = {
        id: initialSessionId,
        title: 'New Chat Session',
        messages: [
          {
            role: 'assistant',
            text: 'Hi there! I am your AI Workspace Assistant. I can compile project status reports or email outstanding invoices. Try asking me one of the suggestions below!'
          }
        ],
        timestamp: Date.now()
      };
      parsed = [defaultSession];
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    }

    setSessions(parsed);
    const sorted = [...parsed].sort((a, b) => b.timestamp - a.timestamp);
    setCurrentSessionId(sorted[0].id);
    setMessages(sorted[0].messages);
    setSessionLoaded(true);
    
    // Auto-collapse sidebar on smaller screens
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [companyId]);

  // 2. Sync active session messages to localStorage whenever messages change
  useEffect(() => {
    if (!companyId || !currentSessionId || sessions.length === 0 || !sessionLoaded) return;

    const storageKey = `ai_chat_sessions_${companyId}`;
    const updatedSessions = sessions.map(session => {
      if (session.id === currentSessionId) {
        // Update title from the first user message if title is default
        let title = session.title;
        if (title === 'New Chat Session') {
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.text.length > 25 
              ? firstUserMessage.text.substring(0, 22) + '...' 
              : firstUserMessage.text;
          }
        }
        return {
          ...session,
          title,
          messages,
          timestamp: Date.now()
        };
      }
      return session;
    });

    setSessions(updatedSessions);
    localStorage.setItem(storageKey, JSON.stringify(updatedSessions));
  }, [messages, currentSessionId, companyId, sessionLoaded]);

  // 3. Scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // 4. Create New Chat Session
  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Chat Session',
      messages: [
        {
          role: 'assistant',
          text: 'Hi there! I am your AI Workspace Assistant. I can compile project status reports or email outstanding invoices. Try asking me one of the suggestions below!'
        }
      ],
      timestamp: Date.now()
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    const key = companyId ? `ai_chat_sessions_${companyId}` : 'ai_chat_sessions_global';
    localStorage.setItem(key, JSON.stringify(updated));
    setError(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // 5. Select Chat Session
  const handleSelectSession = (id) => {
    const session = sessions.find(s => s.id === id);
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
  const handleDeleteSession = (e, id) => {
    e.stopPropagation(); // Prevent selecting the session

    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    const key = companyId ? `ai_chat_sessions_${companyId}` : 'ai_chat_sessions_global';
    localStorage.setItem(key, JSON.stringify(filtered));

    if (currentSessionId === id) {
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
        setMessages(filtered[0].messages);
      } else {
        // If all sessions deleted, create a fresh one
        const newId = `session_${Date.now()}`;
        const fresh = [{
          id: newId,
          title: 'New Chat Session',
          messages: [
            {
              role: 'assistant',
              text: 'Hi there! I am your AI Workspace Assistant. I can compile project status reports or email outstanding invoices. Try asking me one of the suggestions below!'
            }
          ],
          timestamp: Date.now()
        }];
        setSessions(fresh);
        setCurrentSessionId(newId);
        setMessages(fresh[0].messages);
        const key = companyId ? `ai_chat_sessions_${companyId}` : 'ai_chat_sessions_global';
        localStorage.setItem(key, JSON.stringify(fresh));
      }
    }
  };

  // 6.5. Rename Chat Session
  const handleStartEdit = (e, id, currentTitle) => {
    e.stopPropagation(); // Prevent selecting the session
    setEditingSessionId(id);
    setEditingTitleText(currentTitle);
  };

  const handleSaveTitle = (id) => {
    if (!editingTitleText.trim()) return;

    const updated = sessions.map(s => {
      if (s.id === id) {
        return {
          ...s,
          title: editingTitleText.trim()
        };
      }
      return s;
    });

    setSessions(updated);
    const key = companyId ? `ai_chat_sessions_${companyId}` : 'ai_chat_sessions_global';
    localStorage.setItem(key, JSON.stringify(updated));
    setEditingSessionId(null);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  // 7. Send Message (SSE Streaming)
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }
    setError(null);

    const userMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, provider: selectedProvider }),
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
      let messageAdded = false; // Only add message bubble when first text token arrives

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            // Next line should be data
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);

              if (data.text) {
                // Token event — append text and clear any transient tool status
                setToolStatus(null);
                fullText += data.text;
                if (!messageAdded) {
                  // Add the assistant bubble only on the first real token
                  messageAdded = true;
                  setMessages((prev) => [...prev, { role: 'assistant', text: fullText }]);
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', text: fullText };
                    return updated;
                  });
                }
              } else if (data.error) {
                throw new Error(data.error);
              } else if (data.name) {
                // Tool call indicator — show transient professional status (not persisted)
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
                throw parseErr; // Re-throw actual errors, not JSON parse issues
              }
            }
          }
        }
      }

      // If no text was streamed at all (empty response), set fallback
      setToolStatus(null);
      if (!fullText.trim()) {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'No response was generated. Please try again.' }]);
      }
    } catch (err) {
      setError(err.message);
      setToolStatus(null);
    } finally {
      setLoading(false);
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

          {/* Model Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              id="ai-model-selector"
              style={{
                appearance: 'none',
                background: 'var(--bg-primary)',
                border: `1px solid ${PROVIDER_META[selectedProvider]?.color || 'var(--border-color)'}44`,
                color: PROVIDER_META[selectedProvider]?.color || 'var(--text-primary)',
                padding: '0.4rem 2rem 0.4rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '140px',
              }}
            >
              <option value="auto">⚡ Auto Select</option>
              {configuredProviders.map((p) => (
                <option key={p} value={p}>
                  {p === 'gemini' ? '✦ Google Gemini' : p === 'openai' ? '◉ OpenAI GPT' : p === 'claude' ? '◈ Claude' : p === 'nvidia' ? '▲ NVIDIA NIM' : p}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: PROVIDER_META[selectedProvider]?.color || 'var(--text-muted)',
              }}
            />
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
                <span style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  padding: '0 4px'
                }}>
                  {isUser ? 'You' : 'Assistant'}
                </span>
              </div>
            );
          })}

          {loading && (
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
                {toolStatus || 'Analysing your request...'}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={loading}
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
          <button 
            onClick={() => handleSendMessage()}
            disabled={loading || !inputValue.trim()}
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
              opacity: (loading || !inputValue.trim()) ? 0.6 : 1
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style jsx global>{`
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
