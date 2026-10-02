import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

export function usePreview(file) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return undefined; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export function Dropzone({ file, preview, onFile, big, title, hint, scanning }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const take = (f) => { if (f && f.type.startsWith('image/')) onFile(f); };
  const open = () => input.current?.click();
  return (
    <div
      className={`dz ${big ? 'dz-big' : 'dz-small'} ${drag ? 'drag' : ''} ${file ? 'has' : ''} ${scanning ? 'scanning' : ''}`}
      role="button" tabIndex={0} aria-label={title}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
    >
      {file ? (
        <>
          {preview && <img src={preview} alt="" className="dz-img" />}
          {scanning && <span className="scan" />}
          <div className="dz-meta"><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></div>
          <button type="button" className="dz-x" aria-label="Remove image"
            onClick={(e) => { e.stopPropagation(); onFile(null); if (input.current) input.current.value = ''; }}><X size={16} /></button>
        </>
      ) : (
        <div className="dz-empty">
          <span className="dz-ico"><ImagePlus size={big ? 26 : 20} /></span>
          <strong>{title}</strong>
          <small>{hint}</small>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
    </div>
  );
}

/** Several photos at once (batch patterns, listing writer). */
export function MultiDrop({ files, onFiles, max, title, hint }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const add = (list) => {
    const imgs = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
    onFiles([...files, ...imgs].slice(0, max));
  };
  return (
    <div>
      <div className={`dz dz-small ${drag ? 'drag' : ''}`} role="button" tabIndex={0} aria-label={title}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
        <div className="dz-empty"><span className="dz-ico"><ImagePlus size={20} /></span><strong>{title}</strong><small>{hint}</small></div>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <ul className="multi-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <MiniThumb file={f} /><span>{f.name}</span>
              <button type="button" className="icon-btn" aria-label={`Remove ${f.name}`} onClick={() => onFiles(files.filter((_, k) => k !== i))}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniThumb({ file }) {
  const url = usePreview(file);
  return url ? <img src={url} alt="" /> : <span className="thumb-ph" />;
}
