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

export function Spinner({ size = 16, className = '' }) {
  return <span className={`ui-spinner ${className}`} style={{ '--spinner-size': `${size}px` }} aria-hidden="true" />;
}

export function LoadingButton({ busy = false, children, ...props }) {
  return <button {...props} disabled={busy || props.disabled} aria-busy={busy}>{busy && <Spinner size={15} />}{children}</button>;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, className = '' }) {
  return <span className={`ui-skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function PanelSkeleton({ rows = 4, table = false }) {
  return (
    <div className="panel ui-loading-panel" aria-busy="true" aria-label="Loading">
      <div className="ui-skeleton-head"><Skeleton width="34%" height={17}/><Skeleton width="18%" height={11}/></div>
      {table ? Array.from({ length: rows }).map((_, i) => (
        <div className="ui-skeleton-row" key={i}>
          <Skeleton width="24%" height={13}/><Skeleton width="18%" height={13}/><Skeleton width="15%" height={13}/><Skeleton width="12%" height={13}/>
        </div>
      )) : Array.from({ length: rows }).map((_, i) => <Skeleton key={i} width={`${86 - i * 7}%`} height={12}/>) }
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

export function Meter({ used, limit }) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div className="meter meter-lg" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
