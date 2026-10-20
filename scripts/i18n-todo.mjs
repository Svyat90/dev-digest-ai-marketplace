#!/usr/bin/env node
// Lists catalog descriptions whose translation is missing or stale for one language
// (docs/SITE-SPEC.md → Languages → Catalog content), with the current English text
// and its hash, ready to hand to Claude for a draft. Always exits 0: CI prints the
// report to the job summary and never fails on it.
//
//   node scripts/i18n-todo.mjs uk        or, from the repository root: npm run i18n:todo -- uk

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadMarketplace, loadManifest, pluginDir, listComponents, readJson } from './lib/plugins.mjs';
import { translationTodo } from './lib/catalog.mjs';

const lang = process.argv[2];
if (!lang) {
  console.error('usage: node scripts/i18n-todo.mjs <language code>, e.g. uk');
  process.exit(0);
}

const file = join(ROOT, 'site', 'i18n', 'content', `${lang}.json`);
const content = existsSync(file) ? readJson(file) : {};

// The same English texts build-index.mjs puts into index.json.
const items = [];
for (const entry of loadMarketplace().plugins) {
  const dir = pluginDir(entry);
  const manifest = loadManifest(dir) ?? {};
  items.push({ kind: 'plugins', key: entry.name, description: entry.description ?? manifest.description ?? '' });
  for (const c of listComponents(dir)) {
    items.push({ kind: 'artifacts', key: `${entry.name}/${c.type}/${c.data?.name}`, description: c.data?.description ?? '' });
  }
}

const todo = translationTodo(items, content);
const known = new Set(items.map((i) => `${i.kind}:${i.key}`));
const orphans = Object.entries(content).flatMap(([kind, entries]) =>
  Object.keys(entries ?? {}).filter((key) => !known.has(`${kind}:${key}`)).map((key) => `${kind} → ${key}`));

console.log(`## Content translations: ${lang}\n`);
console.log(`site/i18n/content/${lang}.json: ${items.length - todo.length} of ${items.length} descriptions translated and current.\n`);
if (todo.length) {
  console.log('Translate each text below and store it under its key with `"source": "<hash>"`.\n');
  for (const t of todo) {
    console.log(`### ${t.status}: ${t.kind} → \`${t.key}\` (source \`${t.hash}\`)\n`);
    console.log(`> ${t.description.replace(/\n/g, '\n> ')}\n`);
  }
}
if (orphans.length) {
  console.log('Entries for items that no longer exist (safe to delete):\n');
  for (const o of orphans) console.log(`- ${o}`);
  console.log();
}
if (!todo.length && !orphans.length) console.log('Nothing to do.');
