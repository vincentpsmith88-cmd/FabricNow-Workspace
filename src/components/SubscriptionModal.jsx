import React, { useEffect, useState } from 'react';
import { Check, Lock, X, Scissors, ShieldCheck, Infinity as Inf } from 'lucide-react';
import { api, PLAN, money } from '../api.js';
import { useToast } from '../toast.jsx';

const PIECES = [
  { d: 'M18 14 Q34 6 52 14 L58 62 Q38 74 14 62 Z', label: 'Front' },
  { d: 'M74 14 Q92 6 108 14 L112 62 Q92 74 70 62 Z', label: 'Back' },
  { d: 'M16 86 L56 80 L62 128 L10 132 Z', label: 'Sleeve' },
  { d: 'M74 84 Q92 78 112 86 L108 130 Q92 136 70 130 Z', label: 'Facing' },
];

const KINDS = {
  pattern: { head: 'Generate patterns on autopilot', t: 'Agbada · size M', s: '4 pieces, grain lines, seam allowance', now: 'Pattern generation', inc: '250 images / month' },
  tailor: { head: 'Let AI plan your stitching and cutting', t: 'Stitch plan · 12 steps', s: 'Sewing order, allowances, cutting advice', now: 'Tailor Tools AI', inc: 'Included' },
  fabric: { head: 'Turn any fabric photo into a swatch', t: 'Ankara swatch · repeat tile', s: 'Colours, motif and weave detected', now: 'Fabric AI', inc: 'Included' },
  library: { head: 'Generate designs for your pattern library', t: 'Kaftan · 6 variations', s: 'Ready to edit and save', now: 'Library AI', inc: 'Included' },
  assistant: { head: 'Ask the FabricNow assistant anything', t: 'How much fabric for a boubou?', s: 'Answers using your projects', now: 'Assistant', inc: 'Included' },
  converter: { head: 'Unlock image and vector tools', t: 'Image · vector · PDF', s: 'Generate and convert creative files', now: 'Image & vector tools', inc: 'Included' },
};

const ROWS = [
  ['Pattern generation', 'Locked', '250 images / month'],
  ['Exports and manifest', 'Locked', 'Included'],
  ['Extra images, with segmentation', '—', `${money(PLAN.overageSegmentation)} each`],
  ['Extra images, background only', '—', `${money(PLAN.overageBackground)} each`],
  ['Requests blocked at the limit', '—', 'Never'],
];

export default function SubscriptionModal({ open, detail, onClose }) {
  const K = KINDS[detail?.kind] || KINDS.pattern;
  const rows = detail?.kind === 'converter'
    ? [[K.now, 'Locked', K.inc], ['Image and vector conversions', 'Locked', 'Included'], ['Processed images', '—', `${PLAN.included} / month`]]
    : [[K.now, 'Locked', K.inc], ...ROWS.slice(1)];
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const subscribe = async () => {
    setBusy(true);
    try {
      const d = await api('/api/billing/api-checkout', { method: 'POST', body: JSON.stringify({ tier: PLAN.tier }) });
      if (d.url) { window.location.href = d.url; return; }
      toast.error('No redirect link came back from billing. Try again.');
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <div className="sub-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="sub" role="dialog" aria-modal="true" aria-labelledby="sub-title">
        <button className="sub-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <aside className="sub-art">
          <div className="sub-stage" aria-hidden="true">
            <svg viewBox="0 0 128 142" className="sub-sheet">
              {PIECES.map((p, i) => (
                <g key={p.label} style={{ '--i': i }}>
                  <path className="sub-cut" d={p.d} pathLength="1" />
                  <path className="sub-seam" d={p.d} transform="translate(0 0)" />
                </g>
              ))}
              <line className="sub-grain" x1="36" y1="26" x2="36" y2="56" />
              <line className="sub-grain" x1="92" y1="26" x2="92" y2="56" />
            </svg>
            <div className="sub-prompt">
              <span className="sub-prompt-dot" />
              <div>
                <strong>{K.t}</strong>
                <small>{K.s}</small>
              </div>
              <Scissors size={16} />
            </div>
          </div>

          <h2>{K.head}</h2>
          <p>{detail?.message || 'Unlock AI pattern generation, exports and production workflows.'}</p>

          <table className="sub-table">
            <thead><tr><th /><th>Now</th><th className="on">{PLAN.name}</th></tr></thead>
            <tbody>
              {rows.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td className="on">{c}</td></tr>)}
            </tbody>
          </table>
        </aside>

        <div className="sub-pay">
          <h3 id="sub-title">Checkout</h3>

          <div className="sub-plan" aria-label="Selected plan">
            <span className="sub-radio"><i /></span>
            <div>
              <strong>{PLAN.name}</strong>
              <small>{PLAN.included} processed images a month</small>
            </div>
            <div className="sub-plan-price"><b>{money(PLAN.price)}</b><small>/month</small></div>
          </div>

          <ul className="sub-feats">
            <li><Check size={15} />{PLAN.included} images included every month</li>
            <li><Check size={15} />{money(PLAN.overageSegmentation)} per extra image with segmentation</li>
            <li><Check size={15} />{money(PLAN.overageBackground)} per extra image, background removal only</li>
            <li><Inf size={15} />Extra images are billed automatically, never blocked</li>
          </ul>

          <div className="sub-total">
            <div><span>{PLAN.name}</span><b>{money(PLAN.price)}</b></div>
            <div className="due"><span>Amount due today</span><b>{money(PLAN.price)}</b></div>
            <small>Billed {money(PLAN.price)}/month until canceled. Cancel any time from Manage subscription.</small>
          </div>

          <button className={`sub-cta ${busy ? 'is-pending' : ''}`} onClick={subscribe} aria-busy={busy} data-no-spin autoFocus>
            {!busy && <Lock size={16} />}{`Subscribe for ${money(PLAN.price)}/mo`}
          </button>
          <p className="sub-fine"><ShieldCheck size={14} />Payment is completed on Stripe. FabricNow never sees your card details.</p>
          <button className="sub-later" onClick={onClose} data-no-spin>Not now</button>
        </div>
      </section>
    </div>
  );
}
