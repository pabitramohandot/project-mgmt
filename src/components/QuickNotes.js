'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  StickyNote, Plus, Trash2, Share2, Bold, Italic, Underline, 
  Strikethrough, Link as LinkIcon, Palette, Baseline, Type, Check, X,
  Globe, Users, User, Shield, Pencil
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import SearchableSelect from './SearchableSelect';

export default function QuickNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteColor, setNoteColor] = useState('#ffffff');
  
  // Sharing States (like Project Credential Share)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRecipientType, setShareRecipientType] = useState("client"); // 'client' | 'employee' | 'custom'
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [customEmail, setCustomEmail] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [clients, setClients] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [savedRange, setSavedRange] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const editorRef = useRef(null);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('.color-picker') && !event.target.closest('.share-modal-container') && !event.target.closest('.searchable-select')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      // Fetch Clients
      const clientsRes = await fetch('/api/clients');
      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData || []);
      }
      
      // Fetch Employees (from /api/auth/me)
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCompanyUsers(meData.companyUsers || []);
      }
    } catch(e) {
      console.error(e);
    }
  }

  const saveSelection = () => {
    if (typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        return sel.getRangeAt(0);
      }
    }
    return null;
  };

  const restoreSelection = (range) => {
    if (range && typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const handleCommand = (command, value = null) => {
    if (!editorRef.current) return;
    if (savedRange) {
      restoreSelection(savedRange);
    }
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const handleColorChange = (command, value) => {
    if (savedRange) {
      restoreSelection(savedRange);
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const addLink = (e) => {
    if (e) e.preventDefault();
    const range = saveSelection();
    setSavedRange(range);
    setShowLinkModal(true);
  };

  const handleSaveNote = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    
    if (!content.trim() && !noteTitle.trim() && content === '<br>') {
      setIsComposing(false);
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

  // ----- Sharing Logic -----
  const getRecipientInfo = () => {
    let emails = [];
    let phones = [];

    if (shareRecipientType === "client") {
      selectedRecipientIds.forEach((id) => {
        const client = clients.find((c) => c._id === id);
        if (client) {
          if (client.email) emails.push(client.email);
          const p = client.phone || client.whatsapp;
          if (p) phones.push(p.replace(/[^\d+]/g, ""));
        }
      });
    } else if (shareRecipientType === "employee") {
      selectedRecipientIds.forEach((id) => {
        const emp = companyUsers.find((u) => u.id === id);
        if (emp) {
          if (emp.email) emails.push(emp.email);
          const p = emp.whatsapp || emp.phone;
          if (p) phones.push(p.replace(/[^\d+]/g, ""));
        }
      });
    } else if (shareRecipientType === "custom") {
      if (customEmail) emails.push(customEmail);
      if (customPhone) phones.push(customPhone.replace(/[^\d+]/g, ""));
    }

    return { emails, phones };
  };

  const formatNoteText = () => {
    if (!editorRef.current) return '';
    let text = noteTitle ? `*${noteTitle}*\n\n` : '';
    
    let htmlContent = editorRef.current.innerHTML;
    
    // Replace closing block-level tags and breaks with linebreaks
    htmlContent = htmlContent.replace(/<\/div>/gi, "\n");
    htmlContent = htmlContent.replace(/<\/li>/gi, "\n");
    htmlContent = htmlContent.replace(/<\/p>/gi, "\n");
    htmlContent = htmlContent.replace(/<\/h[1-6]>/gi, "\n");
    htmlContent = htmlContent.replace(/<br\s*[\/]?>/gi, "\n");
    
    // Create a temporary div to strip remaining HTML tags
    const tmp = document.createElement("DIV");
    tmp.innerHTML = htmlContent;
    
    // Extract and split by line breaks, trim line content, and filter empty/blank lines
    let lines = (tmp.textContent || tmp.innerText || "").split('\n');
    lines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    text += lines.join('\n');
    
    return text.trim();
  };

  const handleShareWhatsApp = () => {
    const { phones } = getRecipientInfo();
    const text = formatNoteText();
    if (!text) {
      alert("Note is empty");
      return;
    }

    const encodedText = encodeURIComponent(text);
    if (phones.length === 0) {
      const url = `https://api.whatsapp.com/send?text=${encodedText}`;
      window.open(url, "_blank");
    } else {
      phones.forEach((phone) => {
        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
        window.open(url, "_blank");
      });
    }
  };

  const handleShareEmail = () => {
    const { emails } = getRecipientInfo();
    const text = formatNoteText();
    if (!text) {
      alert("Note is empty");
      return;
    }

    const subject = encodeURIComponent(noteTitle || "Quick Note");
    const encodedBody = encodeURIComponent(text);
    const url = `mailto:${emails.join(',')}?subject=${subject}&body=${encodedBody}`;

    window.location.href = url;
  };

  return (
    <div className="quick-notes-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: isOpen ? 'var(--bg-hover)' : 'transparent', 
          border: 'none', 
          color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          transition: 'all 0.2s',
          padding: '8px',
          borderRadius: '8px',
          position: 'relative'
        }} 
        title="Quick Notes"
      >
        <StickyNote size={20} />
        <span 
          className="shimmer-tag-note"
          style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          fontSize: '0.55rem',
          fontWeight: '800',
          padding: '0.15rem 0.35rem',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          lineHeight: 1,
          boxShadow: '0 0 8px rgba(0, 174, 239, 0.4)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}>
          Add Note
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '-50px',
          marginTop: '12px',
          width: '500px',
          maxHeight: '600px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Quick Notes</h3>
            {!isComposing && (
              <button 
                onClick={() => { resetEditor(); setIsComposing(true); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 500 }}
              >
                <Plus size={16} /> New Note
              </button>
            )}
          </div>

          {/* Editor Area */}
          {isComposing && (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: noteColor }}>
              <input 
                type="text" 
                placeholder="Title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', marginBottom: '12px' }}
              />
              
              <div 
                ref={editorRef}
                contentEditable
                style={{
                  minHeight: '100px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}
                data-placeholder="Take a note..."
              />

              {/* Rich Text Toolbar */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px' }}>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('bold')} className="rt-btn" title="Bold"><Bold size={14} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('italic')} className="rt-btn" title="Italic"><Italic size={14} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('underline')} className="rt-btn" title="Underline"><Underline size={14} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('strikeThrough')} className="rt-btn" title="Strikethrough"><Strikethrough size={14} /></button>
                
                <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />
                
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('formatBlock', 'H1')} className="rt-btn" title="Heading 1"><Type size={16} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('formatBlock', 'H2')} className="rt-btn" title="Heading 2"><Type size={14} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); const range = saveSelection(); setSavedRange(range); }} onClick={() => handleCommand('formatBlock', 'P')} className="rt-btn" title="Normal Text"><Type size={12} /></button>
                
                <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />
                
                <label onMouseDown={() => { const range = saveSelection(); setSavedRange(range); }} className="rt-btn color-picker" title="Text Color" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Baseline size={14} />
                  <input type="color" onChange={(e) => handleColorChange('foreColor', e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                </label>
                <label onMouseDown={() => { const range = saveSelection(); setSavedRange(range); }} className="rt-btn color-picker" title="Highlight Color" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Palette size={14} />
                  <input type="color" onChange={(e) => handleColorChange('hiliteColor', e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                </label>
                
                <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => addLink(e)} className="rt-btn" title="Add Link"><LinkIcon size={14} /></button>
              </div>

              {/* Note Settings Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                      Board Color
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[
                        { name: 'White', value: '#ffffff' },
                        { name: 'Red', value: '#fee2e2' },
                        { name: 'Orange', value: '#ffedd5' },
                        { name: 'Yellow', value: '#fef9c3' },
                        { name: 'Green', value: '#dcfce7' },
                        { name: 'Blue', value: '#dbeafe' },
                        { name: 'Purple', value: '#f3e8ff' }
                      ].map((c) => (
                        <button
                          key={c.value}
                          onClick={(e) => { e.preventDefault(); setNoteColor(c.value); }}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: c.value,
                            border: noteColor === c.value ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: noteColor === c.value ? '0 0 4px var(--accent-primary)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                          title={c.name}
                        />
                      ))}
                      
                      <label className="rt-btn color-picker" title="Custom color" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, background: 'transparent', margin: 0 }}>
                        <Plus size={10} style={{ color: 'var(--text-muted)' }} />
                        <input type="color" value={noteColor === '#ffffff' ? '#ffffff' : noteColor} onChange={(e) => setNoteColor(e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                      </label>
                    </div>
                  </div>
                  
                  <button onClick={() => setShowShareModal(!showShareModal)} className={`rt-btn ${showShareModal ? 'active' : ''}`} title="Share Note" style={{ marginTop: '14px' }}>
                    <Share2 size={14} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={resetEditor} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>Cancel</button>
                  <button onClick={handleSaveNote} disabled={saving} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* External Share Modal Dropdown */}
              {showShareModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: 199, borderRadius: '12px' }} onClick={() => setShowShareModal(false)}></div>
              )}
              {showShareModal && (
                <div className="share-modal-container" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85%', padding: '20px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', zIndex: 200, fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Share Note</h4>
                    <button onClick={() => setShowShareModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: '12px' }}>
                    <button
                      type="button"
                      className={`rt-btn ${shareRecipientType === "client" ? "active" : ""}`}
                      style={{ padding: "0.5rem", fontSize: "0.75rem", border: '1px solid var(--border-color)' }}
                      onClick={() => {
                        setShareRecipientType("client");
                        setSelectedRecipientIds([]);
                      }}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      className={`rt-btn ${shareRecipientType === "employee" ? "active" : ""}`}
                      style={{ padding: "0.5rem", fontSize: "0.75rem", border: '1px solid var(--border-color)' }}
                      onClick={() => {
                        setShareRecipientType("employee");
                        setSelectedRecipientIds([]);
                      }}
                    >
                      Employee
                    </button>
                    <button
                      type="button"
                      className={`rt-btn ${shareRecipientType === "custom" ? "active" : ""}`}
                      style={{ padding: "0.5rem", fontSize: "0.75rem", border: '1px solid var(--border-color)' }}
                      onClick={() => {
                        setShareRecipientType("custom");
                        setSelectedRecipientIds([]);
                      }}
                    >
                      Custom
                    </button>
                  </div>
 
                  <div style={{ marginBottom: '12px' }}>
                    {shareRecipientType === "client" && (
                      <div>
                        <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>Select Client</div>
                        <SearchableSelect
                          multiple={true}
                          options={clients.map((c) => ({
                            value: c._id,
                            label: c.name,
                            sublabel: `${c.company ? `${c.company} • ` : ""}${c.email}`,
                            searchText: `${c.name} ${c.company || ""} ${c.email}`,
                          }))}
                          placeholder="Search and select client..."
                          value={selectedRecipientIds}
                          onChange={(ids) => setSelectedRecipientIds(ids)}
                        />
                      </div>
                    )}
                    {shareRecipientType === "employee" && (
                      <div>
                        <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>Select Employee</div>
                        <SearchableSelect
                          multiple={true}
                          options={companyUsers.map((u) => ({
                            value: u.id,
                            label: u.username || u.name,
                            sublabel: `${u.role || "Member"} • ${u.email || ""}`,
                            searchText: `${u.username || u.name || ""} ${u.email || ""} ${u.role || ""}`,
                          }))}
                          placeholder="Search and select employee..."
                          value={selectedRecipientIds}
                          onChange={(ids) => setSelectedRecipientIds(ids)}
                        />
                      </div>
                    )}
                    {shareRecipientType === "custom" && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
                        />
                        <input
                          type="text"
                          placeholder="WhatsApp / Phone Number"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <button
                      onClick={handleShareWhatsApp}
                      style={{ background: '#25D366', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Share via WhatsApp
                    </button>
                    <button
                      onClick={handleShareEmail}
                      style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Share via Email
                    </button>
                  </div>
                </div>
              )}
              
              {/* Insert Link Modal */}
              {showLinkModal && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '85%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  zIndex: 210,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Insert Link</span>
                    <button 
                      onClick={() => setShowLinkModal(false)} 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && linkUrl) {
                        if (savedRange) {
                          restoreSelection(savedRange);
                        }
                        document.execCommand('createLink', false, linkUrl);
                        setShowLinkModal(false);
                        setLinkUrl('');
                      }
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => { setShowLinkModal(false); setLinkUrl(''); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (linkUrl) {
                          if (savedRange) {
                            restoreSelection(savedRange);
                          }
                          document.execCommand('createLink', false, linkUrl);
                        }
                        setShowLinkModal(false);
                        setLinkUrl('');
                      }}
                      style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)' }}>
            {loading && !isComposing ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading notes...</div>
            ) : notes.length === 0 && !isComposing ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <StickyNote size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                <div style={{ fontSize: '0.9rem' }}>No notes yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click 'New Note' to create one</div>
              </div>
            ) : (
              notes.slice(0, 3).map((note) => {
                const isExpanded = expandedNoteId === note._id;
                return (
                  <div 
                    key={note._id} 
                    onClick={() => setExpandedNoteId(isExpanded ? null : note._id)}
                    className="note-card"
                    style={{ 
                      background: note.color || '#ffffff', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      border: '1px solid var(--border-color)', 
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.2s',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#111', fontWeight: 600 }}>
                        {note.title || 'Untitled Note'}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>
                        {new Date(note.createdAt || note.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <div 
                          style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.5, minHeight: '40px', overflowY: 'auto' }}
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditorForNote(note); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            className="card-action-btn"
                            title="Edit Note"
                          >
                            <Pencil size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Edit</span>
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditorForNote(note); setShowShareModal(true); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            className="card-action-btn"
                            title="Share Note"
                          >
                            <Share2 size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Share</span>
                          </button>

                          <button 
                            onClick={(e) => handleDelete(note._id, e)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                            className="card-action-btn"
                            title="Delete Note"
                          >
                            <Trash2 size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            
            {notes.length > 3 && !isComposing && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notes');
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginTop: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--accent-primary-glow)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--bg-hover)'}
              >
                View All Notes
              </button>
            )}
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
        .rt-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justifyContent: center;
          transition: all 0.2s;
        }
        .rt-btn:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .rt-btn.active {
          color: var(--accent-primary);
          background: var(--accent-primary-glow);
          border-color: var(--accent-primary) !important;
        }
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
          display: block;
        }
        .card-action-btn:hover {
          background: rgba(0, 0, 0, 0.05) !important;
          color: var(--text-primary) !important;
        }
        .note-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
        }
        .note-card:hover .note-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
