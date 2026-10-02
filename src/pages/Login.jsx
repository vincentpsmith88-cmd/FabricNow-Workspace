import React, { useCallback, useState } from 'react';
import { ArrowUpRight, Grid3X3, MoveDiagonal, Ruler, Scissors, Sparkles } from 'lucide-react';
import { api, TOKEN_KEY, GOOGLE_AUTH_PATH } from '../api.js';
import { Brand } from '../components/Logo.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Spinner } from '../components/ui.jsx';

export default function Login({ onAuth }) {
  const inviteToken = window.location.pathname.startsWith('/company-invitations/') ? window.location.pathname.split('/').filter(Boolean).pop() : '';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const finish = async (d) => {
    localStorage.setItem(TOKEN_KEY, d.token);
    if (inviteToken) {
      try { await api('/api/companies/invitations/accept', { method: 'POST', body: JSON.stringify({ token: inviteToken }) }); window.history.replaceState({}, '', '/'); }
      catch (err) { setError(err.message); }
    }
    onAuth(d.user);
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await finish(await api('/api/auth/signin', { method: 'POST', body: JSON.stringify(form) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const google = useCallback(async (credential) => {
    setBusy(true); setError('');
    try { await finish(await api(GOOGLE_AUTH_PATH, { method: 'POST', body: JSON.stringify({ credential, idToken: credential }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }, []); // eslint-disable-line

  return (
    <main className="auth-atelier">
      <section className="atelier-canvas" aria-hidden="true">
        <header className="atelier-topbar"><Brand light size={28} /><span>FABRICNOW / FASHION OS</span><span className="atelier-index">01 — 04</span></header>
        <div className="atelier-grid" />
        <div className="atelier-draft">
          <div className="draft-title">PATTERN / STUDY 04</div>
          <div className="draft-figure">
            <span className="draft-neck" /><span className="draft-shoulder" /><span className="draft-bodice" /><span className="draft-waist" /><span className="draft-skirt" />
            <i className="draft-seam seam-a" /><i className="draft-seam seam-b" /><i className="draft-seam seam-c" />
          </div>
          <div className="draft-measure m-a"><span>42</span><i /></div>
          <div className="draft-measure m-b"><span>18</span><i /></div>
          <div className="draft-cross cross-a" /><div className="draft-cross cross-b" />
          <div className="draft-note note-a"><Ruler size={12}/> GRAINLINE / BIAS</div>
          <div className="draft-note note-b"><Scissors size={12}/> CUT / FORM / FIT</div>
        </div>
        <div className="atelier-orbit orbit-one" /><div className="atelier-orbit orbit-two" />
        <div className="atelier-pin"><span className="pinterest-mark">P</span><div><small>PINTEREST RESEARCH</small><strong>Reference → Pattern Studio</strong></div><ArrowUpRight size={15}/></div>
        <div className="atelier-live"><span /><span>LIVE CANVAS</span><b>02:41:08</b></div>
        <div className="atelier-copy">
          <div className="atelier-eyebrow"><Sparkles size={13}/> DESIGN / SOURCING / PRODUCTION</div>
          <h1>Build the garment.<br/><em>Then build the system.</em></h1>
          <p>FabricNow connects visual research, materials, pattern development and production in one company workspace.</p>
          <div className="atelier-tags"><span><Grid3X3 size={13}/> Visual research</span><span><Scissors size={13}/> Pattern Studio</span><span><MoveDiagonal size={13}/> Production OS</span></div>
        </div>
      </section>

      <section className="atelier-auth">
        <div className="atelier-auth-inner">
          <div className="atelier-mobile-brand"><Brand size={28}/></div>
          <div className="atelier-kicker">{inviteToken ? 'COMPANY INVITATION' : 'FABRICNOW / SIGN IN'}</div>
          <h2>{inviteToken ? 'Join your company workspace.' : 'Your workspace, ready.'}</h2>
          <p className="atelier-sub">{inviteToken ? 'Use the invited email address to continue.' : 'Sign in to continue designing, sourcing and producing.'}</p>

          <GoogleButton onCredential={google} onError={setError} text="signin_with" />
          {import.meta.env.DEV && <p className="dev-hint">Google must list <code>{window.location.origin}</code> under Authorized JavaScript origins.</p>}
          <div className="atelier-divider"><span>or</span></div>

          <form onSubmit={submit}>
            <label className="atelier-field"><span>Work email</span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="you@company.com" /></label>
            <label className="atelier-field"><span>Password</span><input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required placeholder="••••••••" /></label>
            {error && <div className="error atelier-error" role="alert">{error}</div>}
            <button className="atelier-submit" disabled={busy} aria-busy={busy}>{busy ? <Spinner size={17}/> : <>Enter workspace <ArrowUpRight size={16}/></>}</button>
          </form>

          <div className="atelier-security"><span /> Company access is permission-based. You only see workspaces you are authorized to access.</div>
          <p className="atelier-contact">Need access to a company? <a href="https://fabricnow.tonasel.com/contact?topic=api-enterprise" target="_blank" rel="noreferrer">Contact FabricNow</a></p>
        </div>
      </section>
    </main>
  );
}
