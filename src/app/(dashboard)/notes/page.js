'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  StickyNote, Plus, Trash2, Share2, Bold, Italic, Underline, 
  Strikethrough, Link as LinkIcon, Palette, Baseline, Type, X 
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [isComposing, setIsComposing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteColor, setNoteColor] = useState('#ffffff');
  const [saving, setSaving] = useState(false);
  
  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRecipientType, setShareRecipientType] = useState('client');
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [clients, setClients] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    fetchNotes();
    fetchUsers();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const clientsRes = await fetch('/api/clients');
      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData || []);
      }
      
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCompanyUsers(meData.companyUsers || []);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const groupNotesByDate = () => {
    const groups = {};
    notes.forEach(note => {
      const dateObj = new Date(note.updatedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      
      if (dateObj.toDateString() === today.toDateString()) {
        dateStr = 'Today';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        dateStr = 'Yesterday';
      }

      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(note);
    });
    return groups;
  };

  const groupedNotes = groupNotesByDate();

  // --- Editor Methods ---
  const handleCommand = (command, value = null) => {
    if (!editorRef.current) return;
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const addLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      handleCommand('createLink', url);
    }
  };

  const handleSaveNote = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    
    if (!content.trim() && !noteTitle.trim() && content === '<br>') {
      resetEditor();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: noteTitle,
        content: content,
        color: noteColor,
      };

      let res;
      if (editingNoteId) {
        res = await fetch(`/api/notes/${editingNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        resetEditor();
        fetchNotes();
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const executeDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(notes.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditorForNote = (note) => {
    setEditingNoteId(note._id);
    setNoteTitle(note.title || '');
    setNoteColor(note.color || '#ffffff');
    setIsComposing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content;
      }
    }, 50);
  };

  const resetEditor = () => {
    setIsComposing(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteColor('#ffffff');
    setShowShareModal(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  // --- Share Logic ---
  const getRecipientInfo = () => {
    let email = "";
    let phone = "";
    if (shareRecipientType === "client") {
      const client = clients.find((c) => c._id === selectedRecipientId);
      if (client) { email = client.email || ""; phone = client.phone || client.whatsapp || ""; }
    } else if (shareRecipientType === "employee") {
      const emp = companyUsers.find((u) => u.id === selectedRecipientId);
      if (emp) { email = emp.email || ""; phone = emp.whatsapp || emp.phone || ""; }
    } else if (shareRecipientType === "custom") {
      email = customEmail; phone = customPhone;
    }
    if (phone) phone = phone.replace(/[^\d+]/g, "");
    return { email, phone };
  };

  const formatNoteText = () => {
    if (!editorRef.current) return '';
    let text = noteTitle ? `*${noteTitle}*\n\n` : '';
    let htmlContent = editorRef.current.innerHTML;
    htmlContent = htmlContent.replace(/<br\s*[\/]?>/gi, "\n");
    htmlContent = htmlContent.replace(/<p[^>]*>/gi, "\n");
    htmlContent = htmlContent.replace(/<\/p>/gi, "");
    const tmp = document.createElement("DIV");
    tmp.innerHTML = htmlContent;
    text += tmp.textContent || tmp.innerText || "";
    return text.trim();
  };

  const handleShareWhatsApp = () => {
    const { phone } = getRecipientInfo();
    const text = formatNoteText();
    if (!text) { alert("Note is empty"); return; }
    const encodedText = encodeURIComponent(text);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = () => {
    const { email } = getRecipientInfo();
    const text = formatNoteText();
    if (!text) { alert("Note is empty"); return; }
    const subject = encodeURIComponent(noteTitle || "Quick Note");
    const encodedBody = encodeURIComponent(text);
    const url = `mailto:${email}?subject=${subject}&body=${encodedBody}`;
    window.location.href = url;
  };

  return (
    <div className="page-container" style={{ padding: '24px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StickyNote size={28} color="var(--accent-primary)" />
            My Notes
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Organize your thoughts and share them instantly.</p>
        </div>
        
        <button 
          onClick={() => { resetEditor(); setIsComposing(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}
        >
          <Plus size={18} /> New Note
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading notes...</div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <StickyNote size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No notes yet</div>
          <p style={{ fontSize: '0.9rem' }}>Capture your first idea by creating a new note.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {Object.entries(groupedNotes).map(([date, dateNotes]) => (
            <div key={date}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {date}
              </h2>
              
              <div className="notes-grid">
                {dateNotes.map(note => (
                  <div 
                    key={note._id}
                    onClick={() => openEditorForNote(note)}
                    className="note-card"
                    style={{
                      background: note.color || '#ffffff',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '240px'
                    }}
                  >
                    {note.title && <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#111', fontWeight: 600 }}>{note.title}</h3>}
                    <div 
                      style={{ 
                        fontSize: '0.9rem', color: '#333', lineHeight: 1.6, 
                        flex: 1, overflow: 'hidden', 
                        display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word'
                      }}
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                    <div className="note-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)', opacity: 0.5, transition: 'opacity 0.2s' }}>
                      <button 
                        onClick={(e) => handleDelete(note._id, e)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete Note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal Overlay */}
      {isComposing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: noteColor, width: '100%', maxWidth: '600px',
            borderRadius: '16px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <input 
                type="text" 
                placeholder="Title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', marginBottom: '16px' }}
              />
              
              <div 
                ref={editorRef}
                contentEditable
                style={{
                  minHeight: '200px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)'
                }}
                data-placeholder="Start typing your note..."
              />
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              {/* Rich Text Toolbar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button onClick={() => handleCommand('bold')} className="rt-btn" title="Bold"><Bold size={16} /></button>
                <button onClick={() => handleCommand('italic')} className="rt-btn" title="Italic"><Italic size={16} /></button>
                <button onClick={() => handleCommand('underline')} className="rt-btn" title="Underline"><Underline size={16} /></button>
                <button onClick={() => handleCommand('strikeThrough')} className="rt-btn" title="Strikethrough"><Strikethrough size={16} /></button>
                
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }} />
                
                <button onClick={() => handleCommand('formatBlock', 'H1')} className="rt-btn" title="Heading 1"><Type size={18} /></button>
                <button onClick={() => handleCommand('formatBlock', 'H2')} className="rt-btn" title="Heading 2"><Type size={16} /></button>
                <button onClick={() => handleCommand('formatBlock', 'P')} className="rt-btn" title="Normal Text"><Type size={14} /></button>
                
                <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 8px' }} />
                
                <label className="rt-btn" title="Text Color" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Baseline size={16} />
                  <input type="color" onChange={(e) => handleCommand('foreColor', e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                </label>
                <label className="rt-btn" title="Highlight Color" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Palette size={16} />
                  <input type="color" onChange={(e) => handleCommand('hiliteColor', e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                </label>
                
                <button onClick={addLink} className="rt-btn" title="Add Link"><LinkIcon size={16} /></button>
                
                <div style={{ flex: 1 }} />
                
                <label className="rt-btn" title="Note Background Color" style={{ border: '1px solid var(--border-color)', borderRadius: '20px', padding: '4px 12px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: noteColor, marginRight: '8px' }}></div>
                  <span style={{ fontSize: '0.8rem' }}>Color</span>
                  <input type="color" value={noteColor === '#ffffff' ? '#ffffff' : noteColor} onChange={(e) => setNoteColor(e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                </label>
                
                <button onClick={() => setShowShareModal(!showShareModal)} className={`rt-btn ${showShareModal ? 'active' : ''}`} style={{ borderRadius: '20px', padding: '4px 12px', border: '1px solid var(--border-color)' }}>
                  <Share2 size={16} style={{ marginRight: '6px' }} />
                  <span style={{ fontSize: '0.8rem' }}>Share</span>
                </button>
              </div>

              {/* Share Options */}
              {showShareModal && (
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: '16px' }}>
                    <button
                      type="button"
                      className={`btn ${shareRecipientType === "client" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => {
                        setShareRecipientType("client");
                        setSelectedRecipientId(clients.length > 0 ? clients[0]._id : "");
                      }}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      className={`btn ${shareRecipientType === "employee" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => {
                        setShareRecipientType("employee");
                        setSelectedRecipientId(companyUsers.length > 0 ? companyUsers[0].id : "");
                      }}
                    >
                      Employee
                    </button>
                    <button
                      type="button"
                      className={`btn ${shareRecipientType === "custom" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                      onClick={() => {
                        setShareRecipientType("custom");
                        setSelectedRecipientId("");
                      }}
                    >
                      Custom
                    </button>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    {shareRecipientType === "client" && (
                      <div>
                        <div style={{ marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Client</div>
                        <SearchableSelect
                          options={clients.map((c) => ({
                            value: c._id,
                            label: c.name,
                            sublabel: `${c.company ? `${c.company} • ` : ""}${c.email}`,
                            searchText: `${c.name} ${c.company || ""} ${c.email}`,
                          }))}
                          placeholder="Search and select client..."
                          value={selectedRecipientId}
                          onChange={(clientId) => setSelectedRecipientId(clientId)}
                        />
                      </div>
                    )}
                    {shareRecipientType === "employee" && (
                      <div>
                        <div style={{ marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Employee</div>
                        <SearchableSelect
                          options={companyUsers.map((u) => ({
                            value: u.id,
                            label: u.username || u.name,
                            sublabel: `${u.role || "Member"} • ${u.email || ""}`,
                            searchText: `${u.username || u.name || ""} ${u.email || ""} ${u.role || ""}`,
                          }))}
                          placeholder="Search and select employee..."
                          value={selectedRecipientId}
                          onChange={(empId) => setSelectedRecipientId(empId)}
                        />
                      </div>
                    )}
                    {shareRecipientType === "custom" && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          className="form-input"
                          style={{ flex: 1 }}
                        />
                        <input
                          type="text"
                          placeholder="WhatsApp Number"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          className="form-input"
                          style={{ flex: 1 }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <button
                      onClick={handleShareWhatsApp}
                      style={{ background: '#25D366', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Share via WhatsApp
                    </button>
                    <button
                      onClick={handleShareEmail}
                      style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Share via Email
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={resetEditor} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveNote} disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setDeleteConfirmId(null)}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '360px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Note</h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .note-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
        }
        .note-card:hover .note-card-actions {
          opacity: 1 !important;
        }
        .rt-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justifyContent: center;
          transition: all 0.2s;
        }
        .rt-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .rt-btn.active {
          color: var(--accent-primary);
          background: var(--accent-primary-glow);
          border-color: var(--accent-primary) !important;
        }
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.3);
          pointer-events: none;
          display: block;
        }
        .notes-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(6, 1fr);
        }
        @media (max-width: 1800px) {
          .notes-grid { grid-template-columns: repeat(5, 1fr); }
        }
        @media (max-width: 1400px) {
          .notes-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 1100px) {
          .notes-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 800px) {
          .notes-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .notes-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
