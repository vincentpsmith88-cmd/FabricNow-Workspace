import React, { useEffect, useState } from 'react';
import { fetchBlob } from '../api.js';

const cache = new Map(); // path -> object URL, kept for the session so reopening a project is instant

export default function AuthImage({ path, alt = '', className = '', onClick }) {
  const [src, setSrc] = useState(cache.get(path) || '');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (cache.has(path)) { setSrc(cache.get(path)); return undefined; }
    setSrc(''); setFailed(false);
    fetchBlob(path).then((b) => {
      const u = URL.createObjectURL(b);
      cache.set(path, u);
      if (live) setSrc(u);
    }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [path]);
  if (failed) return <span className={`img-fail ${className}`}>Preview unavailable</span>;
  if (!src) return <span className={`img-skel ${className}`} aria-hidden="true" />;
  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}
