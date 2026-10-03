import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Minus, Search, X } from 'lucide-react';
import { CountUp } from './Charts.jsx';
import { Spinner } from './ui.jsx';

/* =====================================================================
   Workspace UI kit — shared building blocks for the analytics pages.
   Styles live in workspace-pro.css (.wp-*).
   ===================================================================== */

export const TONES = { success: 'success', danger: 'danger', warn: 'warn', info: 'info', neutral: 'neutral', brand: 'brand' };
export const PALETTE = ['#E66239', '#7560B4', '#2F9E73', '#3B82C4', '#D9A21B', '#C0517A', '#657E92'];

/** Maps a free-text status/priority to a visual tone. */
export function toneOf(v) {
  const s = String(v || '').toLowerCase();
  if (['approved', 'ready', 'shipped', 'active', 'completed', 'done', 'passed', 'published'].includes(s)) return 'success';
  if (['rejected', 'failed', 'urgent', 'error', 'blocked'].includes(s)) return 'danger';
  if (['review', 'high', 'sampling', 'pending', 'warning'].includes(s)) return 'warn';
  if (['running', 'production', 'quality', 'processing', 'in progress'].includes(s)) return 'info';
  return 'neutral';
}

/* ---------- Modal: portal + scroll lock + sticky footer (fixes clipped popups) ---------- */
export function Modal({ open, onClose, kicker, title, description, icon: Icon, onSubmit, busy = false, submitLabel = 'Save', submitIcon: SubmitIcon, footnote, error, children, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector('input:not([type=hidden]),select,textarea')?.focus(), 60);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="wp-modal-root" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <form noValidate className={`wp-modal wp-modal-${size}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}>
        <header className="wp-modal-head">
          {Icon && <span className="wp-modal-icon"><Icon size={20} /></span>}
          <div>
            {kicker && <span className="wp-kicker">{kicker}</span>}
            <h3 id={titleId}>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="wp-modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="wp-modal-body">{children}</div>
        <footer className="wp-modal-foot">
          {error ? <span className="wp-modal-err" role="alert"><AlertCircle size={14} />{error}</span> : <span className="wp-modal-note">{footnote}</span>}
          <div>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy} data-no-spin>{busy ? <Spinner size={15} /> : <>{SubmitIcon && <SubmitIcon size={15} />}{submitLabel}</>}</button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

/** Renders a schema of fields: [{name,label,type,options,span,placeholder,hint,required,min,max}] */
export function FormFields({ fields, values, onChange }) {
  return (
    <div className="wp-form">
      {fields.map((f) => (
        <label key={f.name} className="wp-field" data-span={f.span || 1}>
          <span className="wp-field-label">{f.label}{f.required && <b aria-hidden="true"> *</b>}{f.optional && <em>optional</em>}</span>
          {f.type === 'select' ? (
            <select value={values[f.name]} onChange={(e) => onChange(f.name, e.target.value)}>{f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
          ) : f.type === 'textarea' ? (
            <textarea rows={f.rows || 4} value={values[f.name]} placeholder={f.placeholder} onChange={(e) => onChange(f.name, e.target.value)} />
          ) : (
            <input type={f.type || 'text'} value={values[f.name]} placeholder={f.placeholder} min={f.min} max={f.max} step={f.step} required={f.required} onChange={(e) => onChange(f.name, e.target.value)} />
          )}
          {f.hint && <small>{f.hint}</small>}
        </label>
      ))}
    </div>
  );
}

/* ---------- Snackbar ---------- */
export function useSnack() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(0);
  const push = useCallback((text, kind = 'success') => {
    setMsg({ text, kind, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = msg ? createPortal(
    <div className={`wp-snack ${msg.kind}`} role="status" key={msg.id}>
      {msg.kind === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}<span>{msg.text}</span>
      <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss"><X size={14} /></button>
    </div>, document.body) : null;
  return [node, push];
}

/* ---------- Page header & panel ---------- */
export function PageHead({ eyebrow, title, description, actions }) {
  return (
    <header className="wp-head">
      <div>
        <span className="wp-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className="wp-head-actions">{actions}</div>}
    </header>
  );
}
export function Panel({ title, sub, action, children, className = '' }) {
  return (
    <section className={`wp-panel ${className}`}>
      {(title || action) && <div className="wp-panel-head"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{action}</div>}
      {children}
    </section>
  );
}

/* ---------- KPI ---------- */
export function Sparkline({ data = [], color = 'var(--orange)' }) {
  const id = useId().replace(/:/g, '');
  if (data.length < 2) return <div className="wp-spark empty" aria-hidden="true" />;
  const max = Math.max(1, ...data), W = 100, H = 36;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 3 - (v / max) * (H - 8)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  return (
    <svg className="wp-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Delta({ now, prev, suffix = 'vs previous period' }) {
  if (prev == null) return null;
  const diff = now - prev;
  const pct = prev === 0 ? (now === 0 ? 0 : 100) : Math.round((diff / prev) * 100);
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const I = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return <span className={`wp-delta ${dir}`}><I size={13} />{dir === 'flat' ? 'No change' : `${Math.abs(pct)}%`}<em>{suffix}</em></span>;
}
export function KpiCard({ icon: Icon, label, value, display, sub, tone = 'brand', spark, delta, ring }) {
  return (
    <div className={`wp-kpi tone-${tone}`}>
      <div className="wp-kpi-top">
        <span className="wp-kpi-icon">{Icon && <Icon size={18} />}</span>
        <span className="wp-kpi-label">{label}</span>
        {ring != null && <Ring value={ring} size={40} tone={tone} />}
      </div>
      <strong className="wp-kpi-value">{display ?? (typeof value === 'number' ? <CountUp value={value} /> : value)}</strong>
      <div className="wp-kpi-foot">{delta || (sub && <small>{sub}</small>)}</div>
      {spark && <Sparkline data={spark} />}
    </div>
  );
}
export const KpiGrid = ({ children }) => <div className="wp-kpis">{children}</div>;

/* ---------- Charts ---------- */
export function Ring({ value = 0, size = 44, tone = 'brand', label, stroke = 5 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <span className={`wp-ring tone-${tone}`} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="trk" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="val" strokeWidth={stroke} fill="none" strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" />
      </svg>
      <b>{label ?? Math.round(v)}</b>
    </span>
  );
}
export function Donut({ segments, center, size = 150 }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="wp-donut-wrap">
      <div className="wp-donut" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" role="img" aria-label="Distribution chart">
          <circle cx="70" cy="70" r={r} fill="none" className="trk" strokeWidth="16" />
          {total > 0 && segments.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c; const off = -acc; acc += len;
            return <circle key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 2)} ${c - len + 2}`} strokeDashoffset={off} transform="rotate(-90 70 70)" />;
          })}
        </svg>
        {center && <div className="wp-donut-center"><strong>{center.value}</strong><small>{center.label}</small></div>}
      </div>
      <ul className="wp-legend">
        {segments.map((s) => (
          <li key={s.label}><i style={{ background: s.color }} /><span>{s.label}</span><b>{s.value}</b><em>{total ? Math.round((s.value / total) * 100) : 0}%</em></li>
        ))}
      </ul>
    </div>
  );
}
/** Horizontal bars. items: [{label, value, color?, sub?}] */
export function HBars({ items, unit = '', empty = 'No data yet' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <div className="wp-nodata">{empty}</div>;
  return (
    <ul className="wp-hbars">
      {items.map((i, n) => (
        <li key={i.label}>
          <div className="wp-hbar-row"><span title={i.label}>{i.label}</span><b>{i.value}{unit}</b></div>
          <div className="wp-hbar-track"><i style={{ width: `${(i.value / max) * 100}%`, background: i.color || PALETTE[n % PALETTE.length], animationDelay: `${n * 60}ms` }} /></div>
        </li>
      ))}
    </ul>
  );
}
/** Vertical columns. items: [{label, value, color?}] */
export function Columns({ items, height = 150 }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="wp-cols" style={{ height }} role="img" aria-label="Column chart">
      {items.map((i, n) => (
        <div key={i.label} className="wp-col">
          <b>{i.value}</b>
          <div><i style={{ height: `${Math.max(i.value ? 6 : 2, (i.value / max) * 100)}%`, background: i.color || PALETTE[n % PALETTE.length], animationDelay: `${n * 70}ms` }} /></div>
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Toolbar pieces ---------- */
export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <label className="wp-search"><Search size={16} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search"><X size={14} /></button>}
    </label>
  );
}
export function Chips({ options, value, onChange, label }) {
  return (
    <div className="wp-chips" role="group" aria-label={label}>
      {options.map((o) => <button type="button" key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)} aria-pressed={value === o.value}>{o.label}{o.count != null && <b>{o.count}</b>}</button>)}
    </div>
  );
}
export function ViewToggle({ value, onChange, options }) {
  return (
    <div className="wp-toggle" role="group" aria-label="Change view">
      {options.map(([v, l, I]) => <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} aria-pressed={value === v} title={l}><I size={15} /><span>{l}</span></button>)}
    </div>
  );
}

