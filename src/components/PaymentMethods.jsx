import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Lock, ShieldCheck, Zap, X, Check, Star, RefreshCw, TriangleAlert } from 'lucide-react';
import { api } from '../api.js';
import { getStripe } from '../stripe.js';
import { useToast } from '../toast.jsx';
import PendingButton from './PendingButton.jsx';
import BrandLogo, { brandName, normalizeBrand } from './CardBrands.jsx';
import { Skeleton } from './ui.jsx';

/* ---------- helpers ---------- */

const tone = (brand) => ({ mastercard: 'ember', amex: 'slate' }[normalizeBrand(brand)] || 'navy');
const pad = (n) => String(n || 0).padStart(2, '0');
const expLabel = (c) => (c.expMonth && c.expYear ? `${pad(c.expMonth)}/${String(c.expYear).slice(-2)}` : 'MM/YY');

function expiryState(c) {
  if (!c.expMonth || !c.expYear) return null;
  const now = new Date();
  const months = (c.expYear - now.getFullYear()) * 12 + (c.expMonth - (now.getMonth() + 1));
  if (months < 0) return 'expired';
  if (months <= 1) return 'soon';
  return null;
}

function maskedNumber(brand, last4) {
  const l = last4 || '••••';
  return normalizeBrand(brand) === 'amex'
    ? `•••• •••••• •${l}`
    : `•••• •••• •••• ${l}`;
}

/* ---------- the credit-card visual ---------- */

export function CreditCard({ brand = 'unknown', last4, holder, expMonth, expYear, isDefault = false, live = false }) {
  const hasLast4 = Boolean(last4);
  return (
    <div className={`ccard ccard-${tone(brand)} ${live ? 'ccard-live' : ''}`}>
      <div className="ccard-top">
        <span className="ccard-chip" aria-hidden="true" />
        <svg className="ccard-nfc" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M8 6.5c2.2 3.2 2.2 8.8 0 12" /><path d="M12 4.5c3.4 4.4 3.4 11.6 0 16" /><path d="M16 2.5c4.6 5.6 4.6 15.4 0 21" />
        </svg>
        {isDefault && <span className="ccard-badge"><Star size={11} fill="currentColor" /> Default</span>}
      </div>
      <div className={`ccard-number ${hasLast4 ? '' : 'is-empty'}`}>{maskedNumber(brand, last4)}</div>
      <div className="ccard-bottom">
        <div className="ccard-meta">
          <div><small>Card holder</small><b>{(holder || 'Your name').toUpperCase()}</b></div>
          <div><small>Expires</small><b>{expLabel({ expMonth, expYear })}</b></div>
        </div>
        <span className="ccard-brand"><BrandLogo brand={brand} tone="light" height={34} /></span>
      </div>
    </div>
  );
}

/* ---------- add-card dialog ---------- */

