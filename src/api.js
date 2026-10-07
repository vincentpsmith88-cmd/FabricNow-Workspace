export const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const GOOGLE_AUTH_PATH = import.meta.env.VITE_GOOGLE_AUTH_PATH || '/api/auth/google';

export const TOKEN_KEY = 'fabricnow_token';
export const COMPANY_KEY = 'fabricnow_company_id';


// ---- Subscription gate -------------------------------------------------------------------------
// null = not known yet (the server decides), true/false once /api/billing/api-status has answered.
let subscribed = null;
export const setSubscribed = (v) => { subscribed = v; };
export const isSubscriptionInactive = () => subscribed === false;
export const UPGRADE_MSG = 'Choose a plan to use this feature.';
export const isUpgradeMessage = (m) => m === UPGRADE_MSG || /active api (plan|subscription)|upgrade to unlock|api plan is required/i.test(String(m || ''));

// Every endpoint that generates something. Matched on POST only.
const GENERATORS = [
  [/^\/api\/tailor-tools\/(ai|stitch-plan|cutting-layout)/, 'tailor'],
  [/^\/api\/workspace\/(patterns|tools|jobs\/[^/]+\/grade)/, 'pattern'],
  [/^\/api\/workspace-suite\/fabrics\/ai-/, 'fabric'],
  [/^\/api\/pattern-library\/ai/, 'library'],
  [/^\/api\/assistant\//, 'assistant'],
];
const kindOf = (path) => { const p = String(path).split('?')[0]; const hit = GENERATORS.find(([re]) => re.test(p)); return hit ? hit[1] : null; };

export function requestUpgrade(kind = 'pattern', extra = {}) {
  window.dispatchEvent(new CustomEvent('fabricnow:upgrade-required', { detail: { kind, target: 'billing', ...extra } }));
}

export async function api(path, opts = {}) {
  const method = String(opts.method || 'GET').toUpperCase();
  const genKind = method === 'POST' ? kindOf(path) : null;
  if (genKind && subscribed === false) {
    requestUpgrade(genKind);
    throw Object.assign(new Error(UPGRADE_MSG), { code: 'API_SUBSCRIPTION_REQUIRED' });
  }
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const companyId = localStorage.getItem(COMPANY_KEY);
  if (companyId) headers['X-Company-ID'] = companyId;

  let res;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers });
  } catch {
    throw new Error('Could not reach the FabricNow API. Check your connection and try again.');
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const isUpgradeRequired = data.code === 'API_SUBSCRIPTION_REQUIRED' || /active api subscription|upgrade to unlock/i.test(String(data.error || data.message || ''));
    if (isUpgradeRequired) {
      window.dispatchEvent(new CustomEvent('fabricnow:upgrade-required', {
        detail: {
          kind: kindOf(path) || 'pattern',
          title: data.title || 'Upgrade to unlock pattern generation',
          message: data.message || data.error || 'Upgrade to unlock AI-powered pattern generation.',
          ctaLabel: data.ctaLabel || 'View plans',
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          target: 'billing',
        },
      }));
    }
    throw Object.assign(new Error(data.error || data.message || 'Request failed'), {
      code: data.code || 'API_ERROR',
      details: data,
    });
  }
  return data;
}

// Plan facts, as published at https://fabricnow.tonasel.com/developers
export const PLAN = {
  name: 'API Growth',
  tier: 'growth',
  price: 2900,
  included: 250,
  overageSegmentation: 49,
  overageBackground: 20,
};

export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/** Fetch a protected file (image, zip) with the sign-in token and return it as a Blob. */
export async function fetchBlob(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  let res;
  try {
    res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error('Could not reach the FabricNow API. Check your connection and try again.');
  }
  if (!res.ok) {
    let msg = 'Download failed';
    try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  return res.blob();
}

/** POST a form (file upload) to a protected endpoint that answers with a file, and return the file as a Blob. */
export async function postForBlob(path, formData) {
  const token = localStorage.getItem(TOKEN_KEY);
  let res;
  try {
    res = await fetch(`${API}${path}`, { method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error('Could not reach the FabricNow API. Check your connection and try again.');
  }
  if (!res.ok) {
    let msg = 'The request failed.';
    try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  return res.blob();
}

export async function downloadFile(path, filename) {
  const blob = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
