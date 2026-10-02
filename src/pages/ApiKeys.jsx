import React, { useEffect, useState } from 'react';
import { KeyRound, Copy, Plus, Images, Sparkles, Layers3 } from 'lucide-react';
import { Spinner, Skeleton } from '../components/ui.jsx';
import { api } from '../api.js';
import { fmtDate } from '../usage.js';
import { useToast } from '../toast.jsx';

function DeveloperEmpty({onCreate}){return <div className="library-empty fashion-module-empty developer-empty"><div className="library-empty-visual"><div className="library-empty-orb"><KeyRound size={28}/></div><span className="empty-float empty-float-a"><Images size={16}/></span><span className="empty-float empty-float-b"><Sparkles size={16}/></span><span className="empty-float empty-float-c"><Layers3 size={16}/></span></div><div className="library-empty-copy"><span className="library-empty-label">DEVELOPER WORKSPACE IS READY</span><h4>No API keys yet</h4><p>Create a server-side credential when you are ready to connect FabricNow to your own application. Nothing is shown as connected until the backend confirms it.</p><div className="library-empty-actions"><button className="btn btn-primary" onClick={onCreate}>Create first key <Plus size={15}/></button></div></div></div>}

// Accepts { keys: [] }, { apiKeys: [] }, { data: [] } or a bare array.
const toList = (d) => {
  const v = d && !Array.isArray(d) ? (d.keys ?? d.apiKeys ?? d.data) : d;
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
};

export default function ApiKeys() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState('');

  const load = async () => {
    try { setItems(toList(await api('/api/billing/api-keys'))); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    setBusy(true);
    try {
      const d = await api('/api/billing/api-keys', { method: 'POST', body: JSON.stringify({ name: 'Workspace key' }) });
      setSecret(String(d?.apiKey || d?.key || ''));
      toast.success('API key created.');
      await load();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(secret); toast.success('Key copied.'); }
    catch { toast.error('Copy failed. Select the key and copy it manually.'); }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div><h3>API credentials</h3><p className="muted small-text">Use these on your server only. Never ship a key in browser code.</p></div>
        <button className="btn btn-primary" onClick={create} disabled={busy} aria-busy={busy}>{busy ? <Spinner size={15}/> : <Plus size={16} />} {!busy && 'Create key'}</button>
      </div>

      {secret && (
        <div className="secret">
          <p>Copy this key now. It won’t be shown again.</p>
          <div className="secret-row"><code>{secret}</code><button className="btn btn-ghost" onClick={copy}><Copy size={16} /> Copy</button></div>
        </div>
      )}

      {loading ? <div className="ui-loading-panel" aria-busy="true"><div className="ui-skeleton-head"><Skeleton width="28%" height={15}/><Skeleton width="14%" height={10}/></div>{[1,2,3].map(i=><div className="ui-skeleton-row" key={i}><Skeleton width="28%" height={13}/><Skeleton width="22%" height={11}/><Skeleton width="12%" height={24}/></div>)}</div> : null}
      {items.length > 0 && (
        <ul className="rows">
          {items.map((k, i) => (
            <li key={String(k.id || k._id || i)}>
              <span className="row-icon"><KeyRound size={16} /></span>
              <div><strong>{String(k.name || 'API key')}</strong><small>{k.createdAt ? `Created ${fmtDate(k.createdAt)}` : ''}</small></div>
              <span className={`pill ${k.revokedAt ? 'pill-bad' : 'pill-ok'}`}>{k.revokedAt ? 'Revoked' : 'Active'}</span>
            </li>
          ))}
        </ul>
      )}
      {!loading && !items.length && !secret && (
        <DeveloperEmpty onCreate={create} />
      )}
    </section>
  );
}