/* ---------- Badges, avatars, empty & loading ---------- */
export const Badge = ({ tone = 'neutral', dot = true, children }) => <span className={`wp-badge tone-${tone}`}>{dot && <i />}{children}</span>;
export function Avatar({ name = '?', size = 26 }) {
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return <span className="wp-avatar" style={{ width: size, height: size, background: `hsl(${h} 45% 90%)`, color: `hsl(${h} 45% 28%)`, fontSize: size * 0.4 }}>{initials}</span>;
}
export function ProEmpty({ icon: Icon, title, body, action, onAction, hints = [] }) {
  return (
    <div className="wp-empty">
      <div className="wp-empty-ghost" aria-hidden="true"><i /><i /><i /></div>
      <span className="wp-empty-icon">{Icon && <Icon size={24} />}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <button className="btn btn-primary" onClick={onAction}>{action}<ArrowRight size={15} /></button>}
      {hints.length > 0 && <ul className="wp-empty-hints">{hints.map((h) => <li key={h}><CheckCircle2 size={14} />{h}</li>)}</ul>}
    </div>
  );
}
export function PageSkeleton({ cards = 6 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="wp-kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="wp-kpi wp-skel"><i style={{ width: '40%' }} /><i style={{ width: '55%', height: 28 }} /><i style={{ width: '70%' }} /></div>)}</div>
      <div className="wp-cards" style={{ marginTop: 18 }}>{Array.from({ length: cards }).map((_, i) => <div key={i} className="wp-card wp-skel"><i style={{ height: 70 }} /><i style={{ width: '60%' }} /><i style={{ width: '85%' }} /></div>)}</div>
    </div>
  );
}
export function ErrorBanner({ message, onRetry }) {
  return <div className="wp-error" role="alert"><AlertCircle size={18} /><div><strong>Couldn’t load this data</strong><span>{message}</span></div>{onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}</div>;
}

