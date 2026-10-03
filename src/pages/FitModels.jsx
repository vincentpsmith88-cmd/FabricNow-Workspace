import React, { useMemo, useRef, useState } from 'react';
import { Box, Camera, Check, FileBox, Lightbulb, Maximize2, Minimize2, Moon, Rotate3D, Ruler, Search, Sun } from 'lucide-react';
import FitModelViewer from '../components/FitModelViewer.jsx';
import { FIT_MODELS, SIZE_SCALE } from '../components/fitModels.js';

const FILTERS = [['all', 'All'], ['female', 'Female'], ['male', 'Male'], ['child', 'Child']];
const VIEWS = [[0, 'Front'], [45, '¾'], [90, 'Side'], [180, 'Back']];
const LIGHTS = [['studio', 'Studio', Lightbulb], ['daylight', 'Daylight', Sun], ['noir', 'Spotlight', Moon]];
const kindOf = (m) => (m.child ? 'child' : m.gender);

/** Pictogram drawn from the model's own measurements so every body is recognisable in the list. */
function Silhouette({ m, child }) {
  const h = m.height, top = 197 - h, cx = 50;
  const y = (f) => top + h * f;
  const sh = Math.max(m.chest * 0.17, h * 0.1);
  const pts = [[sh, .2], [m.chest * 0.155, .29], [m.waist * 0.14, .4], [m.hip * 0.16, .52], [m.hip * 0.13, .66], [m.hip * 0.085, .82], [m.hip * 0.06, .985]];
  const right = pts.map(([w, f]) => `${cx + w} ${y(f)}`);
  const left = [...pts].reverse().map(([w, f]) => `${cx - w} ${y(f)}`);
  const d = `M${cx - sh * 0.45} ${y(.16)} L${cx + sh * 0.45} ${y(.16)} L${right.join(' L')} L${left.join(' L')} Z`;
  return (
    <svg viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx={cx} cy={y(.075)} r={h * (child ? .1 : .055)} />
      <path d={d} strokeLinejoin="round" strokeWidth="5" />
    </svg>
  );
}

