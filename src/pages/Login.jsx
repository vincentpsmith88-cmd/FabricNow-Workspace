import React, { useCallback, useState } from 'react';
import { Layers, ImageOff, Scissors, Sparkles, ArrowUpRight, CircleDot } from 'lucide-react';
import { api, TOKEN_KEY, GOOGLE_AUTH_PATH, PLAN } from '../api.js';
import { Brand } from '../components/Logo.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Spinner } from '../components/ui.jsx';

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
    <div className="auth auth-modern">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-visual-noise" />
        <div className="auth-visual-topline"><Brand light size={30} /><span>FASHION OPERATING SYSTEM</span></div>
        <div className="fashion-canvas">
          <div className="canvas-orbit orbit-a" />
          <div className="canvas-orbit orbit-b" />
          <div className="canvas-line line-a" />
          <div className="canvas-line line-b" />
          <div className="pattern-sheet sheet-main">
            <div className="sheet-label">PATTERN STUDIO · 01</div>
            <div className="pattern-title">SILHOUETTE<br/><em>IN MOTION</em></div>
            <div className="pattern-drawing"><span className="shoulder"/><span className="bodice"/><span className="skirt"/><span className="seam seam-one"/><span className="seam seam-two"/></div>
            <div className="sheet-footer"><span>BIAS / DRAPE / FORM</span><span>FN—001</span></div>
          </div>
          <div className="pinterest-card pin-one"><span className="pin-dot"/><small>PINTEREST RESEARCH</small><strong>TEXTURE<br/>TO SILHOUETTE</strong><span className="pin-arrow"><ArrowUpRight size={14}/></span></div>
          <div className="pinterest-card pin-two"><div className="pin-image pin-fabric"/><div><small>FABRIC STUDY</small><strong>BATIK / LINEN</strong></div></div>
          <div className="pinterest-card pin-three"><div className="pin-image pin-look"/><div><small>LOOK 24</small><strong>RESORT FORM</strong></div></div>
          <div className="canvas-stamp"><CircleDot size={12}/> LIVE CANVAS</div>
        </div>
        <div className="auth-visual-copy">
          <div className="eyebrow"><Sparkles size={13}/> DESIGN → PRODUCTION</div>
          <h2>Where fashion ideas become production-ready.</h2>
          <p>Research silhouettes, organize fabrics, build patterns and move approved work into production — all inside one company workspace.</p>
          <div className="auth-feature-row"><span><ImageOff size={15}/> Visual research</span><span><Scissors size={15}/> Pattern Studio</span><span><Layers size={15}/> Production OS</span></div>
        </div>
      </section>

      <section className="auth-panel auth-modern-panel">
        <div className="auth-card auth-modern-card">
          <div className="auth-mobile-brand"><Brand size={30} /></div>
          <div className="auth-kicker">{inviteToken ? 'COMPANY INVITATION' : 'WELCOME BACK'}</div>
          <h1>{inviteToken ? 'Join your company workspace.' : 'Your fashion workspace, ready.'}</h1>
          <p className="muted">{inviteToken ? 'Sign in with the email address that received the invitation.' : 'Sign in to continue designing, sourcing and producing.'}</p>

          <GoogleButton onCredential={google} onError={setError} text="signin_with" />
          {import.meta.env.DEV && <p className="dev-hint">Dev only: Google must list <code>{window.location.origin}</code> under Authorized JavaScript origins.</p>}
          <div className="divider"><span>or continue with email</span></div>

          <form onSubmit={submit}>
            <label className="field">Work email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
            <label className="field">Password
              <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required />
            </label>
            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-block auth-submit" disabled={busy} aria-busy={busy}>{busy ? <Spinner size={16}/> : <span>Sign in</span>}</button>
          </form>

          <div className="auth-assurance"><span className="assurance-dot"/> Company data stays inside the workspace you are authorized to access.</div>
          <p className="switch">Need access? <a className="link" href="https://fabricnow.tonasel.com/contact?topic=api-enterprise" target="_blank" rel="noreferrer">Contact FabricNow</a></p>
        </div>
      </section>
    </div>
  );
}
