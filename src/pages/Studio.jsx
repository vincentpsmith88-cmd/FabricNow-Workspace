import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Check, ExternalLink, FileOutput, ImagePlus, Layers3, Link2, Plus, RotateCcw, Ruler, Scissors, Sparkles, SlidersHorizontal, Coffee, Clock3, Download } from 'lucide-react';
import { api, API, TOKEN_KEY } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented, Spinner } from '../components/ui.jsx';
import { Dropzone, usePreview } from '../components/Dropzone.jsx';
import JobView from '../components/JobView.jsx';

const LININGS = [{ value: 'none', label: 'None' }, { value: 'partial', label: 'Partial' }, { value: 'full', label: 'Full' }];
const NOTE_IDEAS = ['Side zip', 'Puff sleeves', 'Gathered waist', 'Fully lined bodice', 'Slit hem', 'Wide neckline'];
const STEPS = [
  ['01', 'Reference', 'Garment + fabric photo'],
  ['02', 'Construction', 'Type, lining, notes'],
  ['03', 'Generate', 'Pieces + grading'],
  ['04', 'Review', 'Production files'],
];
const MAX_NOTES = 500;
const FORMAT_GROUPS = [
  ['Length', ['Mini', 'Knee length', 'Midi', 'Maxi']],
  ['Sleeve', ['Sleeveless', 'Cap sleeve', 'Short sleeve', 'Three-quarter sleeve', 'Long sleeve']],
  ['Shape', ['A-line', 'Fitted', 'Gathered', 'Flared', 'Wrap', 'Shift']],
];
const ALL_FORMATS = FORMAT_GROUPS.flatMap(([, f]) => f);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function Hero({ eyebrow, title, body, stage, actions }) {
  return (
    <header className="ps-hero">
      <div className="ps-hero-top">
        <div className="ps-hero-copy">
          <span className="ps-eyebrow"><Scissors size={13} /> {eyebrow}</span>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <div className="ps-hero-actions">{actions}</div>
      </div>
      <ol className="ps-steps" aria-label="Progress">
        {STEPS.map(([n, t, d], i) => (
          <li key={n} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''} aria-current={i === stage ? 'step' : undefined}>
            <span className="ps-step-n">{i < stage ? <Check size={13} /> : n}</span>
            <span><strong>{t}</strong><small>{d}</small></span>
          </li>
        ))}
      </ol>
    </header>
  );
}

