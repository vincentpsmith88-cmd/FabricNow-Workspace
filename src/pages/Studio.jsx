import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Check, ExternalLink, FileOutput, ImagePlus, Layers3, Link2, Plus, RotateCcw, Ruler, Scissors, Sparkles, SlidersHorizontal } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented, Spinner } from '../components/ui.jsx';
import { Dropzone, usePreview } from '../components/Dropzone.jsx';
import { useCatalog } from '../components/GarmentSelect.jsx';
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

export default function Studio({ onDone, onJob, onDeleted, setPage }) {
  const toast = useToast();
  const catalog = useCatalog();
  const [file, setFile] = useState(null);
  const [swatch, setSwatch] = useState(null);
  const [garment] = useState('Auto-detect');
  const [lining, setLining] = useState('none');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [reference, setReference] = useState(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');
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

  useEffect(() => {
    if (!busy) { setSecs(0); return undefined; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const reset = () => {
    setFile(null); setSwatch(null); setNotes(''); setLining('none');
    setResult(null); setError('');
  };

  const addIdea = (t) => setNotes((n) => {
    if (n.toLowerCase().includes(t.toLowerCase())) return n;
    return `${n.trim() ? `${n.trim().replace(/[,.]$/, '')}, ` : ''}${t.toLowerCase()}`.slice(0, MAX_NOTES);
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Add a garment photo to continue.');
    if (file.size > 10 * 1024 * 1024) return setError('That photo is over 10 MB. Choose a smaller one.');
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (swatch) fd.append('swatch', swatch);
      fd.append('garment', garment); fd.append('notes', notes); fd.append('lining', lining);
      const d = await api('/api/workspace/patterns', { method: 'POST', body: fd });
      setResult(d); onDone(d); toast.success('Pattern job started.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const ready = Boolean(file);
  const gLabel = result?.garment || result?.plan?.garment || 'AI auto-detect';
  const stage = result ? 3 : busy ? 2 : ready ? 1 : 0;

  if (result) {
    return (
      <div className="ps">
        <Hero
          eyebrow="PATTERN STUDIO" stage={3}
          title="Review the pattern, then grade and export."
          body="Check the generated pieces, adjust if needed, and prepare production-ready files."
          actions={<button className="btn btn-ghost" type="button" onClick={reset}><RotateCcw size={15} /> Start another</button>}
        />
        <div className="ps-result-strip">
          <span className="ok"><CheckCircle2 size={15} /> Pattern generated</span>
          <b>{gLabel}</b>
          <span>{cap(lining)} lining</span>
          {swatch && <span>Fabric reference added</span>}
          <button className="btn btn-ghost" type="button" onClick={() => setPage('projects')}>All projects <ArrowRight size={15} /></button>
        </div>
        <JobView jobId={result.id} initial={result} onJob={onJob} onDeleted={(id) => { onDeleted(id); reset(); }} />
      </div>
    );
  }

  return (
    <div className="ps">
      <Hero
        eyebrow="PATTERN STUDIO" stage={stage}
        title="From garment photo to production pattern."
        body="Upload a reference, describe how it’s constructed, and get cut-ready pattern pieces with grading and DXF / SVG exports."
        actions={<><button className="btn btn-ghost" type="button" onClick={reset}><RotateCcw size={15} /> Reset</button></>}
      />

      <form className="ps-grid" onSubmit={submit}>
        <div className="ps-main">
          <section className="ps-card">
            <div className="ps-card-head">
              <span className="ps-badge"><ImagePlus size={17} /></span>
              <div><h3>Garment &amp; fabric</h3><p>A clear front or ¾ photo gives the most accurate pieces.</p></div>
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
              <div><h3>Construction</h3><p>Give the engine enough context to plan the pieces correctly.</p></div>
            </div>
            <div className="ps-config">
              <div><span className="ps-label">Garment type</span><div className="ps-auto-detect"><Sparkles size={14}/> AI will identify the garment from the reference</div></div>
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
          </dl>

          <div className="ps-route" aria-label="What you will get">
            <span><Layers3 size={14} /> Pattern pieces</span>
            <span><Ruler size={14} /> Grading</span>
            <span><FileOutput size={14} /> DXF / SVG</span>
          </div>

          {error && <div className="ps-error" role="alert">{error}</div>}

          <button className="ps-cta" disabled={busy || !ready} data-no-spin aria-busy={busy}>
            {busy ? <><Spinner size={16} /> Generating · {secs}s</> : <><Sparkles size={16} /> Generate</>}
          </button>
          {busy
            ? <div className="ps-progress" aria-hidden="true"><i /></div>
            : <p className="ps-brief-foot">{ready ? 'When it finishes you can review, grade and export from the result.' : 'Add a garment photo to enable generation.'}</p>}
        </aside>
      </form>
    </div>
  );
}