export default function FitModels() {
  const [modelId, setModelId] = useState(FIT_MODELS[0].id);
  const [size, setSize] = useState('M');
  const [light, setLight] = useState('studio');
  const [auto, setAuto] = useState(false);
  const [view, setView] = useState({ deg: 0, n: 0 });
  const [activeView, setActiveView] = useState(0);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [full, setFull] = useState(false);
  const viewer = useRef(null);
  const stage = useRef(null);

  const model = FIT_MODELS.find((m) => m.id === modelId) || FIT_MODELS[0];
  const scale = model.child ? 1 : (SIZE_SCALE[size] || 1);
  const list = useMemo(() => FIT_MODELS.filter((m) => (filter === 'all' || kindOf(m) === filter) && `${m.label} ${m.category}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? FIT_MODELS.length : FIT_MODELS.filter((m) => kindOf(m) === k).length])), []);
  const stats = [['Height', model.measurements.height, 190], ['Chest', model.measurements.chest, 125], ['Waist', model.measurements.waist, 125], ['Hip', model.measurements.hip, 125]];

  const go = (deg) => { setActiveView(deg); setView((v) => ({ deg, n: v.n + 1 })); };
  const pick = (m) => { setModelId(m.id); go(0); };
  const snap = () => {
    const url = viewer.current?.snapshot(); if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `fabricnow-${model.id}-${model.child ? 'child' : size}.png`; a.click();
  };
  const toggleFull = () => {
    const el = stage.current; if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen(); setFull(false); }
    else if (el.requestFullscreen) { el.requestFullscreen().then(() => setFull(true)).catch(() => {}); }
  };
  React.useEffect(() => { const h = () => setFull(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);

  return (
    <div className="fm-page">
      <header className="fm-head">
        <div>
          <div className="fm-eyebrow">FASHION OS · 3D FIT MODELS</div>
          <h2>Fit model library</h2>
          <p>Inspect every fitting body under proper studio lighting — rotate, zoom, change size and capture a still.</p>
        </div>
        <span className="fm-count"><i /> {FIT_MODELS.length} fitting models</span>
      </header>

      <div className="fm-shell">
        {/* ---------- library ---------- */}
        <aside className="fm-rail" aria-label="Model library">
          <label className="fm-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models" aria-label="Search models" /></label>
          <div className="fm-filters" role="group" aria-label="Filter models">
            {FILTERS.map(([k, l]) => <button type="button" key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}<b>{counts[k]}</b></button>)}
          </div>
          <div className="fm-list">
            {list.map((m) => (
              <button type="button" key={m.id} className={m.id === modelId ? 'on' : ''} onClick={() => pick(m)} aria-pressed={m.id === modelId}>
                <span className="fm-thumb"><Silhouette m={m.measurements} child={m.child} /></span>
                <span className="fm-list-text"><strong>{m.label}</strong><small>{m.category}</small></span>
                {m.id === modelId && <Check size={16} className="fm-list-check" />}
              </button>
            ))}
            {!list.length && <div className="fm-list-empty">No models match “{query}”.</div>}
          </div>
        </aside>

        {/* ---------- stage ---------- */}
        <section className="fm-stage" ref={stage} aria-label="3D viewer">
          <FitModelViewer ref={viewer} model={model} scale={scale} view={view} lighting={light} autoRotate={auto} onInteract={() => setActiveView(null)} />

          <div className="fm-float fm-title">
            <span className="fm-live"><i /> Live</span>
            <div><strong>{model.label}</strong><small>{model.category}{model.child ? '' : ` · size ${size}`}</small></div>
          </div>

          <div className="fm-float fm-tools">
            <div className="fm-lights" role="radiogroup" aria-label="Lighting">
              {LIGHTS.map(([k, l, I]) => <button type="button" key={k} role="radio" aria-checked={light === k} className={light === k ? 'on' : ''} onClick={() => setLight(k)} title={`${l} lighting`}><I size={14} /><span>{l}</span></button>)}
            </div>
            <button type="button" className={`fm-icon ${auto ? 'on' : ''}`} onClick={() => setAuto((v) => !v)} aria-pressed={auto} title="Auto-rotate"><Rotate3D size={16} /></button>
            <button type="button" className="fm-icon" onClick={snap} title="Save a PNG still"><Camera size={16} /></button>
            <button type="button" className="fm-icon" onClick={toggleFull} title={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          </div>

          <div className="fm-float fm-views" role="group" aria-label="Camera angle">
            {VIEWS.map(([deg, l]) => <button type="button" key={l} className={activeView === deg ? 'on' : ''} onClick={() => go(deg)}>{l}</button>)}
            <span className="fm-views-sep" />
            <button type="button" onClick={() => { viewer.current?.reset(); setActiveView(0); }}>Reset</button>
          </div>
          <div className="fm-hint">Drag to rotate · Scroll to zoom</div>
        </section>

        {/* ---------- details ---------- */}
        <aside className="fm-info" aria-label="Model details">
          <section className="fm-panel">
            <div className="fm-panel-head"><span>Body measurements</span><small>{model.child ? 'As supplied' : `Estimated · size ${size}`}</small></div>
            <div className="fm-stats">
              {stats.map(([l, v, max]) => {
                const val = Math.round(v * scale);
                return <div key={l}><small>{l}</small><strong>{val}<em> cm</em></strong><i><b style={{ width: `${Math.min(100, (val / (max * (model.child ? 1 : 1.13))) * 100)}%` }} /></i></div>;
              })}
            </div>
          </section>

          <section className="fm-panel">
            <div className="fm-panel-head"><span>Target size</span><small>{model.child ? 'Fixed' : 'Scales the avatar'}</small></div>
            <div className="fm-sizes" role="group" aria-label="Model size">
              {Object.keys(SIZE_SCALE).map((s) => <button type="button" key={s} className={size === s && !model.child ? 'on' : ''} disabled={model.child} onClick={() => setSize(s)}>{s}</button>)}
            </div>
            {model.child && <p className="fm-note">Child models use their supplied proportions, so adult size scaling is turned off.</p>}
          </section>

          <section className="fm-panel fm-source">
            <div className="fm-source-row"><FileBox size={16} /><span><small>Source file</small><strong>{model.file}</strong></span></div>
            <div className="fm-source-row"><Box size={16} /><span><small>Format</small><strong>FBX · rendered with three.js</strong></span></div>
            <div className="fm-source-row"><Ruler size={16} /><span><small>Reference height</small><strong>{Math.round(model.measurements.height * scale)} cm</strong></span></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
