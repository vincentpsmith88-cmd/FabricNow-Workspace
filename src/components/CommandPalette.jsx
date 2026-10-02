import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, Moon, Sun, LogOut, Plus, Package, BookOpen, FolderKanban } from 'lucide-react';
import { api } from '../api.js';
import { NAV } from '../nav.js';
import { jobTitle } from '../usage.js';

/** Cmd/Ctrl+K palette: jump to any page, run quick actions, and search products, collections and pattern jobs. */
export default function CommandPalette({ open, onClose, setPage, jobs, theme, toggleTheme, onLogout }) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState({ products: [], collections: [] });
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setCursor(0);
    setTimeout(() => inputRef.current?.focus(), 10);
    let live = true;
    Promise.allSettled([api('/api/workspace-suite/projects'), api('/api/workspace-suite/collections')]).then(([p, c]) => {
      if (!live) return;
      setRemote({
        products: p.status === 'fulfilled' ? (p.value.projects || []) : [],
        collections: c.status === 'fulfilled' ? (c.value.collections || []) : [],
      });
    });
    return () => { live = false; };
  }, [open]);

  const items = useMemo(() => {
    const go = (id) => () => { setPage(id); onClose(); };
    const list = [
      { group: 'Quick actions', label: 'New product', hint: 'Capture a garment', icon: Plus, run: go('fashion-capture'), kw: 'create capture add' },
      { group: 'Quick actions', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', hint: 'Appearance', icon: theme === 'dark' ? Sun : Moon, run: () => { toggleTheme(); onClose(); }, kw: 'theme appearance dark light' },
      { group: 'Quick actions', label: 'Sign out', hint: '', icon: LogOut, run: () => { onClose(); onLogout(); }, kw: 'logout' },
      ...NAV.map((n) => ({ group: 'Go to', label: n.label, hint: n.sub, icon: n.icon, run: go(n.id), kw: n.id })),
      ...remote.products.map((p) => ({ group: 'Products', label: p.name, hint: [p.sku, p.category, p.status].filter(Boolean).join(' · '), icon: Package, run: go('fashion-production'), kw: `${p.sku || ''} ${p.category || ''}` })),
      ...remote.collections.map((c) => ({ group: 'Collections', label: c.name, hint: c.season || '', icon: BookOpen, run: go('fashion-collections'), kw: c.season || '' })),
      ...(jobs || []).slice(0, 40).map((j) => ({ group: 'Pattern jobs', label: jobTitle(j), hint: j.status || '', icon: FolderKanban, run: go('projects'), kw: String(j.id || '') })),
    ];
    const needle = q.trim().toLowerCase();
    if (!needle) return list.filter((i) => i.group === 'Quick actions' || i.group === 'Go to').slice(0, 14);
    return list.filter((i) => `${i.label} ${i.hint} ${i.kw}`.toLowerCase().includes(needle)).slice(0, 30);
  }, [q, remote, jobs, theme, setPage, onClose, toggleTheme, onLogout]);

  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [cursor]);

  if (!open) return null;

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(items.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[cursor]?.run(); }
  };

  let lastGroup = '';
  return (
    <div className="cmdk-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <div className="cmdk-input">
          <Search size={18} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages, products, collections, jobs…" aria-label="Search" />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list" ref={listRef} role="listbox">
          {items.length === 0 && <div className="cmdk-empty">No results for “{q}”.</div>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="cmdk-group" key={`g-${it.group}`}>{it.group}</div> : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <React.Fragment key={`${it.group}-${it.label}-${i}`}>
                {head}
                <button type="button" role="option" aria-selected={i === cursor} data-active={i === cursor} data-no-spin className={`cmdk-item ${i === cursor ? 'on' : ''}`} onMouseMove={() => setCursor(i)} onClick={it.run}>
                  <span className="cmdk-ico"><Icon size={16} /></span>
                  <span className="cmdk-label">{it.label}</span>
                  {it.hint && <span className="cmdk-hint">{it.hint}</span>}
                  {i === cursor && <CornerDownLeft size={14} className="cmdk-enter" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
      </div>
    </div>
  );
}
