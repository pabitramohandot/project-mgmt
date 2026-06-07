'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Check, Clock, AlertCircle, Download } from 'lucide-react';
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
  const [hasAutoSent, setHasAutoSent] = useState(false);

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
      }
    } catch (e) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
      checkAdmin();
    }
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
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

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, pdfBase64 }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedInvoice = await res.json();
      setInvoice(updatedInvoice);
      showToast(`Invoice marked as ${newStatus}`, 'success');
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
            {isAdmin && invoice.status !== 'Paid' && (
              <button 
                className="btn btn-secondary" 
                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                onClick={() => handleUpdateStatus('Paid')}
                disabled={updating}
              >
                <Check size={16} />
                <span>Mark as Paid</span>
              </button>
            )}
            {isAdmin && invoice.status === 'Draft' && (
              <button 
                className="btn btn-secondary" 
                style={{ color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                onClick={() => handleUpdateStatus('Sent')}
                disabled={updating}
              >
                <span>Send Email</span>
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
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                IONETWEB
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Development & Consulting Services</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 300, color: '#64748b', margin: 0 }}>INVOICE</h1>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '0.25rem' }}>
                {invoice.invoiceNumber}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="invoice-details-grid">
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
            <div>
              <span className={`badge badge-${invoice.status.toLowerCase()}`} style={{ padding: '0.35rem 0.85rem' }}>
                {invoice.status}
              </span>
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
            {/* Notes */}
            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
              {invoice.notes && (
                <>
                  <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Notes & Terms</h4>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
                </>
              )}
            </div>

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

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '4rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
            Thank you for your business! If you have any questions regarding this invoice, please reach out.
          </div>
        </div>
      </div>
    </div>
  );
}
