'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, DollarSign, CheckCircle2, Clock, Loader2, X, Download, Eye, Printer, Building2, UserCheck, Trash2, Landmark } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { numberToWordsRupees } from '@/lib/numberToWords';

export default function PayrollPage() {
  const { showToast } = useNotification();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    targetUserId: '',
    month: new Date().toISOString().substring(0, 7),
    basicSalary: 19800,
    allowances: 13200,
    deductions: 350,
    effectiveWorkDays: 30,
    lopDays: 0,
    customEarnings: [
      { label: 'HRA', amount: 7920 },
      { label: 'CONVEYANCE', amount: 1600 },
      { label: 'SPECIAL ALLOWANCE', amount: 3680 }
    ],
    customDeductions: [
      { label: 'GROUP MEDICAL INSURANCE', amount: 350 }
    ],
    status: 'Paid',
    notes: ''
  });

  const isAdmin = currentUser?.role === 'company_admin' || currentUser?.role === 'superadmin' || currentUser?.category === 'Company Admin' || currentUser?.category === 'Super Admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user || meData || null);
        if (meData.company?.currency) {
          setCompanyCurrency(meData.company.currency);
        }
      }

      const payrollRes = await fetch('/api/payroll');
      if (payrollRes.ok) {
        const pData = await payrollRes.json();
        setPayrolls(pData.payrolls || []);
      }

      const empRes = await fetch('/api/employees');
      if (empRes.ok) {
        const eData = await empRes.json();
        const emps = eData.employees || [];
        setEmployees(emps);
        if (emps.length > 0) {
          handleEmployeeSelect(emps[0]._id, emps);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading payroll data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEmployeeSelect = (empId, list = employees) => {
    const emp = list.find(e => e._id === empId);
    if (emp) {
      const basic = emp.salary?.basicSalary || 19800;
      const earnings = emp.salary?.customEarnings?.length > 0 ? emp.salary.customEarnings : [
        { label: 'HRA', amount: 7920 },
        { label: 'CONVEYANCE', amount: 1600 },
        { label: 'SPECIAL ALLOWANCE', amount: 3680 }
      ];
      const deductions = emp.salary?.customDeductions?.length > 0 ? emp.salary.customDeductions : [
        { label: 'GROUP MEDICAL INSURANCE', amount: 350 }
      ];
      const allowSum = earnings.reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const deductSum = deductions.reduce((s, i) => s + (Number(i.amount) || 0), 0);

      setForm(prev => ({
        ...prev,
        targetUserId: empId,
        basicSalary: basic,
        allowances: allowSum,
        deductions: deductSum,
        customEarnings: earnings,
        customDeductions: deductions,
        employeeNo: emp.employeeNo || '',
        designation: emp.designation || emp.category || '',
        department: emp.department || '',
        location: emp.location || '',
        bankName: emp.bankName || '',
        bankAccountNo: emp.bankAccountNo || '',
        panNumber: emp.panNumber || '',
        pfUan: emp.pfUan || '',
        joiningDate: emp.joiningDate || ''
      }));
    } else {
      setForm(prev => ({ ...prev, targetUserId: empId }));
    }
  };

  const handleAddModalEarning = () => {
    setForm(prev => ({
      ...prev,
      customEarnings: [...(prev.customEarnings || []), { label: '', amount: 0 }]
    }));
  };

  const handleUpdateModalEarning = (idx, field, val) => {
    setForm(prev => {
      const updated = [...(prev.customEarnings || [])];
      updated[idx] = { ...updated[idx], [field]: field === 'amount' ? (Number(val) || 0) : val };
      return { ...prev, customEarnings: updated };
    });
  };

  const handleRemoveModalEarning = (idx) => {
    setForm(prev => ({
      ...prev,
      customEarnings: (prev.customEarnings || []).filter((_, i) => i !== idx)
    }));
  };

  const handleAddModalDeduction = () => {
    setForm(prev => ({
      ...prev,
      customDeductions: [...(prev.customDeductions || []), { label: '', amount: 0 }]
    }));
  };

  const handleUpdateModalDeduction = (idx, field, val) => {
    setForm(prev => {
      const updated = [...(prev.customDeductions || [])];
      updated[idx] = { ...updated[idx], [field]: field === 'amount' ? (Number(val) || 0) : val };
      return { ...prev, customDeductions: updated };
    });
  };

  const handleRemoveModalDeduction = (idx) => {
    setForm(prev => ({
      ...prev,
      customDeductions: (prev.customDeductions || []).filter((_, i) => i !== idx)
    }));
  };

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    if (!form.targetUserId || !form.month) {
      showToast('Please select employee and month', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const sumEarnings = (form.customEarnings || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const sumDeductions = (form.customDeductions || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);

      const payload = {
        ...form,
        basicSalary: Number(form.basicSalary) || 0,
        allowances: sumEarnings,
        deductions: sumDeductions,
      };

      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Payroll processed successfully!', 'success');
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to process payroll', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPayrollSum = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">HR Payroll & Salary Slips</h1>
          <p className="page-subtitle">View compensation breakdowns, allowances, tax deductions, and print official salary slips.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Process Salary Slip</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{isAdmin ? 'Total Net Pay' : 'My Total Received Pay'}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{companyCurrency} {totalPayrollSum.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 174, 239, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Salary Slips</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{payrolls.length}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
            <div>Loading payroll records...</div>
          </div>
        ) : payrolls.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CreditCard size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
            <h3>No Payroll Slips Found</h3>
            <p>{isAdmin ? 'Click "Process Salary Slip" to issue payroll records.' : 'No salary slips have been issued for your account yet.'}</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Month</th>
                  <th>Basic Pay</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.userId?.username || 'Employee'}</td>
                    <td>{item.month}</td>
                    <td>{companyCurrency} {item.basicSalary?.toLocaleString()}</td>
                    <td style={{ color: '#10b981' }}>+{companyCurrency} {item.allowances?.toLocaleString()}</td>
                    <td style={{ color: '#ef4444' }}>-{companyCurrency} {item.deductions?.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{companyCurrency} {item.netSalary?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${item.status === 'Paid' ? 'badge-progress' : 'badge-planning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedSlip(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} />
                        <span>View Payslip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Corporate Payslip Detail Modal */}
      {mounted && typeof document !== 'undefined' && document.body && selectedSlip && createPortal(
        <div className="modal-overlay payslip-modal-overlay" onClick={() => setSelectedSlip(null)}>
          <div className="modal-content animate-fade-in payslip-modal-content" style={{ maxWidth: '820px', width: '95vw', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', background: '#ffffff', color: '#0f172a', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Controls (Hidden during print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>
                Official Corporate Salary Slip • {selectedSlip.month}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  <Printer size={16} />
                  <span>Print Payslip / Export PDF</span>
                </button>
                <button onClick={() => setSelectedSlip(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PRINTABLE PAYSLIP DOCUMENT CONTAINER */}
            <div id="printable-payslip-document" style={{ background: '#ffffff', color: '#000000', fontFamily: 'Inter, Arial, sans-serif', padding: '1rem', border: '1px solid #cbd5e1' }}>
              
              {/* Header Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, textTransform: 'capitalize', color: '#0f172a' }}>
                  Payslip for the month of {new Date(selectedSlip.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) !== 'Invalid Date' ? new Date(selectedSlip.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : selectedSlip.month}
                </h2>
              </div>

              {/* Employee & Bank Info Grid */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', padding: '0.6rem 0.75rem', borderRight: '1px solid #000000', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '6px' }}>
                        <strong>Name:</strong> <span>{selectedSlip.userId?.username || 'Employee'}</span>
                        <strong>Designation:</strong> <span>{selectedSlip.designation || selectedSlip.userId?.designation || 'Staff Member'}</span>
                        <strong>Department:</strong> <span>{selectedSlip.department || selectedSlip.userId?.department || 'General'}</span>
                        <strong>Location:</strong> <span>{selectedSlip.location || selectedSlip.userId?.location || 'HQ'}</span>
                        <strong>Effective Work Days:</strong> <span>{selectedSlip.effectiveWorkDays ?? 30}</span>
                        <strong>LOP:</strong> <span>{selectedSlip.lopDays ?? 0}</span>
                      </div>
                    </td>
                    <td style={{ width: '50%', padding: '0.6rem 0.75rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '6px' }}>
                        <strong>Employee No:</strong> <span>{selectedSlip.employeeNo || selectedSlip.userId?.employeeNo || 'EMP-101'}</span>
                        <strong>Bank:</strong> <span>{selectedSlip.bankName || selectedSlip.userId?.bankName || 'Standard Bank'}</span>
                        <strong>Bank Account No:</strong> <span>{selectedSlip.bankAccountNo || selectedSlip.userId?.bankAccountNo || '—'}</span>
                        <strong>PAN Number:</strong> <span>{selectedSlip.panNumber || selectedSlip.userId?.panNumber || '—'}</span>
                        <strong>PF UAN:</strong> <span>{selectedSlip.pfUan || selectedSlip.userId?.pfUan || '—'}</span>
                        <strong>Joining Date:</strong> <span>{selectedSlip.joiningDate || selectedSlip.userId?.joiningDate || '—'}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Earnings & Deductions Split Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000', background: '#f8fafc' }}>
                    <th colSpan={3} style={{ width: '50%', padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #000000', fontWeight: 800, fontSize: '0.95rem' }}>Earnings</th>
                    <th colSpan={3} style={{ width: '50%', padding: '0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>Deduction</th>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000000', fontWeight: 700 }}>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', borderRight: '1px solid #000000' }}>YTD</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Basic Row */}
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>BASIC</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{(selectedSlip.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', borderRight: '1px solid #000000' }}>{(selectedSlip.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    
                    {/* First Deduction (if any) */}
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      {selectedSlip.customDeductions && selectedSlip.customDeductions[0] ? selectedSlip.customDeductions[0].label : (selectedSlip.deductions > 0 ? 'DEDUCTIONS' : '')}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      {selectedSlip.customDeductions && selectedSlip.customDeductions[0] ? selectedSlip.customDeductions[0].amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (selectedSlip.deductions > 0 ? selectedSlip.deductions?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '')}
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                      {selectedSlip.customDeductions && selectedSlip.customDeductions[0] ? selectedSlip.customDeductions[0].amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (selectedSlip.deductions > 0 ? selectedSlip.deductions?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '')}
                    </td>
                  </tr>

                  {/* Render Custom Earnings vs Remaining Deductions */}
                  {Array.from({ length: Math.max(
                    (selectedSlip.customEarnings?.length || 0),
                    Math.max(0, (selectedSlip.customDeductions?.length || 0) - 1)
                  ) }).map((_, idx) => {
                    const earn = selectedSlip.customEarnings ? selectedSlip.customEarnings[idx] : null;
                    const deduct = selectedSlip.customDeductions ? selectedSlip.customDeductions[idx + 1] : null;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.4rem 0.6rem' }}>{earn ? earn.label : ''}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{earn ? earn.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', borderRight: '1px solid #000000' }}>{earn ? earn.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>

                        <td style={{ padding: '0.4rem 0.6rem' }}>{deduct ? deduct.label : ''}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{deduct ? deduct.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{deduct ? deduct.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  {(() => {
                    const totalEarningSum = (selectedSlip.basicSalary || 0) + (selectedSlip.allowances || 0);
                    const totalDeductionsSum = selectedSlip.deductions || 0;

                    return (
                      <tr style={{ borderTop: '1px solid #000000', fontWeight: 800, background: '#f8fafc' }}>
                        <td style={{ padding: '0.5rem 0.6rem' }}>Total Earnings: INR.</td>
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{totalEarningSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', borderRight: '1px solid #000000' }}>{totalEarningSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

                        <td style={{ padding: '0.5rem 0.6rem' }}>Total Deductions: INR.</td>
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{totalDeductionsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{totalDeductionsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>

              {/* Net Pay & Words Banner */}
              <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem' }}>Net Pay for the month :</strong>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{(selectedSlip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ fontStyle: 'italic', color: '#475569', fontSize: '0.88rem' }}>
                  ({numberToWordsRupees(selectedSlip.netSalary || 0)})
                </div>
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.6rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                This is a system generated payslip and does not require signature
              </div>
            </div>

            {/* Print CSS Rules */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                .payslip-modal-overlay, .payslip-modal-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  box-shadow: none !important;
                }
                #printable-payslip-document, #printable-payslip-document * {
                  visibility: visible !important;
                }
                #printable-payslip-document {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 20px !important;
                  border: 1px solid #000 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}

      {/* Process Salary Slip Modal */}
      {mounted && typeof document !== 'undefined' && document.body && isModalOpen && isAdmin && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '640px', width: '92vw', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Process Employee Salary Slip</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Select employee and customize monthly earnings / deductions</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreatePayroll}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-select"
                    value={form.targetUserId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.username} ({emp.email || 'No email'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Pay Period (Month) *</label>
                  <input
                    type="month"
                    className="form-input"
                    value={form.month}
                    onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Effective Work Days</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.effectiveWorkDays}
                    onChange={(e) => setForm(prev => ({ ...prev, effectiveWorkDays: e.target.value }))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">LOP Days</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.lopDays}
                    onChange={(e) => setForm(prev => ({ ...prev, lopDays: e.target.value }))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">BASIC SALARY *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.basicSalary}
                  onChange={(e) => setForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                  required
                />
              </div>

              {/* Dynamic Earnings Section */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>+ EARNING COMPONENTS</span>
                  <button
                    type="button"
                    onClick={handleAddModalEarning}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={12} />
                    <span>Add Earning</span>
                  </button>
                </div>

                {(form.customEarnings || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.8rem' }}
                      placeholder="Label (e.g. HRA)"
                      value={item.label}
                      onChange={(e) => handleUpdateModalEarning(idx, 'label', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.8rem' }}
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={(e) => handleUpdateModalEarning(idx, 'amount', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveModalEarning(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Dynamic Deductions Section */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>- DEDUCTION COMPONENTS</span>
                  <button
                    type="button"
                    onClick={handleAddModalDeduction}
                    className="btn btn-secondary"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={12} />
                    <span>Add Deduction</span>
                  </button>
                </div>

                {(form.customDeductions || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.8rem' }}
                      placeholder="Label (e.g. PF)"
                      value={item.label}
                      onChange={(e) => handleUpdateModalDeduction(idx, 'label', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.8rem' }}
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={(e) => handleUpdateModalDeduction(idx, 'amount', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveModalDeduction(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Calculated Summary Box */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 174, 239, 0.05)', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(0, 174, 239, 0.2)' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Total Net Pay:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                  {companyCurrency} {Math.max(0, (Number(form.basicSalary || 0) + (form.customEarnings || []).reduce((s, i) => s + (Number(i.amount) || 0), 0)) - (form.customDeductions || []).reduce((s, i) => s + (Number(i.amount) || 0), 0)).toLocaleString()}
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px', fontWeight: 700 }} disabled={submitting}>
                {submitting ? 'Processing Payslip...' : 'Generate & Issue Salary Slip'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
