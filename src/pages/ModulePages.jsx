import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Factory, FileText, Flame, Gauge, Kanban, LayoutGrid, Layers, Palette, Percent, Plus, Rows3, Ruler, Scale, ShieldCheck, Shirt, Store, Tags, Timer, XCircle } from 'lucide-react';
import { api } from '../api.js';
import FabricFromPhoto from './FabricAI.jsx';
import { cap } from '../usage.js';
import {
  Avatar, Badge, Chips, Columns, Donut, ErrorBanner, FormFields, HBars, KpiCard, KpiGrid, Modal, PageHead, PageSkeleton, Panel,
  PALETTE, ProEmpty, Ring, SearchBox, ViewToggle, avg, colorFromText, countBy, daysFromNow, fmtDay, toneOf, useSnack,
} from '../components/kit.jsx';

const VIEWS = { cards: ['cards', 'Cards', LayoutGrid], table: ['table', 'Table', Rows3], board: ['board', 'Board', Kanban] };

function useResource(path, key) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true); setError('');
    api(path).then((d) => setItems(d[key] || [])).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [path, key]);
  useEffect(load, [load]);
  return { items, loading, error, reload: load };
}

/** One analytics page: header, KPI cards, insight charts, toolbar (search / filter / view), results, create modal. */
function ResourcePage({
  eyebrow, title, description, endpoint, listKey, createLabel, createIcon: CreateIcon = Plus, onCreate, modal,
  kpis, insights, filter, search, renderCard, renderBoard, columns, views = ['cards', 'table'], empty, noun = 'item', extraActions,
}) {
  const { items, loading, error, reload } = useResource(endpoint, listKey);
  const [snack, push] = useSnack();
  const [query, setQuery] = useState('');
  const [fv, setFv] = useState('all');
  const [view, setView] = useState(views[0]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(modal?.initial || {});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => { if (onCreate) return onCreate(); setForm(modal.initial); setFormError(''); setOpen(true); };
  const close = useCallback(() => setOpen(false), []);
  const save = async () => {
    const problem = modal.validate?.(form);
    if (problem) return setFormError(problem);
    setBusy(true); setFormError('');
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(modal.toPayload ? modal.toPayload(form) : form) });
      setOpen(false); push(modal.success); reload();
    } catch (e) { setFormError(e.message); }
    finally { setBusy(false); }
  };

  const ctx = useMemo(() => ({ reload, push, items }), [reload, push, items]);
  const filterOptions = useMemo(() => {
    if (!filter) return [];
    const opts = filter.options(items);
    return [{ value: 'all', label: 'All', count: items.length }, ...opts.map((o) => ({ ...o, count: items.filter((i) => filter.match(i, o.value)).length }))];
  }, [filter, items]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (fv === 'all' || !filter || filter.match(i, fv)) && (!q || search(i).toLowerCase().includes(q)));
  }, [items, query, fv, filter, search]);

  const toggles = views.map((v) => VIEWS[v]);
  const actions = <>{extraActions?.(ctx)}<button className="btn btn-primary" onClick={openCreate}><CreateIcon size={15} /> {createLabel}</button></>;

  return (
    <div className="wp">
      <PageHead eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {loading ? <PageSkeleton /> : error ? <ErrorBanner message={error} onRetry={reload} /> : !items.length ? (
        <ProEmpty {...empty} onAction={openCreate} />
      ) : (
        <>
          <KpiGrid>{kpis(items).map((k) => <KpiCard key={k.label} {...k} />)}</KpiGrid>
          {insights && <div className={`wp-insights n${insights(items).length}`}>{insights(items).map((p) => <Panel key={p.title} title={p.title} sub={p.sub}>{p.body}</Panel>)}</div>}

          <div className="wp-toolbar">
            <SearchBox value={query} onChange={setQuery} placeholder={`Search ${noun}s`} />
            {filter && <Chips options={filterOptions} value={fv} onChange={setFv} label={filter.label} />}
            {(query || fv !== 'all') && <span className="wp-count">{shown.length} of {items.length}</span>}
            {toggles.length > 1 && <ViewToggle value={view} onChange={setView} options={toggles} />}
          </div>

          {!shown.length ? (
            <div className="wp-nomatch"><strong>No {noun}s match your filters</strong><button className="btn btn-ghost" onClick={() => { setQuery(''); setFv('all'); }}>Clear filters</button></div>
          ) : view === 'board' ? renderBoard(shown, ctx) : view === 'table' ? (
            <div className="wp-table-wrap"><table className="wp-table"><thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
              <tbody>{shown.map((i) => <tr key={i.id}>{columns.map((c) => <td key={c.label}>{c.render(i, ctx)}</td>)}</tr>)}</tbody></table></div>
          ) : <div className="wp-cards">{shown.map((i) => renderCard(i, ctx))}</div>}
        </>
      )}

      {modal && (
        <Modal open={open} onClose={close} onSubmit={save} busy={busy} error={formError} kicker={modal.kicker} title={modal.title} description={modal.description} icon={modal.icon} submitLabel={modal.submitLabel || 'Save'} footnote="Saved to this company workspace">
          <FormFields fields={modal.fields} values={form} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
        </Modal>
      )}
      {snack}
    </div>
  );
}

