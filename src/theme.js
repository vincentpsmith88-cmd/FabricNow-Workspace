import { useEffect, useState } from 'react';

export function getTheme() { return 'light'; }

export function applyTheme(theme = 'light', persist = false) {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFFFFF');
  if (persist) { try { localStorage.setItem('fabricnow.theme', 'light'); } catch {} }
}

export function useTheme() {
  const [theme] = useState('light');
  useEffect(() => { applyTheme('light'); }, []);
  const noop = () => {};
  return [theme, noop];
}
