import { useCallback, useEffect, useState } from 'react';
import { parseRoute, type Route } from './route';
import { storage } from './storage';

const ROUTE_EVENT = 'catalog:route';

// Navigates to a hash route. `replace` keeps typing in the search box out of history.
export function navigate(hash: string, { replace = false } = {}): void {
  if (replace) {
    history.replaceState(history.state, '', hash);
    window.dispatchEvent(new Event(ROUTE_EVENT));
  } else if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', update);
    window.addEventListener(ROUTE_EVENT, update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener(ROUTE_EVENT, update);
    };
  }, []);
  return route;
}

export type Theme = 'light' | 'dark';
const THEME_KEY = 'theme';
const systemTheme = (): Theme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// Default: the system setting. A toggle pins the choice in localStorage.
export function useTheme(): [Theme, () => void] {
  const stored = storage.get(THEME_KEY);
  const [pinned, setPinned] = useState<Theme | null>(stored === 'light' || stored === 'dark' ? stored : null);
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(systemTheme());
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (pinned) document.documentElement.dataset.theme = pinned;
    else delete document.documentElement.dataset.theme;
  }, [pinned]);

  const theme = pinned ?? system;
  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    storage.set(THEME_KEY, next);
    setPinned(next);
  }, [theme]);
  return [theme, toggle];
}