/* ====================================================================== Fabric Library */
const FIBRES = ['cotton', 'polyester', 'linen', 'silk', 'wool', 'viscose', 'rayon', 'nylon', 'elastane', 'spandex', 'lace', 'denim'];
const fibreOf = (c) => { const t = String(c || '').toLowerCase(); const f = FIBRES.find((x) => t.includes(x)); return f ? cap(f) : c ? 'Other' : null; };
const weightClass = (g) => (!g ? 'Unspecified' : g < 150 ? 'Lightweight' : g <= 250 ? 'Midweight' : 'Heavyweight');

export function FabricLibrary() {
  return (
    <ResourcePage
      eyebrow="MATERIALS · FABRIC INTELLIGENCE" title="Fabric Library" noun="fabric"
      description="A shared material library for your company — reuse the same fabric records across designs, tech packs and production."
      endpoint="/api/workspace-suite/fabrics" listKey="fabrics" createLabel="Add fabric"
      extraActions={(ctx) => <FabricFromPhoto onSaved={(name) => { ctx.reload(); ctx.push(`“${name}” was added from your photo.`); }} />}
      empty={{ icon: Palette, title: 'Build your material library', body: 'Add the fabrics you source — composition, weight, width and supplier — so designers and production always work from the same data.', action: 'Add your first fabric', hints: ['Reusable across products', 'Searchable by fibre, colour and supplier', 'Shared with authorised teammates'] }}
      modal={{
        kicker: 'MATERIALS', title: 'Add fabric', description: 'Add a material record to your company library.', icon: Palette, success: 'Fabric added to the library.',
        initial: { name: '', supplier: '', composition: '', weightGsm: '', widthCm: '', color: '', pattern: '', origin: '', notes: '' },
        validate: (f) => (!f.name.trim() ? 'Give the fabric a name.' : ''),
        toPayload: (f) => ({ ...f, weightGsm: Number(f.weightGsm) || undefined, widthCm: Number(f.widthCm) || undefined }),
        fields: [
          { name: 'name', label: 'Fabric name', required: true, placeholder: 'e.g. Indigo adire cotton', span: 2 },
          { name: 'supplier', label: 'Supplier', placeholder: 'e.g. Kantamanto Textiles' },
          { name: 'composition', label: 'Composition', placeholder: 'e.g. 100% cotton' },
          { name: 'weightGsm', label: 'Weight (gsm)', type: 'number', min: 0, placeholder: '180' },
          { name: 'widthCm', label: 'Width (cm)', type: 'number', min: 0, placeholder: '112' },
          { name: 'color', label: 'Colour', placeholder: 'e.g. Indigo' },
          { name: 'pattern', label: 'Pattern', placeholder: 'e.g. Adire, Kente, Ankara' },
          { name: 'origin', label: 'Origin', placeholder: 'e.g. Ghana' },
          { name: 'notes', label: 'Notes', type: 'textarea', optional: true, span: 2, placeholder: 'Handfeel, care, minimum order…' },
        ],
      }}
      kpis={(it) => {
        const w = it.map((f) => Number(f.weightGsm)).filter(Boolean), wd = it.map((f) => Number(f.widthCm)).filter(Boolean);
        return [
          { icon: Palette, label: 'Fabrics', value: it.length, sub: 'in your library', tone: 'brand' },
          { icon: Store, label: 'Suppliers', value: new Set(it.map((f) => f.supplier).filter(Boolean)).size, sub: 'sourcing partners', tone: 'info' },
          { icon: Scale, label: 'Avg. weight', display: w.length ? `${Math.round(avg(w))} gsm` : '—', sub: `${w.length} with weight data`, tone: 'success' },
          { icon: Ruler, label: 'Avg. width', display: wd.length ? `${Math.round(avg(wd))} cm` : '—', sub: `${wd.length} with width data`, tone: 'warn' },
        ];
      }}
      insights={(it) => [
        { title: 'Weight classes', sub: 'Light under 150 · mid 150–250 · heavy over 250 gsm', body: <Donut center={{ value: it.length, label: 'fabrics' }} segments={['Lightweight', 'Midweight', 'Heavyweight', 'Unspecified'].map((l, i) => ({ label: l, value: it.filter((f) => weightClass(Number(f.weightGsm)) === l).length, color: [PALETTE[3], PALETTE[0], PALETTE[1], '#C5CAD6'][i] }))} /> },
        { title: 'Fibre mix', sub: 'Main fibre in the composition', body: <HBars items={countBy(it, (f) => fibreOf(f.composition)).slice(0, 5).map(([label, value]) => ({ label, value }))} empty="Add compositions to see the mix" /> },
        { title: 'Top suppliers', sub: 'By number of fabrics', body: <HBars items={countBy(it, (f) => f.supplier).slice(0, 5).map(([label, value]) => ({ label, value }))} empty="Add suppliers to see this" /> },
      ]}
      filter={{ label: 'Weight class', options: () => ['Lightweight', 'Midweight', 'Heavyweight'].map((v) => ({ value: v, label: v })), match: (f, v) => weightClass(Number(f.weightGsm)) === v }}
      search={(f) => [f.name, f.supplier, f.composition, f.color, f.pattern, f.origin].join(' ')}
      renderCard={(f) => (
        <article className="wp-card wp-fabric" key={f.id}>
          <div className={`wp-swatch${f.imageUrl ? ' has-img' : ''}`} style={f.imageUrl ? { backgroundImage: `url(${JSON.stringify(f.imageUrl)})` } : { '--sw': colorFromText(f.color || f.name) }}><span>{f.color || 'No colour'}</span>{f.meta?.palette?.length > 0 && <i className="wp-sw-dots">{f.meta.palette.slice(0, 5).map((c) => <b key={c} style={{ background: c }} />)}</i>}{f.meta?.ai && <em className="wp-sw-ai">AI</em>}</div>
          <div className="wp-card-body">
            <h4>{f.name}</h4>
            <p>{[f.pattern, f.origin].filter(Boolean).join(' · ') || 'No pattern or origin'}</p>
            <dl className="wp-specs">
              <div><dt>Composition</dt><dd>{f.composition || '—'}</dd></div>
              <div><dt>Weight</dt><dd>{f.weightGsm ? `${f.weightGsm} gsm` : '—'}</dd></div>
              <div><dt>Width</dt><dd>{f.widthCm ? `${f.widthCm} cm` : '—'}</dd></div>
              <div><dt>Supplier</dt><dd>{f.supplier || '—'}</dd></div>
            </dl>
            {weightClass(Number(f.weightGsm)) !== 'Unspecified' && <Badge tone="info" dot={false}>{weightClass(Number(f.weightGsm))}</Badge>}
          </div>
        </article>
      )}
      columns={[
        { label: 'Fabric', render: (f) => <div className="wp-cell-main"><span className="wp-dot" style={{ background: colorFromText(f.color || f.name) }} /><div><strong>{f.name}</strong><small>{f.pattern || f.origin || '—'}</small></div></div> },
        { label: 'Supplier', render: (f) => f.supplier || '—' }, { label: 'Composition', render: (f) => f.composition || '—' },
        { label: 'Weight', render: (f) => (f.weightGsm ? `${f.weightGsm} gsm` : '—') }, { label: 'Width', render: (f) => (f.widthCm ? `${f.widthCm} cm` : '—') },
        { label: 'Colour', render: (f) => f.color || '—' },
      ]}
    />
  );
}

