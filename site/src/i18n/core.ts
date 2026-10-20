// UI string lookup (docs/SITE-SPEC.md → Languages → UI strings). Pure functions;
// the React provider is in ./index.tsx.

import type en from './locales/en.json';

export type Messages = Record<string, string>;
type RawKey = keyof typeof en;
export const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;
type PluralCategory = (typeof PLURAL_CATEGORIES)[number];
type PluralBase<K> = K extends `${infer B}.${PluralCategory}` ? B : never;

// Keys of en.json, with `key.one|few|many|other` collapsed to `key`: a key that is
// not in en.json is a compile error in every component.
export type MessageKey = Exclude<RawKey, `${string}.${PluralCategory}`> | PluralBase<RawKey>;
export type Params = Record<string, string | number>;

export interface Locale {
  code: string;
  nativeName: string;
  messages: Messages;
}

const PLURAL_SUFFIX = new RegExp(`\\.(${PLURAL_CATEGORIES.join('|')})$`);

// Collapses plural forms: `search.count.one` → `search.count`.
export function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, '');
}

export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].sort();
}

// Locales from import.meta.glob('./locales/*.json'): adding a language is adding a file.
export function buildLocales(modules: Record<string, unknown>): Locale[] {
  return Object.entries(modules)
    .map(([path, mod]) => {
      const messages = ((mod as { default?: Messages }).default ?? mod) as Messages;
      const code = path.replace(/^.*\//, '').replace(/\.json$/, '');
      return { code, nativeName: messages['meta.nativeName'] ?? code, messages };
    })
    .sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.code.localeCompare(b.code)));
}

// ?lang= in the URL, else the remembered choice, else the browser language, else en.
export function resolveLanguage(
  available: string[],
  { url, stored, browser }: { url?: string | null; stored?: string | null; browser?: readonly string[] },
): string {
  const supported = (code?: string | null) => {
    if (!code) return null;
    const lower = code.toLowerCase();
    return available.find((a) => a === lower) ?? available.find((a) => a === lower.split('-')[0]) ?? null;
  };
  return supported(url) ?? supported(stored) ?? browser?.map(supported).find(Boolean) ?? 'en';
}

export function translate(locale: Locale, fallback: Locale, key: MessageKey, params: Params = {}): string {
  const lookup = (l: Locale): string | undefined => {
    if (typeof params.count === 'number') {
      const category = new Intl.PluralRules(l.code).select(params.count);
      return l.messages[`${key}.${category}`] ?? l.messages[`${key}.other`] ?? l.messages[key];
    }
    return l.messages[key];
  };
  const text = lookup(locale) ?? lookup(fallback) ?? key;
  const numbers = new Intl.NumberFormat(locale.code);
  return text.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    if (v === undefined) return m;
    return typeof v === 'number' ? numbers.format(v) : v;
  });
}
