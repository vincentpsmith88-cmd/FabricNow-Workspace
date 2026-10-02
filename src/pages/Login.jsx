import React, { useCallback, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Ruler, Scissors, ShieldCheck, Sparkles } from 'lucide-react';
import { api, TOKEN_KEY, GOOGLE_AUTH_PATH } from '../api.js';
import { Brand } from '../components/Logo.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Spinner } from '../components/ui.jsx';

export default function Login({ onAuth }) {
  const inviteToken = window.location.pathname.startsWith('/company-invitations/') ? window.location.pathname.split('/').filter(Boolean).pop() : '';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
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
    <main className="lx">
      {/* ambient background */}
      <div className="lx-bg" aria-hidden="true">
        <i className="lx-aurora lx-a1" /><i className="lx-aurora lx-a2" /><i className="lx-aurora lx-a3" />
        <div className="lx-grid" /><div className="lx-grain" />
      </div>

      {/* brand story — decorative, hidden below 1000px */}
      <section className="lx-hero" aria-hidden="true">
        <header className="lx-top">
          <Brand light size={30} />
          <span className="lx-badge"><i /> Fashion OS</span>
        </header>

        <div className="lx-hero-main">
          <div className="lx-eyebrow" style={{ '--i': 0 }}><Sparkles size={13} /> Design · Sourcing · Production</div>
          <h1 style={{ '--i': 1 }}>Build the garment.<br /><em>Then build the system.</em></h1>
          <p style={{ '--i': 2 }}>Visual research, materials, pattern development and production — one connected workspace for your fashion company.</p>

          <div className="lx-stage">
            <article className="lx-glass lx-c-ref">
              <div className="lx-c-head"><span className="lx-pin">P</span><small>Pinterest Research</small></div>
              <div className="lx-ref-img" />
              <strong className="lx-c-title">Indigo batik maxi dress</strong>
              <div className="lx-c-link"><span>Reference saved</span><ArrowRight size={13} /><b>Pattern Studio</b></div>
            </article>

            <article className="lx-glass lx-c-job">
              <div className="lx-c-head"><Scissors size={14} /><small>Pattern Studio</small><span className="lx-live"><i />Processing</span></div>
              <strong className="lx-c-title">Wrap dress · 8 pattern pieces</strong>
              <div className="lx-bar"><i /></div>
              <div className="lx-steps"><span className="done">Segment</span><span className="done">Pieces</span><span className="on">Grade</span><span>Export</span></div>
            </article>

            <article className="lx-glass lx-c-fab">
              <div className="lx-c-head"><small>Fabric Library</small></div>
              <div className="lx-swatches"><i className="sw-ankara" /><i className="sw-kente" /><i className="sw-indigo" /></div>
              <span className="lx-c-sub">African prints &amp; materials</span>
            </article>

            <div className="lx-glass lx-c-chip"><Ruler size={13} /> Bust 92 · Waist 74 · Hip 98 cm</div>
          </div>
        </div>
      </section>

      {/* sign-in */}
      <section className="lx-panel">
        <div className="lx-form-card">
          <div className="lx-mbrand"><Brand light size={28} /></div>
          <div className="lx-kicker">{inviteToken ? 'Company invitation' : 'FabricNow / Sign in'}</div>
          <h2>{inviteToken ? 'Join your company workspace.' : 'Your workspace, ready.'}</h2>
          <p className="lx-sub">{inviteToken ? 'Use the invited email address to continue.' : 'Sign in to continue designing, sourcing and producing.'}</p>

          <GoogleButton onCredential={google} onError={setError} text="signin_with" theme="filled_black" shape="pill" />
          {import.meta.env.DEV && <p className="dev-hint">Google must list <code>{window.location.origin}</code> under Authorized JavaScript origins.</p>}

          <div className="lx-divider"><span>or continue with email</span></div>

          <form onSubmit={submit}>
            <label className="lx-field">
              <span>Work email</span>
              <div className="lx-input">
                <Mail size={17} className="lx-ico" />
                <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="you@company.com" />
              </div>
            </label>
            <label className="lx-field">
              <span>Password</span>
              <div className="lx-input">
                <Lock size={17} className="lx-ico" />
                <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="current-password" required placeholder="Enter your password" />
                <button type="button" className="lx-eye" data-no-spin onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && <div className="lx-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}

            <button className="lx-submit" data-no-spin disabled={busy} aria-busy={busy}>
              {busy ? <Spinner size={18} /> : <>Enter workspace <ArrowRight size={17} /></>}
            </button>
          </form>

          <div className="lx-security"><ShieldCheck size={15} /><span>Access is permission-based — you only see workspaces you are authorized to open.</span></div>
          <p className="lx-contact">Need access to a company? <a href="https://fabricnow.tonasel.com/contact?topic=api-enterprise" target="_blank" rel="noreferrer">Contact FabricNow</a></p>
        </div>
      </section>
    </main>
  );
}