/* ====================================================================== Garment Library */
export function GarmentLibrary({ setPage }) {
  const ready = (p) => Number(p.readiness) || 0;
  return (
    <ResourcePage
      eyebrow="DESIGN · GARMENT INTELLIGENCE" title="Garment Library" noun="garment"
      description="Every garment record in your company, with readiness tracked from capture through to production."
      endpoint="/api/workspace-suite/projects?limit=200" listKey="projects" createLabel="Add garment" onCreate={() => setPage('fashion-capture')}
      empty={{ icon: Shirt, title: 'Your garment library is empty', body: 'Create your first product in Product Capture. Once saved, it appears here for every authorised member of this company.', action: 'Open Product Capture', hints: ['Track readiness per garment', 'Group by category and status', 'One source of truth for the team'] }}
      kpis={(it) => [
        { icon: Shirt, label: 'Garments', value: it.length, sub: 'in the library', tone: 'brand' },
        { icon: Gauge, label: 'Avg. readiness', display: `${Math.round(avg(it.map(ready)))}%`, ring: avg(it.map(ready)), sub: 'across all garments', tone: 'info' },
        { icon: CheckCircle2, label: 'Production-ready', value: it.filter((p) => ready(p) >= 80).length, sub: 'readiness 80% or higher', tone: 'success' },
        { icon: Tags, label: 'Categories', value: new Set(it.map((p) => p.category).filter(Boolean)).size, sub: 'garment types', tone: 'warn' },
      ]}
      insights={(it) => [
        { title: 'Status', sub: 'Where garments are in the workflow', body: <Donut center={{ value: it.length, label: 'garments' }} segments={countBy(it, (p) => p.status || 'unknown').map(([label, value], i) => ({ label: cap(label), value, color: PALETTE[i % PALETTE.length] }))} /> },
        { title: 'Readiness', sub: 'Garments by completeness band', body: <Columns items={[['0–39%', 0, 39], ['40–69%', 40, 69], ['70–89%', 70, 89], ['90–100%', 90, 100]].map(([label, a, b], i) => ({ label, value: it.filter((p) => ready(p) >= a && ready(p) <= b).length, color: [PALETTE[5], PALETTE[4], PALETTE[3], PALETTE[2]][i] }))} /> },
        { title: 'Top categories', sub: 'Most common garment types', body: <HBars items={countBy(it, (p) => p.category).slice(0, 5).map(([label, value]) => ({ label, value }))} empty="Add categories to see this" /> },
      ]}
      filter={{ label: 'Status', options: (it) => countBy(it, (p) => p.status).map(([v]) => ({ value: v, label: cap(v) })), match: (p, v) => p.status === v }}
      search={(p) => [p.name, p.sku, p.category, p.status].join(' ')}
      renderCard={(p) => (
        <article className="wp-card wp-row-card" key={p.id}>
          <Ring value={ready(p)} size={56} tone={ready(p) >= 80 ? 'success' : ready(p) >= 40 ? 'warn' : 'danger'} label={`${ready(p)}%`} />
          <div className="wp-card-body">
            <h4>{p.name}</h4>
            <p>{p.category || 'Uncategorised'}</p>
            <div className="wp-meta"><Badge tone={toneOf(p.status)}>{cap(p.status || 'draft')}</Badge><span><Tags size={13} /> {p.sku || 'No SKU'}</span></div>
          </div>
        </article>
      )}
      columns={[
        { label: 'Garment', render: (p) => <div className="wp-cell-main"><div><strong>{p.name}</strong><small>{p.category || 'Uncategorised'}</small></div></div> },
        { label: 'SKU', render: (p) => p.sku || '—' }, { label: 'Status', render: (p) => <Badge tone={toneOf(p.status)}>{cap(p.status || 'draft')}</Badge> },
        { label: 'Readiness', render: (p) => <div className="wp-bar"><i style={{ width: `${ready(p)}%` }} /><b>{ready(p)}%</b></div> },
      ]}
    />
  );
}

