import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  ImagePlus,
  RefreshCw,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { api, fetchBlob } from '../api.js';
import { useToast } from '../toast.jsx';
import BodyMeshViewer from './BodyMeshViewer.jsx';
import './body-measurements.css';

const VIEWS = [
  ['front', 'Front view', 'Face the camera'],
  ['side', 'Side view', 'Turn 90° to the side'],
  ['back', 'Back view', 'Face away from camera'],
  ['left', 'Left profile', 'Optional detail angle'],
  ['right', 'Right profile', 'Optional detail angle'],
];
const LABELS = {
  bust: 'Bust', underbust: 'Underbust', waist: 'Natural waist', highHip: 'High hip',
  hip: 'Full hip', shoulderWidth: 'Shoulder width', neck: 'Neck', armLength: 'Arm length',
  upperArm: 'Upper arm', wrist: 'Wrist', thigh: 'Thigh', knee: 'Knee',
  inseam: 'Inseam', outseam: 'Outseam', height: 'Height',
};

export default function BodyMeasurements() {
  const toast = useToast();
  const [files, setFiles] = useState({});
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState('cm');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [garment, setGarment] = useState('bodice');
  const [ease, setEase] = useState('4');
  const [seam, setSeam] = useState('1');
  const [patternBusy, setPatternBusy] = useState(false);
  const [patternId, setPatternId] = useState('');
  const [editing, setEditing] = useState(false);
  const [measurementDraft, setMeasurementDraft] = useState({});

  useEffect(() => {
    api('/api/body-measurements/scans').then((d) => setHistory(d.scans || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (scan?.measurements) {
      setMeasurementDraft(Object.fromEntries(
        Object.entries(scan.measurements).map(([key, value]) => [key, String(value.value ?? value)]),
      ));
    }
  }, [scan]);

  const ready = Boolean(files.front && files.side && height);
  const requiredCount = Number(Boolean(files.front)) + Number(Boolean(files.side));
  const add = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    if (file.size > 12 * 1024 * 1024) return setError('Each image must be 12 MB or smaller.');
    setFiles((current) => ({ ...current, [key]: file }));
    setError('');
  };
  const remove = (key) => setFiles((current) => {
    const next = { ...current };
    delete next[key];
    return next;
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) return setError('Add front and side photos and enter the person’s height.');
    setBusy(true);
    setError('');
    setScan(null);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([key, file]) => formData.append(key, file));
      formData.append('height', height);
      formData.append('unit', unit);
      formData.append('name', name);
      const data = await api('/api/body-measurements/scans', { method: 'POST', body: formData });
      setScan(data.scan || data);
      setHistory((current) => [data.scan || data, ...current]);
      toast.success('Measurement scan completed. Image usage has been recorded.');
    } catch (e) {
      setError(e.message || 'Could not complete the scan.');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!scan?.measurements) return;
    const rows = [
      ['Measurement', scan.unit || 'cm', 'Confidence'],
      ...Object.entries(scan.measurements).map(([key, value]) => [
        LABELS[key] || key, value.value ?? value, value.confidence ?? 'Not supplied',
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    anchor.download = 'fabricnow-measurements.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const saveMeasurements = async () => {
    try {
      const edits = Object.fromEntries(Object.entries(measurementDraft).map(([key, value]) => [key, Number(value)]));
      const data = await api(`/api/body-measurements/scans/${scan.id || scan._id}/measurements`, {
        method: 'PATCH',
        body: JSON.stringify({ measurements: edits }),
      });
      setScan(data.scan);
      setEditing(false);
      toast.success('Measurement corrections saved.');
    } catch (e) {
      setError(e.message || 'Could not save corrections.');
    }
  };

  const generatePattern = async () => {
    if (!scan?.id && !scan?._id) return;
    setPatternBusy(true);
    setError('');
    try {
      const data = await api(`/api/body-measurements/scans/${scan.id || scan._id}/patterns`, {
        method: 'POST',
        body: JSON.stringify({ garment, ease_cm: Number(ease), seam_allowance_cm: Number(seam) }),
      });
      setPatternId(data.patternId);
      toast.success(`Pattern generated. ${data.usage?.imagesDeducted || 1} image-equivalent usage unit deducted.`);
    } catch (e) {
      setError(e.message || 'Pattern generation failed.');
    } finally {
      setPatternBusy(false);
    }
  };

  const downloadPattern = async () => {
    if (!patternId || !scan) return;
    try {
      const blob = await fetchBlob(`/api/body-measurements/scans/${scan.id || scan._id}/pattern-files/${patternId}/pattern.svg`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fabricnow-pattern.svg';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main className="bm-page">
      <header className="bm-hero">
        <div className="bm-hero-copy">
          <span className="bm-eyebrow"><Sparkles size={14} /> FABRICNOW STUDIO <span>/</span> BODY SCAN</span>
          <h1>A precise fit starts here.</h1>
          <p>Transform guided photos into a body profile, ready for fitting and pattern drafting.</p>
          <div className="bm-hero-meta">
            <span><ShieldCheck size={14} /> Guided capture</span>
            <span><Activity size={14} /> Review every measurement</span>
          </div>
        </div>
        <div className="bm-hero-art" aria-hidden="true">
          <span className="bm-orbit bm-orbit-one" />
          <span className="bm-orbit bm-orbit-two" />
          <span className="bm-hero-scan"><ScanLine size={34} strokeWidth={1.5} /></span>
          <span className="bm-art-dot bm-art-dot-one" />
          <span className="bm-art-dot bm-art-dot-two" />
        </div>
        <div className="bm-hero-footer">
          <span className="bm-live-dot" /> AI MEASUREMENT STUDIO
          <span className="bm-hero-footer-divider" />
          <span>01 <i>/</i> 02</span>
        </div>
      </header>

      <div className="bm-workflow" aria-label="Measurement workflow">
        <div className="bm-workflow-step is-active">
          <span className="bm-workflow-number">01</span>
          <span><strong>Capture photos</strong><small>Front, side &amp; height</small></span>
        </div>
        <span className="bm-workflow-line" />
        <div className={`bm-workflow-step ${scan?.measurements ? 'is-complete' : ''}`}>
          <span className="bm-workflow-number">{scan?.measurements ? <CheckCircle2 size={16} /> : '02'}</span>
          <span><strong>Review profile</strong><small>Adjust and draft</small></span>
        </div>
      </div>

      <div className="bm-layout">
        <form className="bm-card bm-capture-card" onSubmit={submit}>
          <div className="bm-card-title">
            <div className="bm-title-group">
              <span className="bm-card-icon"><Camera size={17} /></span>
              <div>
                <span className="bm-section-kicker">CAPTURE STUDIO</span>
                <h2>New body scan</h2>
                <p>Wear fitted clothing and stand against a plain, well-lit background.</p>
              </div>
            </div>
            <span className="bm-required-tag"><span /> 2 REQUIRED</span>
          </div>

          <div className="bm-fields">
            <label>
              <span>Profile name <small>OPTIONAL</small></span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ama’s fitting" />
            </label>
            <label>
              <span>Person’s height <small>REQUIRED</small></span>
              <div className="bm-height">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  placeholder={unit === 'cm' ? 'e.g. 168' : 'e.g. 66'}
                  aria-label="Person’s height"
                />
                <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Height unit">
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </label>
          </div>

          <div className="bm-upload-heading">
            <div><strong>Photo angles</strong><span>At least two clear views to begin</span></div>
            <span className="bm-upload-count">{requiredCount}<i>/2</i> required</span>
          </div>
          <div className="bm-photo-grid">
            {VIEWS.map(([key, title, hint], index) => (
              <div key={key} className={`bm-upload-tile ${files[key] ? 'has-file' : ''}`}>
                <label className="bm-upload" htmlFor={`bm-upload-${key}`}>
                  <input
                    id={`bm-upload-${key}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => add(key, event.target.files?.[0])}
                  />
                  {files[key] ? (
                    <>
                      <img src={URL.createObjectURL(files[key])} alt={`${title} uploaded`} />
                      <span className="bm-preview-check"><CheckCircle2 size={15} /></span>
                      <span className="bm-file-ok">{files[key].name}</span>
                    </>
                  ) : (
                    <>
                      <span className="bm-upload-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="bm-camera"><ImagePlus size={20} /></span>
                      <strong>{title}</strong>
                      <small>{hint}</small>
                      <span className="bm-add"><Upload size={13} /> Choose photo</span>
                      <span className={`bm-angle-tag ${index < 2 ? 'is-required' : ''}`}>{index < 2 ? 'REQUIRED' : 'OPTIONAL'}</span>
                    </>
                  )}
                </label>
                {files[key] && (
                  <button type="button" className="bm-remove-photo" onClick={() => remove(key)}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bm-guidance">
            <span className="bm-guidance-icon"><AlertTriangle size={15} /></span>
            <p><strong>For best results</strong> Keep your full body in frame, stand naturally, and avoid loose clothing, shoes, or tilted cameras.</p>
          </div>
          {error && <div className="bm-error" role="alert">{error}</div>}
          <div className="bm-submit">
            <span><ShieldCheck size={14} /> Each successfully processed source image counts toward API Growth usage.</span>
            <button disabled={!ready || busy} className="btn btn-primary">
              {busy ? <><RefreshCw className="bm-spin" size={15} /> Processing scan…</> : <>Generate measurements <ArrowRight size={16} /></>}
            </button>
          </div>
        </form>

        <aside className="bm-side">
          <section className="bm-card bm-results-card">
            <div className="bm-card-title">
              <div className="bm-title-group">
                <span className="bm-card-icon bm-card-icon-result"><Ruler size={17} /></span>
                <div>
                  <span className="bm-section-kicker">YOUR PROFILE</span>
                  <h2>Measurements</h2>
                  <p>Estimated dimensions, ready for review.</p>
                </div>
              </div>
              {scan?.measurements && <span className="bm-result-status"><span /> READY</span>}
            </div>
            {scan?.measurements ? (
              <>
                <div className="bm-result-head"><CheckCircle2 size={16} /> Scan complete <small>{scan.status || 'Review required'}</small></div>
                <div className="bm-correction-head">
                  <span>Dimensions in centimetres</span>
                  <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel edit' : 'Edit values'}</button>
                </div>
                <div className="bm-measures">
                  {Object.entries(scan.measurements).map(([key, value]) => (
                    <div key={key}>
                      <span>{LABELS[key] || key}</span>
                      {editing ? (
                        <input
                          className="bm-edit-measure"
                          type="number"
                          min="0.1"
                          max="300"
                          step="0.1"
                          value={measurementDraft[key] ?? value.value ?? value}
                          onChange={(event) => setMeasurementDraft((draft) => ({ ...draft, [key]: event.target.value }))}
                        />
                      ) : <strong>{value.value ?? value} <small>{scan.unit || 'cm'}</small></strong>}
                      <em>{value.method?.startsWith('manual') ? 'Manually corrected' : value.confidence ? `${Math.round(value.confidence * 100)}% confidence` : 'Verify measurement'}</em>
                    </div>
                  ))}
                </div>
                {editing && <button type="button" className="btn btn-primary bm-save-button" onClick={saveMeasurements}>Save corrections <CheckCircle2 size={15} /></button>}
                {scan.outputs?.mesh_file && (
                  <div className="bm-mesh-panel">
                    <h3>3D body reconstruction</h3>
                    <BodyMeshViewer scanId={scan.id || scan._id} />
                    <small>Silhouette reconstruction calibrated to entered height. Validate dimensions with a tape.</small>
                  </div>
                )}
                <div className="bm-pattern-panel">
                  <div className="bm-pattern-heading"><span className="bm-pattern-icon"><Sparkles size={15} /></span><div><h3>Pattern studio</h3><p>Draft a starting block from this profile.</p></div></div>
                  <div className="bm-pattern-controls">
                    <label>Garment<select value={garment} onChange={(event) => setGarment(event.target.value)}><option value="bodice">Bodice / top</option><option value="skirt">Skirt</option><option value="trousers">Trousers</option><option value="dress">Dress (bodice + skirt)</option></select></label>
                    <label>Ease (cm)<input type="number" min="0" max="20" step="0.5" value={ease} onChange={(event) => setEase(event.target.value)} /></label>
                    <label>Seam allowance<input type="number" min="0" max="3" step="0.25" value={seam} onChange={(event) => setSeam(event.target.value)} /></label>
                  </div>
                  <div className="bm-pattern-actions">
                    <button type="button" className="btn btn-primary" disabled={patternBusy} onClick={generatePattern}>
                      {patternBusy ? <><RefreshCw className="bm-spin" size={14} /> Drafting…</> : <>Generate pattern <ArrowRight size={14} /></>}
                    </button>
                    {patternId && <button type="button" className="btn btn-ghost" onClick={downloadPattern}><Download size={14} /> Download SVG</button>}
                  </div>
                  <small>Review and fit a toile before production.</small>
                </div>
                <button type="button" className="btn btn-ghost bm-export-button" onClick={download}><Download size={15} /> Export measurements CSV</button>
              </>
            ) : (
              <div className="bm-empty">
                <span className="bm-empty-illustration"><UserRound size={27} /></span>
                <strong>Your profile is taking shape</strong>
                <p>Upload front and side photos, add a height reference, and your measurement profile will appear here.</p>
                <span className="bm-empty-note"><ScanLine size={13} /> ESTIMATES ALWAYS REQUIRE REVIEW</span>
              </div>
            )}
          </section>

          <section className="bm-card bm-history">
            <div className="bm-card-title">
              <div className="bm-title-group">
                <span className="bm-card-icon bm-card-icon-history"><Clock3 size={16} /></span>
                <div><span className="bm-section-kicker">SAVED PROFILES</span><h2>Recent scans</h2></div>
              </div>
              {history.length > 0 && <span className="bm-history-count">{history.length}</span>}
            </div>
            {history.length ? history.slice(0, 6).map((item, index) => (
              <button type="button" className="bm-history-row" key={item.id || item._id || index} onClick={() => setScan(item)}>
                <span className="bm-history-avatar"><UserRound size={15} /></span>
                <span className="bm-history-info">
                  <strong>{item.name || 'Body scan'}</strong>
                  <small>{new Date(item.createdAt || Date.now()).toLocaleDateString()} · {item.status || 'Completed'}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            )) : <p className="bm-muted">Your saved profiles will appear here.</p>}
          </section>
        </aside>
      </div>

      <p className="bm-disclaimer"><ShieldCheck size={14} /> Measurement estimates are not a substitute for tape-measure validation. Verify critical dimensions and fit a toile before production.</p>
    </main>
  );
}
