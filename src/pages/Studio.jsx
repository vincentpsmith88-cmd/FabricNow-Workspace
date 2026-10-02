import React, { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented } from '../components/ui.jsx';
import { Dropzone, usePreview } from '../components/Dropzone.jsx';
import GarmentSelect, { garmentLabel, useCatalog } from '../components/GarmentSelect.jsx';
import JobView from '../components/JobView.jsx';

const LININGS = [{ value: 'none', label: 'None' }, { value: 'partial', label: 'Partial' }, { value: 'full', label: 'Full' }];
const MAX_NOTES = 500;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function Studio({ onDone, onJob, onDeleted, setPage }) {
  const toast = useToast();
  const catalog = useCatalog();
  const [file, setFile] = useState(null);
  const [swatch, setSwatch] = useState(null);
  const [garment, setGarment] = useState('Auto-detect');
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

  const reset = () => { setFile(null); setSwatch(null); setNotes(''); setGarment('Auto-detect'); setLining('none'); setResult(null); setError(''); };

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
  const gLabel = garmentLabel(catalog, garment);

  return (
    <div className="cols studio">
      {result ? (
        <div className="stack">
          <JobView jobId={result.id} initial={result} onJob={onJob} onDeleted={(id) => { onDeleted(id); reset(); }} />
          <div className="done-actions">
            <button className="btn btn-ghost" onClick={() => setPage('projects')}>All projects <ArrowRight size={16} /></button>
            <button className="btn btn-ghost" onClick={reset}><RotateCcw size={16} /> Start another</button>
          </div>
        </div>
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
            <div className="step-head"><h3>Garment type</h3><span>Picking the exact style helps the AI plan the right pieces</span></div>
            <GarmentSelect value={garment} onChange={setGarment} />
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
            <p>{ready ? `${gLabel}${lining !== 'none' ? `, ${lining} lining` : ''}` : 'Add a garment photo to begin'}</p>
            <button className={`btn btn-primary btn-lg ${ready ? 'glow' : ''}`} disabled={busy || !ready}>
              <Sparkles size={16} /> {busy ? 'Submitting…' : 'Generate pattern'}
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
          <div><dt>Garment</dt><dd>{gLabel}</dd></div>
          <div><dt>Lining</dt><dd>{cap(lining)}</dd></div>
          <div><dt>Fabric reference</dt><dd>{swatch ? 'Added' : 'None'}</dd></div>
          <div><dt>Notes</dt><dd>{notes.trim() ? `${notes.trim().length} characters` : 'None'}</dd></div>
        </dl>
        {busy ? (
          <div className="brief-foot"><div className="progress"><i /></div><span>Submitting · {secs}s</span></div>
        ) : (
          <p className="brief-foot-text">The AI reads your photo, plans every piece, draws the sheet, checks it, then exports pieces, SVGs and a manifest as a ZIP.</p>
        )}
      </aside>
    </div>
  );
}