/* ====================================================================== Measurements */
function previewMeasurements(m) {
  if (!m || typeof m !== 'object') return [];
  const vals = Object.values(m);
  const flat = vals.length && vals.every((v) => v && typeof v === 'object') ? vals[0] : m;
  return Object.entries(flat).filter(([, v]) => typeof v !== 'object').slice(0, 4);
}
export function MeasurementStudio() {
  return (
    <ResourcePage
      eyebrow="PRODUCTION · FIT SYSTEM" title="Measurements & Size Profiles" noun="profile"
      description="Reusable company size standards, so every garment and tech pack uses consistent fit data."
      endpoint="/api/workspace-suite/measurements" listKey="profiles" createLabel="New size profile" createIcon={Ruler}
      empty={{ icon: Ruler, title: 'Define your fit system', body: 'Create a size profile once and reuse it across products and production documents.', action: 'Create first size profile', hints: ['XS to XL or your own size range', 'Centimetres or inches', 'Linked to tech packs'] }}
      modal={{
        kicker: 'FIT SYSTEM', title: 'New size profile', description: 'Define reusable measurements and size standards.', icon: Ruler, success: 'Size profile created.',
        initial: { name: '', category: '', unit: 'cm', sizes: 'XS,S,M,L,XL', measurements: '{}', notes: '' },
        validate: (f) => { if (!f.name.trim()) return 'Give the profile a name.'; try { JSON.parse(f.measurements || '{}'); } catch { return 'Measurements must be valid JSON.'; } return ''; },
        toPayload: (f) => ({ ...f, sizes: f.sizes.split(',').map((s) => s.trim()).filter(Boolean), measurements: JSON.parse(f.measurements || '{}') }),
        fields: [
          { name: 'name', label: 'Profile name', required: true, placeholder: 'e.g. Women’s dresses — standard', span: 2 },
          { name: 'category', label: 'Category', placeholder: 'e.g. Dresses' },
          { name: 'unit', label: 'Unit', type: 'select', options: ['cm', 'in'] },
          { name: 'sizes', label: 'Sizes', span: 2, hint: 'Comma separated, e.g. XS, S, M, L, XL' },
          { name: 'measurements', label: 'Measurements (JSON)', type: 'textarea', span: 2, rows: 5, hint: 'e.g. {"M":{"chest":92,"waist":74,"hip":100}}' },
          { name: 'notes', label: 'Notes', type: 'textarea', optional: true, span: 2, rows: 3 },
        ],
      }}
      kpis={(it) => [
        { icon: Ruler, label: 'Size profiles', value: it.length, sub: 'company standards', tone: 'brand' },
        { icon: Layers, label: 'Sizes defined', value: it.reduce((a, p) => a + (p.sizes || []).length, 0), sub: 'across all profiles', tone: 'info' },
        { icon: Tags, label: 'Categories', value: new Set(it.map((p) => p.category).filter(Boolean)).size, sub: 'garment groups covered', tone: 'success' },
        { icon: Scale, label: 'Units', display: `${it.filter((p) => p.unit === 'cm').length} cm · ${it.filter((p) => p.unit === 'in').length} in`, sub: 'measurement systems', tone: 'warn' },
      ]}
      insights={(it) => [
        { title: 'Unit system', sub: 'Profiles by measurement unit', body: <Donut center={{ value: it.length, label: 'profiles' }} segments={[['Centimetres', 'cm', PALETTE[0]], ['Inches', 'in', PALETTE[1]]].map(([label, u, color]) => ({ label, value: it.filter((p) => p.unit === u).length, color }))} /> },
        { title: 'Coverage by category', sub: 'Profiles per garment category', body: <HBars items={countBy(it, (p) => p.category).slice(0, 6).map(([label, value]) => ({ label, value }))} empty="Add categories to see coverage" /> },
      ]}
      filter={{ label: 'Unit', options: () => [{ value: 'cm', label: 'Centimetres' }, { value: 'in', label: 'Inches' }], match: (p, v) => p.unit === v }}
      search={(p) => [p.name, p.category, (p.sizes || []).join(' ')].join(' ')}
      renderCard={(p) => {
        const prev = previewMeasurements(p.measurements);
        return (
          <article className="wp-card" key={p.id}>
            <div className="wp-card-body">
              <div className="wp-card-top"><h4>{p.name}</h4><Badge tone={toneOf(p.status)}>{cap(p.status || 'active')}</Badge></div>
              <p>{p.category || 'No category'} · {p.unit}</p>
              <div className="wp-sizes">{(p.sizes || []).map((s) => <span key={s}>{s}</span>)}</div>
              {prev.length > 0 && <dl className="wp-specs">{prev.map(([k, v]) => <div key={k}><dt>{cap(k)}</dt><dd>{String(v)} {p.unit}</dd></div>)}</dl>}
            </div>
          </article>
        );
      }}
      columns={[
        { label: 'Profile', render: (p) => <strong>{p.name}</strong> }, { label: 'Category', render: (p) => p.category || '—' }, { label: 'Unit', render: (p) => p.unit },
        { label: 'Sizes', render: (p) => (p.sizes || []).join(', ') || '—' }, { label: 'Status', render: (p) => <Badge tone={toneOf(p.status)}>{cap(p.status || 'active')}</Badge> },
      ]}
    />
  );
}

