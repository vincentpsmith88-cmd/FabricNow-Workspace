import React, { useMemo, useState } from 'react';
import { Rotate3D, Ruler, UserRound, Maximize2, Check, ChevronDown } from 'lucide-react';

const MODELS = {
  female: {
    label: 'Female',
    descriptor: 'Studio fit · neutral',
    src: '/models/fabricnow-female-fashion-avatar.glb',
    measurements: { XS: { chest: 82, waist: 64, hip: 90, height: 164 }, S: { chest: 86, waist: 68, hip: 94, height: 168 }, M: { chest: 92, waist: 74, hip: 100, height: 172 }, L: { chest: 98, waist: 80, hip: 106, height: 176 }, XL: { chest: 104, waist: 86, hip: 112, height: 180 }, '2XL': { chest: 112, waist: 94, hip: 120, height: 184 } },
  },
  male: {
    label: 'Male',
    descriptor: 'Studio fit · neutral',
    src: '/models/fabricnow-male-fashion-avatar.glb',
    measurements: { XS: { chest: 86, waist: 70, hip: 88, height: 166 }, S: { chest: 92, waist: 76, hip: 94, height: 171 }, M: { chest: 98, waist: 82, hip: 100, height: 176 }, L: { chest: 104, waist: 88, hip: 106, height: 181 }, XL: { chest: 112, waist: 96, hip: 114, height: 186 }, '2XL': { chest: 120, waist: 104, hip: 122, height: 191 } },
  },
};

const SIZE_SCALE = {
  XS: [0.93, 0.94, 0.93], S: [0.97, 0.97, 0.97], M: [1, 1, 1], L: [1.04, 1.04, 1.04], XL: [1.08, 1.08, 1.08], '2XL': [1.13, 1.13, 1.13],
};

export default function FitModelPanel({ gender, setGender, size, setSize, fitSystem = 'Standard', setFitSystem }) {
  const [angle, setAngle] = useState(0);
  const model = MODELS[gender] || MODELS.female;
  const data = model.measurements[size] || model.measurements.M;
  const scale = SIZE_SCALE[size] || SIZE_SCALE.M;
  const modelScale = useMemo(() => scale.join(' '), [scale]);

  const rotate = (delta) => setAngle((v) => (v + delta + 360) % 360);
  const view = (deg) => setAngle(deg);

  return (
    <section className="fit-model-panel" aria-label="3D fitting avatar">
      <div className="fit-model-head">
        <div>
          <span className="studio-section-kicker">03 · 3D FIT</span>
          <h3>Preview the garment on a fashion fitting avatar</h3>
          <p>Use the same neutral, studio-style body throughout development. Rotate it freely, switch gender and inspect each size before generating the production pattern.</p>
        </div>
        <span className="fit-model-badge"><Rotate3D size={14}/> 360° interactive</span>
      </div>

      <div className="fit-model-controls">
        <div className="fit-control-group">
          <span className="fit-control-label">Avatar</span>
          <div className="fit-avatar-switch" role="group" aria-label="Fitting avatar">
            {Object.entries(MODELS).map(([key, value]) => (
              <button type="button" key={key} className={gender === key ? 'on' : ''} onClick={() => { setGender(key); setAngle(0); }}>
                <span className="fit-avatar-thumb"><UserRound size={18}/></span>
                <span><strong>{value.label}</strong><small>{value.descriptor}</small></span>
                {gender === key && <Check size={15}/>} 
              </button>
            ))}
          </div>
        </div>
        <div className="fit-control-group">
          <span className="fit-control-label">Target size</span>
          <div className="fit-size-row" role="group" aria-label="Model size">
            {Object.keys(SIZE_SCALE).map((s) => <button type="button" key={s} className={size === s ? 'on' : ''} onClick={() => setSize(s)}>{s}</button>)}
          </div>
        </div>
        <label className="fit-control-group fit-select-wrap">
          <span className="fit-control-label">Company fit system</span>
          <div className="fit-select-inner"><select value={fitSystem} onChange={(e) => setFitSystem?.(e.target.value)}><option>Standard</option><option>Women's Relaxed</option><option>Women's Fitted</option><option>Men's Regular</option><option>Men's Relaxed</option><option>Custom company fit</option></select><ChevronDown size={14}/></div>
        </label>
      </div>

      <div className="fit-model-stage fit-model-stage-vipere">
        <div className="fit-model-toolbar">
          {[[0,'Front'],[45,'3/4'],[90,'Side'],[180,'Back']].map(([deg,label]) => <button type="button" key={label} onClick={() => view(deg)} className={angle === deg ? 'on' : ''}>{label}</button>)}
          <span className="fit-toolbar-divider" />
          <button type="button" onClick={() => setAngle(0)}><Rotate3D size={14}/> Reset view</button>
        </div>
        <div className="fit-model-viewer-shell">
          <model-viewer
            key={`${gender}-${size}`}
            src={model.src}
            alt={`${model.label} ${size} fashion fitting avatar`}
            camera-controls
            touch-action="pan-y"
            shadow-intensity="0.12"
            exposure="1.08"
            environment-image="neutral"
            camera-orbit={`${angle}deg 82deg 2.35m`}
            camera-target="0m 0.92m 0m"
            interaction-prompt="none"
            disable-pan
            style={{ '--model-scale': modelScale }}
          />
          <div className="fit-model-floor" aria-hidden="true" />
          <div className="fit-model-corner"><span>{model.label} · {size}</span><small>{data.height} cm · {fitSystem}</small></div>
          <div className="fit-model-rotate-hint"><Rotate3D size={14}/> Drag to rotate</div>
        </div>
        <div className="fit-model-quick">
          <button type="button" onClick={() => rotate(-15)}>−15°</button>
          <strong>{angle}°</strong>
          <button type="button" onClick={() => rotate(15)}>+15°</button>
        </div>
      </div>

      <div className="fit-model-data">
        <div><Ruler size={15}/><span><strong>Body measurements</strong><small>Chest {data.chest} · Waist {data.waist} · Hip {data.hip} cm</small></span></div>
        <div><Maximize2 size={15}/><span><strong>Avatar height</strong><small>{data.height} cm · {gender === 'female' ? 'Female' : 'Male'} · {size}</small></span></div>
        <div><Check size={15}/><span><strong>Fit profile</strong><small>{fitSystem} · carried into pattern generation</small></span></div>
      </div>
    </section>
  );
}
