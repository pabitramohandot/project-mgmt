'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, Eye, EyeOff, CheckCircle, Users, Activity } from 'lucide-react';

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
    <form onSubmit={handleSubmit} style={{ width: '100%', position: 'relative', zIndex: 10 }}>
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem',
          color: '#dc2626',
          fontSize: '0.875rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span style={{ fontWeight: 'bold' }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Username */}
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <User size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Username"
            className="form-input"
            style={{ 
              paddingLeft: '3.25rem', 
              height: '56px', 
              fontSize: '1rem',
              color: '#0f172a',
              fontFamily: 'var(--font-sans)',
              fontWeight: '500'
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Password */}
      <div className="form-group" style={{ marginBottom: '2.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Lock size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="form-input"
            style={{ 
              paddingLeft: '3.25rem', 
              paddingRight: '3.25rem', 
              height: '56px', 
              fontSize: '1rem',
              color: '#0f172a',
              fontFamily: 'var(--font-sans)',
              fontWeight: '500'
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            style={{
              position: 'absolute',
              right: '1.25rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn-login-submit"
        style={{
          width: '100%',
          height: '56px',
          fontSize: '1.05rem',
          fontWeight: 700,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.02em',
          marginBottom: '1.5rem'
        }}
        disabled={loading}
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </button>

      {/* Link to Register */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Don't have an account? </span>
        <Link href="/register" style={{
          color: '#00aeef',
          fontWeight: '700',
          textDecoration: 'none',
          fontSize: '0.9rem'
        }}>
          Register Now
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.08) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(242, 101, 34, 0.06) 0%, transparent 45%), #f1f5f9',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
      '--text-primary': '#0f172a',
      '--text-secondary': '#334155',
      '--text-muted': '#64748b',
      '--border-color': '#cbd5e1',
      '--border-color-hover': '#94a3b8',
      '--accent-primary': '#00aeef',
      '--accent-primary-glow': 'rgba(0, 174, 239, 0.12)',
      '--bg-card': '#ffffff',
      '--bg-card-hover': '#ffffff'
    }}>
      {/* Background Blurs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
        top: '-200px',
        left: '-150px',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(242, 101, 34, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
        bottom: '-250px',
        right: '-150px',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Main Split Layout Container */}
      <div className="login-card-layout" style={{
        maxWidth: '1000px',
        width: '100%',
        minHeight: '620px',
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
        borderRadius: '28px',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
        animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Left Side: Brand Showcase */}
        <div className="login-left-panel" style={{
          width: '45%',
          background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #f0fdf4 100%)',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          borderRight: '1px solid rgba(15, 23, 42, 0.05)',
          overflow: 'hidden'
        }}>
          {/* Subtle grid pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(#00aeef 0.5px, transparent 0.5px)',
            backgroundSize: '16px 16px',
            opacity: 0.15,
            pointerEvents: 'none'
          }} />

          {/* Logo Area */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <img 
              src="https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png" 
              alt="My worklance Logo" 
              style={{ 
                height: '48px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0, 174, 239, 0.1))' 
              }} 
            />
          </div>

          {/* Visual Showcase Center */}
          <div style={{ position: 'relative', zIndex: 2, margin: '2.5rem 0' }}>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: 800, 
              color: '#0f172a', 
              lineHeight: 1.25, 
              marginBottom: '1rem',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-heading)'
            }}>
              Unleash <span style={{ 
                background: 'linear-gradient(135deg, #00aeef 0%, #009fe3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>Collaborative</span> Productivity.
            </h1>
            <p style={{ 
              color: '#334155', 
              fontSize: '1rem', 
              lineHeight: 1.6, 
              marginBottom: '2rem',
              fontWeight: '500',
              fontFamily: 'var(--font-sans)'
            }}>
              Your ultimate center to track local projects, plan tasks, and collaborate smoothly with your workspace.
            </p>

            {/* Floating Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="floating-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <CheckCircle size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-sans)' }}>Unified Workspace Control</span>
              </div>
              <div className="floating-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Users size={18} style={{ color: '#00aeef' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-sans)' }}>Seamless Team Syncing</span>
              </div>
              <div className="floating-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Activity size={18} style={{ color: '#f26522' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-sans)' }}>Real-time Task Updates</span>
              </div>
            </div>
          </div>

          {/* Footer Area */}
          <div style={{ position: 'relative', zIndex: 2, fontSize: '0.85rem', color: '#475569', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
            © {new Date().getFullYear()} Worklance. All rights reserved.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right-panel" style={{
          width: '55%',
          padding: '4rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {/* Mobile Only Logo */}
          <div className="mobile-logo-wrapper" style={{ marginBottom: '2rem', display: 'none' }}>
            <img 
              src="https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png" 
              alt="My worklance Logo" 
              style={{ height: '36px', objectFit: 'contain' }} 
            />
          </div>

          <div style={{ width: '100%', maxWidth: '380px' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 800, 
              color: 'var(--text-primary)', 
              marginBottom: '0.5rem', 
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-heading)'
            }}>
              Sign In
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '1rem', 
              lineHeight: 1.5,
              marginBottom: '2.5rem',
              fontWeight: '500',
              fontFamily: 'var(--font-sans)'
            }}>
              Please enter your credentials to access your account.
            </p>

            <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading form...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-input {
          background: rgba(255, 255, 255, 0.45) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(15, 23, 42, 0.12) !important;
          color: #0f172a !important;
          border-radius: 12px !important;
          outline: none;
          transition: all 0.2s ease-in-out !important;
        }
        .form-input:focus {
          background: rgba(255, 255, 255, 0.75) !important;
          border-color: #00aeef !important;
          box-shadow: 0 0 0 4px rgba(0, 174, 239, 0.16) !important;
        }
        .form-input::placeholder {
          color: #64748b !important;
        }
        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover, 
        .form-input:-webkit-autofill:focus, 
        .form-input:-webkit-autofill:active {
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: #0f172a !important;
          transition: background-color 5000s ease-in-out 0s !important;
          box-shadow: inset 0 0 20px 20px rgba(255, 255, 255, 0.45) !important;
        }
        .btn-login-submit {
          background: linear-gradient(135deg, #00aeef 0%, #009fe3 100%) !important;
          border: none !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(0, 174, 239, 0.25) !important;
          cursor: pointer;
          transition: all 0.2s ease-in-out !important;
        }
        .btn-login-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 174, 239, 0.4) !important;
          background: linear-gradient(135deg, #00befc 0%, #00b0fa 100%) !important;
        }
        .btn-login-submit:active {
          transform: translateY(0);
        }
        .btn-login-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Responsive adjustments */
        @media (max-width: 868px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            width: 100% !important;
            padding: 3rem 2rem !important;
            align-items: center !important;
          }
          .mobile-logo-wrapper {
            display: block !important;
            text-align: center;
          }
          .login-card-layout {
            max-width: 460px !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
