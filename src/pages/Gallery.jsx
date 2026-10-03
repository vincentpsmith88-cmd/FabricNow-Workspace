import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, ExternalLink, Search, Sparkles, X, Camera } from 'lucide-react';
import { api } from '../api.js';
import { Skeleton, Spinner } from '../components/ui.jsx';
import './gallery.css';

const CATEGORIES = [
  ['All', 'African fashion'], ['Women', 'African women fashion'], ['Men', 'African men fashion'],
  ['Wedding', 'African wedding attire'], ['Ankara', 'Ankara dress'], ['Kente', 'Kente cloth fashion'],
  ['Aso ebi', 'Aso ebi'], ['Agbada', 'Agbada'], ['Kitenge', 'Kitenge'],
  ['Fabrics', 'African print fabric'], ['Accessories', 'African jewelry headwrap'],
];

export default function Gallery({ setPage }) {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('African fashion');
  const [input, setInput] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [attr, setAttr] = useState({ text: 'Photos from Unsplash', url: 'https://unsplash.com' });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState([]);
  const [open, setOpen] = useState(-1);
  const seq = useRef(0);
  const sentinel = useRef(null);

  useEffect(() => {
    api('/api/companies/inspirations')
      .then((d) => setSaved((d.inspirations || []).map((x) => x.externalId || x.id)))
      .catch(() => {});
  }, []);

  const load = useCallback(async (q, p, append) => {
    const id = ++seq.current;
    append ? setMore(true) : setLoading(true);
    setError('');
    try {
      const d = await api(`/api/inspiration-library/photos?q=${encodeURIComponent(q)}&page=${p}&limit=30`);
      if (id !== seq.current) return;
      setConfigured(d.configured !== false);
      if (d.attribution) setAttr(d.attribution);
      setItems((cur) => (append ? [...cur, ...(d.items || []).filter((n) => !cur.some((c) => c.id === n.id))] : d.items || []));
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

  // endless scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || more) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) load(query, page + 1, true); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, more, page, query, load]);

  // lightbox keys
  useEffect(() => {
    if (open < 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1);
      if (e.key === 'ArrowRight') setOpen((i) => Math.min(i + 1, items.length - 1));
      if (e.key === 'ArrowLeft') setOpen((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items.length]);

  const pickCat = ([label, q]) => { setCat(label); setInput(''); setQuery(q); };
  const submit = (e) => { e.preventDefault(); const q = input.trim(); if (q) { setCat(''); setQuery(q); } };

  const pid = (p) => `${String(p.source || 'photo').toLowerCase()}:${p.id}`;
  const track = (p) => { api('/api/inspiration-library/photos/download', { method: 'POST', body: JSON.stringify({ id: p.id, source: p.source }) }).catch(() => {}); };
  const toPin = (p) => ({
    id: pid(p), title: p.title, description: `Photo by ${p.photographer} on ${p.source}`,
    imageUrl: p.imageUrl, link: p.link, source: p.source, credit: `Photo by ${p.photographer}`,
  });
  const save = async (p) => {
    const pin = toPin(p);
    if (saved.includes(pin.id)) return;
    track(p);
    try {
      await api('/api/companies/inspirations', { method: 'POST', body: JSON.stringify({
        provider: 'manual', externalId: pin.id, title: pin.title, description: pin.description,
        imageUrl: pin.imageUrl, sourceUrl: pin.link, sourceAccount: p.photographer,
        metadata: { source: p.source, credit: pin.credit },
      }) });
      setSaved((s) => [pin.id, ...s]);
    } catch (e) { setError(e.message); }
  };
  const toStudio = (p) => {
    const pin = toPin(p);
    track(p);
    try { localStorage.setItem('fabricnow.patternReference', JSON.stringify({ id: pin.id, title: pin.title, imageUrl: pin.imageUrl, sourceUrl: pin.link, provider: p.source })); } catch {}
    setPage('studio');
  };

  const cur = open >= 0 ? items[open] : null;

  return (
    <div className="pm-page gallery-page">
      <div className="pm-head">
        <div>
          <div className="pm-eyebrow">WORKSPACE · GALLERY</div>
          <h2>Gallery</h2>
          <p>A visual wall of African fashion photography. Open any photo, save it to your company’s Inspiration Library, or send it straight to Pattern Studio.</p>
        </div>
        <div className="pm-actions">
          <button className="btn btn-ghost" onClick={() => setPage('inspiration-library')}>Inspiration Library</button>
        </div>
      </div>

      <form onSubmit={submit} className="gal-bar">
        <div className="pm-search gal-search">
          <Search size={16} />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search the gallery — e.g. Ankara maxi, Kente stole…" />
        </div>
        <button className="btn btn-primary" disabled={loading}>Search</button>
      </form>
      <div className="gal-cats">
        {CATEGORIES.map((c) => (
          <button type="button" key={c[0]} className={c[0] === cat ? 'on' : ''} onClick={() => pickCat(c)}>{c[0]}</button>
        ))}
      </div>

      {error && <div className="error pinterest-error">{error}</div>}

      {!loading && !configured ? (
        <div className="sl-empty">
          <Camera size={26} />
          <h3>Gallery photos aren’t switched on yet</h3>
          <p>Ask your admin to add a free <b>UNSPLASH_ACCESS_KEY</b> to the backend (unsplash.com/developers), then restart the server.</p>
        </div>
      ) : loading ? (
        <div className="gal-masonry">
          {[220, 300, 260, 340, 240, 310, 280, 230].map((h, i) => <Skeleton key={i} height={h} radius={14} />)}
        </div>
      ) : !items.length ? (
        <div className="sl-empty"><Camera size={26} /><h3>No photos found</h3><p>Try a broader term like “African dress”.</p></div>
      ) : (
        <>
          <div className="sl-count"><strong>{total.toLocaleString()}</strong> photos</div>
          <div className="gal-masonry">
            {items.map((p, i) => (
              <figure className="gal-item" key={p.id} style={{ aspectRatio: `${p.width || 2}/${p.height || 3}`, background: p.color || undefined }}>
                <button className="gal-open" onClick={() => setOpen(i)} aria-label={`Open ${p.title}`}>
                  <img src={p.thumbUrl || p.imageUrl} alt={p.title} loading="lazy" />
                </button>
                <figcaption>
                  <span>{p.photographer}</span>
                  <button className="gal-save" onClick={() => save(p)} aria-label="Save to Inspiration Library" title={saved.includes(pid(p)) ? 'Saved' : 'Save'}>
                    <Bookmark size={15} fill={saved.includes(pid(p)) ? 'currentColor' : 'none'} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <div ref={sentinel} className="gal-sentinel">{more && <Spinner size={18} />}</div>
          <div className="sl-credit"><a href={attr.url} target="_blank" rel="noreferrer">{attr.text}</a>. Free to use; please keep the photographer credit.</div>
        </>
      )}

      {cur && (
        <div className="gal-lightbox" onClick={() => setOpen(-1)} role="dialog" aria-modal="true">
          <button className="gal-x" onClick={() => setOpen(-1)} aria-label="Close"><X size={20} /></button>
          {open > 0 && <button className="gal-nav gal-prev" onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }} aria-label="Previous"><ChevronLeft size={26} /></button>}
          {open < items.length - 1 && <button className="gal-nav gal-next" onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }} aria-label="Next"><ChevronRight size={26} /></button>}
          <div className="gal-stage" onClick={(e) => e.stopPropagation()}>
            <img src={cur.imageUrl} alt={cur.title} />
            <div className="gal-info">
              <div>
                <strong>{cur.title}</strong>
                <span>
                  <a href={cur.photographerUrl} target="_blank" rel="noreferrer">Photo by {cur.photographer}</a> on <a href={attr.url} target="_blank" rel="noreferrer">{cur.source}</a>
                </span>
              </div>
              <div className="gal-actions">
                <button className="btn btn-primary btn-sm" onClick={() => toStudio(cur)}><Sparkles size={14} /> Pattern Studio</button>
                <button className="btn btn-ghost btn-sm" onClick={() => save(cur)}>
                  <Bookmark size={14} fill={saved.includes(pid(cur)) ? 'currentColor' : 'none'} /> {saved.includes(pid(cur)) ? 'Saved' : 'Save'}
                </button>
                <a className="btn btn-ghost btn-sm" href={cur.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Source</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
