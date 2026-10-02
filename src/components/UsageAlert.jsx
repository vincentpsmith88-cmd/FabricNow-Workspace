import React, { useState } from 'react';
import { AlertTriangle, Gauge, X } from 'lucide-react';

/** Warns at 80% and again at 100% of the monthly image allowance. Dismissal lasts for the current month and level. */
export default function UsageAlert({ usage, setPage }) {
  const pct = Math.round((usage.used / Math.max(1, usage.limit)) * 100);
  const level = usage.used >= usage.limit ? 'over' : pct >= 80 ? 'warn' : null;
  const month = new Date().toISOString().slice(0, 7);
  const key = `fabricnow.usage-alert.${month}.${level}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  if (!usage.active || !level || hidden) return null;
  const left = Math.max(0, usage.limit - usage.used);
  const dismiss = () => { setHidden(true); try { localStorage.setItem(key, '1'); } catch { /* ignore */ } };
  return (
    <div className={`usage-alert ${level}`} role="status">
      <span className="usage-alert-ico">{level === 'over' ? <AlertTriangle size={18} /> : <Gauge size={18} />}</span>
      <div>
        <strong>{level === 'over' ? 'You have used your included images for this month.' : `You have used ${pct}% of your monthly images.`}</strong>
        <span>
          {level === 'over'
            ? `${usage.over.toLocaleString()} processed beyond the ${usage.limit.toLocaleString()} included. Extra images are billed at your plan's overage rates.`
            : `${left.toLocaleString()} of ${usage.limit.toLocaleString()} images left before overage rates apply.`}
        </span>
      </div>
      <button className="btn btn-ghost" data-no-spin onClick={() => setPage('usage')}>View usage</button>
      <button className="icon-btn" data-no-spin onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
    </div>
  );
}
