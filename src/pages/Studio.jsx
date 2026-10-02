import React, { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles, ImagePlus, Ruler, Layers3, ShieldCheck, Box, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented } from '../components/ui.jsx';
import { Dropzone, usePreview } from '../components/Dropzone.jsx';
import GarmentSelect, { garmentLabel, useCatalog } from '../components/GarmentSelect.jsx';
import JobView from '../components/JobView.jsx';
import FitModelPanel from '../components/FitModelPanel.jsx';

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
  const [gender, setGender] = useState('female');
  const [size, setSize] = useState('M');
  const [fitSystem, setFitSystem] = useState('Standard');
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

  const reset = () => {
    setFile(null); setSwatch(null); setNotes(''); setGarment('Auto-detect'); setLining('none');
    setGender('female'); setSize('M'); setFitSystem('Standard'); setResult(null); setError('');
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
      fd.append('garment', garment); fd.append('notes', notes); fd.append('lining', lining);
      fd.append('model_gender', gender); fd.append('model_size', size); fd.append('fit_system', fitSystem);
      const d = await api('/api/workspace/patterns', { method: 'POST', body: fd });
      setResult(d); onDone(d); toast.success('Pattern job started with your fit model.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const ready = Boolean(file);
  const gLabel = garmentLabel(catalog, garment);

  if (result) {
    return <div className="pattern-studio-page">
      <header className="studio-head">
        <div><div className="studio-eyebrow">PATTERN STUDIO · PRODUCTION WORKSPACE</div><h2>Review the generated pattern, then grade and prepare production files.</h2><p>Your selected {gender} {size} fit model and fit system were included with the generation request.</p></div>
        <button className="btn btn-ghost" type="button" onClick={reset}><RotateCcw size={15}/> Start another</button>
      </header>
      <div className="studio-result-strip"><span><CheckCircle2 size={15}/> Pattern generated</span><b>{gLabel}</b><span>{gender === 'female' ? 'Female' : 'Male'} · {size}</span><span>{fitSystem}</span><button className="btn btn-ghost" onClick={() => setPage('projects')}>All projects <ArrowRight size={15}/></button></div>
      <JobView jobId={result.id} initial={result} onJob={onJob} onDeleted={(id) => { onDeleted(id); reset(); }} />
    </div>;
  }

  return (
    <div className="pattern-studio-page">
      <header className="studio-head">
        <div>
          <div className="studio-eyebrow">PATTERN STUDIO · 2D → 3D → PRODUCTION</div>
          <h2>Build, fit and prepare a garment from one working flow.</h2>
          <p>Bring in the garment reference, define construction, fit it on a selectable 3D body, then generate the pattern and production package.</p>
        </div>
        <div className="studio-head-actions"><span className="studio-status"><i/> Pattern engine connected</span><button className="btn btn-ghost" type="button" onClick={reset}><RotateCcw size={15}/> Reset</button></div>
      </header>

      <div className="studio-steps">
        {[['01','Reference','Garment imagery',ImagePlus],['02','Configure','Construction intent',Ruler],['03','3D Fit','Model + size',Box],['04','Generate','Pattern + grading',Layers3],['05','Review','Production output',ShieldCheck]].map(([n,t,d,I],i)=><div className={ready && i < 3 ? 'active' : ''} key={n}><b>{n}</b><span><strong>{t}</strong><small>{d}</small></span>{i<4&&<ArrowRight size={14}/>}</div>)}
      </div>

      <form className="studio-workspace" onSubmit={submit}>
        <div className="studio-form-column">
          <section className="studio-card">
            <div className="studio-card-head"><div><span className="studio-section-kicker">01 · REFERENCE</span><h3>Garment and fabric</h3></div><span>Clear front or 3/4 garment photo · max 10 MB</span></div>
            <div className="studio-upload-grid">
              <Dropzone big file={file} preview={photo} onFile={(f) => { setFile(f); setError(''); }} title="Drop a garment photo here" hint="or click to browse" scanning={busy} />
              <Dropzone file={swatch} preview={fabric} onFile={setSwatch} title="Add fabric reference" hint="Optional · close-up of weave or print" />
            </div>
          </section>

          <section className="studio-card">
            <div className="studio-card-head"><div><span className="studio-section-kicker">02 · CONSTRUCTION</span><h3>Garment intent</h3></div><span>Give the engine enough context to plan the pieces correctly</span></div>
            <div className="studio-config-grid">
              <div><label className="fit-control-label">Garment type</label><GarmentSelect value={garment} onChange={setGarment} /></div>
              <div><label className="fit-control-label">Lining</label><Segmented label="Lining" options={LININGS} value={lining} onChange={setLining} /></div>
            </div>
            <label className="field studio-notes-field"><span>Designer notes <em>{notes.length}/{MAX_NOTES}</em></span><textarea rows={3} maxLength={MAX_NOTES} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Construction details, fit notes, special panels, closures, neckline or sleeve changes" /></label>
          </section>

          <FitModelPanel gender={gender} setGender={setGender} size={size} setSize={setSize} fitSystem={fitSystem} setFitSystem={setFitSystem} />

          {error && <div className="error" role="alert">{error}</div>}
          <div className="studio-submit-bar">
            <div><span className="studio-submit-label">READY TO GENERATE</span><strong>{ready ? `${gLabel} · ${gender === 'female' ? 'Female' : 'Male'} ${size}` : 'Add a garment reference first'}</strong><small>{ready ? `${cap(lining)} lining · ${fitSystem} fit system` : 'The 3D model will be included in the pattern request.'}</small></div>
            <button className="btn btn-primary btn-lg" disabled={busy || !ready}><Sparkles size={16}/> {busy ? `Generating · ${secs}s` : 'Generate pattern + fit package'}</button>
          </div>
        </div>

        <aside className={`brief ${busy ? 'busy' : ''}`} aria-label="Pattern production brief">
          <div className="brief-head"><span>Production brief</span><span className={`ready ${ready ? 'on' : ''}`}>{busy ? 'Generating' : ready ? 'Ready' : 'Waiting'}</span></div>
          <div className="brief-photo">{photo ? <img src={photo} alt="Garment preview" /> : <img src="/logo-icon.svg" alt="" className="float" />}{busy && <span className="scan" />}</div>
          <div className="brief-model-summary"><div><Box size={15}/><span><strong>3D fit model</strong><small>{gender === 'female' ? 'Female' : 'Male'} · {size} · {fitSystem}</small></span></div><div><Ruler size={15}/><span><strong>Production route</strong><small>2D pattern → grading → DXF / SVG</small></span></div></div>
          <dl className="brief-list"><div><dt>Garment</dt><dd>{gLabel}</dd></div><div><dt>Lining</dt><dd>{cap(lining)}</dd></div><div><dt>Fabric</dt><dd>{swatch ? 'Added' : 'None'}</dd></div><div><dt>Designer notes</dt><dd>{notes.trim() ? `${notes.trim().length} chars` : 'None'}</dd></div></dl>
          {busy ? <div className="brief-foot"><div className="progress"><i /></div><span>Generating · {secs}s</span></div> : <p className="brief-foot-text">The generation request carries your reference, construction intent, fit model, size and fit system. Finished pattern jobs can then be graded and exported from the result view.</p>}
        </aside>
      </form>
    </div>
  );
}
