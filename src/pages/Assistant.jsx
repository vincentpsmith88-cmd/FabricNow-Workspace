import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Sparkles, RefreshCw, Command, Layers3, Shirt, Factory, BookOpen, ArrowRight, Copy, Check, ArrowDown } from 'lucide-react';
import { api } from '../api.js';
import './assistant.css';

const WELCOME = 'Welcome to FabricNow AI. I can help you understand your live workspace, prepare product workflows and find what needs attention.';
const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Tiny safe renderer: **bold**, `code`, "- " bullets, "1. " lists, paragraphs. No raw HTML is ever injected.
function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={`${key}-${i}`}>{part.slice(1, -1)}</code>;
    return part;
  });
}
function RichText({ text }) {
  const lines = String(text || '').split('\n');
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(list.ordered ? <ol key={`l${out.length}`}>{list.items}</ol> : <ul key={`l${out.length}`}>{list.items}</ul>); list = null; } };
  lines.forEach((raw, i) => {
    const bullet = raw.match(/^\s*[-*•]\s+(.*)/); const num = raw.match(/^\s*\d+[.)]\s+(.*)/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(<li key={i}>{inline((bullet || num)[1], i)}</li>);
    } else if (!raw.trim()) { flush(); }
    else { flush(); out.push(<p key={i}>{inline(raw, i)}</p>); }
  });
  flush();
  return <>{out}</>;
}

export default function Assistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME, ts: Date.now() }]);
  const [input, setInput] = useState(''); const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(-1); const [showJump, setShowJump] = useState(false);
  const box = useRef(null); const field = useRef(null); const stick = useRef(true);

  const scrollDown = (smooth = true) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); };
  useEffect(() => { if (stick.current) scrollDown(); }, [messages, busy]);
  const onScroll = () => { const el = box.current; if (!el) return; const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80; stick.current = near; setShowJump(!near); };
  useEffect(() => { const el = field.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 130) + 'px'; }, [input]);

  const send = async (e) => {
    e?.preventDefault(); const message = input.trim(); if (!message || busy) return;
    const history = messages.slice(-10).map(({ role, text }) => ({ role, text }));
    setInput(''); stick.current = true;
    setMessages((m) => [...m, { role: 'user', text: message, ts: Date.now() }]); setBusy(true);
    try {
      const d = await api('/api/assistant/workspace', { method: 'POST', body: JSON.stringify({ message, history }) });
      setMessages((m) => [...m, { role: 'assistant', text: d.reply || 'I could not generate a response.', ts: Date.now() }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message || 'The assistant is temporarily unavailable.', ts: Date.now(), error: true }]);
    } finally { setBusy(false); setTimeout(() => field.current?.focus(), 0); }
  };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } };
  const copy = async (i, text) => { try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch {} };
  const reset = () => { setMessages([{ role: 'assistant', text: 'New workspace conversation started. What are you working on?', ts: Date.now() }]); stick.current = true; };

  const quick = [['Workspace', 'What needs my attention right now?', Command], ['Products', 'How many products need review?', Shirt], ['Production', 'What is missing before I publish?', Factory], ['Collections', 'Help me build a collection from approved products', BookOpen]];

  return <div className="assistant-page">
    <section className="assistant-hero"><div><span className="pm-eyebrow">FABRICNOW AI · WORKSPACE COPILOT</span><h2>Ask your workspace. Get useful next actions.</h2><p>AI assistance grounded in the live FabricNow workspace instead of generic chat.</p></div><button className="btn btn-ghost" onClick={reset}><RefreshCw size={15} /> New chat</button></section>
    <div className="assistant-layout">
      <aside className="assistant-context"><div className="assistant-context-head"><span>START WITH A TASK</span><Sparkles size={15} /></div>{quick.map(([a, q, I]) => <button key={q} onClick={() => { setInput(q); field.current?.focus(); }}><span><I size={17} /></span><div><strong>{a}</strong><small>{q}</small></div><ArrowRight size={14} /></button>)}<div className="assistant-grounding"><Layers3 size={17} /><div><strong>Workspace grounded</strong><small>Responses can use your connected product, asset, production and collection records.</small></div></div></aside>
      <section className="assistant-shell">
        <div className="assistant-chat-head"><div className="assistant-avatar large"><Bot size={20} /></div><div><strong>FabricNow AI</strong><span>Workspace assistant · Live context</span></div><span className="assistant-live"><i /> Connected</span></div>
        <div className="assistant-scroll">
          <div className="assistant-messages" ref={box} onScroll={onScroll} role="log" aria-live="polite">
            {messages.map((m, i) => <div key={i} className={`assistant-msg ${m.role}${m.error ? ' error' : ''}`}>
              <div className="assistant-avatar">{m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}</div>
              <div className="assistant-body">
                <div className="assistant-bubble"><RichText text={m.text} /></div>
                <div className="assistant-meta"><small className="assistant-time">{m.role === 'assistant' ? 'FabricNow AI' : 'You'} · {time(m.ts)}</small>{m.role === 'assistant' && i > 0 && <button className="assistant-copy" onClick={() => copy(i, m.text)} aria-label="Copy reply">{copied === i ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>}</div>
              </div>
            </div>)}
            {busy && <div className="assistant-msg assistant"><div className="assistant-avatar"><Bot size={16} /></div><div className="assistant-body"><div className="assistant-bubble assistant-thinking"><span className="dots"><i /><i /><i /></span> Thinking from workspace context…</div></div></div>}
          </div>
          {showJump && <button className="assistant-jump" onClick={() => { stick.current = true; scrollDown(); }} aria-label="Jump to latest"><ArrowDown size={16} /></button>}
        </div>
        <form className="assistant-compose" onSubmit={send}>
          <textarea ref={field} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="Ask about products, assets, production or marketing…  (Enter to send, Shift+Enter for a new line)" disabled={busy} />
          <button className="btn btn-primary" disabled={busy || !input.trim()}>{busy ? 'Working…' : <><Send size={16} /> Send</>}</button>
        </form>
      </section>
    </div>
  </div>;
}