/* ====================================================================== Tech packs */
const recent = (v, days = 7) => { const d = daysFromNow(v); return d != null && d <= 0 && d >= -days; };
export function TechPacks() {
  return (
    <ResourcePage
      eyebrow="PRODUCTION · TECHNICAL DOCUMENTS" title="Tech Pack Builder" noun="tech pack"
      description="Production-ready technical packages, versioned and kept inside your company workspace."
      endpoint="/api/workspace-suite/tech-packs" listKey="techPacks" createLabel="Create tech pack" createIcon={FileText}
      empty={{ icon: FileText, title: 'Create your first tech pack', body: 'Package construction details, measurements and materials into one versioned production document.', action: 'Create tech pack', hints: ['Versioned automatically', 'Link to a garment record', 'Ready to share with factories'] }}
      modal={{
        kicker: 'TECHNICAL DOCUMENT', title: 'Create tech pack', description: 'Build a production package linked to a garment.', icon: FileText, success: 'Tech pack created.',
        initial: { name: '', projectId: '', notes: '' }, validate: (f) => (!f.name.trim() ? 'Give the tech pack a name.' : ''),
        fields: [
          { name: 'name', label: 'Tech pack name', required: true, placeholder: 'e.g. Wrap dress — SS27', span: 2 },
          { name: 'projectId', label: 'Garment / project ID', optional: true, span: 2, hint: 'Link this pack to an existing garment record.' },
          { name: 'notes', label: 'Notes', type: 'textarea', optional: true, span: 2, rows: 4, placeholder: 'Construction notes, tolerances, trims…' },
        ],
      }}
      kpis={(it) => [
        { icon: FileText, label: 'Tech packs', value: it.length, sub: 'in the workspace', tone: 'brand' },
        { icon: CheckCircle2, label: 'Approved / active', value: it.filter((t) => toneOf(t.status) === 'success').length, sub: 'ready for production', tone: 'success' },
        { icon: Layers, label: 'Highest version', display: `v${Math.max(1, ...it.map((t) => Number(t.version) || 1))}`, sub: 'most revised pack', tone: 'info' },
        { icon: Timer, label: 'Updated this week', value: it.filter((t) => recent(t.updatedAt)).length, sub: 'last 7 days', tone: 'warn' },
      ]}
      insights={(it) => [
        { title: 'Status', sub: 'Packs by review state', body: <Donut center={{ value: it.length, label: 'packs' }} segments={countBy(it, (t) => t.status || 'draft').map(([label, value], i) => ({ label: cap(label), value, color: PALETTE[i % PALETTE.length] }))} /> },
        { title: 'Recently updated', sub: 'Latest activity', body: <ul className="wp-feed">{[...it].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5).map((t) => <li key={t.id}><span className="wp-ver">v{t.version || 1}</span><div><strong>{t.name}</strong><small>{fmtDay(t.updatedAt)}</small></div><Badge tone={toneOf(t.status)}>{cap(t.status || 'draft')}</Badge></li>)}</ul> },
      ]}
      filter={{ label: 'Status', options: (it) => countBy(it, (t) => t.status).map(([v]) => ({ value: v, label: cap(v) })), match: (t, v) => t.status === v }}
      search={(t) => [t.name, t.notes, t.status].join(' ')}
      renderCard={(t) => (
        <article className="wp-card wp-row-card" key={t.id}>
          <span className="wp-ver big">v{t.version || 1}</span>
          <div className="wp-card-body">
            <h4>{t.name}</h4>
            <p>{t.notes || 'Production package'}</p>
            <div className="wp-meta"><Badge tone={toneOf(t.status)}>{cap(t.status || 'draft')}</Badge><span><CalendarClock size={13} /> Updated {fmtDay(t.updatedAt)}</span></div>
          </div>
        </article>
      )}
      columns={[
        { label: 'Tech pack', render: (t) => <div className="wp-cell-main"><div><strong>{t.name}</strong><small>{t.notes || 'Production package'}</small></div></div> },
        { label: 'Version', render: (t) => `v${t.version || 1}` }, { label: 'Status', render: (t) => <Badge tone={toneOf(t.status)}>{cap(t.status || 'draft')}</Badge> }, { label: 'Updated', render: (t) => fmtDay(t.updatedAt) },
      ]}
    />
  );
}

