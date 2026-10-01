import React from 'react';
import { PLAN, money } from '../api.js';
import { getUsage } from '../usage.js';
import { Meter } from '../components/ui.jsx';

export default function Usage({ apiStatus, setPage }) {
  const u = getUsage(apiStatus);
  const low = u.over * PLAN.overageBackground;
  const high = u.over * PLAN.overageSegmentation;
  return (
    <div className="cols grid-2">
      <section className="panel">
        <div className="panel-head"><h3>This month</h3></div>
        <div className="big-num">{u.used.toLocaleString()}<span> / {u.limit.toLocaleString()} images</span></div>
        <Meter used={u.used} limit={u.limit} />
        <p className="muted small-text">
          {u.over > 0
            ? `${u.over.toLocaleString()} images over your included volume, roughly ${money(low)} to ${money(high)} in overage depending on the mix of background removal and segmentation.`
            : `${Math.max(0, u.limit - u.used).toLocaleString()} included images remaining.`}
        </p>
      </section>
      <section className="panel">
        <div className="panel-head"><h3>Overage rates</h3></div>
        <dl className="kv">
          <div><dt>With segmentation</dt><dd>{money(PLAN.overageSegmentation)} / image</dd></div>
          <div><dt>Background removal only</dt><dd>{money(PLAN.overageBackground)} / image</dd></div>
        </dl>
        <p className="muted small-text">Overage is billed automatically once the month’s included images are used. No request is blocked for going over.</p>
        <button className="btn btn-ghost" onClick={() => setPage('billing')}>View billing</button>
      </section>
    </div>
  );
}
