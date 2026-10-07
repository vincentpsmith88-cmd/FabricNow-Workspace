import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Download, ExternalLink, FileText, ImagePlus, LayoutGrid, Link2, Plus, Search, Trash2, X } from 'lucide-react';
import { API, api } from '../api.js';
import { useToast } from '../toast.jsx';
import PendingButton from '../components/PendingButton.jsx';
import { buildPdf, canvasBlob } from '../convert.js';
import { CURRENCIES, LAYOUTS, THEMES, renderPages } from '../lookbookRender.js';

const abs = (u) => (/^https?:\/\//i.test(u || '') ? u : `${API}${u || ''}`);
const pic = (p) => p.mockupAssets?.[0] || p.sourceImages?.[0] || p.technicalFlat?.front || '';
let seq = 0;

function loadImg(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('image')); i.src = src; });
}
async function fetchImage(url) {
  const res = await fetch(url); if (!res.ok) throw new Error('missing');
  const blob = await res.blob(); const src = URL.createObjectURL(blob);
  return { img: await loadImg(src), src };
}
/** Photos sent to the share page are shrunk to keep the page fast. */
async function shareJpeg(img) {
  const k = Math.min(1, 1400 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.85, 0.72, 0.6]) { const b = await canvasBlob(c, 'image/jpeg', q); if (b.size < 1.4 * 1024 * 1024 || q === 0.6) return new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }
  return '';
}
const download = (blob, name) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); };

