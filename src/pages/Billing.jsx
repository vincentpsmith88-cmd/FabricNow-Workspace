import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { api, PLAN, money } from '../api.js';
import { getUsage } from '../usage.js';
import { useToast } from '../toast.jsx';
import EmptyPage from './EmptyPage.jsx';
import { openPaystackInline } from '../paystack.js';

export default function Billing({ apiStatus }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const { active } = getUsage(apiStatus);
  if (!apiStatus) return <EmptyPage type="billing" eyebrow="BILLING" title="Billing is waiting for a live connection" body="Subscription and payment details are intentionally empty until FabricNow receives a confirmed billing status." />;

  const go = async (key, path, body) => {
    setBusy(key);
    try {
      const d = await api(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
      if (d.access_code) { await openPaystackInline(d.access_code); return; }
      if (d.canceled) { window.location.reload(); return; }
      toast.error('Paystack did not return a checkout code. Try again.');
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
    <>
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
          <button className="btn btn-ghost" disabled={busy === 'portal' || apiStatus.entitlement?.cancelAtPeriodEnd} onClick={() => go('portal', '/api/billing/cancel', { product: 'api' })}>
            {busy === 'portal' ? 'Canceling…' : apiStatus.entitlement?.cancelAtPeriodEnd ? 'Renewal canceled' : 'Cancel subscription'}
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
        <p className="muted small-text">Payments are processed securely by Paystack. FabricNow does not collect or store your card number or security code. You can cancel renewal here; access remains active through the paid period.</p>
      </section>
    </div>
    </>
  );
}
