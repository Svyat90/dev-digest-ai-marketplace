// Every locale has exactly the keys and placeholders of en.json (plural forms are
// checked against the language's own plural categories).

import { describe, expect, it } from 'vitest';
import { baseKey, buildLocales, placeholders, resolveLanguage, translate, type Locale } from './core';

const locales = buildLocales(import.meta.glob('./locales/*.json', { eager: true }));
const en = locales.find((l) => l.code === 'en')!;

function shape(locale: Locale) {
  const keys = new Map<string, Set<string>>();
  for (const [key, text] of Object.entries(locale.messages)) {
    const base = baseKey(key);
    const set = keys.get(base) ?? new Set<string>();
    placeholders(text).forEach((p) => set.add(p));
    keys.set(base, set);
  }
  return keys;
}

describe('locale files', () => {
  const reference = shape(en);

  it('include en and uk', () => {
    expect(locales.map((l) => l.code)).toEqual(expect.arrayContaining(['en', 'uk']));
  });

  it.each(locales.filter((l) => l.code !== 'en').map((l) => [l.code, l] as const))('%s has the keys of en.json', (_, locale) => {
    const own = shape(locale);
    const missing = [...reference.keys()].filter((k) => !own.has(k));
    const extra = [...own.keys()].filter((k) => !reference.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(locales.filter((l) => l.code !== 'en').map((l) => [l.code, l] as const))('%s uses the placeholders of en.json', (_, locale) => {
    const own = shape(locale);
    const differ = [...reference.entries()]
      .filter(([k, ph]) => own.has(k) && [...own.get(k)!].sort().join() !== [...ph].sort().join())
      .map(([k]) => k);
    expect(differ).toEqual([]);
  });

  it.each(locales.map((l) => [l.code, l] as const))('%s has every plural form its language needs', (_, locale) => {
    const categories = new Intl.PluralRules(locale.code).resolvedOptions().pluralCategories;
    const plural = new Set(Object.keys(locale.messages).filter((k) => k !== baseKey(k)).map(baseKey));
    const missing = [...plural].flatMap((base) =>
      categories.filter((c) => !(`${base}.${c}` in locale.messages)).map((c) => `${base}.${c}`));
    expect(missing).toEqual([]);
  });

  it.each(locales.map((l) => [l.code, l] as const))('%s names itself', (_, locale) => {
    expect(locale.messages['meta.nativeName']).toBeTruthy();
  });
});

describe('adding a language is adding a file', () => {
  it('lists a new locale in the switcher with its native name', () => {
    const modules = {
      './locales/en.json': { default: en.messages },
      './locales/pl.json': { default: { ...en.messages, 'meta.nativeName': 'Polski' } },
    };
    expect(buildLocales(modules).map((l) => [l.code, l.nativeName])).toEqual([['en', 'English'], ['pl', 'Polski']]);
  });
});

describe('language resolution', () => {
  const available = ['en', 'uk'];
  it('prefers ?lang= over the remembered choice', () => {
    expect(resolveLanguage(available, { url: 'en', stored: 'uk', browser: ['uk-UA'] })).toBe('en');
  });
  it('uses the remembered choice before the browser language', () => {
    expect(resolveLanguage(available, { stored: 'uk', browser: ['en-US'] })).toBe('uk');
  });
  it('matches the browser language by its primary subtag', () => {
    expect(resolveLanguage(available, { browser: ['de-DE', 'uk-UA'] })).toBe('uk');
  });
  it('falls back to en', () => {
    expect(resolveLanguage(available, { url: 'xx', browser: ['de'] })).toBe('en');
  });
});

describe('translate', () => {
  const uk = locales.find((l) => l.code === 'uk')!;
  it('resolves Ukrainian plural forms', () => {
    expect(translate(uk, en, 'search.count', { count: 1 })).toBe('1 артефакт');
    expect(translate(uk, en, 'search.count', { count: 3 })).toBe('3 артефакти');
    expect(translate(uk, en, 'search.count', { count: 5 })).toBe('5 артефактів');
  });
  it('resolves English plural forms and placeholders', () => {
    expect(translate(en, en, 'search.count', { count: 1 })).toBe('1 result');
    expect(translate(en, en, 'search.count', { count: 2 })).toBe('2 results');
    expect(translate(en, en, 'search.title.query', { query: 'drizzle' })).toBe('Results for “drizzle”');
  });
});