export default function Lookbook() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [s, setS] = useState({ title: 'Harmattan Collection', brand: '', subtitle: '', currency: 'USD', theme: 'light', layout: 'one' });
  const [pages, setPages] = useState([]);
  const [picker, setPicker] = useState(false); const [projects, setProjects] = useState(null); const [q, setQ] = useState('');
  const [busyPdf, setBusyPdf] = useState(false); const [busyShare, setBusyShare] = useState(false); const [busyAdd, setBusyAdd] = useState(false);
  const [links, setLinks] = useState([]); const [copied, setCopied] = useState(''); const [confirm, setConfirm] = useState('');
  const file = useRef(null);
  const set = (p) => setS((o) => ({ ...o, ...p }));

  const loadLinks = useCallback(() => api('/api/lookbooks').then((d) => setLinks(d.lookbooks || [])).catch(() => {}), []);
  useEffect(() => { loadLinks(); }, [loadLinks]);
  useEffect(() => () => items.forEach((i) => i.src && URL.revokeObjectURL(i.src)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // live preview (debounced)
  useEffect(() => {
    if (!items.length) { setPages([]); return undefined; }
    let live = true; const t = setTimeout(async () => {
      const cs = await renderPages(items, s, 520); if (live) setPages(cs.map((c) => c.toDataURL('image/jpeg', 0.8)));
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [items, s]);

  const openPicker = async () => {
    setPicker((v) => !v); if (projects) return;
    try { const d = await api('/api/workspace-suite/projects'); setProjects(d.projects || []); } catch (e) { setProjects([]); toast.error(e.message); }
  };
  const addProject = async (p) => {
    const url = pic(p); if (!url) { toast.error(`${p.name} has no picture yet.`); return; }
    setBusyAdd(true);
    try {
      const { img, src } = await fetchImage(abs(url));
      setItems((cur) => [...cur, { id: ++seq, projectId: p.id, name: p.name, price: p.listing?.price ? String(p.listing.price) : '', note: [p.fabric, p.color].filter(Boolean).join(' · '), img, src }]);
    } catch { toast.error(`The picture for ${p.name} could not be loaded. Upload it from your computer instead.`); } finally { setBusyAdd(false); }
  };
  const addFiles = async (list) => {
    setBusyAdd(true);
    for (const f of Array.from(list || [])) {
      if (!f.type.startsWith('image/')) continue;
      try { const src = URL.createObjectURL(f); const img = await loadImg(src); setItems((cur) => [...cur, { id: ++seq, name: f.name.replace(/\.[^.]+$/, ''), price: '', note: '', img, src }]); }
      catch { toast.error(`${f.name} could not be read as a picture.`); }
    }
    setBusyAdd(false);
  };
  const upd = (id, p) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const move = (i, d) => setItems((cur) => { const a = [...cur]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id));

  const pdf = async () => {
    setBusyPdf(true);
    try {
      const cs = await renderPages(items, s);
      const out = [];
      for (const c of cs) { const b = await canvasBlob(c, 'image/jpeg', 0.9); out.push({ bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height }); }
      download(await buildPdf(out, { size: 'a4', margin: 0 }), `${(s.title || 'lookbook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
    } catch (e) { toast.error(e.message || 'The PDF could not be made.'); } finally { setBusyPdf(false); }
  };
  const share = async () => {
    setBusyShare(true);
    try {
      const body = { ...s, items: [] };
      for (const it of items) body.items.push({ name: it.name, price: it.price, note: it.note, image: await shareJpeg(it.img) });
      await api('/api/lookbooks', { method: 'POST', body: JSON.stringify(body) });
      await loadLinks();
    } catch (e) { toast.error(e.message); } finally { setBusyShare(false); }
  };
  const copy = (url) => { try { navigator.clipboard.writeText(url); } catch { /* ignore */ } setCopied(url); setTimeout(() => setCopied(''), 1400); };
  const del = async (l) => {
    if (confirm !== l.id) { setConfirm(l.id); setTimeout(() => setConfirm(''), 3000); return; }
    try { await api(`/api/lookbooks/${l.id}`, { method: 'DELETE' }); setConfirm(''); loadLinks(); } catch (e) { toast.error(e.message); }
  };

  const shown = useMemo(() => (projects || []).filter((p) => !q || `${p.name} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(q.toLowerCase())), [projects, q]);
  const ready = items.length > 0;

  return (
    <div className="sl">
      <section className="sl-card sl-left">
        <header className="sl-head">
          <div><h2>Designs</h2><p>Pick the pieces for this lookbook, then set a price and a short line for each.</p></div>
          <div className="sl-head-actions">
            <button className="btn btn-ghost btn-sm" data-no-spin onClick={openPicker}><Plus size={14} /> My designs</button>
            <button className="btn btn-ghost btn-sm" data-no-spin onClick={() => file.current?.click()}><ImagePlus size={14} /> Upload</button>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
        </header>

        {picker && (
          <div className="sl-picker">
            <label className="sl-search"><Search size={15} /><input placeholder="Search your designs" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            {projects === null ? <p className="sl-muted">Loading your designs…</p> : !shown.length ? <p className="sl-muted">No designs found. You can upload pictures instead.</p> : (
              <div className="sl-pick-grid">
                {shown.map((p) => (
                  <button key={p.id} className="sl-pick" data-no-spin onClick={() => addProject(p)} disabled={busyAdd}>
                    {pic(p) ? <img src={abs(pic(p))} alt="" loading="lazy" /> : <span className="sl-noimg">No picture</span>}
                    <span>{p.name}</span><i>{items.some((i) => i.projectId === p.id) ? <Check size={13} /> : <Plus size={13} />}</i>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!ready ? (
          <div className="sl-empty"><LayoutGrid size={26} /><strong>No designs yet</strong><span>Add designs from your workspace or upload pictures to start.</span></div>
        ) : (
          <ul className="sl-items">
            {items.map((it, i) => (
              <li key={it.id}>
                <img src={it.src} alt="" />
                <div className="sl-fields">
                  <input aria-label="Design name" value={it.name} placeholder="Name" onChange={(e) => upd(it.id, { name: e.target.value })} />
                  <div className="sl-two">
                    <input aria-label="Price" value={it.price} placeholder={`Price (${s.currency})`} inputMode="decimal" onChange={(e) => upd(it.id, { price: e.target.value })} />
                    <input aria-label="Short note" value={it.note} placeholder="Short note" onChange={(e) => upd(it.id, { note: e.target.value })} />
                  </div>
                </div>
                <div className="sl-order">
                  <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} data-no-spin><ArrowUp size={15} /></button>
                  <button className="icon-btn" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} data-no-spin><ArrowDown size={15} /></button>
                  <button className="icon-btn" aria-label={`Remove ${it.name}`} onClick={() => remove(it.id)} data-no-spin><X size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sl-card sl-right">
        <h2>Lookbook</h2>
        <div className="sl-form">
          <label><span>Title</span><input value={s.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label><span>Brand</span><input value={s.brand} placeholder="Your label" onChange={(e) => set({ brand: e.target.value })} /></label>
          <label className="wide"><span>Tagline</span><input value={s.subtitle} placeholder="Season, theme or a single line" onChange={(e) => set({ subtitle: e.target.value })} /></label>
          <label><span>Currency</span><select value={s.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label><span>Look</span><select value={s.theme} onChange={(e) => set({ theme: e.target.value })}>{Object.entries(THEMES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}</select></label>
          <label className="wide"><span>Layout</span><select value={s.layout} onChange={(e) => set({ layout: e.target.value })}>{Object.entries(LAYOUTS).map(([k, l]) => <option key={k} value={k}>{l.name}</option>)}</select></label>
        </div>

        {pages.length > 0 && <div className="sl-pages" aria-label="Page preview">{pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} />)}</div>}

        <div className="sl-actions">
          <PendingButton busy={busyPdf} icon={FileText} disabled={!ready} onClick={pdf}>Download PDF</PendingButton>
          <PendingButton busy={busyShare} icon={Link2} className="btn btn-ghost" disabled={!ready} onClick={share}>Create share link</PendingButton>
        </div>
        <p className="sl-muted">A share link is a public web page anyone with the link can open. Delete it below to switch it off.</p>

        {links.length > 0 && (
          <ul className="sl-links">
            {links.map((l) => (
              <li key={l.id}>
                <div><strong>{l.title}</strong><small>{l.count} design{l.count === 1 ? '' : 's'} · {new Date(l.createdAt).toLocaleDateString()}</small></div>
                <button className="btn btn-ghost btn-sm" data-no-spin onClick={() => copy(l.url)}>{copied === l.url ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</button>
                <a className="icon-btn" href={l.url} target="_blank" rel="noreferrer" aria-label="Open page"><ExternalLink size={15} /></a>
                <button className={`icon-btn ${confirm === l.id ? 'danger' : ''}`} data-no-spin onClick={() => del(l)} aria-label="Delete link" title={confirm === l.id ? 'Click again to delete' : 'Delete'}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