/* ---------- helpers ---------- */
const COLOR_NAMES = { indigo: '#3A4A9A', blue: '#3B6FC4', navy: '#24305E', red: '#C23B3B', crimson: '#A82840', maroon: '#6F1D2B', orange: '#E07A2E', yellow: '#E8B93A', gold: '#C9A227', green: '#2F8F5B', emerald: '#1E7F5C', teal: '#1F8A8A', purple: '#6B4FA3', violet: '#7A5CC0', pink: '#D86C9A', magenta: '#B83B8A', brown: '#7A4E32', tan: '#C9A57A', beige: '#D8C7A8', cream: '#EFE5CF', white: '#F1EFEA', black: '#1E1D22', grey: '#8A8F9A', gray: '#8A8F9A', silver: '#B9BDC6', kente: '#C9A227', ankara: '#D9531E' };
export function colorFromText(text = '') {
  const t = String(text).toLowerCase();
  const hit = Object.keys(COLOR_NAMES).find((k) => t.includes(k));
  if (hit) return COLOR_NAMES[hit];
  let h = 0; for (const ch of t || 'fabric') h = (h * 33 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 42% 46%)`;
}
export const fmtDay = (v) => { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
export const daysFromNow = (v) => { if (!v) return null; const d = new Date(v); if (Number.isNaN(d.getTime())) return null; const t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0); return Math.round((d - t) / 86400000); };
export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
export const countBy = (items, pick) => { const m = new Map(); items.forEach((i) => { const k = pick(i); if (k != null && k !== '') m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
