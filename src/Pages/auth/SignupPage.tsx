import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './auth.css';

const SERVER = import.meta.env.VITE_SERVER_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormState {
  firstName: string; lastName: string; userName: string;
  email: string; password: string; confirm: string;
  birthDate: string; sex: string; country: string;
}

// ── Eye icon ──────────────────────────────────────────────────────────────────
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

// ── Country list (abbreviated — extend as needed) ─────────────────────────────
const COUNTRIES = [
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AR','Argentina'],
  ['AU','Australia'],['AT','Austria'],['BE','Belgium'],['BR','Brazil'],
  ['CA','Canada'],['CL','Chile'],['CN','China'],['CO','Colombia'],
  ['HR','Croatia'],['CZ','Czech Republic'],['DK','Denmark'],['EG','Egypt'],
  ['FI','Finland'],['FR','France'],['DE','Germany'],['GR','Greece'],
  ['HU','Hungary'],['IN','India'],['ID','Indonesia'],['IR','Iran'],
  ['IQ','Iraq'],['IE','Ireland'],['IL','Israel'],['IT','Italy'],
  ['JP','Japan'],['JO','Jordan'],['KZ','Kazakhstan'],['KE','Kenya'],
  ['KW','Kuwait'],['LB','Lebanon'],['LY','Libya'],['MY','Malaysia'],
  ['MX','Mexico'],['MA','Morocco'],['NL','Netherlands'],['NZ','New Zealand'],
  ['NG','Nigeria'],['NO','Norway'],['PK','Pakistan'],['PE','Peru'],
  ['PH','Philippines'],['PL','Poland'],['PT','Portugal'],['QA','Qatar'],
  ['RO','Romania'],['RU','Russia'],['SA','Saudi Arabia'],['SN','Senegal'],
  ['RS','Serbia'],['ZA','South Africa'],['ES','Spain'],['SE','Sweden'],
  ['CH','Switzerland'],['SY','Syria'],['TW','Taiwan'],['TN','Tunisia'],
  ['TR','Turkey'],['UA','Ukraine'],['AE','United Arab Emirates'],
  ['GB','United Kingdom'],['US','United States'],['VE','Venezuela'],
  ['VN','Vietnam'],['YE','Yemen'],
];

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Account', 'Profile', 'Photo'];

export default function SignupPage() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState(0);
  const [form,     setForm]     = useState<FormState>({
    firstName: '', lastName: '', userName: '', email: '',
    password: '', confirm: '', birthDate: '', sex: '', country: '',
  });
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [avatar,   setAvatar]   = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string>('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatar(f);
    setPreview(URL.createObjectURL(f));
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (): string => {
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
      if (!form.userName.trim()) return 'Username is required.';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Valid email is required.';
    }
    if (step === 1) {
      if (form.password.length < 6) return 'Password must be at least 6 characters.';
      if (form.password !== form.confirm) return 'Passwords do not match.';
      if (!form.birthDate) return 'Birth date is required.';
      const age = Math.floor((Date.now() - new Date(form.birthDate).getTime()) / 31557600000);
      if (age < 16) return 'You must be at least 16 years old.';
      if (!form.sex) return 'Please select your gender.';
      if (!form.country) return 'Please select your country.';
    }
    return '';
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const prevStep = () => { setError(''); setStep(s => s - 1); };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      const { confirm, ...rest } = form;
      fd.append('data', JSON.stringify(rest));
      if (avatar) fd.append('image', avatar);

      const res  = await fetch(`${SERVER}/api/auth/signup`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Signup failed'); return; }

      navigate('/auth/check-email', { state: { email: form.email } });
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

        {/* Step progress */}
        <div className="auth-steps">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`auth-step ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>

        <h1 className="auth-title">
          {step === 0 ? 'Create account' : step === 1 ? 'Your profile' : 'Add a photo'}
        </h1>
        <p className="auth-sub">
          {step === 0 ? 'Step 1 of 3 — basic info'
           : step === 1 ? 'Step 2 of 3 — details'
           : 'Step 3 of 3 — optional photo'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit}>

          {/* ── Step 0: Basic info ── */}
          {step === 0 && (
            <>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">First name</label>
                  <input name="firstName" className="auth-input" placeholder="Ada"
                    value={form.firstName} onChange={handle} autoFocus />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Last name</label>
                  <input name="lastName" className="auth-input" placeholder="Lovelace"
                    value={form.lastName} onChange={handle} />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Username</label>
                <input name="userName" className="auth-input" placeholder="ada_fate"
                  value={form.userName} onChange={handle} autoComplete="username" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input name="email" type="email" className="auth-input" placeholder="you@example.com"
                  value={form.email} onChange={handle} autoComplete="email" />
              </div>
              <button type="button" className="auth-btn" onClick={nextStep}>Continue →</button>
            </>
          )}

          {/* ── Step 1: Profile details ── */}
          {step === 1 && (
            <>
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input name="password" type={showPw ? 'text' : 'password'}
                    className="auth-input has-icon" placeholder="Min. 6 characters"
                    value={form.password} onChange={handle} autoFocus />
                  <button type="button" className="auth-input-icon" onClick={() => setShowPw(s => !s)}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm password</label>
                <div className="auth-input-wrap">
                  <input name="confirm" type={showCf ? 'text' : 'password'}
                    className="auth-input has-icon" placeholder="Repeat password"
                    value={form.confirm} onChange={handle} />
                  <button type="button" className="auth-input-icon" onClick={() => setShowCf(s => !s)}>
                    <EyeIcon open={showCf} />
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-label">Birth date</label>
                <input name="birthDate" type="date" className="auth-input"
                  value={form.birthDate} onChange={handle} />
              </div>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">Gender</label>
                  <select name="sex" className="auth-select" value={form.sex} onChange={handle}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Country</label>
                  <select name="country" className="auth-select" value={form.country} onChange={handle}>
                    <option value="">Select…</option>
                    {COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="auth-btn auth-btn-outline" onClick={prevStep} style={{ flex: 1 }}>← Back</button>
                <button type="button" className="auth-btn" onClick={nextStep} style={{ flex: 2 }}>Continue →</button>
              </div>
            </>
          )}

          {/* ── Step 2: Photo ── */}
          {step === 2 && (
            <>
              <div className="auth-avatar-upload">
                <img
                  className="auth-avatar-preview"
                  src={preview || `${SERVER}/avatars/persona.png`}
                  alt="avatar preview"
                  onClick={() => fileRef.current?.click()}
                  style={{ cursor: 'pointer' }}
                />
                <label className="auth-avatar-label" onClick={() => fileRef.current?.click()}>
                  {avatar ? 'Change photo' : 'Upload profile photo (optional)'}
                </label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickFile} />
              </div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                You can always add one later in your profile settings.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="auth-btn auth-btn-outline" onClick={prevStep} style={{ flex: 1 }}>← Back</button>
                <button type="submit" className="auth-btn" disabled={loading} style={{ flex: 2 }}>
                  {loading && <span className="auth-spinner" />}
                  {loading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}