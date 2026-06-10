'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ToggleLeft, ToggleRight, Building, Clock, Pencil, Trash2 } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function CompaniesPage() {
  const { showToast, showConfirm } = useNotification();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/superadmin/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      } else {
        showToast('Failed to fetch companies', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const toggleCompanyStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/superadmin/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        showToast('Company status updated successfully', 'success');
        fetchCompanies();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update company status', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating company status', 'error');
    }
  };

  const handleDeleteCompany = (id, name) => {
    showConfirm({
      title: 'Delete Company',
      message: `Are you sure you want to delete company "${name}"? This will permanently delete the company and all its associated users, projects, clients, invoices, and credentials. This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/superadmin/companies/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Company and all associated data deleted successfully', 'success');
            fetchCompanies();
          } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete company', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting company', 'error');
        }
      }
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin: Companies</h1>
          <p className="page-subtitle">Manage registered companies, brand identifiers, and active tenant workspaces.</p>
        </div>
        <div>
          <Link href="/superadmin/companies/new" className="btn btn-primary">
            <Plus size={18} />
            <span>Create Company</span>
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading companies registry...
          </div>
        ) : companies.length === 0 ? (
          <div className="empty-state">
            <Building size={48} style={{ color: 'var(--text-muted)' }} />
            <h3>No Companies Found</h3>
            <p>Create a tenant company to register users and allocate isolated workspaces.</p>
            <Link href="/superadmin/companies/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create Company
            </Link>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Slug / Route</th>
                  <th>Contact Email</th>
                  <th>Primary Colors</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((comp) => (
                  <tr key={comp._id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {comp.logo ? (
                          <img src={comp.logo} alt={comp.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '2px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {comp.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{comp.name}</span>
                      </div>
                    </td>
                    <td>
                      <code>/{comp.slug}</code>
                    </td>
                    <td>{comp.contactEmail || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: comp.brandColors?.primary || '#00aeef', border: '1px solid rgba(255,255,255,0.1)' }}></span>
                        <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: comp.brandColors?.secondary || '#f26522', border: '1px solid rgba(255,255,255,0.1)' }}></span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${comp.isActive ? 'badge-completed' : 'badge-planning'}`} style={{ fontSize: '0.7rem' }}>
                        {comp.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Clock size={12} />
                        <span>{new Date(comp.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => toggleCompanyStatus(comp._id, comp.isActive)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          title={comp.isActive ? "Suspend Company" : "Activate Company"}
                        >
                          {comp.isActive ? <ToggleRight size={24} style={{ color: '#10b981' }} /> : <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />}
                        </button>
                        <Link href={`/superadmin/companies/${comp._id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', gap: '4px' }}>
                          <Pencil size={12} />
                          <span>Edit</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteCompany(comp._id, comp.name)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', gap: '4px', color: 'var(--status-overdue)' }}
                          title="Delete Company"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
