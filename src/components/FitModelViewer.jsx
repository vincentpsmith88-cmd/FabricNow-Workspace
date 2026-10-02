import React from 'react';

export default function FitModelViewer({ model, angle = 0, scale = 1, onAngleChange, compact = false }) {
  if (!model) return null;
  const src = `/models/${encodeURIComponent(model.file)}`;
  return (
    <div className={`fit-model-stage fit-model-stage-vipere ${compact ? 'compact' : ''}`}>
      <div className="fit-model-toolbar">
        {[[0,'Front'],[45,'3/4'],[90,'Side'],[180,'Back']].map(([deg,label]) => (
          <button type="button" key={label} onClick={() => onAngleChange?.(deg)} className={angle === deg ? 'on' : ''}>{label}</button>
        ))}
        <span className="fit-toolbar-divider" />
        <button type="button" onClick={() => onAngleChange?.(0)}>Reset view</button>
      </div>
      <div className="fit-model-viewer-shell">
        <iframe
          key={`${model.id}-${angle}-${scale}`}
          className="fit-fbx-frame"
          title={`${model.label} 3D fitting avatar`}
          src={`/fbx-viewer.html?src=${encodeURIComponent(src)}&angle=${angle}&scale=${encodeURIComponent(scale)}`}
          loading="eager"
        />
        <div className="fit-model-corner"><span>{model.label}</span><small>{model.category} · interactive FBX</small></div>
        <div className="fit-model-rotate-hint">Drag to rotate · scroll to zoom</div>
      </div>
      <div className="fit-model-quick">
        <button type="button" onClick={() => onAngleChange?.((angle + 345) % 360)}>−15°</button>
        <strong>{angle}°</strong>
        <button type="button" onClick={() => onAngleChange?.((angle + 15) % 360)}>+15°</button>
      </div>
    </div>
  );
}
