'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Check, Clock, AlertCircle, Download, X } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function InvoiceDetailPage() {
  const { showToast } = useNotification();
  const params = useParams();
  const id = params.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      setInvoice(data);

      const searchParams = new URLSearchParams(window.location.search);

      // Auto-send PDF if ?send=true is in URL
      if (searchParams.get('send') === 'true' && !updating && !hasAutoSent) {
        setHasAutoSent(true);
        setUpdating(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(async () => {
          const element = document.querySelector('.invoice-sheet');
          if (element) {
            try {
              if (!window.html2pdf) {
                await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                  script.onload = resolve;
                  script.onerror = reject;
                  document.body.appendChild(script);
                });
              }

              const opt = {
                margin:       0.25,
                filename:     `invoice-${data.invoiceNumber}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
              };

              const pdfDataUri = await window.html2pdf().from(element).set(opt).outputPdf('datauristring');
              const pdfBase64 = pdfDataUri.split(',')[1];

              const sendRes = await fetch(`/api/invoices/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Sent', pdfBase64 }),
              });
              if (!sendRes.ok) throw new Error('Failed to send invoice email');
              const updated = await sendRes.json();
              setInvoice(updated);

              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err) {
              console.error('Error auto-sending invoice:', err);
              showToast(err.message, 'error');
            } finally {
              setUpdating(false);
            }
          } else {
            setUpdating(false);
          }
        }, 1500);
      }
      // Auto-download PDF if ?download=true is in URL
      else if (searchParams.get('download') === 'true') {
        setTimeout(() => {
          const element = document.querySelector('.invoice-sheet');
          if (element) {
            const opt = {
              margin:       0.25,
              filename:     `invoice-${data.invoiceNumber}.pdf`,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => {
              window.html2pdf().from(element).set(opt).save();
            };
            document.body.appendChild(script);
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.loggedIn);
        setUserRole(data.role || '');
      }
    } catch (e) {
      setIsAdmin(false);
      setUserRole('');
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
      checkAdmin();
    }
  }, [id]);

  useEffect(() => {
    if (invoice?.companyId?.brandColors) {
      document.documentElement.style.setProperty('--accent-primary', invoice.companyId.brandColors.primary || '#00aeef');
      document.documentElement.style.setProperty('--accent-secondary', invoice.companyId.brandColors.secondary || '#f26522');
    }
  }, [invoice]);

  const handleUpdateStatus = async (newStatus, paymentMethod = '') => {
    try {
      setUpdating(true);
      let pdfBase64 = null;

      if (newStatus === 'Sent') {
        const element = document.querySelector('.invoice-sheet');
        if (element) {
          if (!window.html2pdf) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });
          }

          const opt = {
            margin:       0.25,
            filename:     `invoice-${invoice.invoiceNumber}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
          };

          const pdfDataUri = await window.html2pdf().from(element).set(opt).outputPdf('datauristring');
          pdfBase64 = pdfDataUri.split(',')[1];
        }
      }

      const payload = { status: newStatus, pdfBase64 };
      if (newStatus === 'Paid') {
        payload.paymentMethod = paymentMethod;
      }

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedInvoice = await res.json();
      setInvoice(updatedInvoice);
      showToast(`Invoice marked as ${newStatus}`, 'success');
      setIsPaymentModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.invoice-sheet');
    if (!element) return;
    
    const opt = {
      margin:       0.25,
      filename:     `invoice-${invoice.invoiceNumber}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      window.html2pdf().from(element).set(opt).save();
    };
    document.body.appendChild(script);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h3>Loading invoice details...</h3>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="empty-state" style={{ color: '#ef4444' }}>
        <AlertCircle size={48} />
        <h3>Error Loading Invoice</h3>
        <p>{error || 'Invoice not found'}</p>
        <Link href="/invoices" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Invoices
        </Link>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const taxAmount = invoice.subtotal * (invoice.taxRate / 100);
  const discountAmount = invoice.subtotal * (invoice.discountRate / 100);

  return (
    <div className="public-invoice-container animate-fade-in">
      <div style={{ width: '100%', maxWidth: '900px' }}>
        {/* Action header - hidden on print */}
        <div className="invoice-detail-header no-print">
          {isAdmin ? (
            <Link href="/invoices" className="invoice-back-link">
              <ArrowLeft size={16} />
              <span>Back to Invoices</span>
            </Link>
          ) : (
            <div /> // placeholder for flex alignment
          )}
          
          <div className="invoice-detail-actions">
            {updating && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock className="animate-spin" size={14} />
                <span>Processing...</span>
              </span>
            )}
            {isAdmin && userRole !== 'company_user' && invoice.status !== 'Paid' && (
              <button 
                className="btn btn-secondary" 
                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={updating}
              >
                <Check size={16} />
                <span>Mark as Paid</span>
              </button>
            )}
            {isAdmin && userRole !== 'company_user' && (invoice.status === 'Draft' || invoice.status === 'Sent') && (
              <button 
                className="btn btn-secondary" 
                style={{ color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                onClick={() => handleUpdateStatus('Sent')}
                disabled={updating}
              >
                <span>{invoice.status === 'Sent' ? 'Resend Email' : 'Send Email'}</span>
              </button>
            )}
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Invoice Layout Sheet */}
        <div className="invoice-sheet">
          {/* Header Section */}
          <div className="invoice-header">
            <div>
              {invoice.companyId?.logo ? (
                <img 
                  src={
                    invoice.companyId.logo.startsWith('data:')
                      ? invoice.companyId.logo
                      : `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(invoice.companyId.logo)}`
                  }
                  alt="Company Logo" 
                  crossOrigin="anonymous"
                  style={{ height: 'auto', maxHeight: '60px', width: 'auto', maxWidth: '240px', objectFit: 'contain' }} 
                />
              ) : (
                <>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
                    {invoice.companyId?.name || 'Workspace'}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {invoice.companyId?.tagline || 'Development & Consulting Services'}
                  </p>
                </>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 300, color: '#64748b', margin: 0 }}>INVOICE</h1>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '0.25rem' }}>
                {invoice.invoiceNumber}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="invoice-details-grid" style={{ gridTemplateColumns: '1fr 1fr 1.2fr' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Billed From
              </h4>
              <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {invoice.companyId?.name || 'Workspace'}
                </strong> <br />
                {invoice.companyId?.contactEmail ? (
                  <span style={{ color: '#64748b', display: 'block' }}>{invoice.companyId.contactEmail}</span>
                ) : (
                  <span style={{ color: '#64748b', display: 'block' }}>Contact email not set</span>
                )}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Billed To
              </h4>
              <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5' }}>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                  {invoice.clientCompany || invoice.client?.company || invoice.clientName}
                </strong> <br />
                {(invoice.clientAddress || invoice.client?.address) ? (
                  <span style={{ color: '#64748b', display: 'block', whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>
                    {invoice.clientAddress || invoice.client?.address}
                  </span>
                ) : (
                  invoice.clientEmail && <span style={{ color: '#64748b', display: 'block' }}>{invoice.clientEmail}</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', textAlign: 'left' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                    Date Issued
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 500 }}>
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                    Due Date
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 600 }}>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Project / Direct Billing Context */}
          <div className="invoice-project-link-card">
            <div>
              {invoice.project ? (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Project Linked</span>
                  <strong style={{ color: '#334155' }}>{invoice.project.name}</strong>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Billing Type</span>
                  <strong style={{ color: '#334155' }}>Direct Client Invoice</strong>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge badge-${invoice.status.toLowerCase()}`} style={{ padding: '0.35rem 0.85rem' }}>
                {invoice.status}
              </span>
              {invoice.status === 'Paid' && invoice.paymentMethod && (
                <span className="no-print" style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.08)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                  via {invoice.paymentMethod}
                </span>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Qty</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Rate</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 500 }}>{item.description}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {formatCurrency(item.quantity * item.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="invoice-totals-grid">
            {/* Notes placeholder — moved to dedicated section below */}
            <div />

            {/* Math calculation */}
            <div className="invoice-totals">
              <div className="invoice-total-row">
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="invoice-total-row">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {invoice.discountRate > 0 && (
                <div className="invoice-total-row">
                  <span>Discount ({invoice.discountRate}%):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="invoice-total-row grand-total">
                <span>Total Due:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Banking / Payment Details Section */}
          {(invoice.companyId?.bankDetails || invoice.companyId?.bankQrCode) && (
            <div style={{
              marginTop: '2rem',
              borderTop: '2px solid #e2e8f0',
              paddingTop: '1.5rem',
            }}>
              <h4 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
              }}>
                Payment Details
              </h4>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {invoice.companyId?.bankDetails && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <pre style={{
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      color: '#334155',
                      lineHeight: '1.8',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {invoice.companyId.bankDetails}
                    </pre>
                  </div>
                )}
                {invoice.companyId?.bankQrCode && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <img
                      src={
                        invoice.companyId.bankQrCode.startsWith('data:')
                          ? invoice.companyId.bankQrCode
                          : `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(invoice.companyId.bankQrCode)}`
                      }
                      alt="Payment QR Code"
                      crossOrigin="anonymous"
                      style={{
                        width: '200px',
                        height: '200px',
                        objectFit: 'contain',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'block',
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem' }}>Scan to Pay</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note Section */}
          {invoice.notes && (
            <div style={{
              marginTop: '1.5rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #94a3b8',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
            }}>
              <h4 style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
              }}>
                Note
              </h4>
              <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
            Thank you for your business! If you have any questions regarding this invoice, please reach out.
          </div>
        </div>
      </div>

      {/* Payment Method Selector Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Select Payment Method</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Specify how the client paid this invoice:
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Payment Type</label>
              <select 
                className="form-select"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleUpdateStatus('Paid', selectedPaymentMethod)} 
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
                disabled={updating}
              >
                Confirm & Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