export default function Studio({ setPage }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [swatch, setSwatch] = useState(null);
  const [garment, setGarment] = useState('');
  const [lining, setLining] = useState('none');
  const [notes, setNotes] = useState('');
  const [formats, setFormats] = useState([]);
  const [extraCuts, setExtraCuts] = useState(true);
  const [formatNote, setFormatNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');
  const [request, setRequest] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const photo = usePreview(file);
  const fabric = usePreview(swatch);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fabricnow.patternReference');
      if (!raw) return;
      const ref = JSON.parse(raw);
      if (!ref?.imageUrl) return;
      setReference(ref);
      setReferenceLoading(true);
      fetch(ref.imageUrl, { mode: 'cors' })
        .then(r => { if (!r.ok) throw new Error('Reference image could not be imported automatically.'); return r.blob(); })
        .then(blob => {
          const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
          const imported = new File([blob], `pinterest-reference-${ref.id || 'image'}.${ext}`, { type: blob.type || 'image/jpeg' });
          setFile(imported);
          setError('');
        })
        .catch(() => setReferenceError('Pinterest kept the source image protected from direct import. You can still use it as a visual reference; download it only if you have permission, then drop the file here.'))
        .finally(() => setReferenceLoading(false));
    } catch {}
  }, []);

  const reset = () => {
    setFile(null); setSwatch(null); setNotes(''); setLining('none'); setFormats([]); setFormatNote('');
    setError('');
  };

  const addIdea = (t) => setNotes((n) => {
    if (n.toLowerCase().includes(t.toLowerCase())) return n;
    return `${n.trim() ? `${n.trim().replace(/[,.]$/, '')}, ` : ''}${t.toLowerCase()}`.slice(0, MAX_NOTES);
  });

  const toggleFormat = (f) => setFormats((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]));
  /* Keep optional format selections alongside the customer's production instructions. */
  const formatBrief = () => {
    if (!formats.length && !formatNote.trim()) return '';
    const list = formats.length === ALL_FORMATS.length ? 'every possible dress format (all lengths, sleeves and shapes)' : formats.join(', ');
    return [
      formats.length ? `Also draft these dress formats of the same garment: ${list}.` : '',
      extraCuts ? 'Cut each format as additional pattern pieces after the main pattern, labelled with the format name; only add the pieces that change.' : '',
      formatNote.trim() ? `Extra instruction: ${formatNote.trim()}` : '',
    ].filter(Boolean).join(' ');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Add a garment photo to continue.');
    if (file.size > 10 * 1024 * 1024) return setError('That photo is over 10 MB. Choose a smaller one.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (swatch) fd.append('swatch', swatch);
      const brief = formatBrief();
      fd.append('garment', garment); fd.append('notes', [notes.trim(), brief].filter(Boolean).join('\n\n')); fd.append('lining', lining);
      fd.append('variants', JSON.stringify({ formats, all: formats.length === ALL_FORMATS.length, extraCuts, note: formatNote.trim() }));
      const d = await api('/api/pattern-requests', { method: 'POST', body: fd });
      setRequest(d.request); localStorage.setItem('fabricnow.latestPatternRequest', d.request.id);
      
      toast.success('Garment request submitted.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = localStorage.getItem('fabricnow.latestPatternRequest');
        if (!request) {
          if (saved) {
            const d = await api(`/api/pattern-requests/${saved}`);
            if (active && d.request) setRequest(d.request);
          } else {
            const d = await api('/api/pattern-requests/mine');
            const latest = d.requests?.[0];
            if (active && latest) { setRequest(latest); localStorage.setItem('fabricnow.latestPatternRequest', latest.id); }
          }
        }
      } catch { /* no previous request or it is no longer available */ }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!request?.id || request.status === 'completed') return undefined;
    let active = true;
    const poll = async () => {
      try { const d = await api(`/api/pattern-requests/${request.id}`); if (active && d.request) setRequest(d.request); } catch {}
    };
    const timer = setInterval(poll, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [request?.id, request?.status]);

  useEffect(() => {
    let active = true; const loadPreviews = async () => {
      if (request?.status !== 'completed' || !Array.isArray(request.previews)) { setPreviewImages([]); return; }
      const token = localStorage.getItem(TOKEN_KEY);
      const loaded = await Promise.all(request.previews.map(async p => {
        try { const r = await fetch(`${API}${p.url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); if (!r.ok) return null; return { name: p.name, src: URL.createObjectURL(await r.blob()) }; } catch { return null; }
      }));
      if (active) setPreviewImages(loaded.filter(Boolean)); else loaded.filter(Boolean).forEach(x => URL.revokeObjectURL(x.src));
    };
    loadPreviews(); return () => { active = false; };
  }, [request?.id, request?.status, request?.previews?.length]);

  const downloadPattern = async () => {
    if (!request?.id) return;
    setDownloadBusy(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API}/api/pattern-requests/${request.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Your ZIP is not available yet.');
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = request.resultZipName || 'fabricnow-pattern.zip'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); } finally { setDownloadBusy(false); }
  };


  const ready = Boolean(file);
  const gLabel = garment || 'Not specified';
  const stage = busy ? 2 : ready ? 1 : 0;

  if (request) {
    const completed = request.status === 'completed';
    const statusLabel = completed ? 'Pattern ready' : request.status === 'revision_requested' ? 'Update requested' : request.status === 'processing' ? 'In production' : 'Request received';
    return (
      <div className="ps">
        <Hero eyebrow="PATTERN STUDIO" stage={3} title={completed ? 'Your garment pattern is ready.' : 'Generating garment...'} body={completed ? 'Your finished pattern package is ready in your Workspace.' : 'Grab a coffee and hold on. You can safely leave this page and come back later.'} actions={<button className="btn btn-ghost" type="button" onClick={() => { setRequest(null); localStorage.removeItem('fabricnow.latestPatternRequest'); reset(); }}><RotateCcw size={15} /> New request</button>} />
        <section className="ps-card manual-status-card">
          {completed ? <CheckCircle2 size={54} color="#26966b"/> : <div className="coffee-animation" aria-hidden="true"><span className="coffee-steam steam-one"/><span className="coffee-steam steam-two"/><Coffee size={54}/></div>}
          <h2>{completed ? 'Your pattern is ready!' : 'Generating garment...'}</h2>
          <p>{completed ? 'Your completed pattern ZIP is ready to view and download.' : 'Grab a coffee and hold on ☕'}</p>
          <div className="manual-status-meta"><span className={`ps-pill ${completed ? 'on' : 'busy'}`}>{statusLabel}</span>{!completed && <span><Clock3 size={14}/> Estimated time: 20–30 minutes</span>}</div>
          {!completed && <p className="manual-leave-note">You can safely leave this page. Come back to your Workspace later to check whether your garment is ready.</p>}
          {request.adminNote && <div className="ps-result-strip">{request.adminNote}</div>}
          {completed && previewImages.length > 0 && <div className="manual-preview-grid">{previewImages.map((p, i) => <figure key={`${p.name}-${i}`}><img src={p.src} alt={p.name}/><figcaption>{p.name}</figcaption></figure>)}</div>}
          {completed && <button className="ps-cta" type="button" onClick={downloadPattern} disabled={downloadBusy}><Download size={17}/>{downloadBusy ? 'Preparing download…' : 'Download pattern ZIP'}</button>}
          <small className="manual-request-id">Request #{String(request.id).slice(-8)}</small>
        </section>
      </div>
    );
  }

  return (
    <div className="ps">
      <Hero
        eyebrow="PATTERN STUDIO" stage={stage}
        title="From garment photo to production pattern."
        body="Upload your garment reference and construction instructions. Our production workflow will prepare your pattern package."
        actions={<><button className="btn btn-ghost" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button></>}
      />

      <form className="ps-grid" onSubmit={submit}>
        <div className="ps-main">
          <section className="ps-card">
            <div className="ps-card-head">
              <span className="ps-badge"><ImagePlus size={17} /></span>
              <div><h3>Garment &amp; fabric</h3><p>Upload a clear front or ¾ view of the garment.</p></div>
            </div>

            {reference && (
              <div className="ps-reference">
                <div className="ps-reference-thumb"><img src={reference.imageUrl} alt={reference.title || 'Pinterest reference'} /></div>
                <div>
                  <span className="ps-mini-label">PINTEREST REFERENCE</span>
                  <strong>{reference.title || 'Visual inspiration'}</strong>
                  <p>{referenceLoading ? <span className="inline-loading"><Spinner size={13} /> Preparing reference</span> : referenceError || 'The source link is preserved with this working reference.'}</p>
                  <div className="ps-reference-actions">
                    {reference.sourceUrl && <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13} /> Open source</a>}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(reference.sourceUrl || '')}><Link2 size={13} /> Copy source</button>
                  </div>
                </div>
              </div>
            )}

            <div className="ps-upload">
              <Dropzone big file={file} preview={photo} onFile={(f) => { setFile(f); setError(''); }} title="Drop a garment photo here" hint="or click to browse" scanning={busy} />
              <div className="ps-upload-side">
                <Dropzone file={swatch} preview={fabric} onFile={setSwatch} title="Fabric reference" hint="Optional close-up of weave or print" />
                <ul className="ps-tips">
                  <li><Check size={14} /> Front or ¾ view works best</li>
                  <li><Check size={14} /> Plain, evenly lit background</li>
                  <li><Check size={14} /> JPG, PNG or WebP · up to 10 MB</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="ps-card">
            <div className="ps-card-head">
              <span className="ps-badge"><SlidersHorizontal size={17} /></span>
              <div><h3>Construction</h3><p>Share the construction details for your pattern request.</p></div>
            </div>
            <div className="ps-config">
              <div><label className="ps-label" htmlFor="garment-type">Garment type</label><input id="garment-type" className="ps-text-input" value={garment} onChange={e => setGarment(e.target.value)} placeholder="e.g. Maxi dress with flutter sleeves" /></div>
              <div><span className="ps-label">Lining</span><Segmented label="Lining" options={LININGS} value={lining} onChange={setLining} /></div>
            </div>
            <div className="ps-notes">
              <div className="ps-label-row"><label className="ps-label" htmlFor="notes">Designer notes <em>optional</em></label><span className={notes.length > MAX_NOTES - 40 ? 'warn' : ''}>{notes.length}/{MAX_NOTES}</span></div>
              <textarea id="notes" rows={4} maxLength={MAX_NOTES} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Closures, neckline or sleeve changes, special panels, seam details…" />
              <div className="ps-ideas" aria-label="Quick additions">
                {NOTE_IDEAS.map((t) => <button type="button" key={t} onClick={() => addIdea(t)}><Plus size={12} />{t}</button>)}
              </div>
            </div>
          </section>

          <section className="ps-card">
            <div className="ps-card-head">
              <span className="ps-badge"><Layers3 size={17} /></span>
              <div><h3>Dress formats &amp; extra cuts</h3><p>Select any additional formats you want included in your request.</p></div>
            </div>
            <div className="ps-ideas" aria-label="Dress formats">
              <button type="button" className={formats.length === ALL_FORMATS.length ? 'on' : ''} onClick={() => setFormats(formats.length === ALL_FORMATS.length ? [] : ALL_FORMATS)}><Sparkles size={12} />All possible formats</button>
            </div>
            {FORMAT_GROUPS.map(([label, list]) => (
              <div className="ps-notes" key={label} style={{ marginTop: 14 }}>
                <span className="ps-label">{label}</span>
                <div className="ps-ideas">{list.map((f) => <button type="button" key={f} className={formats.includes(f) ? 'on' : ''} aria-pressed={formats.includes(f)} onClick={() => toggleFormat(f)}>{formats.includes(f) ? <Check size={12} /> : <Plus size={12} />}{f}</button>)}</div>
              </div>
            ))}
            <label className="ps-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}><input type="checkbox" checked={extraCuts} onChange={(e) => setExtraCuts(e.target.checked)} /> Cut each format as additional pieces</label>
            <div className="ps-notes">
              <label className="ps-label" htmlFor="format-note">Additional instructions <em>optional</em></label>
              <textarea id="format-note" rows={3} maxLength={200} value={formatNote} onChange={(e) => setFormatNote(e.target.value)} placeholder="e.g. keep the same neckline on every format, add 10 cm for the maxi" />
            </div>
          </section>
        </div>

        <aside className={`ps-brief ${busy ? 'busy' : ''}`} aria-label="Production brief">
          <div className="ps-brief-head"><span>Production brief</span><span className={`ps-pill ${busy ? 'busy' : ready ? 'on' : ''}`}>{busy ? 'Generating' : ready ? 'Ready' : 'Waiting'}</span></div>

          <div className="ps-brief-photo">
            {photo ? <img src={photo} alt="Garment preview" /> : <div className="ps-brief-empty"><img src="/logo-icon.svg" alt="" className="float" /><small>Your garment preview appears here</small></div>}
            {busy && <span className="scan" />}
          </div>

          <dl className="ps-brief-list">
            <div><dt>Garment</dt><dd>{gLabel}</dd></div>
            <div><dt>Lining</dt><dd>{cap(lining)}</dd></div>
            <div><dt>Fabric</dt><dd>{swatch ? 'Added' : 'None'}</dd></div>
            <div><dt>Notes</dt><dd>{notes.trim() ? `${notes.trim().length} characters` : 'None'}</dd></div>
            <div><dt>Extra formats</dt><dd>{formats.length ? `${formats.length}${extraCuts ? ' · extra cuts' : ''}` : 'None'}</dd></div>
          </dl>

          <div className="ps-route" aria-label="What you will get">
            <span><Layers3 size={14} /> Pattern pieces</span>
            <span><Ruler size={14} /> Your instructions</span>
            <span><FileOutput size={14} /> ZIP package</span>
          </div>

          {error && <div className="ps-error" role="alert">{error}</div>}

          <button className="ps-cta" disabled={busy || !ready} data-no-spin aria-busy={busy}>
            {busy ? <><Spinner size={16} /> Submitting request…</> : <><Sparkles size={16} /> Generate</>}
          </button>
          {busy
            ? <div className="ps-progress" aria-hidden="true"><i /></div>
            : <p className="ps-brief-foot">{ready ? 'Estimated completion: 20–30 minutes. You can leave and return later.' : 'Add a garment photo to submit your request.'}</p>}
        </aside>
      </form>
    </div>
  );
}
