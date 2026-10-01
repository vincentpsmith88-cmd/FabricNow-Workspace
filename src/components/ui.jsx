import React from 'react';
import { isDone, isFailed } from '../usage.js';

export function StatusPill({ status }) {
  const s = String(status || 'processing');
  const kind = isDone({ status: s }) ? 'ok' : isFailed({ status: s }) ? 'bad' : 'wait';
  return <span className={`pill pill-${kind}`}>{s}</span>;
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="empty">
      {Icon && <span className="empty-icon"><Icon size={22} /></span>}
      <strong>{title}</strong>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function Meter({ used, limit }) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div className="meter meter-lg" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Segmented({ options, value, onChange, small = false, label }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg ${small ? 'seg-sm' : ''}`} style={{ '--n': options.length, '--i': i }} role="radiogroup" aria-label={label}>
      <span className="seg-thumb" />
      {options.map((o) => (
        <button type="button" key={o.value} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
