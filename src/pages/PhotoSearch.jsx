import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ExternalLink, Search, Sparkles, Camera } from 'lucide-react';
import { api } from '../api.js';
import { Skeleton, Spinner } from '../components/ui.jsx';
import './shared-library.css';

const CHIPS = ['African fashion', 'Ankara dress', 'Kente cloth', 'Agbada', 'African wedding attire', 'Kitenge', 'Aso ebi', 'African print fabric'];

export const pinId = (p) => `${String(p.source || 'photo').toLowerCase()}:${p.id}`;

function PhotoCard({ photo, saved, onSave, onStudio, onUse }) {
  const pin = {
    id: pinId(photo),
    title: photo.title,
    description: `Photo by ${photo.photographer} on ${photo.source}`,
    imageUrl: photo.imageUrl,
    link: photo.link,
    source: photo.source,
    provider: 'manual',
    credit: `Photo by ${photo.photographer}`,
  };
  return (
    <article className="pin-card">
      <div className="pin-image-wrap" style={{ background: photo.color || undefined }}>
        <img src={photo.thumbUrl || photo.imageUrl} alt={photo.title} loading="lazy" />
      </div>
      <div className="pin-card-body">
        <div className="pin-card-title">{photo.title}</div>
        <div className="pin-source">
          <a href={photo.photographerUrl} target="_blank" rel="noreferrer">Photo by {photo.photographer}</a>
          {' · '}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.source}</a>
        </div>
        <div className="pin-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { onUse(photo); onStudio(pin); }}><Sparkles size={14} /> Pattern Studio</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { onUse(photo); onSave(pin); }}>
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
          <a className="btn btn-ghost btn-sm" href={photo.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Source</a>
        </div>
      </div>
    </article>
  );
}

export default function PhotoSearch({ saved, onSave, onStudio }) {
  const [input, setInput] = useState('African fashion');
  const [query, setQuery] = useState('African fashion');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [attr, setAttr] = useState({ text: 'Photos from Unsplash', url: 'https://unsplash.com' });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (q, p, append) => {
    const id = ++seq.current;
    append ? setMore(true) : setLoading(true);
    setError('');
    try {
      const d = await api(`/api/inspiration-library/photos?q=${encodeURIComponent(q)}&page=${p}&limit=24`);
      if (id !== seq.current) return;
      setConfigured(d.configured !== false);
      if (d.attribution) setAttr(d.attribution);
      setItems((cur) => (append ? [...cur, ...(d.items || [])] : d.items || []));
      setTotal(d.total || 0);
      setHasMore(Boolean(d.hasMore));
      setPageNo(p);
    } catch (e) {
      if (id === seq.current) setError(e.message);
    } finally {
      if (id === seq.current) { setLoading(false); setMore(false); }
    }
  }, []);

  useEffect(() => { load(query, 1, false); }, [query, load]);

  const track = (p) => { api('/api/inspiration-library/photos/download', { method: 'POST', body: JSON.stringify({ id: p.id, source: p.source }) }).catch(() => {}); };
  const submit = (e) => { e.preventDefault(); const q = input.trim(); if (q) setQuery(q); };
  const pick = (q) => { setInput(q); setQuery(q); };

  if (!loading && !configured) {
    return (
      <div className="sl-empty">
        <Camera size={26} />
        <h3>Photo search isn’t switched on yet</h3>
        <p>Ask your admin to add a free <b>UNSPLASH_ACCESS_KEY</b> to the backend (get one at unsplash.com/developers), then restart the server.</p>
      </div>
    );
  }

  return (
    <div className="sl-wrap">
      <form onSubmit={submit} className="sl-toolbar">
        <div className="pm-search sl-search">
          <Search size={16} />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Ankara maxi dress, Kente stole, Agbada" />
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? <Spinner size={15} /> : 'Search photos'}</button>
      </form>
      <div className="sl-chips sl-chip-row">
        {CHIPS.map((c) => (
          <button type="button" key={c} className={c === query ? 'on' : ''} onClick={() => pick(c)}>{c}</button>
        ))}
      </div>

      {error && <div className="error pinterest-error">{error}</div>}

      {loading ? (
        <div className="pin-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="pin-card pin-skeleton-card" key={i}>
              <Skeleton height={230} radius={14} />
              <div className="pin-skeleton-copy"><Skeleton width="62%" height={13} /><Skeleton width="84%" height={10} /></div>
            </div>
          ))}
        </div>
      ) : !items.length ? (
        <div className="sl-empty"><Camera size={26} /><h3>No photos found</h3><p>Try a broader term like “African dress”.</p></div>
      ) : (
        <>
          <div className="sl-count"><strong>{total.toLocaleString()}</strong> free photos for “{query}”</div>
          <div className="pin-grid">
            {items.map((p) => (
              <PhotoCard key={p.id} photo={p} saved={saved.some((x) => x.id === pinId(p))} onSave={onSave} onStudio={onStudio} onUse={track} />
            ))}
          </div>
          {hasMore && (
            <div className="sl-more">
              <button className="btn btn-ghost" disabled={more} onClick={() => load(query, page + 1, true)}>
                {more ? <Spinner size={15} /> : 'Load more photos'}
              </button>
            </div>
          )}
          <div className="sl-credit"><a href={attr.url} target="_blank" rel="noreferrer">{attr.text}</a>. Free to use; please keep the photographer credit.</div>
        </>
      )}
    </div>
  );
}
