import React, { useEffect, useState } from 'react';
import { KeyRound, Copy, Plus } from 'lucide-react';
import { api } from '../api.js';
import { fmtDate } from '../usage.js';
import { useToast } from '../toast.jsx';
import { Empty } from '../components/ui.jsx';

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
        <button className="btn btn-primary" onClick={create} disabled={busy}><Plus size={16} /> {busy ? 'Creating…' : 'Create key'}</button>
      </div>

      {secret && (
        <div className="secret">
          <p>Copy this key now. It won’t be shown again.</p>
          <div className="secret-row"><code>{secret}</code><button className="btn btn-ghost" onClick={copy}><Copy size={16} /> Copy</button></div>
        </div>
      )}

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
        <Empty icon={KeyRound} title="No API keys yet" body="Create a key to start sending requests to the FabricNow API." />
      )}
    </section>
  );
}
