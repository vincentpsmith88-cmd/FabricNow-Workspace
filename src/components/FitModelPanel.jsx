import React, { useMemo, useState } from 'react';
import { Rotate3D, Ruler, Maximize2, Check, Search } from 'lucide-react';
import FitModelViewer from './FitModelViewer.jsx';

export const FIT_MODELS = [
  { id:'african-female-fat-short', label:'African Female · Fat Short', category:'Female · short / fuller', file:'african female fat short.fbx', gender:'female', measurements:{chest:108,waist:98,hip:116,height:158} },
  { id:'african-female-fat-tall', label:'African Female · Fat Tall', category:'Female · tall / fuller', file:'african female fat tall.fbx', gender:'female', measurements:{chest:112,waist:102,hip:120,height:178} },
  { id:'african-male-fat-tall', label:'African Male · Fat Tall', category:'Male · tall / fuller', file:'african male fat tall.fbx', gender:'male', measurements:{chest:116,waist:108,hip:116,height:188} },
  { id:'african-male-tall', label:'African Male · Tall', category:'Male · tall', file:'african male tall.fbx', gender:'male', measurements:{chest:104,waist:88,hip:106,height:188} },
  { id:'baby', label:'Baby', category:'Child · neutral', file:'baby.fbx', gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'baby-female', label:'Baby Female', category:'Child · female', file:'babyfemale.fbx', gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'male', label:'Male', category:'Adult · standard', file:'male.fbx', gender:'male', measurements:{chest:98,waist:82,hip:100,height:176} },
  { id:'custom', label:'Custom Model', category:'Supplied FBX · Untitled', file:'Untitled.fbx', gender:'female', measurements:{chest:92,waist:74,hip:100,height:172} },
];

const SIZE_SCALE = { XS:.93, S:.97, M:1, L:1.04, XL:1.08, '2XL':1.13 };
const FIT_SYSTEMS = ['Standard','Women\'s Relaxed','Women\'s Fitted','Men\'s Regular','Men\'s Relaxed','Custom company fit'];

export default function FitModelPanel({ gender, setGender, size, setSize, fitSystem = 'Standard', setFitSystem, modelId: externalModelId, setModelId: externalSetModelId, onOpenLibrary }) {
  const initial = FIT_MODELS.find((m) => m.gender === gender) || FIT_MODELS[0];
  const [localModelId, setLocalModelId] = useState(externalModelId || initial.id);
  const modelId = externalModelId || localModelId;
  const setModelId = externalSetModelId || setLocalModelId;
  const [angle, setAngle] = useState(0);
  const [query, setQuery] = useState('');
  const model = FIT_MODELS.find((m) => m.id === modelId) || FIT_MODELS[0];
  const data = model.measurements;
  const scale = model.child ? 1 : (SIZE_SCALE[size] || 1);
  const filtered = useMemo(() => FIT_MODELS.filter((m) => `${m.label} ${m.category}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const chooseModel = (m) => { setModelId(m.id); setGender(m.gender); setAngle(0); };

  return (
    <section className="fit-model-panel" aria-label="3D fitting model library">
      <div className="fit-model-head">
        <div>
          <span className="studio-section-kicker">03 · 3D FIT</span>
          <h3>Choose a fitting model and inspect it at full size</h3>
          <p>All supplied FBX bodies are available here. The viewer uses a dedicated studio scene with stronger key, fill and rim lighting so the body is clearly visible.</p>
        </div>
        <div className="fit-model-head-actions"><span className="fit-model-badge"><Rotate3D size={14}/> 360° interactive</span>{onOpenLibrary && <button type="button" className="btn btn-ghost" onClick={onOpenLibrary}>Open 3D model page</button>}</div>
      </div>

      <div className="fit-model-controls fit-model-controls-expanded">
        <div className="fit-control-group fit-model-picker-group">
          <div className="fit-picker-top"><span className="fit-control-label">All fitting models · {FIT_MODELS.length}</span><label className="fit-model-search"><Search size={13}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search models" /></label></div>
          <div className="fit-model-picker-grid">
            {filtered.map((m) => <button type="button" key={m.id} className={modelId === m.id ? 'on' : ''} onClick={() => chooseModel(m)}><span className="fit-model-number">{FIT_MODELS.indexOf(m)+1}</span><span><strong>{m.label}</strong><small>{m.category}</small></span>{modelId === m.id && <Check size={14}/>}</button>)}
          </div>
        </div>
        <div className="fit-control-group">
          <span className="fit-control-label">Target size</span>
          <div className="fit-size-row" role="group" aria-label="Model size">{Object.keys(SIZE_SCALE).map((s) => <button type="button" key={s} className={size === s ? 'on' : ''} onClick={() => setSize(s)} disabled={model.child}>{s}</button>)}</div>
          {model.child && <small className="fit-disabled-note">Child models use their supplied proportions; adult size grading is disabled.</small>}
        </div>
        <label className="fit-control-group fit-select-wrap"><span className="fit-control-label">Company fit system</span><select value={fitSystem} onChange={(e) => setFitSystem?.(e.target.value)}>{FIT_SYSTEMS.map((v)=><option key={v}>{v}</option>)}</select></label>
      </div>

      <FitModelViewer model={model} angle={angle} scale={scale} onAngleChange={setAngle} />

      <div className="fit-model-data">
        <div><Ruler size={15}/><span><strong>Body measurements</strong><small>Chest {data.chest} · Waist {data.waist} · Hip {data.hip} cm</small></span></div>
        <div><Maximize2 size={15}/><span><strong>Avatar height</strong><small>{data.height} cm · {model.category}</small></span></div>
        <div><Check size={15}/><span><strong>Fit profile</strong><small>{fitSystem} · carried into pattern generation</small></span></div>
      </div>
    </section>
  );
}
