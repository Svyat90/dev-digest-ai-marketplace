// In-house i18n: a provider and a t() hook, no library.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildLocales, resolveLanguage, translate, type Locale, type MessageKey, type Params } from './core';
import { splitHash } from '../lib/route';
import { storage } from '../lib/storage';

export type { MessageKey } from './core';

export const LOCALES: Locale[] = buildLocales(import.meta.glob('./locales/*.json', { eager: true }));
const EN = LOCALES.find((l) => l.code === 'en')!;
const STORAGE_KEY = 'lang';

interface I18n {
  lang: string;
  locales: Locale[];
  setLang(code: string): void;
  t(key: MessageKey, params?: Params): string;
  formatDate(iso: string | null): string;
  formatNumber(n: number): string;
}

const I18nContext = createContext<I18n | null>(null);

function initialLanguage(): string {
  // ?lang= can sit in the page query or in the hash query (#/plugin/x?lang=en).
  const url = new URLSearchParams(window.location.search).get('lang') ?? splitHash(window.location.hash).params.get('lang');
  return resolveLanguage(LOCALES.map((l) => l.code), {
    url,
    stored: storage.get(STORAGE_KEY),
    browser: navigator.languages,
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLanguage);
  const locale = LOCALES.find((l) => l.code === lang) ?? EN;

  useEffect(() => {
    document.documentElement.lang = locale.code;
  }, [locale.code]);

  const setLang = useCallback((code: string) => {
    storage.set(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  const value = useMemo<I18n>(() => {
    const dates = new Intl.DateTimeFormat(locale.code, { dateStyle: 'medium', timeZone: 'UTC' });
    const numbers = new Intl.NumberFormat(locale.code);
    return {
      lang: locale.code,
      locales: LOCALES,
      setLang,
      t: (key, params) => translate(locale, EN, key, params),
      formatDate: (iso) => (iso ? dates.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : ''),
      formatNumber: (n) => numbers.format(n),
    };
  }, [locale, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
