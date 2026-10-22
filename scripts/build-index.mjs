#!/usr/bin/env node
// Builds the catalog site data in site/public/ (none of it is committed).
// Schema: docs/SITE-SPEC.md → Data contract.
//
//   node scripts/build-index.mjs           write index.json, releases.json, stats.json, bodies/
//   node scripts/build-index.mjs --cost    also print the COST-BASELINE table to stdout
//   npm run build:index                    the same, from the repository root

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ROOT, loadMarketplace, loadManifest, pluginDir, listComponents, estimateTokens, readJson, rel,
} from './lib/plugins.mjs';
import {
  markdownToText, parseChangelog, parseCompatibility, parseTools, translationFor,
} from './lib/catalog.mjs';

const marketplace = loadMarketplace();
const REPOSITORY = 'https://github.com/Svyat90/dev-digest-ai-marketplace';
const OUT_DIR = join(ROOT, 'site', 'public');
const CONTENT_DIR = join(ROOT, 'site', 'i18n', 'content');
const BUILT_AT = new Date().toISOString();

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch {
    return null;
  }
}

const COMMIT = git('rev-parse', 'HEAD');

// Content translations: site/i18n/content/<code>.json, keyed by language code.
const content = Object.fromEntries(
  (existsSync(CONTENT_DIR) ? readdirSync(CONTENT_DIR) : [])
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.slice(0, -5), readJson(join(CONTENT_DIR, f))]),
);

function translations(kind, key, english) {
  const out = {};
  for (const [lang, data] of Object.entries(content)) {
    const t = translationFor(data[kind]?.[key], english);
    if (t) out[lang] = t;
  }
  return out;
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

// Invocation as the user types it: `/plugin:skill`, or `plugin:agent` for agents.
function invocationOf(plugin, c) {
  if (c.type === 'agent') return `${plugin}:${c.data.name}`;
  if (c.type === 'command') return `/${plugin}:${c.data.name}`;
  if (c.type === 'skill' && c.data?.['user-invocable'] !== 'false') return `/${plugin}:${c.data.name}`;
  return null;
}

const bodies = [];
const releases = [];
const artifacts = [];

const plugins = marketplace.plugins.map((entry) => {
  const dir = pluginDir(entry);
  const pluginPath = rel(dir);
  const manifest = loadManifest(dir) ?? {};
  const changelog = parseChangelog(readText(join(dir, 'CHANGELOG.md')) ?? '');
  const compatibility = parseCompatibility(readText(join(dir, 'COMPATIBILITY.md')) ?? '');
  const description = entry.description ?? manifest.description ?? '';

  for (const r of changelog) releases.push({ plugin: entry.name, ...r });

  const components = listComponents(dir).map((c) => {
    const name = c.data?.name ?? null;
    const id = `${entry.name}/${c.type}/${name}`;
    const componentDescription = c.data?.description ?? '';
    bodies.push([`${entry.name}/${c.type}-${name}.md`, c.body.trim() + '\n']);
    return {
      id,
      plugin: entry.name,
      type: c.type,
      name,
      description: componentDescription,
      invocation: invocationOf(entry.name, c),
      tools: parseTools(c.data?.tools ?? c.data?.['allowed-tools']),
      path: rel(c.file),
      text: c.type === 'hook' || c.type === 'mcp' ? c.body.trim() : markdownToText(c.body),
      // Description is always in context while the plugin is enabled; body loads on invoke.
      // Hooks run in the harness and never enter the model context; a skill with
      // disable-model-invocation is hidden from the model until the user invokes it.
      tokens: {
        idle: c.type === 'hook' || c.data?.['disable-model-invocation'] === 'true' ? 0 : estimateTokens(c.data?.description),
        invoked: c.type === 'hook' ? 0 : estimateTokens(c.body),
      },
      translations: translations('artifacts', `${entry.name}/${c.type}/${name}`, componentDescription),
    };
  });
  artifacts.push(...components);

  const readme = readText(join(dir, 'README.md'));
  if (readme) bodies.push([`${entry.name}/README.md`, readme]);

  return {
    name: entry.name,
    displayName: entry.displayName ?? manifest.displayName ?? entry.name,
    version: manifest.version ?? null,
    description,
    author: manifest.author?.name ?? marketplace.owner?.name ?? null,
    category: entry.category ?? null,
    keywords: manifest.keywords ?? entry.tags ?? [],
    dependencies: (manifest.dependencies ?? []).map((d) =>
      typeof d === 'string' ? { name: d.split('@')[0], range: null } : { name: d.name, range: d.version ?? null }),
    compatibility,
    install: `/plugin install ${entry.name}@${marketplace.name}`,
    homepage: manifest.homepage ?? `${REPOSITORY}/tree/main/${pluginPath}`,
    path: pluginPath,
    // Date of the last commit touching the plugin; the newest changelog date without git history.
    updated: git('log', '-1', '--format=%cs', '--', pluginPath) ?? changelog.find((r) => r.date)?.date ?? null,
    tokens: {
      idle: components.reduce((s, c) => s + c.tokens.idle, 0),
      invoked: components.reduce((s, c) => s + c.tokens.invoked, 0),
    },
    components: components.map((c) => c.id),
    translations: translations('plugins', entry.name, description),
  };
});

const versionKey = (v) => v.split(/[.-]/).slice(0, 3).map((n) => n.padStart(6, '0')).join('.');
releases.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')
  || versionKey(b.version).localeCompare(versionKey(a.version))
  || a.plugin.localeCompare(b.plugin));

const meta = { commit: COMMIT, builtAt: BUILT_AT };
const index = {
  marketplace: marketplace.name,
  description: marketplace.description,
  addCommand: `/plugin marketplace add Svyat90/${marketplace.name}`,
  repository: REPOSITORY,
  ...meta,
  plugins,
  artifacts,
};

const counts = { plugin: plugins.length };
for (const a of artifacts) counts[a.type] = (counts[a.type] ?? 0) + 1;
const stats = {
  counts,
  tokens: {
    idle: plugins.reduce((s, p) => s + p.tokens.idle, 0),
    invoked: plugins.reduce((s, p) => s + p.tokens.invoked, 0),
  },
  ...meta,
};

const write = (path, data) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};
rmSync(join(OUT_DIR, 'bodies'), { recursive: true, force: true });
write(join(OUT_DIR, 'index.json'), index);
write(join(OUT_DIR, 'releases.json'), releases);
write(join(OUT_DIR, 'stats.json'), stats);
for (const [path, body] of bodies) write(join(OUT_DIR, 'bodies', path), body);
console.error(`${rel(OUT_DIR)}: ${plugins.length} plugins, ${artifacts.length} artifacts, ${releases.length} releases, ${bodies.length} bodies`);

if (process.argv.includes('--cost')) {
  const rows = plugins.map((p) =>
    `| ${p.name} | ${p.version} | ${p.components.length} | ~${p.tokens.idle} | ~${p.tokens.invoked} |`);
  console.log([
    '| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n'));
}
