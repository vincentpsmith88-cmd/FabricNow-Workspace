export const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const GOOGLE_AUTH_PATH = import.meta.env.VITE_GOOGLE_AUTH_PATH || '/api/auth/google';

export const TOKEN_KEY = 'fabricnow_token';

export async function api(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers });
  } catch {
    throw new Error('Could not reach the FabricNow API. Check your connection and try again.');
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
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
