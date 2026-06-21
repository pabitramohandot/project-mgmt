'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Eye, EyeOff, LayoutDashboard } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (searchParams.get('suspended') === 'true') {
      setError('Your company account has been suspended. Please contact the administrator.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      sessionStorage.setItem('session_active', 'true');
      router.push(redirect);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ fontWeight: 'bold' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Username */}
      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          ADMIN USERNAME
        </label>
        <div style={{ position: 'relative' }}>
          <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Username"
            className="form-input"
            style={{ paddingLeft: '2.75rem' }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Password */}
      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label className="form-label" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          PASSWORD
        </label>
        <div style={{ position: 'relative' }}>
          <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="form-input"
            style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary"
        style={{
          width: '100%',
          padding: '0.85rem',
          fontSize: '0.95rem',
          fontWeight: 600,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
        disabled={loading}
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0c1c2e 0%, #03070b 100%)',
      padding: '1.5rem',
      '--text-primary': '#ffffff',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--border-color': 'rgba(255, 255, 255, 0.12)',
      '--border-color-hover': 'rgba(0, 174, 239, 0.4)',
      '--accent-primary': '#00aeef',
      '--accent-primary-glow': 'rgba(0, 174, 239, 0.25)',
      '--bg-card': 'rgba(12, 21, 32, 0.5)',
      '--bg-card-hover': 'rgba(16, 28, 44, 0.7)'
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '2.5rem',
        backdropFilter: 'blur(20px)',
        background: 'rgba(12, 21, 32, 0.5)',
        border: '1px solid rgba(0, 174, 239, 0.15)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 174, 239, 0.05)',
        borderRadius: '24px',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'rgba(0, 174, 239, 0.08)',
            border: '1px solid rgba(0, 174, 239, 0.2)',
            color: 'var(--accent-primary)',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(0, 174, 239, 0.1)'
          }}>
            <LayoutDashboard size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#ffffff' }}>
            Workspace Manager
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Enter your credentials to manage local projects.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover, 
        .form-input:-webkit-autofill:focus, 
        .form-input:-webkit-autofill:active {
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s !important;
          box-shadow: inset 0 0 20px 20px rgba(255, 255, 255, 0.01) !important;
        }
      `}</style>
    </div>
  );
}
