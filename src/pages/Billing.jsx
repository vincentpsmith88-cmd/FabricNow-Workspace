import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { api, PLAN, money } from '../api.js';
import { getUsage } from '../usage.js';
import { useToast } from '../toast.jsx';

export default function Billing({ apiStatus }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const { active } = getUsage(apiStatus);

  const go = async (key, path, body) => {
    setBusy(key);
    try {
      const d = await api(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
      if (d.url) { window.location.href = d.url; return; }
      toast.error('No redirect link came back from billing. Try again.');
    } catch (e) { toast.error(e.message); }
    finally { setBusy(''); }
  };

  const features = [
    `${PLAN.included} processed images included every month`,
    `${money(PLAN.overageSegmentation)} per extra image with segmentation`,
    `${money(PLAN.overageBackground)} per extra image, background removal only`,
    'Overage billed automatically; requests are never blocked',
  ];

  return (
    <div className="cols grid-2 billing">
      <section className="panel plan-card">
        <div className="plan-top">
          <div>
            <h3>{PLAN.name}</h3>
            <p className="muted">For higher-volume and multi-customer integrations.</p>
          </div>
          {active && <span className="pill pill-ok">Current plan</span>}
        </div>
        <div className="price"><strong>{money(PLAN.price)}</strong><span>/ month</span></div>
        <ul className="checks">{features.map((f) => <li key={f}><Check size={16} />{f}</li>)}</ul>
        {active ? (
          <button className="btn btn-ghost" disabled={busy === 'portal'} onClick={() => go('portal', '/api/billing/portal')}>
            {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy === 'checkout'} onClick={() => go('checkout', '/api/billing/api-checkout', { tier: PLAN.tier })}>
            {busy === 'checkout' ? 'Redirecting…' : `Subscribe for ${money(PLAN.price)}/mo`}
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Subscription</h3></div>
        <dl className="kv">
          <div><dt>Status</dt><dd>{active ? 'Active' : 'Not subscribed'}</dd></div>
          <div><dt>Plan</dt><dd>{PLAN.name}</dd></div>
          <div><dt>Monthly price</dt><dd>{money(PLAN.price)}</dd></div>
        </dl>
        <p className="muted small-text">Payments, invoices and card details are handled in the Stripe billing portal, opened from Manage subscription.</p>
      </section>
    </div>
  );
}
