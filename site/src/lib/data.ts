// Loads the files scripts/build-index.mjs writes to site/public/.

import type { Catalog, CatalogIndex, Release, Stats } from './types';

// Used when index.json itself cannot be loaded.
export const REPOSITORY_FALLBACK = 'https://github.com/Svyat90/dev-digest-ai-marketplace';

async function json<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadCatalog(): Promise<Catalog> {
  const [index, releases, stats] = await Promise.all([
    json<CatalogIndex>('./index.json'),
    json<Release[]>('./releases.json'),
    json<Stats>('./stats.json'),
  ]);
  if (!Array.isArray(index.plugins) || !Array.isArray(index.artifacts)) throw new Error('index.json: unexpected shape');
  return { index, releases, stats };
}

// bodies/<plugin>/README.md or bodies/<plugin>/<type>-<name>.md
export async function loadBody(file: string): Promise<string> {
  const res = await fetch(`./bodies/${file.split('/').map(encodeURIComponent).join('/')}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.text();
}
