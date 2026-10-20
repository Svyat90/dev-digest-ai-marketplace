// Catalog search (docs/SITE-SPEC.md → Search). Pure: no DOM, no React, so the
// acceptance tests run it against the real index.json.

import MiniSearch from 'minisearch';
import type { Artifact, CatalogIndex, EntryType, Plugin } from './types';

// One searchable row: a plugin or one of its components.
export interface Entry {
  id: string;
  type: EntryType;
  name: string;
  plugin: string;
  pluginDisplayName: string;
  version: string | null;
  description: string;
  keywords: string[];
  author: string | null;
  updated: string | null;
  invocation: string | null;
  install: string;
  source: Plugin | Artifact;
}

export type SortOrder = 'relevance' | 'name' | 'updated';

export interface Filters {
  types?: EntryType[];
  keywords?: string[];
  author?: string | null;
  sort?: SortOrder;
}

const ENGLISH_STOP_WORDS = (
  'i me my we our you your it its a an the to for of with without that this these those in on at by ' +
  'from into onto about and or but is are am be can could would should will do does how what which who ' +
  'where when want wants need needs needed some something anything help please just get make like ' +
  'tool tools artifact artifacts'
).split(' ');

const UKRAINIAN_STOP_WORDS = (
  'і й та а але чи або що як який яка яке які де коли хто це цей ця ці той та ті в у на до з із зі за ' +
  'по під над від для про при без через між мені мене мій моя моє мої ми ти ви він вона воно вони його її їх ' +
  'є бути буде треба потрібно потрібен потрібна потрібні хочу хочемо можна можу будь ласка просто ' +
  'інструмент інструменти артефакт артефакти'
).split(' ');

// Type words are chosen with the facet, not typed into the query.
const TYPE_WORDS: Record<string, string[]> = {
  en: 'skill skills agent agents subagent subagents command commands hook hooks plugin plugins mcp server servers'.split(' '),
  uk: 'скіл скіли скілів скілу агент агенти агентів агента субагент команда команди команд хук хуки хуків плагін плагіни плагінів плагіна сервер сервери'.split(' '),
};

const STOP_WORDS: Record<string, string[]> = { en: ENGLISH_STOP_WORDS, uk: UKRAINIAN_STOP_WORDS };

// English stop words always apply: the catalog itself is English.
export function stopWords(lang: string): Set<string> {
  return new Set([
    ...ENGLISH_STOP_WORDS, ...(TYPE_WORDS.en ?? []),
    ...(STOP_WORDS[lang] ?? []), ...(TYPE_WORDS[lang] ?? []),
  ]);
}

export const BOOSTS = {
  name: 5,
  keywords: 4,
  description: 3,
  descriptionLocal: 3,
  pluginText: 2,
  text: 1,
} as const;

// A translation is used only when it exists and its English source has not changed.
export function localized(item: Plugin | Artifact, lang: string): string {
  const t = item.translations?.[lang];
  return t && !t.stale ? t.description : item.description;
}

export function toEntries(index: CatalogIndex): Entry[] {
  const plugins = new Map(index.plugins.map((p) => [p.name, p]));
  const entries: Entry[] = index.plugins.map((p) => ({
    id: `plugin/${p.name}`,
    type: 'plugin',
    name: p.name,
    plugin: p.name,
    pluginDisplayName: p.displayName,
    version: p.version,
    description: p.description,
    keywords: p.keywords,
    author: p.author,
    updated: p.updated,
    invocation: null,
    install: p.install,
    source: p,
  }));
  for (const a of index.artifacts) {
    const p = plugins.get(a.plugin);
    entries.push({
      id: a.id,
      type: a.type,
      name: a.name,
      plugin: a.plugin,
      pluginDisplayName: p?.displayName ?? a.plugin,
      version: p?.version ?? null,
      description: a.description,
      keywords: p?.keywords ?? [],
      author: p?.author ?? null,
      updated: p?.updated ?? null,
      invocation: a.invocation,
      install: p?.install ?? '',
      source: a,
    });
  }
  return entries;
}

type Doc = Record<keyof typeof BOOSTS, string> & { id: string };

function document(entry: Entry, lang: string, plugin: Plugin | undefined): Doc {
  const translated = lang === 'en' ? '' : localized(entry.source, lang);
  return {
    id: entry.id,
    name: entry.type === 'plugin' ? `${entry.name} ${(entry.source as Plugin).displayName}` : entry.name,
    keywords: entry.keywords.join(' '),
    description: entry.description,
    descriptionLocal: translated === entry.description ? '' : translated,
    pluginText: entry.type === 'plugin' ? (plugin?.category ?? '') : `${entry.plugin} ${plugin?.description ?? ''}`,
    text: entry.type === 'plugin' ? '' : (entry.source as Artifact).text,
  };
}

export interface CatalogSearch {
  entries: Entry[];
  terms(query: string): string[];
  search(query: string, filters?: Filters): Entry[];
}

const TYPE_ORDER: Record<EntryType, number> = { plugin: 0, skill: 1, agent: 2, command: 3, hook: 4, mcp: 5 };
const byName = (a: Entry, b: Entry) =>
  TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name) || a.plugin.localeCompare(b.plugin);

export function createSearch(index: CatalogIndex, lang = 'en'): CatalogSearch {
  const entries = toEntries(index);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const plugins = new Map(index.plugins.map((p) => [p.name, p]));
  const stop = stopWords(lang);
  const processTerm = (term: string) => {
    const t = term.toLowerCase().replace(/[’']/g, '');
    return t && !stop.has(t) ? t : null;
  };

  const mini = new MiniSearch<Doc>({
    fields: Object.keys(BOOSTS),
    processTerm,
    searchOptions: {
      boost: { ...BOOSTS },
      prefix: true,
      // Light fuzzy matching: only longer words, at most one or two edits.
      fuzzy: (term) => (term.length >= 6 ? 0.15 : false),
      combineWith: 'OR',
    },
  });
  mini.addAll(entries.map((e) => document(e, lang, plugins.get(e.plugin))));

  const terms = (query: string) =>
    (MiniSearch.getDefault('tokenize') as (text: string) => string[])(query)
      .map(processTerm)
      .filter((t): t is string => Boolean(t));

  return {
    entries,
    terms,
    search(query, filters = {}) {
      let results: Entry[];
      const queryTerms = terms(query);
      if (queryTerms.length === 0) {
        // Empty or stop-words-only query: the whole catalog.
        results = [...entries].sort(byName);
      } else {
        results = mini.search(queryTerms.join(' ')).map((r) => byId.get(String(r.id))!).filter(Boolean);
      }
      const { types, keywords, author, sort = 'relevance' } = filters;
      if (types?.length) results = results.filter((e) => types.includes(e.type));
      if (keywords?.length) results = results.filter((e) => keywords.some((k) => e.keywords.includes(k)));
      if (author) results = results.filter((e) => e.author === author);
      if (sort === 'name') results = [...results].sort(byName);
      if (sort === 'updated') {
        results = [...results].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? '') || byName(a, b));
      }
      return results;
    },
  };
}
