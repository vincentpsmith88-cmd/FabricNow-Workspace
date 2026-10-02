import { PLAN } from './api.js';

export function getUsage(apiStatus) {
  const ent = apiStatus?.entitlement || {};
  const used = Number(ent.usage ?? ent.used ?? 0) || 0;
  const limit = Number(ent.limit ?? ent.quota ?? 0) || PLAN.included;
  return { used, limit, active: Boolean(ent.tier), over: Math.max(0, used - limit) };
}

export const isDone = (j) => ['completed', 'done', 'succeeded'].includes(String(j.status || '').toLowerCase());
export const isFailed = (j) => ['failed', 'error'].includes(String(j.status || '').toLowerCase());

export function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const cap = (s) => { const t = String(s || ''); return t.charAt(0).toUpperCase() + t.slice(1); };

export function jobDate(j) {
  const v = j.createdAt || j.created_at || j.date;
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Jobs per day for the last `days` days (oldest first). */
export function dailySeries(jobs, days) {
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    buckets.push({ date: d, value: 0, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }
  const idx = new Map(buckets.map((b, i) => [b.date.toDateString(), i]));
  jobs.forEach((j) => { const d = jobDate(j); const k = d && idx.get(d.toDateString()); if (k !== null && k !== undefined) buckets[k].value++; });
  return buckets;
}

export function tally(jobs, pick, limit = 6) {
  const m = {};
  jobs.forEach((j) => { const k = pick(j); m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Only returns a real company name; backend placeholders like "test Workspace" are ignored. */
export function companyName(user) {
  const n = String(user?.companyName || '').trim();
  if (!n) return '';
  if (/\bworkspace$/i.test(n)) return '';
  if (n.toLowerCase() === String(user?.name || '').trim().toLowerCase()) return '';
  return n;
}

export const KIND_LABEL = {
  pattern: 'Pattern', print: 'Print generator', colorways: 'Colourways', fabric: 'Fabric extraction',
  flats: 'Sketch to flats', mockup: 'Mockup', asoebi: 'Aso-ebi styles',
};

/** A readable name for any job, pattern or tool. */
export function jobTitle(j) {
  const kind = j.kind || 'pattern';
  if (kind === 'pattern') return (j.garment && j.garment !== 'Auto-detect') ? cap(String(j.garment).replace(/-/g, ' ')) : 'Pattern job';
  return `${KIND_LABEL[kind] || cap(kind)}${j.garment ? ` · ${cap(String(j.garment).replace(/-/g, ' '))}` : ''}`;
}

export const isRunning = (j) => !isDone(j) && !isFailed(j);
