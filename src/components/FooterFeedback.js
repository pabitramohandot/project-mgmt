'use client';

import { useState } from 'react';
import { Bug, MessageSquare, Lightbulb, X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function FooterFeedback() {
  const { showToast } = useNotification();
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'bug' | 'feature' | null
  const [uploadingFile, setUploadingFile] = useState(false);
  const [screenshotPath, setScreenshotPath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forms states
  const [bugForm, setBugForm] = useState({
    page: '',
    description: ''
  });
  
  const [featureForm, setFeatureForm] = useState({
    description: '',
    referenceUrl: ''
  });

  const handleWhatsAppChat = () => {
    window.open('https://wa.me/919777778223', '_blank');
  };

  const openModal = (type) => {
    setActiveModal(type);
    setScreenshotPath('');
    setBugForm({ page: '', description: '' });
    setFeatureForm({ description: '', referenceUrl: '' });
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file.', 'error');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setScreenshotPath(data.filePath);
      showToast('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      showToast('Failed to upload image.', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotPath('');
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugForm.page) {
      showToast('Please select the page where the bug occurred.', 'error');
      return;
    }
    if (!bugForm.description.trim()) {
      showToast('Please enter a description of the bug.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          page: bugForm.page,
          description: bugForm.description,
          screenshot: screenshotPath
        }),
      });

      if (res.ok) {
        showToast('Bug reported successfully! Admin will look into it.', 'success');
        closeModal();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to report bug.', 'error');
      }
    } catch (error) {
      console.error('Bug reporting error:', error);
      showToast('Error sending report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    if (!featureForm.description.trim()) {
      showToast('Please enter a description of the feature request.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feature',
          description: featureForm.description,
          referenceUrl: featureForm.referenceUrl,
          screenshot: screenshotPath
        }),
      });

      if (res.ok) {
        showToast('Feature request submitted successfully!', 'success');
        closeModal();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit feature request.', 'error');
      }
    } catch (error) {
      console.error('Feature request error:', error);
      showToast('Error sending feature request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Widget Row */}
      <div className="feedback-footer-container no-print">
        <button onClick={() => openModal('bug')} className="feedback-btn" title="Report a Bug">
          <Bug size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span>Add Bug</span>
        </button>
        <button onClick={handleWhatsAppChat} className="feedback-btn" title="Chat with Admin on WhatsApp">
          <MessageSquare size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span className="hide-mobile-text">Chat with Admin</span>
          <span className="show-mobile-text">Chat Admin</span>
        </button>
        <button onClick={() => openModal('feature')} className="feedback-btn" title="Request a Feature">
          <Lightbulb size={18} style={{ color: '#eab308', flexShrink: 0 }} />
          <span>Add Feature</span>
        </button>
      </div>

      {/* Bug Report Modal */}
      {activeModal === 'bug' && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700 }}>
                <Bug size={20} style={{ color: '#ef4444' }} />
                <span>Report a Bug</span>
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBugSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Page *</label>
                <select 
                  className="form-input" 
                  required 
                  value={bugForm.page} 
                  onChange={(e) => setBugForm({ ...bugForm, page: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                >
                  <option value="">-- Select Page --</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="Projects">Projects</option>
                  <option value="Clients">Clients</option>
                  <option value="Invoices">Invoices</option>
                  <option value="Credentials">Credentials</option>
                  <option value="Pending Tasks">Pending Tasks</option>
                  <option value="Announcements">Announcements</option>
                  <option value="Branding Settings">Branding Settings</option>
                  <option value="Profile Settings">Profile Settings</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Bug Description *</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  required 
                  placeholder="Describe the issue, what happened, and how to reproduce it..."
                  value={bugForm.description} 
                  onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              {/* Upload Screenshot */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Upload Screenshot (Optional)</label>
                {screenshotPath ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={screenshotPath} alt="Screenshot preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={handleRemoveScreenshot}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    transition: 'all 0.2s'
                  }}>
                    {uploadingFile ? (
                      <>
                        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uploading image...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to upload screenshot</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      disabled={uploadingFile}
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || uploadingFile}
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-primary)'
                  }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Report Bug</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Request Modal */}
      {activeModal === 'feature' && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700 }}>
                <Lightbulb size={20} style={{ color: '#eab308' }} />
                <span>Request a Feature</span>
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFeatureSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Feature Description *</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  required 
                  placeholder="Describe the feature you want, why it is helpful, and how it should function..."
                  value={featureForm.description} 
                  onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Reference URL (Optional)</label>
                <input 
                  type="url"
                  className="form-input" 
                  placeholder="https://example.com/some-example-ui"
                  value={featureForm.referenceUrl} 
                  onChange={(e) => setFeatureForm({ ...featureForm, referenceUrl: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px' }}
                />
              </div>

              {/* Upload Screenshot/Image */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>Reference Image (Optional)</label>
                {screenshotPath ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={screenshotPath} alt="Reference preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={handleRemoveScreenshot}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.01)',
                    transition: 'all 0.2s'
                  }}>
                    {uploadingFile ? (
                      <>
                        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uploading image...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to upload reference image</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      disabled={uploadingFile}
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeModal} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || uploadingFile}
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-primary)'
                  }}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Submit Feature</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS Styling for Footer Widget */}
      <style jsx global>{`
        .show-mobile-text {
          display: none;
        }

        .feedback-footer-container {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 16px;
          z-index: 999;
          align-items: center;
        }

        .feedback-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff !important;
          color: #1e293b !important;
          border: 1px solid rgba(226, 232, 240, 0.85) !important;
          padding: 10px 22px !important;
          border-radius: 30px !important;
          font-size: 0.925rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          line-height: 1 !important;
        }

        .feedback-btn:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -8px rgba(0, 0, 0, 0.1) !important;
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }

        .feedback-btn:active {
          transform: translateY(0) !important;
        }

        /* Phone Responsive Stacking Action Dock */
        @media (max-width: 768px) {
          .show-mobile-text {
            display: inline !important;
          }
          .hide-mobile-text {
            display: none !important;
          }
          .feedback-footer-container {
            bottom: 16px !important;
            left: 16px !important;
            right: 16px !important;
            width: calc(100% - 32px) !important;
            transform: none !important;
            display: grid !important;
            grid-template-columns: 1fr 1.15fr 1fr !important;
            gap: 8px !important;
            background: var(--bg-secondary) !important;
            padding: 8px !important;
            border-radius: 16px !important;
            border: 1px solid var(--border-color) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15) !important;
          }
          .feedback-btn {
            padding: 8px 4px !important;
            font-size: 0.72rem !important;
            border-radius: 10px !important;
            width: 100% !important;
            justify-content: center !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
            gap: 4px !important;
            transform: none !important;
          }
          .feedback-btn span {
            display: inline !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
    </>
  );
}