function AddCardDialog({ hasCards, onClose, onSaved }) {
  const numberRef = useRef(null);
  const expiryRef = useRef(null);
  const cvcRef = useRef(null);
  const stripeRef = useRef(null);
  const elsRef = useRef({});
  const secretRef = useRef('');
  const closeTimer = useRef(0);

  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | ready | saving | done | failed
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('unknown');
  const [fields, setFields] = useState({ number: { ok: false, err: '' }, expiry: { ok: false, err: '' }, cvc: { ok: false, err: '' } });
  const [focus, setFocus] = useState('');
  const [makeDefault, setMakeDefault] = useState(!hasCards);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(null);

  const busy = phase === 'saving';

  useEffect(() => {
    let cancelled = false;
    let created = [];
    (async () => {
      setPhase('loading'); setLoadError('');
      try {
        const d = await api('/api/billing/payment-methods/setup-intent', { method: 'POST' });
        const stripe = await getStripe(d.publishableKey);
        if (cancelled) return;
        stripeRef.current = stripe;
        secretRef.current = d.clientSecret;

        const css = getComputedStyle(document.documentElement);
        const text = css.getPropertyValue('--text').trim() || '#1D1A33';
        const muted = css.getPropertyValue('--muted').trim() || '#5B6676';
        const bad = css.getPropertyValue('--bad').trim() || '#B42318';
        const style = {
          base: { fontFamily: 'Manrope, system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: '16px', fontWeight: '600', color: text, iconColor: muted, '::placeholder': { color: muted } },
          invalid: { color: bad, iconColor: bad },
        };
        const elements = stripe.elements({ fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&display=swap' }] });
        const mount = (type, opts, node, key) => {
          const el = elements.create(type, { style, ...opts });
          el.mount(node);
          el.on('change', (e) => {
            setFields((f) => ({ ...f, [key]: { ok: e.complete, err: e.error?.message || '' } }));
            if (key === 'number') setBrand(normalizeBrand(e.brand));
          });
          el.on('focus', () => setFocus(key));
          el.on('blur', () => setFocus((f) => (f === key ? '' : f)));
          created.push(el);
          return el;
        };
        elsRef.current = {
          number: mount('cardNumber', { showIcon: false, placeholder: '1234 1234 1234 1234' }, numberRef.current, 'number'),
          expiry: mount('cardExpiry', {}, expiryRef.current, 'expiry'),
          cvc: mount('cardCvc', { placeholder: 'CVC' }, cvcRef.current, 'cvc'),
        };
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setLoadError(e.message || 'Could not start secure card entry.');
        setPhase('failed');
      }
    })();
    return () => { cancelled = true; created.forEach((el) => { try { el.destroy(); } catch { /* already gone */ } }); };
  }, [attempt]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [busy, onClose]);

  const valid = name.trim().length >= 2 && fields.number.ok && fields.expiry.ok && fields.cvc.ok;
  const fieldError = fields.number.err || fields.expiry.err || fields.cvc.err;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || phase !== 'ready') return;
    setPhase('saving'); setFormError('');
    try {
      const r = await stripeRef.current.confirmCardSetup(secretRef.current, {
        payment_method: { card: elsRef.current.number, billing_details: { name: name.trim() } },
      });
      if (r.error) { setFormError(r.error.message || 'Your card could not be verified.'); setPhase('ready'); return; }
      const d = await api('/api/billing/payment-methods/confirm', {
        method: 'POST',
        body: JSON.stringify({ setupIntentId: r.setupIntent.id, makeDefault }),
      });
      setSaved(d.cards.find((c) => c.id === d.added) || null);
      setPhase('done');
      onSaved(d.cards);
      closeTimer.current = setTimeout(onClose, 1900);
    } catch (err) {
      setFormError(err.message || 'Could not save the card.');
      setPhase('ready');
    }
  };

  const wrap = (key) => `pm-input ${focus === key ? 'is-focus' : ''} ${fields[key].err ? 'is-bad' : ''}`;

  return createPortal(
    <div className="pm-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <button type="button" className="pm-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>

        <aside className="pm-aside">
          <p className="pm-eyebrow">PAYMENT METHOD</p>
          <h2 id="pm-title">Add a card</h2>
          <div className="pm-preview">
            {phase === 'done' && saved
              ? <CreditCard brand={saved.brand} last4={saved.last4} holder={saved.holder} expMonth={saved.expMonth} expYear={saved.expYear} isDefault={saved.isDefault} />
              : <CreditCard brand={brand} holder={name.trim()} live />}
          </div>
          <ul className="pm-trust">
            <li><Lock size={16} /><span><b>Encrypted by Stripe</b>Your card goes straight to Stripe. FabricNow never sees the full number or CVC.</span></li>
            <li><ShieldCheck size={16} /><span><b>PCI DSS Level 1</b>The highest standard in payments security.</span></li>
            <li><Zap size={16} /><span><b>One-tap renewals</b>Your plan renews and overage bills automatically.</span></li>
          </ul>
        </aside>

        <div className="pm-main">
          {phase === 'done' ? (
            <div className="pm-success" role="status">
              <span className="pm-success-icon"><Check size={34} strokeWidth={3} /></span>
              <h3>Card saved</h3>
              <p className="muted">{saved ? `${brandName(saved.brand)} ending in ${saved.last4}` : 'Your card'} is ready to use{saved?.isDefault ? ' and set as your default.' : '.'}</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className={`pm-form ${phase === 'loading' ? 'is-loading' : ''}`}>
              <div className="pm-field">
                <label htmlFor="pm-name">Name on card</label>
                <div className={`pm-input ${focus === 'name' ? 'is-focus' : ''}`}>
                  <input id="pm-name" value={name} autoComplete="cc-name" placeholder="Ama Mensah" maxLength={60}
                    onChange={(e) => setName(e.target.value)} onFocus={() => setFocus('name')} onBlur={() => setFocus('')} disabled={busy} />
                </div>
              </div>

              <div className="pm-field">
                <label>Card number</label>
                <div className={wrap('number')}>
                  <div ref={numberRef} className="pm-el" />
                  <span className="pm-input-brand"><BrandLogo brand={brand} height={26} /></span>
                </div>
              </div>

              <div className="pm-row">
                <div className="pm-field">
                  <label>Expiry</label>
                  <div className={wrap('expiry')}><div ref={expiryRef} className="pm-el" /></div>
                </div>
                <div className="pm-field">
                  <label>CVC</label>
                  <div className={wrap('cvc')}><div ref={cvcRef} className="pm-el" /></div>
                </div>
              </div>

              {(fieldError || formError) && (
                <p className="pm-error" role="alert"><TriangleAlert size={16} />{formError || fieldError}</p>
              )}

              <label className="pm-check">
                <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} disabled={busy || !hasCards} />
                <span className="pm-check-box"><Check size={13} strokeWidth={3.5} /></span>
                <span>{hasCards ? 'Use as my default card for billing' : 'This will be your default card'}</span>
              </label>

              <div className="pm-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                <PendingButton type="submit" icon={Lock} className="btn btn-primary" busy={busy} disabled={!valid || phase !== 'ready'}>
                  {busy ? 'Verifying card…' : 'Save card'}
                </PendingButton>
              </div>
            </form>
          )}

          {phase === 'failed' && (
            <div className="pm-fail" role="alert">
              <TriangleAlert size={22} />
              <p>{loadError}</p>
              <button type="button" className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}><RefreshCw size={15} /> Try again</button>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

/* ---------- the Billing section ---------- */

export default function PaymentMethods() {
  const toast = useToast();
  const [cards, setCards] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await api('/api/billing/payment-methods');
      setCards(d.cards || []);
    } catch (e) {
      setError(e.message || 'Could not load your cards.');
      setCards([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const makeDefault = async (c) => {
    setBusy(`def:${c.id}`);
    try {
      const d = await api(`/api/billing/payment-methods/${c.id}/default`, { method: 'POST' });
      setCards(d.cards);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(''); }
  };

  const remove = async (c) => {
    const ok = await toast.confirm({
      kind: 'warning',
      title: 'Remove this card?',
      message: `${brandName(c.brand)} ending in ${c.last4} will be removed from your account.${c.isDefault && cards.length > 1 ? ' Your next card becomes the default.' : ''}`,
      confirmLabel: 'Remove card',
    });
    if (!ok) return;
    setBusy(`rm:${c.id}`);
    try {
      const d = await api(`/api/billing/payment-methods/${c.id}`, { method: 'DELETE' });
      setCards(d.cards);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(''); }
  };

  const loading = cards === null;
  const empty = !loading && !error && cards.length === 0;

  return (
    <section className="panel pm" aria-labelledby="pm-heading">
      <div className="pm-head">
        <div>
          <h3 id="pm-heading">Payment methods</h3>
          <p className="muted small-text">Cards used for your subscription and any overage. Your default card is charged first.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} disabled={Boolean(error)}><Plus size={16} /> Add card</button>
      </div>

      {loading && (
        <div className="pm-grid" aria-busy="true" aria-label="Loading cards">
          <Skeleton height={220} radius={22} />
        </div>
      )}

      {error && (
        <div className="pm-fail pm-fail-inline" role="alert">
          <TriangleAlert size={20} />
          <p>{error}</p>
          <button type="button" className="btn btn-ghost" onClick={() => { setCards(null); load(); }}><RefreshCw size={15} /> Retry</button>
        </div>
      )}

      {empty && (
        <div className="pm-empty">
          <div className="pm-empty-card" aria-hidden="true"><CreditCard brand="unknown" /></div>
          <div className="pm-empty-copy">
            <strong>No card on file</strong>
            <p className="muted">Save a card once and FabricNow renews your plan automatically. No invoices to chase.</p>
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add your first card</button>
          </div>
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="pm-grid">
          {cards.map((c) => {
            const exp = expiryState(c);
            return (
              <article className={`pm-item ${c.isDefault ? 'is-default' : ''}`} key={c.id}>
                <CreditCard brand={c.brand} last4={c.last4} holder={c.holder} expMonth={c.expMonth} expYear={c.expYear} isDefault={c.isDefault} />
                <div className="pm-item-foot">
                  <div className="pm-item-info">
                    <strong>{brandName(c.brand)} •••• {c.last4}</strong>
                    <span className="muted small-text">
                      {c.funding ? `${c.funding.charAt(0).toUpperCase()}${c.funding.slice(1)} · ` : ''}Expires {expLabel(c)}
                      {exp === 'expired' && <em className="pill pill-bad">Expired</em>}
                      {exp === 'soon' && <em className="pill pill-wait">Expiring soon</em>}
                    </span>
                  </div>
                  <div className="pm-item-actions">
                    {!c.isDefault && (
                      <PendingButton className="btn btn-ghost pm-sm" busy={busy === `def:${c.id}`} disabled={Boolean(busy)} onClick={() => makeDefault(c)}>Make default</PendingButton>
                    )}
                    <PendingButton className="btn btn-ghost pm-sm pm-danger" busy={busy === `rm:${c.id}`} disabled={Boolean(busy)} onClick={() => remove(c)} aria-label={`Remove ${brandName(c.brand)} ending ${c.last4}`}>
                      <Trash2 size={15} />
                    </PendingButton>
                  </div>
                </div>
              </article>
            );
          })}
          <button type="button" className="pm-add" onClick={() => setAdding(true)}>
            <span><Plus size={22} /></span>
            <strong>Add another card</strong>
            <small>Visa, Mastercard, Amex and more</small>
          </button>
        </div>
      )}

      <p className="pm-secure"><Lock size={14} /> Card details are sent directly to Stripe and never touch FabricNow servers. We only keep the brand, last four digits and expiry.</p>

      {adding && (
        <AddCardDialog
          hasCards={Boolean(cards && cards.length)}
          onClose={() => setAdding(false)}
          onSaved={(next) => setCards(next)}
        />
      )}
    </section>
  );
}
