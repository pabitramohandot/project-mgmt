'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Plus, Calendar as CalendarIcon, Loader2, X, Trash2, PartyPopper, Sparkles, Clock, Download, Upload, FileSpreadsheet, FileJson, Check, AlertCircle } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function HolidaysPage() {
  const { showToast, showConfirm } = useNotification();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    title: '',
    date: '',
    type: 'Mandatory',
    description: ''
  });

  const isAdmin = currentUser?.role === 'company_admin' || currentUser?.role === 'superadmin' || currentUser?.category === 'Company Admin' || currentUser?.category === 'Super Admin';

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user || meData || null);
      }

      const res = await fetch('/api/holidays');
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading holidays calendar', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      showToast('Title and Date are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showToast('Holiday added successfully!', 'success');
        setIsModalOpen(false);
        setForm({ title: '', date: '', type: 'Mandatory', description: '' });
        fetchHolidays();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add holiday', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = (id, title) => {
    showConfirm({
      title: 'Remove Holiday',
      message: `Are you sure you want to remove holiday "${title}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/holidays?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Holiday removed', 'success');
            fetchHolidays();
          }
        } catch (e) {
          console.error(e);
          showToast('Failed to remove holiday', 'error');
        }
      }
    });
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (holidays.length === 0) {
      showToast('No holidays available to export', 'error');
      return;
    }
    const headers = ['Title', 'Date', 'Type', 'Description'];
    const rows = holidays.map(h => [
      `"${(h.title || '').replace(/"/g, '""')}"`,
      `"${(h.date || '').replace(/"/g, '""')}"`,
      `"${(h.type || 'Mandatory').replace(/"/g, '""')}"`,
      `"${(h.description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `company_holidays_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Holidays exported to CSV!', 'success');
  };

  // JSON Export Handler
  const handleExportJSON = () => {
    if (holidays.length === 0) {
      showToast('No holidays available to export', 'error');
      return;
    }
    const cleanData = holidays.map(h => ({
      title: h.title,
      date: h.date,
      type: h.type || 'Mandatory',
      description: h.description || ''
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `company_holidays_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Holidays exported to JSON!', 'success');
  };

  // Download Sample CSV
  const handleDownloadSampleCSV = () => {
    const sampleCSV = `Title,Date,Type,Description
New Year's Day,2026-01-01,Mandatory,Public Holiday
Republic Day,2026-01-26,Mandatory,National Holiday
Holi,2026-03-04,Optional,Festival of Colors
Good Friday,2026-04-03,Mandatory,Public Holiday
Independence Day,2026-08-15,Mandatory,National Holiday
Diwali,2026-11-08,Mandatory,Festival of Lights
Christmas,2026-12-25,Mandatory,Public Holiday`;

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + sampleCSV);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_holidays_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // File Upload Parser
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed) ? parsed : (parsed.holidays || []);
          const valid = list.filter(item => item && item.title && item.date).map(item => ({
            title: String(item.title).trim(),
            date: String(item.date).trim(),
            type: item.type === 'Optional' || item.type === 'Floating' ? 'Optional' : 'Mandatory',
            description: item.description ? String(item.description).trim() : ''
          }));
          setImportPreview(valid);
        } catch (err) {
          showToast('Invalid JSON file format', 'error');
          setImportPreview([]);
        }
      } else {
        // Parse CSV
        try {
          const lines = text.split(/\r\n|\n/);
          if (lines.length <= 1) {
            showToast('CSV file is empty', 'error');
            return;
          }
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
          const titleIdx = headers.indexOf('title') !== -1 ? headers.indexOf('title') : 0;
          const dateIdx = headers.indexOf('date') !== -1 ? headers.indexOf('date') : 1;
          const typeIdx = headers.indexOf('type') !== -1 ? headers.indexOf('type') : 2;
          const descIdx = headers.indexOf('description') !== -1 ? headers.indexOf('description') : 3;

          const parsedList = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));
            
            const title = cleanCols[titleIdx] || '';
            const date = cleanCols[dateIdx] || '';
            const type = (cleanCols[typeIdx] || '').toLowerCase().includes('option') || (cleanCols[typeIdx] || '').toLowerCase().includes('float') ? 'Optional' : 'Mandatory';
            const description = cleanCols[descIdx] || '';

            if (title && date) {
              parsedList.push({ title, date, type, description });
            }
          }
          setImportPreview(parsedList);
        } catch (err) {
          showToast('Error parsing CSV file', 'error');
          setImportPreview([]);
        }
      }
    };

    reader.readAsText(file);
  };

  // Bulk Import Submit
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) {
      showToast('No valid holiday records to import', 'error');
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: importPreview })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully imported ${data.count || importPreview.length} holidays!`, 'success');
        setIsImportModalOpen(false);
        setImportPreview([]);
        setImportFileName('');
        fetchHolidays();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to import holidays', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error during import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Find next upcoming holiday
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingHolidays = holidays.filter(h => h.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const nextHoliday = upcomingHolidays[0];

  let daysAway = null;
  if (nextHoliday) {
    const diffTime = new Date(nextHoliday.date) - new Date(todayStr);
    daysAway = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Company Holidays & Calendar</h1>
          <p className="page-subtitle">View company-wide paid holidays, floating leaves, and upcoming calendar events.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {holidays.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export Holidays as CSV"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleExportJSON}
                title="Export Holidays as JSON"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <FileJson size={15} />
                <span>Export JSON</span>
              </button>
            </div>
          )}

          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setImportPreview([]);
                  setImportFileName('');
                  setIsImportModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Upload size={15} />
                <span>Import Holidays</span>
              </button>

              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} />
                <span>Add Holiday</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Holiday Banner */}
      {nextHoliday && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 174, 239, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
          border: '1px solid var(--accent-primary-glow)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PartyPopper size={26} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Upcoming Holiday</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{nextHoliday.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{nextHoliday.date} ({new Date(nextHoliday.date).toLocaleDateString('en-US', { weekday: 'long' })})</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {daysAway === 0 ? 'Today is a Holiday! 🎉' : `${daysAway} Day${daysAway > 1 ? 's' : ''} Away`}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sun size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Holidays</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{holidays.length}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
            <div>Loading holidays...</div>
          </div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <PartyPopper size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h3>No Holidays Listed</h3>
            <p>Holiday schedule will appear here when configured by company admin.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Holiday Event</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Category</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {holidays.map((item) => {
                  const dayName = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' });
                  return (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600 }}>{item.title}</td>
                      <td>{item.date}</td>
                      <td>{dayName}</td>
                      <td>
                        <span className={`badge ${item.type === 'Mandatory' ? 'badge-progress' : 'badge-planning'}`}>
                          {item.type}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteHoliday(item._id, item.title)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Single Holiday Modal */}
      {mounted && typeof document !== 'undefined' && document.body && isModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem' }}>Add Holiday Event</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateHoliday}>
              <div className="form-group">
                <label className="form-label">Holiday Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Independence Day"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="Mandatory">Mandatory Public Holiday</option>
                  <option value="Optional">Optional / Floating Holiday</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', marginTop: '1rem' }} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Holiday'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Import Holidays Modal */}
      {mounted && typeof document !== 'undefined' && document.body && isImportModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '580px', width: '92vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Bulk Import Holidays</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Upload a CSV or JSON file containing holiday dates</span>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>1. Select File (.csv or .json)</span>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={13} />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept=".csv, .json"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <Upload size={32} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem', opacity: 0.8 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {importFileName ? `Selected: ${importFileName}` : 'Click or Drag & Drop File Here'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Supports CSV (Title, Date, Type, Description) or JSON formats
                </div>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {importPreview.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} />
                    <span>2. Preview Parsed Holidays ({importPreview.length} records ready)</span>
                  </span>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{item.title}</td>
                          <td>{item.date}</td>
                          <td>
                            <span className={`badge ${item.type === 'Mandatory' ? 'badge-progress' : 'badge-planning'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmImport}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', fontWeight: 700 }}
              disabled={importing || importPreview.length === 0}
            >
              {importing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Importing Holidays...</span>
                </span>
              ) : (
                `Import ${importPreview.length} Holiday${importPreview.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
