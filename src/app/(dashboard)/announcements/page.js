'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Search, Check, Send, Sparkles, Mail, Eye, RefreshCw, X, MessageSquare } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { useNotification } from '@/components/NotificationProvider';

export default function AnnouncementsPage() {
  const { showToast } = useNotification();
  const [companyName, setCompanyName] = useState('Workspace');
  
  // Recipients states
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientType, setRecipientType] = useState('selected'); // 'all', 'individual', 'selected'
  const [selectedIndividual, setSelectedIndividual] = useState('');
  const [selectedClients, setSelectedClients] = useState([]); // Array of client IDs

  // Compose states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState(['email']); // 'email', 'whatsapp'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp Queue Drawer state
  const [whatsappQueue, setWhatsappQueue] = useState([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [sentQueueIds, setSentQueueIds] = useState(new Set());

  // Fetch all clients
  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error('Failed to load clients:', e);
      showToast('Failed to load clients list.', 'error');
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('company_name');
      if (savedName) setCompanyName(savedName);
    }
  }, []);

  const handleSelectClientCheckbox = (clientId) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  const handleSelectAll = (filteredClients) => {
    const filteredIds = filteredClients.map(c => c._id);
    const allSelected = filteredIds.every(id => selectedClients.includes(id));
    
    if (allSelected) {
      // Deselect all filtered
      setSelectedClients(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered (avoiding duplicates)
      setSelectedClients(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(c => {
    const text = `${c.name} ${c.company || ''} ${c.email} ${c.phone || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const getPersonalizedMessage = (clientName) => {
    if (!message) return 'Compose your message to see a preview...';
    return message.replace(/\[ClientName\]/g, clientName || 'Client Name');
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please compose a message.', 'error');
      return;
    }
    if (channels.length === 0) {
      showToast('Please select at least one channel (Email or WhatsApp).', 'error');
      return;
    }
    if (recipientType === 'individual' && !selectedIndividual) {
      showToast('Please select a client.', 'error');
      return;
    }
    if (recipientType === 'selected' && selectedClients.length === 0) {
      showToast('Please select at least one client checkbox.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        recipientType,
        recipients: recipientType === 'individual' ? selectedIndividual : (recipientType === 'selected' ? selectedClients : null),
        subject: channels.includes('email') ? (subject || `Broadcast from ${companyName}`) : '',
        message,
        channels
      };

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send broadcast');
      }

      const result = await res.json();
      showToast(result.message || 'Broadcast processed successfully!', 'success');

      // If email channel sent successfully
      if (channels.includes('email') && result.results?.emailSent.length > 0) {
        showToast(`Sent ${result.results.emailSent.length} emails.`, 'success');
      }
      if (channels.includes('email') && result.results?.emailFailed.length > 0) {
        showToast(`Failed to send ${result.results.emailFailed.length} emails.`, 'error');
      }

      // If whatsapp is in channels, open the queue drawer
      if (channels.includes('whatsapp') && result.results?.whatsappQueue.length > 0) {
        setWhatsappQueue(result.results.whatsappQueue);
        setSentQueueIds(new Set());
        setIsQueueOpen(true);
      } else {
        // Reset form if no WhatsApp queue is required
        setSubject('');
        setMessage('');
        setSelectedClients([]);
        setSelectedIndividual('');
      }

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerWhatsAppLink = (client) => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      showToast(`${client.name} has no valid phone number.`, 'error');
      return;
    }

    const personalMessage = getPersonalizedMessage(client.name);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(personalMessage)}`;
    
    window.open(url, '_blank');
    setSentQueueIds(prev => new Set([...prev, client.id]));
  };

  const samplePreviewClient = recipientType === 'individual' && selectedIndividual 
    ? clients.find(c => c._id === selectedIndividual) 
    : (recipientType === 'selected' && selectedClients.length > 0 ? clients.find(c => c._id === selectedClients[0]) : null);

  const previewName = samplePreviewClient ? samplePreviewClient.name : 'Priyanka';

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Announcements</h1>
            <p className="page-subtitle">Personalize and broadcast bulk alerts or marketing updates via WhatsApp and Email.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Main Composing Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <form onSubmit={handleSendBroadcast}>
              
              {/* Target Recipients */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>1. Select Target Audience</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="recipientType" 
                      value="selected" 
                      checked={recipientType === 'selected'}
                      onChange={() => setRecipientType('selected')}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span>Select Clients (Checkboxes)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="recipientType" 
                      value="individual" 
                      checked={recipientType === 'individual'} 
                      onChange={() => setRecipientType('individual')}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span>Individual Client</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="radio" 
                      name="recipientType" 
                      value="all" 
                      checked={recipientType === 'all'} 
                      onChange={() => setRecipientType('all')}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span>All Clients ({clients.length})</span>
                  </label>
                </div>

                {/* Individual Recipient Dropdown */}
                {recipientType === 'individual' && (
                  <div className="animate-fade-in" style={{ marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
                    <SearchableSelect
                      options={clients.map(c => ({
                        value: c._id,
                        label: c.name,
                        sublabel: `${c.company ? `${c.company} • ` : ''}${c.email}`,
                        searchText: `${c.name} ${c.company || ''} ${c.email}`
                      }))}
                      placeholder="Select a client profile..."
                      required={recipientType === 'individual'}
                      value={selectedIndividual}
                      onChange={(val) => setSelectedIndividual(val)}
                    />
                  </div>
                )}

                {/* Multiselect Checkbox Table */}
                {recipientType === 'selected' && (
                  <div className="animate-fade-in" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                        <input 
                          type="text" 
                          placeholder="Search and select client rows..." 
                          className="form-input"
                          style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', height: '38px' }}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        onClick={() => handleSelectAll(filteredClients)}
                      >
                        {filteredClients.every(c => selectedClients.includes(c._id)) ? 'Deselect Page' : 'Select Page'}
                      </button>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      {loadingClients ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                      ) : filteredClients.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No clients match search</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center', position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 1 }}></th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 1 }}>Client Name</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 1 }}>Company</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 1 }}>Email</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--table-header-bg)', zIndex: 1 }}>Phone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClients.map(c => {
                              const isChecked = selectedClients.includes(c._id);
                              return (
                                <tr 
                                  key={c._id} 
                                  onClick={() => handleSelectClientCheckbox(c._id)}
                                  style={{ 
                                    borderBottom: '1px solid var(--border-color)', 
                                    cursor: 'pointer',
                                    background: isChecked ? 'var(--accent-primary-glow)' : 'transparent'
                                  }}
                                >
                                  <td style={{ padding: '0.5rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={() => handleSelectClientCheckbox(c._id)}
                                      style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '0.5rem', fontWeight: 500 }}>{c.name}</td>
                                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{c.company || '-'}</td>
                                  <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{c.email || '-'}</td>
                                  <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{c.phone || 'No phone'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Showing {filteredClients.length} clients</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{selectedClients.length} selected</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Channels */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>2. Channels</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={channels.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'email']);
                        else setChannels(channels.filter(c => c !== 'email'));
                      }}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <Mail size={16} style={{ color: 'var(--accent-secondary)' }} />
                    <span>Send via Email</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={channels.includes('whatsapp')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'whatsapp']);
                        else setChannels(channels.filter(c => c !== 'whatsapp'));
                      }}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <MessageSquare size={16} style={{ color: '#25D366' }} />
                    <span>Send via WhatsApp</span>
                  </label>
                </div>
              </div>

              {/* Compose message content */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.95rem' }}>3. Composed Message</label>
                
                {channels.includes('email') && (
                  <div style={{ marginTop: '0.75rem' }} className="animate-fade-in">
                    <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email Subject Line</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Scheduled Maintenance Schedule Alert" 
                      className="form-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required={channels.includes('email')}
                    />
                  </div>
                )}

                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 0 }}>Message Body</label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Use <code>[ClientName]</code> for names</span>
                  </div>
                  <textarea 
                    placeholder="Hello [ClientName], We are excited to announce..." 
                    className="form-textarea"
                    style={{ minHeight: '160px', marginTop: '0.25rem' }}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Submit Broadcast Button */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Launch Broadcast Announcements</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Live Mock Template Preview Panel */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            <div className="card" style={{ background: 'rgba(20,20,35,0.4)', borderColor: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <Eye size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Dynamic Live Preview</h3>
              </div>

              {channels.includes('email') && (
                <div className="animate-fade-in" style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'var(--accent-primary)', padding: '0.75rem 1rem', textAlign: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}>
                    {companyName} Announcement
                  </div>
                  <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Subject: </span> {subject || `Broadcast from ${companyName}`}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Hello {previewName},</p>
                      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                        {getPersonalizedMessage(previewName)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {channels.includes('whatsapp') && (
                <div className="animate-fade-in" style={{ background: '#075e54', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ background: '#075e54', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366' }}></div>
                    WhatsApp Composer Pre-fill Preview
                  </div>
                  <div style={{ padding: '1rem', background: '#e5ddd5', minHeight: '100px', fontSize: '0.8rem', color: '#000' }}>
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)', maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                      {getPersonalizedMessage(previewName)}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Sparkles size={12} style={{ color: 'var(--accent-secondary)' }} />
                <span>Simulated preview for client: <strong>{previewName}</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* WhatsApp Dispatcher Queue Assistant Modal */}
      {isQueueOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '640px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={22} style={{ color: '#25D366' }} />
                <h2 style={{ fontSize: '1.25rem' }}>WhatsApp Broadcast Assistant</h2>
              </div>
              <button onClick={() => setIsQueueOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Below is the pending message dispatch list. Click <strong>"Send WhatsApp"</strong> on each client row to launch the WhatsApp Web/App helper composer.
            </p>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Client Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Phone</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '120px' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappQueue.map((client) => {
                      const isSent = sentQueueIds.has(client.id);
                      return (
                        <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color)', background: isSent ? 'rgba(37,211,102,0.02)' : 'transparent' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{client.name}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{client.phone || <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No phone number</span>}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {isSent ? (
                              <span style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600 }}>
                                Opened Link
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600 }}>
                                Pending Click
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button 
                              onClick={() => triggerWhatsAppLink(client)}
                              disabled={!client.phone}
                              className="btn btn-whatsapp"
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.75rem', 
                                display: 'inline-flex', 
                                gap: '0.25rem', 
                                width: '100%',
                                justifyContent: 'center',
                                border: '1px solid rgba(37, 211, 102, 0.35)'
                              }}
                            >
                              {isSent ? <Check size={12} /> : null}
                              <span>{isSent ? 'Send Again' : 'Send'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Progress: <strong style={{ color: '#25D366' }}>{sentQueueIds.size}</strong> / {whatsappQueue.length} messages initialized
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1.25rem' }} 
                onClick={() => {
                  setIsQueueOpen(false);
                  // Reset forms on queue close
                  setSubject('');
                  setMessage('');
                  setSelectedClients([]);
                  setSelectedIndividual('');
                }}
              >
                Close Assistant
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
