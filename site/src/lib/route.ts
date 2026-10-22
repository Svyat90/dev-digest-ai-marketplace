// Hash routes (docs/SITE-SPEC.md → Routes and screens). Hash routing works on
// GitHub Pages without server rewrites.

import { ENTRY_TYPES, type EntryType } from './types';
import type { SortOrder } from './search';

export type Route =
  | { name: 'home' }
  | { name: 'search'; query: SearchQuery }
  | { name: 'plugin'; plugin: string }
  | { name: 'artifact'; id: string }
  | { name: 'whats-new' }
  | { name: 'getting-started' }
  | { name: 'not-found' };

export interface SearchQuery {
  q: string;
  types: EntryType[];
  keywords: string[];
  sort: SortOrder;
}

const SORTS: SortOrder[] = ['relevance', 'name', 'updated'];
const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

export function splitHash(hash: string): { path: string[]; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const i = raw.indexOf('?');
  const path = (i === -1 ? raw : raw.slice(0, i)).split('/').filter(Boolean).map(decodeURIComponent);
  return { path, params: new URLSearchParams(i === -1 ? '' : raw.slice(i + 1)) };
}

export function parseSearch(params: URLSearchParams): SearchQuery {
  const sort = params.get('sort') as SortOrder | null;
  return {
    q: params.get('q') ?? '',
    types: list(params.get('type')).filter((t): t is EntryType => (ENTRY_TYPES as readonly string[]).includes(t)),
    keywords: list(params.get('kw')),
    sort: sort && SORTS.includes(sort) ? sort : 'relevance',
  };
}

export function parseRoute(hash: string): Route {
  const { path, params } = splitHash(hash);
  const [head, ...rest] = path;
  if (!head) return { name: 'home' };
  if (head === 'search') return { name: 'search', query: parseSearch(params) };
  if (head === 'plugin' && rest.length === 1) return { name: 'plugin', plugin: rest[0]! };
  if (head === 'artifact' && rest.length === 3) return { name: 'artifact', id: rest.join('/') };
  if (head === 'whats-new') return { name: 'whats-new' };
  if (head === 'getting-started') return { name: 'getting-started' };
  return { name: 'not-found' };
}

const enc = encodeURIComponent;

export const href = {
  home: () => '#/',
  search(query: Partial<SearchQuery> = {}) {
    const p = new URLSearchParams();
    if (query.q) p.set('q', query.q);
    if (query.types?.length) p.set('type', query.types.join(','));
    if (query.keywords?.length) p.set('kw', query.keywords.join(','));
    if (query.sort && query.sort !== 'relevance') p.set('sort', query.sort);
    const qs = p.toString();
    return `#/search${qs ? `?${qs}` : ''}`;
  },
  plugin: (name: string) => `#/plugin/${enc(name)}`,
  artifact: (id: string) => `#/artifact/${id.split('/').map(enc).join('/')}`,
  entry: (e: { type: EntryType; id: string; plugin: string }) =>
    e.type === 'plugin' ? href.plugin(e.plugin) : href.artifact(e.id),
  whatsNew: () => '#/whats-new',
  gettingStarted: () => '#/getting-started',
};