/* ====================================================================== Production board */
const STAGES = ['queued', 'sampling', 'production', 'quality', 'ready', 'shipped'];
const PRIORITY_TONE = { low: 'neutral', normal: 'info', high: 'warn', urgent: 'danger' };
const stageColor = (s) => PALETTE[STAGES.indexOf(s) % PALETTE.length];
const STAGE_SHORT = { queued: 'Queue', sampling: 'Sample', production: 'Make', quality: 'QC', ready: 'Ready', shipped: 'Ship' };
const isOverdue = (i) => { const d = daysFromNow(i.dueDate); return d != null && d < 0 && !['ready', 'shipped'].includes(i.stage); };
function DueChip({ item }) {
  const d = daysFromNow(item.dueDate);
  if (d == null) return <span className="wp-due"><CalendarClock size={13} /> No due date</span>;
  const late = isOverdue(item), soon = !late && d <= 3 && !['ready', 'shipped'].includes(item.stage);
  return <span className={`wp-due ${late ? 'late' : soon ? 'soon' : ''}`}><CalendarClock size={13} />{fmtDay(item.dueDate)}{late ? ` · ${Math.abs(d)}d late` : soon ? (d === 0 ? ' · today' : ` · in ${d}d`) : ''}</span>;
}
function WorkCard({ item }) {
  return (
    <article className={`wp-card wp-work ${isOverdue(item) ? 'overdue' : ''}`}>
      <div className="wp-card-top"><Badge tone={PRIORITY_TONE[item.priority] || 'neutral'}>{cap(item.priority || 'normal')}</Badge><Badge tone={toneOf(item.stage)} dot={false}>{cap(item.stage)}</Badge></div>
      <h4>{item.title}</h4>
      {item.notes && <p>{item.notes}</p>}
      <div className="wp-work-foot"><DueChip item={item} /><span className="wp-assignee"><Avatar name={item.assigneeId?.name || 'Unassigned'} size={24} />{item.assigneeId?.name || 'Unassigned'}</span></div>
    </article>
  );
}
export function ProductionBoard() {
  return (
    <ResourcePage
      eyebrow="PRODUCTION · WORKFLOW" title="Production Board" noun="work item"
      description="Track every piece of production work from the queue through sampling, quality and shipment."
      endpoint="/api/workspace-suite/production" listKey="items" createLabel="Add work item" createIcon={Factory}
      views={['board', 'cards', 'table']}
      empty={{ icon: Kanban, title: 'Start tracking production', body: 'Add a work item to follow it from queue to shipment, with priorities, due dates and owners.', action: 'Add first work item', hints: ['Six-stage production pipeline', 'Priorities and due dates', 'See overdue work at a glance'] }}
      modal={{
        kicker: 'PRODUCTION WORKFLOW', title: 'Add production work', description: 'Create a tracked production item for your team.', icon: Factory, success: 'Production item added.',
        initial: { title: '', stage: 'queued', priority: 'normal', dueDate: '', notes: '' },
        validate: (f) => (!f.title.trim() ? 'Give the work item a title.' : ''),
        toPayload: (f) => ({ ...f, dueDate: f.dueDate || undefined }),
        fields: [
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Sample run — Adire wrap dress', span: 2 },
          { name: 'stage', label: 'Stage', type: 'select', options: STAGES.map((s) => ({ value: s, label: cap(s) })) },
          { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'].map((s) => ({ value: s, label: cap(s) })) },
          { name: 'dueDate', label: 'Due date', type: 'date', optional: true },
          { name: 'notes', label: 'Notes', type: 'textarea', optional: true, span: 2, rows: 4, placeholder: 'Quantities, fabric, factory instructions…' },
        ],
      }}
      kpis={(it) => [
        { icon: Kanban, label: 'Work items', value: it.length, sub: `${it.filter((i) => i.stage === 'shipped').length} shipped`, tone: 'brand' },
        { icon: Timer, label: 'In progress', value: it.filter((i) => ['sampling', 'production', 'quality'].includes(i.stage)).length, sub: 'sampling, production, quality', tone: 'info' },
        { icon: AlertTriangle, label: 'Overdue', value: it.filter(isOverdue).length, sub: 'past due date, not ready', tone: 'danger' },
        { icon: Flame, label: 'High priority', value: it.filter((i) => ['high', 'urgent'].includes(i.priority) && i.stage !== 'shipped').length, sub: 'high or urgent, still open', tone: 'warn' },
      ]}
      insights={(it) => [
        { title: 'Pipeline', sub: 'Work items by stage', body: <Columns height={160} items={STAGES.map((s) => ({ label: STAGE_SHORT[s], value: it.filter((i) => i.stage === s).length, color: stageColor(s) }))} /> },
        { title: 'Priority mix', sub: 'Open and closed work', body: <Donut center={{ value: it.length, label: 'items' }} segments={['urgent', 'high', 'normal', 'low'].map((p, i) => ({ label: cap(p), value: it.filter((x) => (x.priority || 'normal') === p).length, color: [PALETTE[5], PALETTE[4], PALETTE[3], '#C5CAD6'][i] }))} /> },
        { title: 'Due next', sub: 'Closest open deadlines', body: (() => {
          const next = it.filter((i) => i.dueDate && i.stage !== 'shipped').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);
          return next.length ? <ul className="wp-feed">{next.map((i) => <li key={i.id} className="wp-due-row"><span className={`wp-pip ${isOverdue(i) ? 'late' : ''}`} /><div><strong>{i.title}</strong><div className="wp-due-sub"><small>{cap(i.stage)}</small><DueChip item={i} /></div></div></li>)}</ul> : <div className="wp-nodata">No upcoming due dates</div>;
        })() },
      ]}
      filter={{ label: 'Priority', options: () => ['urgent', 'high', 'normal', 'low'].map((v) => ({ value: v, label: cap(v) })), match: (i, v) => (i.priority || 'normal') === v }}
      search={(i) => [i.title, i.notes, i.stage, i.priority, i.assigneeId?.name].join(' ')}
      renderBoard={(list) => (
        <div className="wp-board">
          {STAGES.map((s) => {
            const col = list.filter((i) => i.stage === s);
            return (
              <section className="wp-lane" key={s}>
                <header><i style={{ background: stageColor(s) }} /><h4>{cap(s)}</h4><b>{col.length}</b></header>
                <div className="wp-lane-body">{col.length ? col.map((i) => <WorkCard key={i.id} item={i} />) : <div className="wp-lane-empty">Nothing in {s}</div>}</div>
              </section>
            );
          })}
        </div>
      )}
      renderCard={(i) => <WorkCard key={i.id} item={i} />}
      columns={[
        { label: 'Work item', render: (i) => <div className="wp-cell-main"><div><strong>{i.title}</strong><small>{i.notes || '—'}</small></div></div> },
        { label: 'Stage', render: (i) => <Badge tone={toneOf(i.stage)}>{cap(i.stage)}</Badge> },
        { label: 'Priority', render: (i) => <Badge tone={PRIORITY_TONE[i.priority] || 'neutral'}>{cap(i.priority || 'normal')}</Badge> },
        { label: 'Due', render: (i) => <DueChip item={i} /> },
        { label: 'Assignee', render: (i) => <span className="wp-assignee"><Avatar name={i.assigneeId?.name || 'Unassigned'} size={24} />{i.assigneeId?.name || 'Unassigned'}</span> },
      ]}
    />
  );
}

