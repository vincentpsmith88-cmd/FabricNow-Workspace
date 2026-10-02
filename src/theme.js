import { useEffect, useState } from 'react';

const KEY = 'fabricnow.theme';

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  // FabricNow always starts new browsers/accounts in light mode. Dark is an explicit user choice.
  return 'light';
}

export function applyTheme(theme = 'light', persist = false) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    next === 'dark' ? '#12111D' : '#302C4D'
  );
  if (persist) {
    try { localStorage.setItem(KEY, next); } catch {}
  }
  return next;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getTheme());

  useEffect(() => {
    applyTheme(theme, true);
  }, [theme]);

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark');

  return [theme, toggleTheme, setTheme];
}
