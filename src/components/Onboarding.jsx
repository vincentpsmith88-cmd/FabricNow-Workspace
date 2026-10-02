import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, X, Rocket } from 'lucide-react';
import { api } from '../api.js';

const DISMISS_KEY = 'fabricnow.onboarding.dismissed';
const asList = (d) => { const v = d && !Array.isArray(d) ? (d.keys ?? d.apiKeys ?? d.data) : d; return Array.isArray(v) ? v : []; };

/** Getting-started checklist on Overview. Each step is derived from real workspace data, never ticked by hand. */
export default function Onboarding({ jobs, setPage }) {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } });
  const [facts, setFacts] = useState(null);

  useEffect(() => {
    if (dismissed) return;
    let live = true;
    Promise.allSettled([api('/api/workspace-suite/dashboard'), api('/api/billing/api-keys'), api('/api/workspace-suite/team')]).then(([d, k, t]) => {
      if (!live) return;
      setFacts({
        products: d.status === 'fulfilled' ? Number(d.value?.metrics?.products || 0) : null,
        keys: k.status === 'fulfilled' ? asList(k.value).length : null,
        members: t.status === 'fulfilled' ? (t.value?.team?.members || []).length : null,
        brand: t.status === 'fulfilled' ? Boolean(t.value?.team?.brandKit?.logo || t.value?.team?.brandKit?.voice) : null,
      });
    });
    return () => { live = false; };
  }, [dismissed]);

  if (dismissed || !facts) return null;
  const steps = [
    { id: 'product', label: 'Create your first product', body: 'Start a product record from garment photos.', done: facts.products > 0, go: 'fashion-capture' },
    { id: 'job', label: 'Run a pattern job', body: 'Turn a garment photo into pattern assets.', done: jobs.length > 0, go: 'studio' },
    { id: 'brand', label: 'Set up your brand kit', body: 'Logo, colours and brand voice for listings.', done: facts.brand === true, go: 'fashion-team' },
    { id: 'key', label: 'Create an API key', body: 'Connect your own store or app.', done: facts.keys > 0, go: 'keys' },
    { id: 'team', label: 'Invite a teammate', body: 'Share the workspace with your team.', done: facts.members > 1, go: 'fashion-team' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const pct = Math.round((doneCount / steps.length) * 100);
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } };

  return (
    <section className="onboard">
      <div className="onboard-head">
        <span className="onboard-ico"><Rocket size={18} /></span>
        <div><h3>Get started with FabricNow</h3><p>{doneCount} of {steps.length} done</p></div>
        <div className="onboard-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <button className="icon-btn" data-no-spin onClick={dismiss} aria-label="Hide checklist"><X size={16} /></button>
      </div>
      <ul className="onboard-steps">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? 'done' : ''}>
            <button data-no-spin disabled={s.done} onClick={() => setPage(s.go)}>
              {s.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              <span><strong>{s.label}</strong><small>{s.body}</small></span>
              {!s.done && <ChevronRight size={16} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