/* ====================================================================== Quality control */
const scoreTone = (s) => (s == null ? 'neutral' : s >= 80 ? 'success' : s >= 60 ? 'warn' : 'danger');
const QC_STATUSES = ['queued', 'running', 'review', 'approved', 'rejected'];
export function QualityControl() {
  const decide = async (a, status, ctx) => {
    try { await api(`/api/workspace-suite/quality/${a.id}`, { method: 'PUT', body: JSON.stringify({ status }) }); ctx.push(`Audit ${status}.`); ctx.reload(); }
    catch (e) { ctx.push(e.message, 'error'); }
  };
  const actions = (a, ctx) => (['review', 'queued'].includes(a.status) ? (
    <div className="wp-actions">
      <button className="btn btn-ghost wp-approve" onClick={() => decide(a, 'approved', ctx)}><CheckCircle2 size={14} /> Approve</button>
      <button className="btn btn-ghost wp-reject" onClick={() => decide(a, 'rejected', ctx)}><XCircle size={14} /> Reject</button>
    </div>
  ) : <span className="wp-reviewed">{a.reviewedAt ? `Reviewed ${fmtDay(a.reviewedAt)}` : '—'}</span>);
  return (
    <ResourcePage
      eyebrow="AI QUALITY · HUMAN REVIEW" title="AI Quality Control" noun="audit"
      description="A company-scoped review queue for extraction, production and readiness checks — AI scores them, your team decides."
      endpoint="/api/workspace-suite/quality" listKey="audits" createLabel="Run new audit" createIcon={ShieldCheck}
      empty={{ icon: ShieldCheck, title: 'No quality audits yet', body: 'Queue a product for review and keep every decision, score and reviewer in one auditable history.', action: 'Run first audit', hints: ['Score from 0 to 100', 'Approve or reject in one click', 'Full decision history'] }}
      modal={{
        kicker: 'QUALITY CONTROL', title: 'Run quality audit', description: 'Queue a product for review and record the decision.', icon: ShieldCheck, success: 'Quality audit queued.',
        initial: { title: '', projectId: '', status: 'queued', score: '', notes: '' },
        validate: (f) => (!f.title.trim() ? 'Give the audit a title.' : f.score !== '' && (Number(f.score) < 0 || Number(f.score) > 100) ? 'Score must be between 0 and 100.' : ''),
        toPayload: (f) => ({ ...f, score: f.score === '' ? undefined : Number(f.score) || 0 }),
        fields: [
          { name: 'title', label: 'Audit title', required: true, placeholder: 'e.g. Pattern check — Adire wrap dress', span: 2 },
          { name: 'projectId', label: 'Project ID', optional: true, span: 2, hint: 'Link the audit to a garment or project.' },
          { name: 'status', label: 'Initial status', type: 'select', options: ['queued', 'running', 'review'].map((s) => ({ value: s, label: cap(s) })) },
          { name: 'score', label: 'Score (0–100)', type: 'number', min: 0, max: 100, optional: true, placeholder: '85' },
          { name: 'notes', label: 'Notes', type: 'textarea', optional: true, span: 2, rows: 4, placeholder: 'What should the reviewer look at?' },
        ],
      }}
      kpis={(it) => {
        const scored = it.map((a) => a.score).filter((s) => s != null), approved = it.filter((a) => a.status === 'approved').length, rejected = it.filter((a) => a.status === 'rejected').length;
        return [
          { icon: ClipboardCheck, label: 'Audits', value: it.length, sub: `${approved + rejected} decided`, tone: 'brand' },
          { icon: Gauge, label: 'Average score', display: scored.length ? `${Math.round(avg(scored))}/100` : '—', ring: scored.length ? avg(scored) : null, sub: `${scored.length} scored`, tone: scoreTone(scored.length ? avg(scored) : null) },
          { icon: Percent, label: 'Pass rate', display: approved + rejected ? `${Math.round((approved / (approved + rejected)) * 100)}%` : '—', sub: 'approved of decided', tone: 'success' },
          { icon: AlertTriangle, label: 'Needs attention', value: it.filter((a) => ['queued', 'running', 'review'].includes(a.status)).length, sub: 'queued, running or in review', tone: 'warn' },
        ];
      }}
      insights={(it) => [
        { title: 'Score distribution', sub: 'Audits by quality band', body: <Columns height={160} items={[['Under 60', (s) => s != null && s < 60, PALETTE[5]], ['60–79', (s) => s != null && s >= 60 && s < 80, PALETTE[4]], ['80–89', (s) => s != null && s >= 80 && s < 90, PALETTE[3]], ['90+', (s) => s != null && s >= 90, PALETTE[2]], ['Unscored', (s) => s == null, '#C5CAD6']].map(([label, fn, color]) => ({ label, value: it.filter((a) => fn(a.score)).length, color }))} /> },
        { title: 'Review status', sub: 'Where audits are in the queue', body: <Donut center={{ value: it.length, label: 'audits' }} segments={QC_STATUSES.map((s, i) => ({ label: cap(s), value: it.filter((a) => a.status === s).length, color: [PALETTE[6], PALETTE[3], PALETTE[4], PALETTE[2], PALETTE[5]][i] }))} /> },
      ]}
      filter={{ label: 'Status', options: (it) => QC_STATUSES.filter((s) => it.some((a) => a.status === s)).map((v) => ({ value: v, label: cap(v) })), match: (a, v) => a.status === v }}
      search={(a) => [a.title, a.notes, a.status, a.projectId?.name].join(' ')}
      renderCard={(a, ctx) => (
        <article className="wp-card wp-row-card wp-audit" key={a.id}>
          <Ring value={a.score ?? 0} size={62} tone={scoreTone(a.score)} stroke={6} label={a.score == null ? '—' : a.score} />
          <div className="wp-card-body">
            <h4>{a.title}</h4>
            <p>{a.notes || 'Quality control audit'}</p>
            <div className="wp-meta"><Badge tone={toneOf(a.status)}>{cap(a.status)}</Badge><span><Shirt size={13} /> {a.projectId?.name || 'No project'}</span></div>
            <div className="wp-card-actions">{actions(a, ctx)}</div>
          </div>
        </article>
      )}
      columns={[
        { label: 'Audit', render: (a) => <div className="wp-cell-main"><div><strong>{a.title}</strong><small>{a.notes || 'Quality control'}</small></div></div> },
        { label: 'Status', render: (a) => <Badge tone={toneOf(a.status)}>{cap(a.status)}</Badge> },
        { label: 'Score', render: (a) => (a.score == null ? '—' : <Badge tone={scoreTone(a.score)} dot={false}>{a.score}/100</Badge>) },
        { label: 'Project', render: (a) => a.projectId?.name || '—' }, { label: 'Review', render: (a, ctx) => actions(a, ctx) },
      ]}
    />
  );
}
