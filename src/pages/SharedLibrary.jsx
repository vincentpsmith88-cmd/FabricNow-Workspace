import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ExternalLink, Link2, Search, Layers, Sparkles, LayoutGrid } from 'lucide-react';
import { api } from '../api.js';
import { Skeleton, Spinner } from '../components/ui.jsx';
import './shared-library.css';

const GENDERS = [['', 'Everyone'], ['female', 'Women'], ['male', 'Men']];
const TYPES = [['', 'Boards & searches'], ['board', 'Curated boards'], ['search', 'Search ideas']];
const TYPE_LABEL = { board: 'Board', pin: 'Pin', search: 'Search' };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const PAGE_SIZE = 24;

function LibCard({ item, saved, onSave, onSearch }) {
  const isSearch = item.type === 'search';
  const pin = {
    id: `lib:${item.id}`,
    title: item.title,
    description: `${cap(item.gender)} · ${cap(item.category)} · ${item.region}`,
    imageUrl: '',
    link: item.url,
    boardOwner: item.sourceAccount ? { username: item.sourceAccount } : null,
  };
  return (
    <article className="pin-card sl-card">
      <div className={`sl-tile sl-${item.gender || 'unisex'}`}>
        <span className="sl-type">{TYPE_LABEL[item.type] || 'Link'}</span>
        <Layers size={26} />
        <strong>{item.title}</strong>
        <small>{item.region}</small>
      </div>
      <div className="pin-card-body">
        <div className="sl-chips">
          <span>{cap(item.gender)}</span>
          <span>{cap(item.category)}</span>
        </div>
        <div className="pin-source">
          <span>Pinterest</span>
          {item.sourceAccount ? ` · @${item.sourceAccount}` : ''}
        </div>
        <div className="pin-actions">
          <a className="btn btn-primary btn-sm" href={item.url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Open on Pinterest
          </a>
          {isSearch && (
            <button className="btn btn-ghost btn-sm" onClick={() => onSearch(item.searchQuery || item.title)}>
              <Sparkles size={14} /> Search here
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onSave(pin)}>
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
          </button>
        </div>
        <button className="source-copy" onClick={() => navigator.clipboard?.writeText(item.url)}>
          <Link2 size={12} /> Copy link
        </button>
      </div>
    </article>
  );
}

export default function SharedLibrary({ saved, onSave, setPage }) {
  const [filters, setFilters] = useState({ q: '', gender: '', category: '', region: '', type: '' });
  const [facets, setFacets] = useState({ categories: [], regions: [] });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPageNo] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    api('/api/inspiration-library/facets')
      .then((d) => setFacets({ categories: d.categories || [], regions: d.regions || [] }))
      .catch(() => {});
  }, []);

  const load = useCallback(async (f, p, append) => {
    const id = ++seq.current;
    append ? setMore(true) : setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
      const d = await api(`/api/inspiration-library?${qs}`);
      if (id !== seq.current) return;
      setItems((cur) => (append ? [...cur, ...(d.items || [])] : d.items || []));
      setTotal(d.total || 0);
      setPageNo(p);
    } catch (e) {
      if (id === seq.current) setError(e.message);
    } finally {
      if (id === seq.current) { setLoading(false); setMore(false); }
    }
  }, []);

  // debounce typing, instant for dropdowns
  useEffect(() => {
    const t = setTimeout(() => load(filters, 1, false), filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters, load]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const goSearch = (q) => {
    try { sessionStorage.setItem('fabricnow.pinterestQuery', q); } catch {}
    setPage('pinterest-research');
  };

  return (
    <div className="sl-wrap">
      <div className="sl-toolbar">
        <div className="pm-search sl-search">
          <Search size={16} />
          <input value={filters.q} onChange={set('q')} placeholder="Search Kente, Aso ebi, Agbada, Shweshwe…" />
        </div>
        <select value={filters.gender} onChange={set('gender')} aria-label="Gender">
          {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filters.category} onChange={set('category')} aria-label="Category">
          <option value="">All categories</option>
          {facets.categories.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
        </select>
        <select value={filters.region} onChange={set('region')} aria-label="Region">
          <option value="">All regions</option>
          {facets.regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.type} onChange={set('type')} aria-label="Type">
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ q: '', gender: '', category: '', region: '', type: '' })}>
            Clear
          </button>
        )}
      </div>

      {error && <div className="error pinterest-error">{error}</div>}

      {loading ? (
        <div className="pin-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="pin-card pin-skeleton-card" key={i}>
              <Skeleton height={150} radius={14} />
              <div className="pin-skeleton-copy"><Skeleton width="62%" height={13} /><Skeleton width="84%" height={10} /></div>
            </div>
          ))}
        </div>
      ) : !items.length ? (
        <div className="sl-empty">
          <LayoutGrid size={26} />
          <h3>{hasFilters ? 'Nothing matches those filters' : 'The shared library is empty'}</h3>
          <p>{hasFilters ? 'Try a broader term or clear the filters.' : 'Ask your admin to run the inspiration seed on the backend.'}</p>
        </div>
      ) : (
        <>
          <div className="sl-count"><strong>{total}</strong> references shared across FabricNow</div>
          <div className="pin-grid">
            {items.map((it) => (
              <LibCard
                key={it.id}
                item={it}
                saved={saved.some((x) => x.id === `lib:${it.id}`)}
                onSave={onSave}
                onSearch={goSearch}
              />
            ))}
          </div>
          {items.length < total && (
            <div className="sl-more">
              <button className="btn btn-ghost" disabled={more} onClick={() => load(filters, page + 1, true)}>
                {more ? <Spinner size={15} /> : `Load more (${total - items.length} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
