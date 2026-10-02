import React, { useCallback, useState } from 'react';
import { Layers, ImageOff, Scissors } from 'lucide-react';
import { api, TOKEN_KEY, GOOGLE_AUTH_PATH, PLAN } from '../api.js';
import { Brand } from '../components/Logo.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

// Sign-in only. Accounts are created outside this workspace.
export default function Login({ onAuth }) {
  const inviteToken = window.location.pathname.startsWith('/company-invitations/') ? window.location.pathname.split('/').filter(Boolean).pop() : ''; 
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const finish = async (d) => { localStorage.setItem(TOKEN_KEY, d.token); if (inviteToken) { try { await api('/api/companies/invitations/accept', { method:'POST', body: JSON.stringify({ token: inviteToken }) }); window.history.replaceState({}, '', '/'); } catch (err) { setError(err.message); } } onAuth(d.user); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { finish(await api('/api/auth/signin', { method: 'POST', body: JSON.stringify(form) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const google = useCallback(async (credential) => {
    setBusy(true); setError('');
    try { finish(await api(GOOGLE_AUTH_PATH, { method: 'POST', body: JSON.stringify({ credential, idToken: credential }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }, []); // eslint-disable-line

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden="true">
        <Brand light size={34} />
        <div className="auth-art-copy">
          <h2>Garment automation, built for production teams.</h2>
          <ul>
            <li><ImageOff size={18} /><span>Background removal and garment part segmentation over one HTTP API</span></li>
            <li><Scissors size={18} /><span>Pattern Studio turns a garment photo into pattern assets</span></li>
            <li><Layers size={18} /><span>{PLAN.included} processed images a month included with {PLAN.name}</span></li>
          </ul>
        </div>
        <img className="auth-mark" src="/logo-icon.svg" alt="" />
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Brand size={30} /></div>
          <h1>{inviteToken ? 'Accept company invitation' : 'Sign in to your workspace'}</h1>
          <p className="muted">{inviteToken ? 'Sign in with the email address that received the invitation to join the company.' : 'Use the account your company was set up with.'}</p>

          <GoogleButton onCredential={google} onError={setError} text="signin_with" />
          {import.meta.env.DEV && (
            <p className="dev-hint">Dev only: Google must list <code>{window.location.origin}</code> under Authorized JavaScript origins.</p>
          )}
          <div className="divider"><span>or use email</span></div>

          <form onSubmit={submit}>
            <label className="field">Work email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
            <label className="field">Password
              <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required />
            </label>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <p className="switch">
            Need access? <a className="link" href="https://fabricnow.tonasel.com/contact?topic=api-enterprise" target="_blank" rel="noreferrer">Contact FabricNow</a>
          </p>
        </div>
      </section>
    </div>
  );
}
