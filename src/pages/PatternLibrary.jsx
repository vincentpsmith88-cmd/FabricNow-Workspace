import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, GripVertical, ImagePlus, Library, Pencil, Scissors, Sparkles, Star, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { compressImage } from '../imageTools.js';
import { Spinner } from '../components/ui.jsx';
import { Chips, ErrorBanner, Modal, PageHead, PageSkeleton, ProEmpty, SearchBox, useSnack } from '../components/kit.jsx';
import { flatSvg, normalizeSpec } from './patterns/flats.js';
import { STARTERS, CATEGORIES } from './patterns/starters.js';
import { seedFromDesign } from './patterns/seed.js';
import './pattern-library.css';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const IDEAS = ['Puff-sleeve wrap dress', 'Wide-leg trousers with pleats', 'Cropped bomber with ribbed hem', 'Embroidered kaftan with side slits'];
const SOURCE = { starter: 'Starter', ai: 'AI', photo: 'From photo', duplicate: 'Mine', manual: 'Mine' };
const label = (s) => String(s).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

/* The sketch is plain SVG drawn from the spec, so it stays sharp at any size. */
function Flat({ spec, className = '' }) {
  const svg = useMemo(() => flatSvg(spec, { label: false }), [JSON.stringify(spec)]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`pl-flat ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
const specChips = (s) => {
  const n = normalizeSpec(s), out = [label(n.family), `${label(n.fit)} fit`, n.length && `${label(n.length)} length`];
  if (n.family !== 'skirt' && n.family !== 'trousers') out.push(`${label(n.neckline)} neck`, n.sleeve === 'none' ? 'Sleeveless' : `${label(n.sleeve)} sleeves`);
  if (n.family === 'dress' || n.family === 'skirt') out.push(`${label(n.skirt)} skirt`);
  if (n.family === 'trousers' || n.family === 'jumpsuit') out.push(`${label(n.leg)} leg`);
  if (n.closure !== 'none') out.push(label(n.closure)); if (n.pockets !== 'none') out.push(`${label(n.pockets)} pockets`);
  return [...out.filter(Boolean), ...n.details.map(label)];
};

export default function PatternLibrary({ setPage }) {
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, push] = useSnack();
  const [scope, setScope] = useState('all');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [prompt, setPrompt] = useState('');
  const [ref, setRef] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [size, setSize] = useState('M');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState(false);
  const [fresh, setFresh] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api('/api/pattern-library').then((d) => setMine(d.designs || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { if (!fresh) return undefined; const t = setTimeout(() => setFresh(''), 2600); return () => clearTimeout(t); }, [fresh]);

  const all = useMemo(() => [...mine.map((d) => ({ ...d, mine: true })), ...STARTERS.map((d) => ({ ...d, mine: false }))], [mine]);
  const byId = useMemo(() => new Map(all.map((d) => [d.id, d])), [all]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((d) => (scope === 'all' || (scope === 'mine' ? d.mine : !d.mine)) && (cat === 'all' || d.category === cat)
      && (!t || [d.name, d.description, ...(d.tags || [])].join(' ').toLowerCase().includes(t)));
  }, [all, scope, cat, q]);
  const catCounts = useMemo(() => {
    const base = all.filter((d) => scope === 'all' || (scope === 'mine' ? d.mine : !d.mine));
    return CATEGORIES.map(([value, lab]) => ({ value, label: lab, count: value === 'all' ? base.length : base.filter((d) => d.category === value).length }));
  }, [all, scope]);

  /* ---------- actions ---------- */
  const generate = async () => {
    if (busy) return;
    if (!prompt.trim() && !photo) return push('Describe the design or add a photo first.', 'error');
    setBusy(true);
    try {
      const body = { prompt, size, imageDataUrl: photo || undefined };
      if (ref) { if (ref.mine) body.referenceId = ref.id; else { body.referenceSpec = ref.spec; body.referenceName = ref.name; } }
      const d = await api('/api/pattern-library/ai', { method: 'POST', body: JSON.stringify(body) });
      setMine((m) => [d.design, ...m]); setFresh(d.design.id); setScope('all'); setCat('all'); setQ('');
      setPrompt(''); setPhoto(null); setRef(null);
      push(`Created “${d.design.name}”. It is saved in My designs.`);
    } catch (e) { push(e.message, 'error'); } finally { setBusy(false); }
  };
  const duplicate = async (d) => {
    try {
      const r = d.mine ? await api(`/api/pattern-library/${d.id}/duplicate`, { method: 'POST' })
        : await api('/api/pattern-library', { method: 'POST', body: JSON.stringify({ name: `${d.name} copy`, category: d.category, description: d.description, tags: d.tags, spec: d.spec, sizeLabel: size, source: 'starter' }) });
      setMine((m) => [r.design, ...m]); setFresh(r.design.id); push('Duplicated. Your copy is in My designs.');
    } catch (e) { push(e.message, 'error'); }
  };
  const draft = (d) => {
    const seed = seedFromDesign(d, d.sizeLabel || size);
    try { sessionStorage.setItem('fabricnow.tailorSeed', JSON.stringify(seed)); } catch { /* storage may be blocked */ }
    if (setPage) setPage('tailor-tools'); else push('Open Tailor Tools to draft this pattern.', 'error');
  };
  const remove = async (d) => {
    if (!window.confirm(`Delete “${d.name}” from your library?`)) return;
    try { await api(`/api/pattern-library/${d.id}`, { method: 'DELETE' }); setMine((m) => m.filter((x) => x.id !== d.id)); setOpen(null); push('Design deleted.'); } catch (e) { push(e.message, 'error'); }
  };
  const toggleFav = async (d) => {
    setMine((m) => m.map((x) => (x.id === d.id ? { ...x, favorite: !x.favorite } : x)));
    try { await api(`/api/pattern-library/${d.id}`, { method: 'PUT', body: JSON.stringify({ favorite: !d.favorite }) }); } catch (e) { setMine((m) => m.map((x) => (x.id === d.id ? { ...x, favorite: d.favorite } : x))); push(e.message, 'error'); }
  };
  const openDesign = (d) => { setOpen(d); setEdit({ name: d.name, category: d.category, notes: d.notes || '', sizeLabel: d.sizeLabel || size }); };
  const saveEdit = async () => {
    if (!open) return;
    if (!open.mine) { await duplicate(open); setOpen(null); return; }
    if (!edit.name.trim()) return push('Give the design a name.', 'error');
    setSaving(true);
    try { const r = await api(`/api/pattern-library/${open.id}`, { method: 'PUT', body: JSON.stringify(edit) }); setMine((m) => m.map((x) => (x.id === open.id ? r.design : x))); setOpen(null); push('Design saved.'); }
    catch (e) { push(e.message, 'error'); } finally { setSaving(false); }
  };
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { setPhoto((await compressImage(f, 1024, 0.8)).src); } catch (err) { push(err.message, 'error'); }
  };
  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const d = byId.get(e.dataTransfer.getData('text/plain')); if (d) setRef(d);
    else if (e.dataTransfer.files?.[0]) onPhoto({ target: { files: e.dataTransfer.files, value: '' } });
  };

  return (
    <div className="pl-page">
      <PageHead eyebrow="WORKSPACE · DESIGN" title="Pattern Library"
        description="Start from a ready-made flat sketch, or describe a new design and let AI draw it. Duplicate any design to make it yours, then draft its pattern in Tailor Tools." />

      <section className={`pl-composer${drag ? ' drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} aria-label="Create a design">
        <div className="pl-composer-top"><span className="pl-composer-icon"><Sparkles size={16} /></span><div><strong>Create a design</strong><small>Describe it, add a photo, or drag a design card here to use it as the starting point.</small></div></div>
        <div className="pl-input-wrap">
          <textarea value={prompt} rows={3} placeholder="Describe the design… e.g. a fitted midi dress with a sweetheart neckline and puff sleeves"
            onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} aria-label="Describe the design" />
          <button type="button" className="btn btn-primary pl-send" onClick={generate} disabled={busy} data-no-spin aria-label="Create design">{busy ? <Spinner size={18} /> : <><Sparkles size={16} /> Create</>}</button>
        </div>
        <div className="pl-composer-row">
          <label className="pl-field"><span>Start from</span>
            <select value={ref?.id || ''} onChange={(e) => setRef(byId.get(e.target.value) || null)} aria-label="Reference design">
              <option value="">Nothing (new design)</option>
              {mine.length > 0 && <optgroup label="My designs">{mine.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>}
              <optgroup label="Starter designs">{STARTERS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>
            </select>
          </label>
          <label className="pl-field"><span>Size</span><select value={size} onChange={(e) => setSize(e.target.value)} aria-label="Size">{SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /> {photo ? 'Change photo' : 'Add a photo'}</button>
          <div className="pl-ideas">{IDEAS.map((i) => <button type="button" key={i} onClick={() => setPrompt(i)}>{i}</button>)}</div>
        </div>
        {(ref || photo) && (
          <div className="pl-attached">
            {ref && <span className="pl-chip-ref"><Flat spec={ref.spec} className="mini" /><span><small>Starting from</small><b>{ref.name}</b></span><button type="button" onClick={() => setRef(null)} aria-label="Remove reference"><X size={14} /></button></span>}
            {photo && <span className="pl-chip-ref"><img src={photo} alt="Reference photo" /><span><small>Photo</small><b>Used as reference</b></span><button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo"><X size={14} /></button></span>}
          </div>
        )}
      </section>

      <div className="pl-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search designs" />
        <Chips label="Show" value={scope} onChange={setScope} options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'My designs', count: mine.length }, { value: 'starter', label: 'Starter' }]} />
      </div>
      <Chips label="Category" value={cat} onChange={setCat} options={catCounts} />

      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? <PageSkeleton cards={6} /> : shown.length === 0 ? (
        <ProEmpty icon={Library} title="No designs match" body={scope === 'mine' ? 'You have no designs here yet. Duplicate a starter design or describe a new one above.' : 'Try a different search or category.'} />
      ) : (
        <div className="pl-grid">
          {shown.map((d) => (
            <article key={d.id} className={`pl-card${fresh === d.id ? ' fresh' : ''}`} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', d.id); e.dataTransfer.effectAllowed = 'copy'; }}>
              <button type="button" className="pl-card-art" onClick={() => openDesign(d)} aria-label={`Open ${d.name}`}><Flat spec={d.spec} /></button>
              <div className="pl-card-body">
                <div className="pl-card-top">
                  <button type="button" className="pl-name" onClick={() => openDesign(d)}>{d.name}</button>
                  {d.mine ? <button type="button" className={`pl-star${d.favorite ? ' on' : ''}`} onClick={() => toggleFav(d)} aria-label={d.favorite ? 'Remove favourite' : 'Favourite'} aria-pressed={!!d.favorite}><Star size={16} /></button> : <GripVertical size={15} className="pl-grip" aria-hidden="true" />}
                </div>
                <div className="pl-meta"><span className={`pl-tag src-${d.mine ? 'mine' : 'starter'}`}>{SOURCE[d.source] || 'Mine'}</span><span className="pl-tag">{label(d.category)}</span>{(d.tags || []).slice(0, 2).map((t) => <span key={t} className="pl-tag soft">{t}</span>)}</div>
                <p>{d.description}</p>
                <div className="pl-actions">
                  <button type="button" className="btn btn-ghost pl-dup" onClick={() => duplicate(d)}><Copy size={14} /> Duplicate</button>
                  <button type="button" className="btn btn-ghost" onClick={() => draft(d)} title="Draft this pattern in Tailor Tools"><Scissors size={14} /> Draft pattern</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} kicker={open?.mine ? 'MY DESIGN' : 'STARTER DESIGN'} title={open?.name || ''} description={open?.description} icon={Library}
        onSubmit={saveEdit} busy={saving} submitLabel={open?.mine ? 'Save changes' : 'Duplicate to My designs'} submitIcon={open?.mine ? undefined : Copy} size="lg">
        {open && (
          <div className="pl-detail">
            <Flat spec={open.spec} className="big" />
            <div className="pl-spec">{specChips(open.spec).map((c) => <span key={c}>{c}</span>)}</div>
            {open.mine ? (
              <div className="pl-edit">
                <label><span>Name</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={120} /></label>
                <label><span>Category</span><select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATEGORIES.filter(([v]) => v !== 'all').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label><span>Pattern size</span><select value={edit.sizeLabel} onChange={(e) => setEdit({ ...edit, sizeLabel: e.target.value })}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label className="wide"><span>Notes</span><textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Fabric ideas, fit notes, measurements to check…" /></label>
              </div>
            ) : <p className="pl-hint">This is a starter design. Duplicate it to rename it, add notes and change it with AI.</p>}
            <div className="pl-detail-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { draft({ ...open, sizeLabel: open.mine ? edit.sizeLabel : size }); }}><Scissors size={14} /> Draft pattern in Tailor Tools</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setRef(open); setOpen(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Sparkles size={14} /> Use as reference</button>
              {open.mine && <button type="button" className="btn btn-ghost pl-del" onClick={() => remove(open)}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        )}
      </Modal>
      {snack}
    </div>
  );
}
