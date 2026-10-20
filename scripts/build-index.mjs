#!/usr/bin/env node
// Builds site/artifact-search/plugins.json — the index the Artifact Search site renders.
// Schema: docs/SITE-SPEC.md → Data contract.
//
//   node scripts/build-index.mjs           write site/artifact-search/plugins.json
//   node scripts/build-index.mjs --cost    also print the COST-BASELINE table to stdout

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  ROOT, loadMarketplace, loadManifest, pluginDir, listComponents, estimateTokens, rel,
} from './lib/plugins.mjs';

const marketplace = loadMarketplace();
const REPOSITORY = 'https://github.com/Svyat90/dev-digest-ai-marketplace';
const OUT_DIR = join(ROOT, 'site', 'artifact-search');

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
    text: c.body.trim(),
    // Description is always in context while the plugin is enabled; body loads on invoke.
    // Hooks run in the harness and never enter the model context.
    tokens: {
      idle: estimateTokens(c.data?.description),
      invoked: c.type === 'hook' ? 0 : estimateTokens(c.body),
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
  repository: REPOSITORY,
  commit: gitSha(),
  plugins,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'plugins.json'), JSON.stringify(index, null, 2) + '\n');
console.error(`${rel(join(OUT_DIR, 'plugins.json'))}: ${plugins.length} plugins`);

if (process.argv.includes('--cost')) {
  const rows = plugins.map((p) =>
    `| ${p.name} | ${p.version} | ${p.components.length} | ~${p.tokens.idle} | ~${p.tokens.invoked} |`);
  console.log([
    '| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n'));
}
