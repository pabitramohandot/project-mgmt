'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Contact,
  Search,
  Mail,
  Phone,
  Building,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import { formatCurrency as fmtCurrency } from '@/lib/currency';

export default function ContactsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [companyCurrency, setCompanyCurrency] = useState('INR');
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const [res, meRes] = await Promise.all([
        fetch(`/api/crm/contacts?search=${encodeURIComponent(search)}`),
        fetch('/api/auth/me')
      ]);
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.company?.currency) setCompanyCurrency(meData.company.currency);
      }
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const formatCurrency = (val) => {
    return fmtCurrency(val || 0, companyCurrency);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
            <Contact size={28} style={{ color: 'var(--accent-primary)' }} />
            CRM Contact Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Consolidated directory of all client and lead contact representatives.
          </p>
        </div>

        <Link href="/crm/leads?action=add" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
          <Plus size={16} /> Add Lead Contact
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search contact by name, email, phone, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', height: '40px' }}
          />
        </div>
      </div>

      {/* Contacts Cards Grid */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
      ) : contacts.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {contacts.map((contact, idx) => (
            <div key={idx} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justify: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{contact.name}</h3>
                  {contact.company && (
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Building size={14} style={{ color: 'var(--text-muted)' }} /> {contact.company}
                    </p>
                  )}
                </div>
                <span
                  className="badge"
                  style={{
                    background: contact.type.includes('Client') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: contact.type.includes('Client') ? '#10b981' : '#3b82f6',
                    fontSize: '0.68rem'
                  }}
                >
                  {contact.type}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {contact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <a href={`mailto:${contact.email}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <a href={`tel:${contact.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {contact.phone}
                    </a>
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Deals</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{contact.totalDeals}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Value</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCurrency(contact.totalValue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
