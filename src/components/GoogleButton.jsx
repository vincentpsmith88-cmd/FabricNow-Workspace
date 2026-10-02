import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../api.js';

const SRC = 'https://accounts.google.com/gsi/client';
let loader;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC; s.async = true; s.defer = true;
      s.onload = resolve;
      s.onerror = () => { loader = null; reject(new Error('Could not load Google sign-in.')); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

/** Renders Google's own button. `onCredential` receives the Google ID token. */
export default function GoogleButton({ onCredential, onError, text = 'continue_with', theme = 'outline', shape = 'rectangular' }) {
  const box = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [state, setState] = useState(GOOGLE_CLIENT_ID ? 'loading' : 'missing');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => r?.credential && cb.current(r.credential),
          ux_mode: 'popup',
        });
        const width = Math.min(400, Math.max(200, Math.round(box.current.getBoundingClientRect().width)));
        window.google.accounts.id.renderButton(box.current, {
          type: 'standard', theme, size: 'large', shape,
          text, logo_alignment: 'center', width,
        });
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('failed'); });
    return () => { cancelled = true; };
  }, [text, onError, theme, shape]);

  if (state === 'missing') {
    return (
      <div className="notice" role="note">
        Google sign-in isn’t set up yet. Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>.env</code> and restart the dev server.
      </div>
    );
  }
  if (state === 'failed') {
    return <div className="notice">Google sign-in is unavailable right now. Use your email instead.</div>;
  }
  return <div ref={box} className="google-slot" aria-busy={state === 'loading'} />;
}
