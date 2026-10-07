import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, ExternalLink, Send, Store } from 'lucide-react';
import { API, api } from '../api.js';
import { useToast } from '../toast.jsx';
import PendingButton from '../components/PendingButton.jsx';
import { PLATFORMS, buildCsv, checkProducts, toProduct } from '../storeCsv.js';

const abs = (u) => (/^https?:\/\//i.test(u || '') ? u : `${API}${u || ''}`);
const pic = (p) => p.mockupAssets?.[0] || p.sourceImages?.[0] || p.technicalFlat?.front || '';
const STORE = 'fabricnow.storeexport.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };

const download = (text, name, type = 'text/csv;charset=utf-8') => {
  const u = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
};

export default function StoreExport() {
  const toast = useToast();
  const saved = useMemo(load, []);
  const [projects, setProjects] = useState(null);
  const [rows, setRows] = useState(saved.rows || {});               // id -> { on, price, stock }
  const [platform, setPlatform] = useState(saved.platform || 'shopify');
  const [sizes, setSizes] = useState(saved.sizes ?? 'S, M, L, XL');
  const [vendor, setVendor] = useState(saved.vendor || '');
  const [publish, setPublish] = useState(false);
  const [imageBase, setImageBase] = useState(saved.imageBase || API);
  const [cred, setCred] = useState({ shop: '', token: '', url: '', key: '', secret: '' });
  const [busy, setBusy] = useState(false); const [results, setResults] = useState(null);

  useEffect(() => { api('/api/workspace-suite/projects').then((d) => setProjects(d.projects || [])).catch((e) => { setProjects([]); toast.error(e.message); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ rows, platform, sizes, vendor, imageBase })); } catch { /* storage full or blocked */ } }, [rows, platform, sizes, vendor, imageBase]);

  const setRow = (id, p) => setRows((r) => ({ ...r, [id]: { on: false, price: '', stock: '', ...r[id], ...p } }));
  const sizeList = useMemo(() => sizes.split(/[,\n]/).map((x) => x.trim()).filter(Boolean), [sizes]);
  const chosen = useMemo(() => (projects || []).filter((p) => rows[p.id]?.on), [projects, rows]);
  const products = useMemo(() => chosen.map((p) => toProduct(p, rows[p.id], { imageBase, vendor, sizes: sizeList, publish })), [chosen, rows, imageBase, vendor, sizeList, publish]);
  const warnings = useMemo(() => (products.length ? checkProducts(products, imageBase) : []), [products, imageBase]);
  const allOn = projects?.length > 0 && projects.every((p) => rows[p.id]?.on);
  const info = PLATFORMS[platform];

  const exportCsv = () => download(buildCsv(platform, products), info.file);
  const push = async () => {
    setBusy(true); setResults(null);
    try {
      const credentials = platform === 'shopify' ? { shop: cred.shop, token: cred.token } : { url: cred.url, key: cred.key, secret: cred.secret };
      const d = await api('/api/store-export/push', { method: 'POST', body: JSON.stringify({ platform, credentials, products }) });
      setResults(d.results || []);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const okCount = results?.filter((r) => r.ok).length || 0;

  return (
    <div className="se">
      <section className="sl-card">
        <header className="sl-head">
          <div><h2>Products</h2><p>Choose what to send to your store and set a price for each. Prices are remembered on this device.</p></div>
        </header>
        {projects === null ? <p className="sl-muted">Loading your products…</p> : !projects.length ? (
          <div className="sl-empty"><Store size={26} /><strong>No products yet</strong><span>Create a design in the workspace first, then come back to export it.</span></div>
        ) : (
          <div className="se-table-wrap">
            <table className="se-table">
              <thead><tr>
                <th><input type="checkbox" aria-label="Select all" checked={allOn} onChange={(e) => setRows((r) => Object.fromEntries([...Object.entries(r), ...projects.map((p) => [p.id, { price: '', stock: '', ...r[p.id], on: e.target.checked }])]))} /></th>
                <th>Product</th><th>Price</th><th>Stock</th>
              </tr></thead>
              <tbody>
                {projects.map((p) => {
                  const r = rows[p.id] || {};
                  return (
                    <tr key={p.id} className={r.on ? 'on' : ''}>
                      <td><input type="checkbox" aria-label={`Select ${p.name}`} checked={!!r.on} onChange={(e) => setRow(p.id, { on: e.target.checked })} /></td>
                      <td><div className="se-prod">{pic(p) ? <img src={abs(pic(p))} alt="" loading="lazy" /> : <span className="sl-noimg" />}<div><strong>{p.name}</strong><small>{[p.sku, p.category].filter(Boolean).join(' · ') || 'No SKU'}</small></div></div></td>
                      <td><input className="se-num" inputMode="decimal" placeholder="0.00" value={r.price || ''} onChange={(e) => setRow(p.id, { price: e.target.value, on: r.on ?? e.target.value !== '' })} aria-label={`Price for ${p.name}`} /></td>
                      <td><input className="se-num" inputMode="numeric" placeholder="Any" value={r.stock || ''} onChange={(e) => setRow(p.id, { stock: e.target.value })} aria-label={`Stock for ${p.name}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="sl-card">
        <h2>Send to</h2>
        <div className="se-tabs" role="tablist">
          {Object.entries(PLATFORMS).map(([k, p]) => <button key={k} role="tab" aria-selected={platform === k} className={platform === k ? 'on' : ''} data-no-spin onClick={() => { setPlatform(k); setResults(null); }}>{p.name}</button>)}
        </div>

        <div className="sl-form">
          <label className="wide"><span>Sizes (leave empty for one size)</span><input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="S, M, L, XL" /></label>
          <label><span>Brand / vendor</span><input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Your label" /></label>
          <label><span>Status in store</span><select value={publish ? 'live' : 'draft'} onChange={(e) => setPublish(e.target.value === 'live')}><option value="draft">Draft (review first)</option><option value="live">Live straight away</option></select></label>
          <label className="wide"><span>Public address of your pictures</span><input value={imageBase} onChange={(e) => setImageBase(e.target.value)} /></label>
        </div>

        {platform === 'jumia' && <p className="sl-note">Jumia has no public product API for sellers. Download this file and copy its columns into the Jumia Vendor Center template for your category, which differs per category.</p>}
        {warnings.map((w) => <p className="sl-warn" key={w}><AlertTriangle size={15} />{w}</p>)}

        <div className="sl-actions">
          <PendingButton icon={Download} disabled={!products.length} onClick={exportCsv}>Download {info.name} CSV{products.length ? ` (${products.length})` : ''}</PendingButton>
        </div>

        {info.push && (
          <div className="se-push">
            <h3>Or send directly to your store</h3>
            <p className="sl-muted">Products are created for review. Your keys are used for this request only and are never saved.</p>
            <div className="sl-form">
              {platform === 'shopify' ? (<>
                <label><span>Store address</span><input value={cred.shop} onChange={(e) => setCred({ ...cred, shop: e.target.value })} placeholder="yourstore.myshopify.com" autoComplete="off" /></label>
                <label><span>Admin API access token</span><input type="password" value={cred.token} onChange={(e) => setCred({ ...cred, token: e.target.value })} placeholder="shpat_…" autoComplete="off" /></label>
              </>) : (<>
                <label className="wide"><span>Store URL</span><input value={cred.url} onChange={(e) => setCred({ ...cred, url: e.target.value })} placeholder="https://yourstore.com" autoComplete="off" /></label>
                <label><span>Consumer key</span><input value={cred.key} onChange={(e) => setCred({ ...cred, key: e.target.value })} placeholder="ck_…" autoComplete="off" /></label>
                <label><span>Consumer secret</span><input type="password" value={cred.secret} onChange={(e) => setCred({ ...cred, secret: e.target.value })} placeholder="cs_…" autoComplete="off" /></label>
              </>)}
            </div>
            <p className="sl-muted">{platform === 'shopify' ? 'Create a custom app in Shopify with the write_products permission, then paste its Admin API token.' : 'In WooCommerce go to Settings, Advanced, REST API and create a key with Read/Write access.'} Categories and tags are only set by the CSV import.</p>
            <div className="sl-actions">
              <PendingButton busy={busy} icon={Send} className="btn btn-ghost" disabled={!products.length} onClick={push}>Send {products.length || ''} product{products.length === 1 ? '' : 's'} to {info.name}</PendingButton>
            </div>
            {results && (
              <ul className="se-results">
                <li className="sum">{okCount} of {results.length} sent</li>
                {results.map((r, i) => (
                  <li key={i} className={r.ok ? 'ok' : 'bad'}>
                    {r.ok ? <Check size={15} /> : <AlertTriangle size={15} />}<span><strong>{r.name}</strong>{r.ok ? '' : ` · ${r.error}`}</span>
                    {r.ok && r.url && <a href={r.url} target="_blank" rel="noreferrer" aria-label="Open in store"><ExternalLink size={14} /></a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
