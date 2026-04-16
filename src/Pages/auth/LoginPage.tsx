import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import './auth.css';

const SERVER = import.meta.env.VITE_SERVER_URL;

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${SERVER}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Login failed'); return; }

      // Persist session
      Cookies.set('token',  data.token,                   { expires: 7 });
      Cookies.set('userId', data.user._id,                { expires: 7 });
      Cookies.set('user',   JSON.stringify(data.user),    { expires: 7 });
      if(data.user.role=="moderator"){
        navigate('/moderator-reports');
      }else{
        navigate('/myAccount');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">

        <div className="auth-brand">
          <span className="brand">hatFate</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to continue your journey.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} autoComplete="on">
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              className="auth-input" placeholder="you@example.com"
              value={form.email} onChange={handle} required autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password" name="password" type={showPw ? 'text' : 'password'}
                className="auth-input has-icon" placeholder="••••••••"
                value={form.password} onChange={handle} required
              />
              <button type="button" className="auth-input-icon" onClick={() => setShowPw(s => !s)}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
            <Link to="/auth/forgot-password" className="auth-link" style={{ fontSize: 13 }}>
              Forgot password?
            </Link>
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading && <span className="auth-spinner" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/auth/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}