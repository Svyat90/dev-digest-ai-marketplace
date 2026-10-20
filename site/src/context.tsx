// App-wide state: the loaded catalog, the search index for the active language,
// copy-with-toast and the command palette.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSearch, type CatalogSearch } from './lib/search';
import type { Catalog } from './lib/types';
import { copyText } from './lib/clipboard';
import { useI18n } from './i18n';

interface CatalogState extends Catalog {
  search: CatalogSearch;
}

const CatalogContext = createContext<CatalogState | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const { lang } = useI18n();
  // Rebuilt per language: the translated descriptions are indexed too.
  const search = useMemo(() => createSearch(catalog.index, lang), [catalog.index, lang]);
  const value = useMemo(() => ({ ...catalog, search }), [catalog, search]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}

interface Toast {
  id: number;
  ok: boolean;
}

interface UiState {
  toast: Toast | null;
  copiedKey: string | null;
  copy(text: string, key: string): void;
  paletteOpen: boolean;
  setPaletteOpen(open: boolean | ((open: boolean) => boolean)): void;
}

const UiContext = createContext<UiState | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timers = useRef<number[]>([]);

  const copy = useCallback((text: string, key: string) => {
    void copyText(text).then((ok) => {
      timers.current.forEach(clearTimeout);
      setToast({ id: Date.now(), ok });
      setCopiedKey(ok ? key : null);
      timers.current = [
        window.setTimeout(() => setToast(null), 1800),
        window.setTimeout(() => setCopiedKey(null), 2000),
      ];
    });
  }, []);

  const value = useMemo(
    () => ({ toast, copiedKey, copy, paletteOpen, setPaletteOpen }),
    [toast, copiedKey, copy, paletteOpen],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiState {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
