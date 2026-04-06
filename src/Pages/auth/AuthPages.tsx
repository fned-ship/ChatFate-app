// ─────────────────────────────────────────────────────────────────────────────
// CheckEmailPage.tsx  — shown after signup, tells user to verify
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './auth.css';

export function CheckEmailPage() {
  const { state } = useLocation() as { state?: { email?: string } };

  return (
    <div className="auth-root">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand" style={{ justifyContent: 'center' }}>
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">ChatFate</span>
        </div>

        <div className="auth-icon-wrap" style={{ margin: '0 auto 20px' }}>📬</div>
        <h1 className="auth-title">Check your inbox</h1>
        <p className="auth-sub" style={{ marginBottom: 0 }}>
          We sent a verification link to<br />
          <strong style={{ color: 'var(--accent2)' }}>{state?.email ?? 'your email'}</strong>.
          <br /><br />
          Click the link to activate your account. Don't forget to check your spam folder.
        </p>

        <p className="auth-footer" style={{ marginTop: 32 }}>
          Already verified?{' '}
          <Link to="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// VerifiedPage.tsx  — backend redirects here after successful verification
// ─────────────────────────────────────────────────────────────────────────────
export function VerifiedPage() {
  return (
    <div className="auth-root">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-brand" style={{ justifyContent: 'center' }}>
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">ChatFate</span>
        </div>

        <div className="auth-icon-wrap" style={{ margin: '0 auto 20px' }}>✅</div>
        <h1 className="auth-title">Email verified!</h1>
        <p className="auth-sub" style={{ marginBottom: 0 }}>
          Your account is now active. You can sign in and start chatting.
        </p>

        <Link to="/auth/login">
          <button className="auth-btn" style={{ marginTop: 28 }}>Go to Sign In</button>
        </Link>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ForgotPasswordPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email,   setEmail]   = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent,    setSent]    = React.useState(false);
  const [error,   setError]   = React.useState('');

  const SERVER = import.meta.env.VITE_SERVER_URL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${SERVER}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Something went wrong'); return; }
      setSent(true);
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
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">ChatFate</span>
        </div>

        <div className="auth-icon-wrap">🔑</div>

        {sent ? (
          <>
            <h1 className="auth-title">Link sent!</h1>
            <p className="auth-sub">
              If an account exists for <strong style={{ color: 'var(--accent2)' }}>{email}</strong>,
              you'll receive a reset link shortly. Check your spam folder too.
            </p>
            <Link to="/auth/login">
              <button className="auth-btn" style={{ marginTop: 8 }}>Back to Sign In</button>
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-sub">Enter your email and we'll send a reset link.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={submit}>
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <input
                  type="email" className="auth-input" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                />
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading && <span className="auth-spinner" />}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className="auth-footer">
              Remembered it?{' '}
              <Link to="/auth/login" className="auth-link">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordPage.tsx  — user lands here from the email link
// ─────────────────────────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const { token } = (window as any).__reactRouterParams
    ?? { token: location.pathname.split('/').pop() };

  // Use react-router useParams instead:
  // import { useParams } from 'react-router-dom';
  // const { token } = useParams<{ token: string }>();

  const [form,    setForm]    = React.useState({ password: '', confirm: '' });
  const [showPw,  setShowPw]  = React.useState(false);
  const [showCf,  setShowCf]  = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [done,    setDone]    = React.useState(false);
  const [error,   setError]   = React.useState('');

  const SERVER = import.meta.env.VITE_SERVER_URL;

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${SERVER}/api/auth/reset-password/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Reset failed'); return; }
      setDone(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-dot" />
          <span className="auth-brand-name">ChatFate</span>
        </div>

        <div className="auth-icon-wrap">🛡️</div>

        {done ? (
          <>
            <h1 className="auth-title">Password updated!</h1>
            <p className="auth-sub">Your password has been changed successfully. You can now sign in.</p>
            <Link to="/auth/login">
              <button className="auth-btn" style={{ marginTop: 8 }}>Sign In</button>
            </Link>
          </>
        ) : (
          <>
            <h1 className="auth-title">Set new password</h1>
            <p className="auth-sub">Choose a strong password for your account.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={submit}>
              <div className="auth-field">
                <label className="auth-label">New password</label>
                <div className="auth-input-wrap">
                  <input
                    name="password" type={showPw ? 'text' : 'password'}
                    className="auth-input has-icon" placeholder="Min. 6 characters"
                    value={form.password} onChange={handle} required autoFocus
                  />
                  <button type="button" className="auth-input-icon" onClick={() => setShowPw(s => !s)}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm new password</label>
                <div className="auth-input-wrap">
                  <input
                    name="confirm" type={showCf ? 'text' : 'password'}
                    className="auth-input has-icon" placeholder="Repeat password"
                    value={form.confirm} onChange={handle} required
                  />
                  <button type="button" className="auth-input-icon" onClick={() => setShowCf(s => !s)}>
                    <EyeIcon open={showCf} />
                  </button>
                </div>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading && <span className="auth-spinner" />}
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}