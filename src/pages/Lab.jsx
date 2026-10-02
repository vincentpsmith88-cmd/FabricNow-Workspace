import React, { useEffect, useState } from 'react';
import { Check, Copy, Layers, Palette, PenLine, Pipette, Shirt, Sparkles, Users, FileText, Wand2 } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented, StatusPill } from '../components/ui.jsx';
import { Dropzone, MultiDrop, usePreview } from '../components/Dropzone.jsx';
import GarmentSelect from '../components/GarmentSelect.jsx';
import JobView from '../components/JobView.jsx';
import { isDone, isFailed, jobTitle } from '../usage.js';

const LININGS = [{ value: 'none', label: 'None' }, { value: 'partial', label: 'Partial' }, { value: 'full', label: 'Full' }];

const TOOLS = [
  { id: 'print', icon: Wand2, label: 'Print generator', blurb: 'Describe an Ankara, kente, adire or mudcloth style and get a seamless repeat you can tile.', image: 'optional', imageTitle: 'Inspiration photo (optional)' },
  { id: 'colorways', icon: Palette, label: 'Colourways', blurb: 'One print or garment, up to six new colour versions. Leave palettes blank and the AI suggests them.', image: 'required', imageTitle: 'Print or garment photo' },
  { id: 'fabric', icon: Pipette, label: 'Fabric extraction', blurb: 'Pull a clean, flat fabric swatch out of a photo of someone wearing it.', image: 'required', imageTitle: 'Photo of the worn garment' },
  { id: 'flats', icon: PenLine, label: 'Sketch to flats', blurb: 'Front and back technical drawings, construction notes, bill of materials and a rough yardage.', image: 'required', imageTitle: 'Sketch or garment photo' },
  { id: 'mockup', icon: Shirt, label: 'Mockups and lookbook', blurb: 'Show a garment or print on a model in the scenes you describe.', image: 'required', imageTitle: 'Garment photo or fabric print' },
  { id: 'asoebi', icon: Users, label: 'Aso-ebi styles', blurb: 'The same fabric sewn into different styles for a group: kaba and slit, agbada, peplum gown and more.', image: 'required', imageTitle: 'The fabric' },
  { id: 'listing', icon: FileText, label: 'Listing writer', blurb: 'Title, description, silhouette, fabric, style, tags and SEO text from product photos. You review before publishing.', image: 'multi', max: 4 },
  { id: 'batch', icon: Layers, label: 'Batch patterns', blurb: 'Up to 10 garment photos in one go. Each photo gets its own analysis and its own ZIP.', image: 'multi', max: 10 },
];

export default function Lab({ onDone, onJob, onDeleted, setPage }) {
  const [tool, setTool] = useState('print');
  const t = TOOLS.find((x) => x.id === tool);
  return (
    <div className="stack">
      <div className="chips lab-tabs" role="tablist" aria-label="AI tools">
        {TOOLS.map((x) => (
          <button type="button" key={x.id} role="tab" aria-selected={tool === x.id} className={`chip ${tool === x.id ? 'on' : ''}`} onClick={() => setTool(x.id)}>
            <x.icon size={15} />{x.label}
          </button>
        ))}
      </div>
      <ToolPanel key={tool} tool={t} onDone={onDone} onJob={onJob} onDeleted={onDeleted} setPage={setPage} />
    </div>
  );
}

