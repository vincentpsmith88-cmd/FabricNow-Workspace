import React, { useState } from 'react';
import { Box, Check, Ruler, Rotate3D } from 'lucide-react';
import FitModelViewer from '../components/FitModelViewer.jsx';
import { FIT_MODELS } from '../components/FitModelPanel.jsx';

export default function FitModels() {
  const [modelId, setModelId] = useState(FIT_MODELS[0].id);
  const [angle, setAngle] = useState(0);
  const [size, setSize] = useState('M');
  const model = FIT_MODELS.find((m) => m.id === modelId) || FIT_MODELS[0];
  const scale = model.child ? 1 : ({XS:.93,S:.97,M:1,L:1.04,XL:1.08,'2XL':1.13}[size] || 1);
  return <div className="fit-models-page">
    <header className="studio-head">
      <div><div className="studio-eyebrow">FASHION OS · 3D FIT MODELS</div><h2>Model library</h2><p>Inspect every supplied FBX fitting body in a dedicated, well-lit viewer before using it in Pattern Studio.</p></div>
      <span className="studio-status"><i/> {FIT_MODELS.length} models loaded</span>
    </header>
    <div className="fit-models-layout">
      <aside className="fit-models-library studio-card">
        <div className="studio-card-head"><div><span className="studio-section-kicker">MODEL LIBRARY</span><h3>Choose a body</h3></div></div>
        <div className="fit-library-list">{FIT_MODELS.map((m,i)=><button type="button" key={m.id} className={m.id===modelId?'on':''} onClick={()=>{setModelId(m.id);setAngle(0)}}><span className="fit-model-number">{i+1}</span><span><strong>{m.label}</strong><small>{m.category}</small></span>{m.id===modelId&&<Check size={15}/>}</button>)}</div>
      </aside>
      <section className="fit-models-view studio-card">
        <div className="fit-model-full-head"><div><span className="studio-section-kicker">LIVE VIEWER</span><h3>{model.label}</h3><p>{model.category} · drag to rotate, scroll to zoom</p></div><div className="fit-size-row">{['XS','S','M','L','XL','2XL'].map(s=><button type="button" key={s} className={size===s?'on':''} disabled={model.child} onClick={()=>setSize(s)}>{s}</button>)}</div></div>
        <FitModelViewer model={model} angle={angle} scale={scale} onAngleChange={setAngle} />
        <div className="fit-models-info"><div><Box size={16}/><span><strong>Source</strong><small>{model.file}</small></span></div><div><Ruler size={16}/><span><strong>Height reference</strong><small>{model.measurements.height} cm</small></span></div><div><Rotate3D size={16}/><span><strong>Viewer</strong><small>Three.js FBX · studio lighting</small></span></div></div>
      </section>
    </div>
  </div>;
}
