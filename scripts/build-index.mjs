#!/usr/bin/env node
// Builds site/plugins.json — the catalog the static site renders.
//
//   node scripts/build-index.mjs           write site/plugins.json
//   node scripts/build-index.mjs --cost    also print the COST-BASELINE table to stdout

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  ROOT, loadMarketplace, loadManifest, pluginDir, listComponents, estimateTokens, rel,
} from './lib/plugins.mjs';

const marketplace = loadMarketplace();

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

const plugins = marketplace.plugins.map((entry) => {
  const dir = pluginDir(entry);
  const manifest = loadManifest(dir) ?? {};
  const components = listComponents(dir).map((c) => ({
    type: c.type,
    name: c.data?.name ?? null,
    description: c.data?.description ?? null,
    path: rel(c.file),
    // Description is always in context while the plugin is enabled; body loads on invoke.
    tokens: {
      idle: estimateTokens(c.data?.description),
      invoked: estimateTokens(c.body),
    },
  }));
  return {
    name: entry.name,
    displayName: entry.displayName ?? manifest.displayName ?? entry.name,
    version: manifest.version ?? entry.version ?? null,
    description: entry.description ?? manifest.description ?? '',
    category: entry.category ?? null,
    tags: entry.tags ?? manifest.keywords ?? [],
    dependencies: manifest.dependencies ?? entry.dependencies ?? [],
    install: `claude plugin install ${entry.name}@${marketplace.name}`,
    homepage: manifest.homepage ?? null,
    components,
    tokens: {
      idle: components.reduce((s, c) => s + c.tokens.idle, 0),
      invoked: components.reduce((s, c) => s + c.tokens.invoked, 0),
    },
  };
});

const index = {
  marketplace: marketplace.name,
  description: marketplace.description,
  addCommand: '/plugin marketplace add Svyat90/dev-digest-ai-marketplace',
  commit: gitSha(),
  plugins,
};

mkdirSync(join(ROOT, 'site'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'plugins.json'), JSON.stringify(index, null, 2) + '\n');
console.error(`site/plugins.json: ${plugins.length} plugins`);

if (process.argv.includes('--cost')) {
  const rows = plugins.map((p) =>
    `| ${p.name} | ${p.version} | ${p.components.length} | ~${p.tokens.idle} | ~${p.tokens.invoked} |`);
  console.log([
    '| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n'));
}