function ToolPanel({ tool, onDone, onJob, onDeleted, setPage }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [v, setV] = useState({ garment: 'Auto-detect', lining: 'none', count: '4', input: 'garment' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [batch, setBatch] = useState(null);
  const [listing, setListing] = useState(null);
  const preview = usePreview(file);
  const set = (k) => (e) => setV((cur) => ({ ...cur, [k]: e && e.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (tool.image === 'required' && !file) return setError('Add a photo to continue.');
    if (tool.image === 'multi' && !files.length) return setError('Add at least one photo.');
    if (tool.id === 'print' && !file && !(v.prompt || '').trim()) return setError('Describe the print you want.');
    if (tool.id === 'asoebi' && !(v.styles || '').trim()) return setError('List at least one style, one per line.');
    setBusy(true);
    try {
      const fd = new FormData();
      if (tool.image === 'multi') files.forEach((f) => fd.append('files', f)); else if (file) fd.append('file', file);
      ['prompt', 'style', 'count', 'palettes', 'garment', 'notes', 'model', 'scenes', 'styles', 'input', 'lining'].forEach((k) => {
        if (v[k] !== undefined && v[k] !== '') fd.append(k, v[k]);
      });
      if (tool.id === 'listing') {
        setListing(await api('/api/workspace/tools/listing', { method: 'POST', body: fd }));
      } else if (tool.id === 'batch') {
        const d = await api('/api/workspace/patterns/batch', { method: 'POST', body: fd });
        d.jobs.forEach(onDone); setBatch(d.jobs); toast.success(`${d.jobs.length} pattern jobs started.`);
      } else {
        const d = await api(`/api/workspace/tools/${tool.id}`, { method: 'POST', body: fd });
        setJob(d); onDone(d); toast.success('Started. This usually takes one to three minutes.');
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const again = () => { setJob(null); setBatch(null); setListing(null); setError(''); };

  if (job) {
    return (
      <div className="stack">
        <JobView jobId={job.id} initial={job} onJob={onJob} onDeleted={(id) => { onDeleted(id); again(); }} />
        <div className="done-actions"><button className="btn btn-ghost" onClick={again}>Make another</button></div>
      </div>
    );
  }
  if (batch) return <BatchStatus jobs={batch} onJob={onJob} setPage={setPage} again={again} />;
  if (listing) return <ListingResult data={listing} setData={setListing} again={again} />;

  const isFabricMock = tool.id === 'mockup' && v.input === 'fabric';
  return (
    <form className="panel composer lab-form" onSubmit={submit}>
      <div className="step-head"><h3>{tool.label}</h3></div>
      <p className="muted">{tool.blurb}</p>

      <div className="step">
        <div className="step-head"><h3>{tool.image === 'multi' ? (tool.id === 'batch' ? 'Garment photos' : 'Product photos') : 'Photo'}</h3>
          <span>{tool.image === 'multi' ? `Up to ${tool.max}` : tool.image === 'optional' ? 'Optional' : 'JPG, PNG or WebP, up to 10 MB'}</span></div>
        {tool.image === 'multi'
          ? <MultiDrop files={files} onFiles={setFiles} max={tool.max} title="Drop photos here" hint="or click to browse" />
          : <Dropzone file={file} preview={preview} onFile={(f) => { setFile(f); setError(''); }} title={tool.imageTitle} hint="Drop or click" scanning={busy} />}
      </div>

      {tool.id === 'print' && (<>
        <label className="field">What should the print look like?
          <textarea rows={3} maxLength={600} value={v.prompt || ''} onChange={set('prompt')} placeholder="Bold geometric Ankara in indigo and gold with sun and cowrie motifs" /></label>
        <label className="field">Style or technique <em>optional</em>
          <input value={v.style || ''} onChange={set('style')} placeholder="Wax print, kente weave, adire resist-dye, mudcloth, lace…" /></label>
      </>)}

      {tool.id === 'colorways' && (<>
        <div className="step"><div className="step-head"><h3>How many versions</h3></div>
          <Segmented label="Count" options={['2', '3', '4', '6'].map((n) => ({ value: n, label: n }))} value={v.count} onChange={set('count')} /></div>
        <label className="field">Palettes <em>optional, one per line</em>
          <textarea rows={3} value={v.palettes || ''} onChange={set('palettes')} placeholder={'indigo and white\nemerald green and gold'} /></label>
      </>)}

      {tool.id === 'flats' && (<>
        <div className="step"><div className="step-head"><h3>Garment type</h3></div><GarmentSelect value={v.garment} onChange={set('garment')} /></div>
        <label className="field">Notes <em>optional</em><textarea rows={3} maxLength={500} value={v.notes || ''} onChange={set('notes')} placeholder="Back zip, lined bodice, hidden pockets…" /></label>
      </>)}

      {tool.id === 'mockup' && (<>
        <div className="step"><div className="step-head"><h3>The photo shows</h3></div>
          <Segmented label="Input" options={[{ value: 'garment', label: 'A garment' }, { value: 'fabric', label: 'A fabric' }]} value={v.input} onChange={set('input')} /></div>
        {isFabricMock && <div className="step"><div className="step-head"><h3>Make it into</h3></div><GarmentSelect auto={false} value={v.garment === 'Auto-detect' ? 'dress' : v.garment} onChange={set('garment')} /></div>}
        <label className="field">Model <em>optional</em><input value={v.model || ''} onChange={set('model')} placeholder="A tall woman with short natural hair" /></label>
        <label className="field">Scenes <em>one per line, up to 4</em>
          <textarea rows={3} value={v.scenes || ''} onChange={set('scenes')} placeholder={'Studio, front view, white backdrop\nWedding reception, golden hour'} /></label>
      </>)}

      {tool.id === 'asoebi' && (<>
        <label className="field">Styles <em>one per line, up to 6</em>
          <textarea rows={4} value={v.styles || ''} onChange={set('styles')} placeholder={'kaba and slit\nagbada\npeplum gown\nsenator suit'} /></label>
        <label className="field">Model <em>optional</em><input value={v.model || ''} onChange={set('model')} placeholder="A woman in her thirties" /></label>
      </>)}

      {tool.id === 'listing' && (
        <label className="field">Seller notes <em>optional</em><textarea rows={3} maxLength={300} value={v.notes || ''} onChange={set('notes')} placeholder="100% cotton, 6 yards, made in Accra" /></label>
      )}

      {tool.id === 'batch' && (<>
        <div className="step"><div className="step-head"><h3>Garment type</h3><span>Applies to every photo</span></div><GarmentSelect value={v.garment} onChange={set('garment')} /></div>
        <div className="step"><div className="step-head"><h3>Lining</h3></div><Segmented label="Lining" options={LININGS} value={v.lining} onChange={set('lining')} /></div>
      </>)}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="composer-bar">
        <p>{tool.id === 'batch' ? `${files.length} photo${files.length === 1 ? '' : 's'} selected` : 'Each run counts toward your hourly limit.'}</p>
        <button className="btn btn-primary btn-lg" disabled={busy}><Sparkles size={16} /> {busy ? 'Working…' : tool.id === 'listing' ? 'Write listing' : 'Generate'}</button>
      </div>
    </form>
  );
}

function BatchStatus({ jobs, onJob, setPage, again }) {
  const [live, setLive] = useState(jobs);
  useEffect(() => {
    let on = true; let timer;
    const tick = async () => {
      try {
        const d = await api(`/api/workspace/jobs?ids=${live.map((j) => j.id).join(',')}`);
        if (!on) return;
        const map = new Map(d.jobs.map((j) => [j.id, j]));
        const next = live.map((j) => map.get(j.id) || j);
        next.forEach((j) => onJob(j)); setLive(next);
        if (next.some((j) => !isDone(j) && !isFailed(j))) timer = setTimeout(tick, 4000);
      } catch { if (on) timer = setTimeout(tick, 8000); }
    };
    timer = setTimeout(tick, 3000);
    return () => { on = false; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="panel">
      <div className="panel-head"><h3>Batch started</h3></div>
      <ul className="rows">
        {live.map((j, i) => (
          <li key={j.id}><span className="row-icon">{i + 1}</span><div><strong>{jobTitle(j)}</strong><small>{j.stage || ''}{j.pieces?.length ? ` · ${j.pieces.length} pieces` : ''}</small></div><StatusPill status={j.status} /></li>
        ))}
      </ul>
      <div className="done-actions">
        <button className="btn btn-primary" onClick={() => setPage('projects')}>Open Projects to download</button>
        <button className="btn btn-ghost" onClick={again}>Start another batch</button>
      </div>
    </section>
  );
}

function ListingResult({ data, setData, again }) {
  const toast = useToast();
  const [copied, setCopied] = useState('');
  const edit = (k) => (e) => setData({ ...data, [k]: e.target.value });
  const copy = async (k, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(''), 1500); } catch { toast.error('Copy failed. Select the text and copy it manually.'); }
  };
  const Row = ({ k, label, area }) => (
    <label className="field">
      <span className="field-row">{label}<button type="button" className="link" onClick={() => copy(k, String(data[k] || ''))}>{copied === k ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button></span>
      {area ? <textarea rows={5} value={data[k] || ''} onChange={edit(k)} /> : <input value={data[k] || ''} onChange={edit(k)} />}
    </label>
  );
  const tags = (data.tags || []).join(', ');
  return (
    <section className="panel composer">
      <div className="panel-head"><h3>Listing draft</h3><span className="muted small-text">{data.provider === 'anthropic' ? 'Written by Claude' : 'Written by OpenAI'}</span></div>
      <div className="warn-box"><FileText size={16} /><ul><li>Review before you publish. The AI only describes what it can see.</li>
        {(data.confidence_notes || []).map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      <Row k="title" label={`Title (${(data.title || '').length}/60)`} />
      <Row k="description" label="Description" area />
      <div className="grid-2">
        <Row k="silhouette" label="Silhouette" /><Row k="fabric" label="Fabric" />
        <Row k="style" label="Style" /><Row k="garment_type" label="Garment type" />
      </div>
      <label className="field"><span className="field-row">Tags<button type="button" className="link" onClick={() => copy('tags', tags)}>{copied === 'tags' ? 'Copied' : 'Copy'}</button></span>
        <input value={tags} onChange={(e) => setData({ ...data, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>
      <p className="muted small-text">Colours: {(data.colours || []).join(', ') || 'n/a'} · Occasions: {(data.occasions || []).join(', ') || 'n/a'}</p>
      <Row k="seo_title" label="SEO title" /><Row k="seo_description" label="SEO description" area /><Row k="image_alt_text" label="Image alt text" />
      {data.cultural_note && <p className="muted small-text">{data.cultural_note}</p>}
      <div className="done-actions">
        <button className="btn btn-ghost" onClick={() => copy('json', JSON.stringify(data, null, 2))}>{copied === 'json' ? 'Copied' : 'Copy all as JSON'}</button>
        <button className="btn btn-ghost" onClick={again}>Write another</button>
      </div>
    </section>
  );
}
