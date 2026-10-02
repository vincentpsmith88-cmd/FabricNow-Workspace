import React, { useEffect, useRef, useState } from 'react';
import { Download, Trash2, TriangleAlert, Ruler } from 'lucide-react';
import { api, downloadFile } from '../api.js';
import { useToast } from '../toast.jsx';
import { isDone, isFailed, jobTitle } from '../usage.js';
import { StatusPill } from './ui.jsx';
import AuthImage from './AuthImage.jsx';

const base = (id) => `/api/workspace/jobs/${id}`;
const file = (id, f) => `${base(id)}/files/${f.split('/').map(encodeURIComponent).join('/')}`;
const pretty = (f) => f.replace(/\.[a-z]+$/i, '').replace(/^[a-z]+_\d+_?/i, '').replace(/[-_]+/g, ' ').trim() || f;

/** Which images to show for a finished tool job, with captions. */
function galleryFor(job) {
  const names = (job.files || []).filter((f) => /\.(png|jpe?g)$/i.test(f) && f !== 'ORIGINAL PICTURE.png');
  const cap = {};
  (job.colorways || []).forEach((c) => { cap[c.file] = c.name; });
  (job.looks || []).forEach((l) => { cap[l.file] = l.label; });
  const order = (f) => (f === 'original.png' ? -1 : 0);
  return names.sort((a, b) => order(a) - order(b)).map((f) => ({ file: f, label: cap[f] || (f === 'original.png' ? 'Original' : pretty(f)) }));
}

