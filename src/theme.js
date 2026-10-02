import { useCallback, useEffect, useState } from 'react';

const KEY = 'fabricnow.theme';

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* storage blocked */ }
  return 'light';
}

export function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#13121F' : '#F4F5FA');
  if (persist) { try { localStorage.setItem(KEY, theme); } catch { /* ignore */ } }
}

export function useTheme() {
  const [theme, setTheme] = useState(getTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggle = useCallback(() => {
    setTheme((cur) => { const next = cur === 'dark' ? 'light' : 'dark'; applyTheme(next, true); return next; });
  }, []);
  return [theme, toggle];
}
