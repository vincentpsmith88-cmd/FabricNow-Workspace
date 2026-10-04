import React, { useMemo, useRef, useState } from 'react';
import { Box, Camera, Check, FileBox, Lightbulb, Maximize2, Minimize2, Moon, Rotate3D, Ruler, Scissors, Search, Shirt, Sun } from 'lucide-react';
import { api } from '../api.js';
import { buildProfile } from './tailor/garment3d.js';
import { withPath } from './tailor/geometry.js';
import { PRINTS, printById, tileOf, tileSvg } from './tailor/fabrics.js';
import './fit-garment.css';
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

export default function FitModels({ setPage }) {
  const [modelId, setModelId] = useState(FIT_MODELS[0].id);
  const [size, setSize] = useState('M');
  const [light, setLight] = useState('studio');
  const [auto, setAuto] = useState(false);
  const [view, setView] = useState({ deg: 0, n: 0 });
  const [activeView, setActiveView] = useState(0);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [full, setFull] = useState(false);
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState('');
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [wear, setWear] = useState(true);
  const [print, setPrint] = useState(null);
  const [info, setInfo] = useState({ status: 'none' });
  const viewer = useRef(null);
  const stage = useRef(null);

  const model = FIT_MODELS.find((m) => m.id === modelId) || FIT_MODELS[0];
  const scale = model.child ? 1 : (SIZE_SCALE[size] || 1);
  const list = useMemo(() => FIT_MODELS.filter((m) => (filter === 'all' || kindOf(m) === filter) && `${m.label} ${m.category}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? FIT_MODELS.length : FIT_MODELS.filter((m) => kindOf(m) === k).length])), []);
  const stats = [['Height', model.measurements.height, 190], ['Chest', model.measurements.chest, 125], ['Waist', model.measurements.waist, 125], ['Hip', model.measurements.hip, 125]];

  /* Boards saved in Tailor Tools. "Try on a fit model" over there leaves the board id in sessionStorage. */
  React.useEffect(() => {
    let dead = false;
    api('/api/tailor-tools/boards').then((d) => {
      if (dead) return;
      const list = d.boards || []; setBoards(list);
      const want = sessionStorage.getItem('fabricnow.tryOnBoard'); sessionStorage.removeItem('fabricnow.tryOnBoard');
      if (want && list.some((b) => b.id === want)) setBoardId(want);
    }).catch(() => {}).finally(() => { if (!dead) setBoardsLoading(false); });
    return () => { dead = true; };
  }, []);
  const board = boards.find((b) => b.id === boardId);
  const garment = useMemo(() => {
    if (!board) return null;
    const ops = (board.operations || []).map(withPath), profile = buildProfile(ops);
    if (!profile.tubes.length) return { unsupported: true };
    const layers = board.layers || [], meas = layers.find((l) => l.type === 'measurements')?.values || {};
    const boardFabric = layers.find((l) => l.type === 'fabric')?.value || { id: 'ankara' }, fabrics = {};
    for (const t of profile.tubes) {
      const piece = ops.find((o) => o.id === t.pieceId), f = print || piece?.fabric || boardFabric, tile = tileOf(f);
      fabrics[t.kind] = { svg: tileSvg(f, 24), tile: [tile.w, tile.h], scale: f.scale || 100, rot: f.rot || 0 };
    }
    return { profile, fabrics, meas: { bust: meas.bust || 92, waist: meas.waist || 74, hip: meas.hip || 98 }, patternHeightCm: 172 };
  }, [board, print]);
  const wearable = wear && garment && !garment.unsupported ? garment : null;
  React.useEffect(() => { if (!wearable) setInfo({ status: 'none' }); }, [wearable]);
  const pickPrint = (id) => setPrint({ id, colors: printById(id).colors.slice(), scale: print?.scale || 100, rot: print?.rot || 0 });

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
          <FitModelViewer ref={viewer} model={model} scale={scale} view={view} lighting={light} autoRotate={auto} garment={wearable} onGarmentInfo={setInfo} onInteract={() => setActiveView(null)} />

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
          <section className="fm-panel fm-garment">
            <div className="fm-panel-head"><span>Garment</span><small>From Tailor Tools</small></div>
            {boardsLoading && <p className="fm-note">Loading your boards…</p>}
            {!boardsLoading && !boards.length && <p className="fm-note">No saved boards yet. Draft a dress in Tailor Tools, save it, then try it on here.</p>}
            {boards.length > 0 && (
              <select className="fm-select" value={boardId} onChange={(e) => { setBoardId(e.target.value); setPrint(null); setWear(true); }} aria-label="Board to try on">
                <option value="">No garment</option>
                {boards.map((b, i) => <option key={b.id} value={b.id}>{b.name || 'Tailor board'} · #{boards.length - i}</option>)}
              </select>
            )}
            {board && garment?.unsupported && <p className="fm-note fm-warn">This board has no bodice or skirt pieces. Add a dress, blouse or skirt from the Design tab in Tailor Tools. Trousers and hand-drawn pieces can't be shown on the model yet.</p>}
            {garment && !garment.unsupported && (
              <>
                <div className="fm-garment-row">
                  <label className="fm-switch"><input type="checkbox" checked={wear} onChange={(e) => setWear(e.target.checked)} /><i /> <span>Show on model</span></label>
                  {print && <button type="button" className="fm-link" onClick={() => setPrint(null)}>Use board fabric</button>}
                </div>
                <div className="fm-sub">Try another fabric</div>
                <div className="fm-prints">
                  {PRINTS.map((p) => { const t = tileOf({ id: p.id }); return (
                    <button type="button" key={p.id} className={print?.id === p.id ? 'on' : ''} onClick={() => pickPrint(p.id)} title={p.name} aria-label={p.name}>
                      <svg viewBox={`0 0 ${t.w * 2} ${t.h * 2}`} preserveAspectRatio="xMidYMid slice"><g dangerouslySetInnerHTML={{ __html: t.markup + `<g transform="translate(${t.w} 0)">${t.markup}</g><g transform="translate(0 ${t.h})">${t.markup}</g><g transform="translate(${t.w} ${t.h})">${t.markup}</g>` }} /></svg>
                    </button>); })}
                </div>
                {print && <label className="fm-range"><span>Print size</span><input type="range" min="40" max="300" value={print.scale || 100} onChange={(e) => setPrint({ ...print, scale: +e.target.value })} /></label>}
                {info.status === 'error' && <p className="fm-note fm-warn">{info.message}</p>}
                {info.status === 'ok' && info.notes?.map((n, i) => <p className="fm-note" key={i}>{n}</p>)}
                <p className="fm-note">The garment is fitted to this model's real body shape. It covers the torso and hips down to the hem. Sleeves are not shown yet.</p>
              </>
            )}
            {setPage && <button type="button" className="fm-open" onClick={() => setPage('tailor-tools')}><Scissors size={14} /> Open Tailor Tools</button>}
          </section>

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
