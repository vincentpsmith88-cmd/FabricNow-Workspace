import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Check, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented } from '../components/ui.jsx';

const GARMENTS = ['dress', 'shirt', 'jacket', 'trousers', 'skirt', 'kaftan'];
const LININGS = [{ value: 'none', label: 'None' }, { value: 'partial', label: 'Partial' }, { value: 'full', label: 'Full' }];
const MAX_NOTES = 500;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function usePreview(file) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function Dropzone({ file, preview, onFile, big, title, hint, scanning }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const take = (f) => { if (f && f.type.startsWith('image/')) onFile(f); };
  const open = () => input.current?.click();
  return (
    <div
      className={`dz ${big ? 'dz-big' : 'dz-small'} ${drag ? 'drag' : ''} ${file ? 'has' : ''} ${scanning ? 'scanning' : ''}`}
      role="button" tabIndex={0} aria-label={title}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
    >
      {file ? (
        <>
          {preview && <img src={preview} alt="" className="dz-img" />}
          {scanning && <span className="scan" />}
          <div className="dz-meta"><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></div>
          <button type="button" className="dz-x" aria-label="Remove image"
            onClick={(e) => { e.stopPropagation(); onFile(null); if (input.current) input.current.value = ''; }}><X size={16} /></button>
        </>
      ) : (
        <div className="dz-empty">
          <span className="dz-ico"><ImagePlus size={big ? 26 : 20} /></span>
          <strong>{title}</strong>
          <small>{hint}</small>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
    </div>
  );
}

export default function Studio({ onDone, setPage }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [swatch, setSwatch] = useState(null);
  const [garment, setGarment] = useState('dress');
  const [lining, setLining] = useState('none');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const photo = usePreview(file);
  const fabric = usePreview(swatch);

  useEffect(() => {
    if (!busy) { setSecs(0); return undefined; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const reset = () => { setFile(null); setSwatch(null); setNotes(''); setGarment('dress'); setLining('none'); setResult(null); setError(''); };

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
      setResult(d); onDone(d); toast.success('Pattern job created.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const ready = Boolean(file);

  return (
    <div className="cols studio">
      {result ? (
        <section className="panel done">
          <svg className="check-anim" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" pathLength="1" />
            <path d="M15 27.5l7.5 7.5L37.5 19" pathLength="1" />
          </svg>
          <h2>Pattern job created</h2>
          <p className="muted">Your {garment} is being processed. It will appear in Projects as soon as it’s ready.</p>
          <p className="muted small-text">Job ID <code>{result.id || result.job_id || 'pending'}</code></p>
          <div className="done-actions">
            <button className="btn btn-primary" onClick={() => setPage('projects')}>View in Projects <ArrowRight size={16} /></button>
            <button className="btn btn-ghost" onClick={reset}><RotateCcw size={16} /> Start another</button>
          </div>
        </section>
      ) : (
        <form className="panel composer" onSubmit={submit}>
          <div className="step">
            <div className="step-head"><h3>Garment photo</h3><span>Front-facing, JPG, PNG or WebP, up to 10 MB</span></div>
            <Dropzone big file={file} preview={photo} onFile={(f) => { setFile(f); setError(''); }} title="Drop a garment photo here" hint="or click to browse" scanning={busy} />
          </div>

          <div className="step">
            <div className="step-head"><h3>Fabric reference <em>optional</em></h3><span>A close-up shows weave and print</span></div>
            <Dropzone file={swatch} preview={fabric} onFile={setSwatch} title="Add a fabric close-up" hint="Drop or click" />
          </div>

          <div className="step">
            <div className="step-head"><h3>Garment type</h3></div>
            <div className="chips" role="radiogroup" aria-label="Garment type">
              {GARMENTS.map((g) => (
                <button type="button" key={g} role="radio" aria-checked={garment === g} className={`chip ${garment === g ? 'on' : ''}`} onClick={() => setGarment(g)}>
                  {garment === g && <Check size={14} />}{cap(g)}
                </button>
              ))}
            </div>
          </div>

          <div className="step">
            <div className="step-head"><h3>Lining</h3></div>
            <Segmented label="Lining" options={LININGS} value={lining} onChange={setLining} />
          </div>

          <div className="step">
            <div className="step-head"><h3>Designer notes</h3><span>{notes.length}/{MAX_NOTES}</span></div>
            <textarea className="notes" rows={4} maxLength={MAX_NOTES} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Construction details, fit notes, special panels" />
          </div>

          {error && <div className="error" role="alert">{error}</div>}

          <div className="composer-bar">
            <p>{ready ? `${cap(garment)}${lining !== 'none' ? `, ${lining} lining` : ''}` : 'Add a garment photo to begin'}</p>
            <button className={`btn btn-primary btn-lg ${ready ? 'glow' : ''}`} disabled={busy || !ready}>
              <Sparkles size={16} /> {busy ? 'Generating…' : 'Generate pattern'}
            </button>
          </div>
        </form>
      )}

      <aside className={`brief ${busy ? 'busy' : ''}`} aria-label="Pattern brief">
        <div className="brief-head">
          <span>Pattern brief</span>
          <span className={`ready ${ready ? 'on' : ''}`}>{result ? 'Submitted' : busy ? 'Working' : ready ? 'Ready' : 'Waiting for photo'}</span>
        </div>
        <div className="brief-photo">
          {photo ? <img src={photo} alt="Garment preview" /> : <img src="/logo-icon.svg" alt="" className="float" />}
          {busy && <span className="scan" />}
        </div>
        <dl className="brief-list">
          <div><dt>Garment</dt><dd>{cap(garment)}</dd></div>
          <div><dt>Lining</dt><dd>{cap(lining)}</dd></div>
          <div><dt>Fabric reference</dt><dd>{swatch ? 'Added' : 'None'}</dd></div>
          <div><dt>Notes</dt><dd>{notes.trim() ? `${notes.trim().length} characters` : 'None'}</dd></div>
        </dl>
        {busy ? (
          <div className="brief-foot"><div className="progress"><i /></div><span>Generating pattern · {secs}s</span></div>
        ) : (
          <p className="brief-foot-text">Pattern assets are generated by FabricNow’s protected pattern service and exported as a ZIP.</p>
        )}
      </aside>
    </div>
  );
}
