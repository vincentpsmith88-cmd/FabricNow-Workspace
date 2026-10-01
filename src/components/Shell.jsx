import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, X, Plus, ChevronDown, Settings } from 'lucide-react';
import { Brand } from './Logo.jsx';
import { NAV_GROUPS, NAV } from '../nav.js';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}

export function Sidebar({ page, setPage, open, close, user, usage }) {
  const pct = Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={close} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="side-top">
          <Brand light />
          <button className="icon-btn side-close" onClick={close} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="side-nav">
          {NAV_GROUPS.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`nav-item ${page === id ? 'active' : ''}`}
                  aria-current={page === id ? 'page' : undefined}
                  onClick={() => { setPage(id); close(); }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button className="side-meter" onClick={() => { setPage('usage'); close(); }}>
          <div className="meter-head">
            <span>Images this month</span>
            <strong>{usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</strong>
          </div>
          <div className="meter"><i style={{ width: `${pct}%` }} /></div>
        </button>
      </aside>
    </>
  );
}

export function Topbar({ page, setPage, openMenu, user, onLogout }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const current = NAV.find((n) => n.id === page);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={openMenu} aria-label="Open menu"><Menu size={22} /></button>
      <div className="top-title" key={page}>
        <h1>{current?.label}</h1>
        <p>{current?.sub}</p>
      </div>
      <div className="top-actions">
        {page !== 'studio' && (
          <button className="btn btn-primary" aria-label="New pattern" onClick={() => setPage('studio')}>
            <Plus size={16} /> <span className="hide-sm">New pattern</span>
          </button>
        )}
        <div className="user-menu" ref={ref}>
          <button className="user-btn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
            <span className="avatar">{initials(user.name)}</span>
            <span className="user-meta hide-sm"><strong>{user.name}</strong><small>{user.email}</small></span>
            <ChevronDown size={16} className="hide-sm" />
          </button>
          {menu && (
            <div className="menu-pop" role="menu">
              <div className="menu-id"><strong>{user.name}</strong><small>{user.email}</small></div>
              <button role="menuitem" onClick={() => { setPage('settings'); setMenu(false); }}><Settings size={16} /> Settings</button>
              <button role="menuitem" onClick={onLogout}><LogOut size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
