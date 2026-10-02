import { api, COMPANY_KEY } from './api.js';

export async function loadCompanyContext() {
  const selected = localStorage.getItem(COMPANY_KEY);
  return api('/api/companies/bootstrap', selected ? { headers: { 'X-Company-ID': selected } } : {});
}

export function selectCompany(id) {
  if (id) localStorage.setItem(COMPANY_KEY, id);
  else localStorage.removeItem(COMPANY_KEY);
}