export default function JobView({ jobId, initial, onJob, onDeleted }) {
  const toast = useToast();
  const [job, setJob] = useState(initial || null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const cb = useRef(onJob);
  cb.current = onJob;

  useEffect(() => { setJob(initial && initial.id === jobId ? initial : null); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll until the job finishes. Pieces and files only exist once it is done.
  useEffect(() => {
    let live = true; let timer;
    const tick = async () => {
      try {
        const j = await api(base(jobId));
        if (!live) return;
        setJob(j); cb.current?.(j);
        if (!isDone(j) && !isFailed(j)) timer = setTimeout(tick, 2500);
      } catch (e) {
        if (live) timer = setTimeout(tick, 6000);
      }
    };
    tick();
    return () => { live = false; clearTimeout(timer); };
  }, [jobId]);

  if (!job) return <div className="panel"><div className="img-skel" style={{ height: 80 }} /></div>;
  const done = isDone(job); const failed = isFailed(job);
  const kind = job.kind || 'pattern';
  const zipName = `fabric-now-${kind}-${job.id.slice(0, 6)}.zip`;

  const download = async () => {
    setBusy(true);
    try { await downloadFile(`${base(job.id)}/export.zip`, zipName); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this project and its files? This cannot be undone.')) return;
    try { await api(base(job.id), { method: 'DELETE' }); onDeleted?.(job.id); toast.success('Project deleted.'); } catch (e) { toast.error(e.message); }
  };

  return (
    <section className="panel jobview">
      <div className="jobview-head">
        <div>
          <h3>{jobTitle(job)}</h3>
          <p className="muted small-text">{job.plan?.garment || ''}{job.plan?.provider ? ` · planned by ${job.plan.provider === 'anthropic' ? 'Claude' : 'OpenAI'}` : ''}</p>
        </div>
        <div className="jobview-actions">
          <StatusPill status={job.status} />
          {done && <button className="btn btn-primary" onClick={download} disabled={busy}><Download size={16} /> {busy ? 'Preparing…' : 'Download ZIP'}</button>}
          <button className="icon-btn" aria-label="Delete project" onClick={remove}><Trash2 size={16} /></button>
        </div>
      </div>

      {!done && !failed && (
        <div className="jobview-wait">
          <div className="progress"><i /></div>
          <p className="muted small-text">{job.stage || 'Working'}… this usually takes one to three minutes. You can leave this page; the job keeps running.</p>
          {job.plan?.pieces?.length > 0 && (
            <p className="small-text">Planned {job.plan.pieces.length} pieces: {job.plan.pieces.map((p) => p.name).join(', ')}.</p>
          )}
        </div>
      )}
      {failed && <div className="error" role="alert">{job.error || 'This job failed.'}</div>}

      {done && job.warnings?.length > 0 && (
        <div className="warn-box" role="status">
          <TriangleAlert size={16} />
          <ul>{job.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {done && kind === 'pattern' && (
        <>
          <div className="sheet-wrap">
            <AuthImage path={file(job.id, 'Fabric Now 1.png')} alt="Full pattern sheet" className="sheet-img" onClick={() => setZoom(file(job.id, 'Fabric Now 1.png'))} />
          </div>
          <h4 className="sub">{job.pieces.length} pieces</h4>
          <div className="piece-grid">
            {job.pieces.map((p) => (
              <figure key={p.name} className="piece">
                <div className="piece-img"><AuthImage path={file(job.id, `${p.name}.png`)} alt={p.label} /></div>
                <figcaption><strong>{p.label}</strong><small>{p.cut || `${p.w} × ${p.h}px`}</small></figcaption>
              </figure>
            ))}
          </div>
          <Grading job={job} onJob={(j) => { setJob(j); cb.current?.(j); }} />
        </>
      )}

      {done && kind !== 'pattern' && (
        <>
          {kind === 'print' && <p className="muted small-text">{job.seamless ? 'The repeat edges match.' : 'The repeat edges may show a faint seam.'} Seam score {job.seam_score} (under 2 is seamless).</p>}
          <div className="gallery">
            {galleryFor(job).map((g) => (
              <figure key={g.file} className="shot">
                <AuthImage path={file(job.id, g.file)} alt={g.label} onClick={() => setZoom(file(job.id, g.file))} />
                <figcaption>{g.label}</figcaption>
              </figure>
            ))}
          </div>
          {kind === 'flats' && job.spec && <Spec spec={job.spec} />}
        </>
      )}

      {zoom && (
        <div className="lightbox" role="dialog" aria-label="Image preview" onClick={() => setZoom(null)}>
          <AuthImage path={zoom} alt="" />
          <button className="btn btn-ghost" onClick={() => setZoom(null)}>Close</button>
        </div>
      )}
    </section>
  );
}

function Spec({ spec }) {
  const list = (v) => (Array.isArray(v) ? v : []).filter(Boolean);
  return (
    <div className="spec">
      <h4 className="sub">{spec.name || 'Garment spec'}</h4>
      <p className="muted small-text">{[spec.garment_type, spec.silhouette].filter(Boolean).join(' · ')}</p>
      {list(spec.construction_notes).length > 0 && <><strong>Construction</strong><ul>{list(spec.construction_notes).map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      {list(spec.bom).length > 0 && (
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Note</th></tr></thead>
          <tbody>{list(spec.bom).map((b, i) => <tr key={i}><td>{b.item}</td><td>{b.qty}</td><td>{b.note}</td></tr>)}</tbody></table></div>
      )}
      {spec.yardage_estimate_m && <p className="small-text muted">Rough yardage (m, 150 cm fabric): {Object.entries(spec.yardage_estimate_m).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>}
    </div>
  );
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

function Grading({ job, onJob }) {
  const toast = useToast();
  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL']);
  const [width, setWidth] = useState('150');
  const [seam, setSeam] = useState('1');
  const [len, setLen] = useState('');
  const [busy, setBusy] = useState(false);
  const report = job.grading;

  const run = async (e) => {
    e.preventDefault();
    if (!sizes.length) return toast.error('Choose at least one size.');
    setBusy(true);
    try {
      const r = await api(`${base(job.id)}/grade`, { method: 'POST', body: JSON.stringify({
        sizes: sizes.join(','), fabric_width_cm: width, seam_cm: seam, base_length_cm: len }) });
      onJob({ ...job, grading: r }); toast.success('Grading, markers and DXF added to the ZIP.');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const toggle = (s) => setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : SIZES.filter((x) => cur.includes(x) || x === s)));

  return (
    <div className="grading">
      <h4 className="sub"><Ruler size={16} /> Sizes, marker and yardage</h4>
      <p className="muted small-text">Scales the drawn pieces by size, adds seam allowance, lays them out on your fabric width and writes SVG and DXF files for CLO3D or a cutter. It is an estimate: check the length below against your real garment and test with a toile.</p>
      <form onSubmit={run} className="grading-form">
        <div className="chips chips-sm" role="group" aria-label="Sizes">
          {SIZES.map((s) => <button type="button" key={s} aria-pressed={sizes.includes(s)} className={`chip ${sizes.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)}>{s}</button>)}
        </div>
        <div className="grading-fields">
          <label className="field">Fabric width (cm)<input type="number" min="60" max="400" value={width} onChange={(e) => setWidth(e.target.value)} /></label>
          <label className="field">Seam allowance (cm)<input type="number" min="0" max="5" step="0.1" value={seam} onChange={(e) => setSeam(e.target.value)} /></label>
          <label className="field">Longest piece, real length (cm)<input type="number" min="5" max="400" placeholder="Estimate" value={len} onChange={(e) => setLen(e.target.value)} /></label>
        </div>
        <button className="btn btn-ghost" disabled={busy}>{busy ? 'Calculating…' : report ? 'Recalculate' : 'Calculate sizes and marker'}</button>
      </form>
      {report && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Size</th><th>Marker length</th><th>Yardage (+5%)</th><th>Pieces cut</th></tr></thead>
            <tbody>{Object.entries(report.sizes).map(([s, v]) => (
              <tr key={s}><td><strong>{s}</strong></td><td>{v.marker_length_cm} cm</td><td>{v.yardage_m} m ({v.yardage_yd} yd)</td><td>{v.pieces_cut}</td></tr>
            ))}</tbody>
          </table>
          <p className="muted small-text">{report.scale.assumed_from_garment_type ? `Scale assumed: the longest piece (${report.scale.reference_piece}) is ${report.scale.reference_longest_side_cm} cm. Enter the real length above to correct it. ` : `Scale: ${report.scale.reference_piece} is ${report.scale.reference_longest_side_cm} cm long. `}Single-layer layout; nesting by hand usually saves 5 to 15 percent. Files are in the ZIP under <code>grading/</code>.</p>
        </div>
      )}
    </div>
  );
}
