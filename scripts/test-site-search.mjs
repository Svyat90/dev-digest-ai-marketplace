#!/usr/bin/env node
// Acceptance test for Artifact Search: the canonical queries from docs/SITE-SPEC.md
// (Success metrics) must return the expected artifact in the top 3 results.
// Runs against the real index, so build it first: node scripts/build-index.mjs

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/plugins.mjs';
import { buildCards, search, terms } from '../site/artifact-search/search.js';

const CANONICAL = [
  ['I need a skill to review an ADR', 'skill', 'adr-review', 1],
  ['review a design change', 'agent', 'architecture-reviewer', 3],
  ['write a spec for a new feature', 'skill', 'write-spec', 3],
  ['break a spec into tasks', 'skill', 'plan-from-spec', 3],
  ['prepare a pull request', 'skill', 'pr-ready', 3],
  ['research a technology with sources', 'skill', 'tech-research', 3],
  ['block force push', 'hook', 'PreToolUse', 3],
];

const index = JSON.parse(readFileSync(join(ROOT, 'site', 'artifact-search', 'plugins.json'), 'utf8'));
const { cards } = buildCards(index);
let failed = 0;

for (const [query, type, name, top] of CANONICAL) {
  const results = search(cards, terms(query)).slice(0, top).map((r) => r.card);
  const ok = results.some((c) => c.type === type && c.name === name);
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✘'} "${query}" → ${type} ${name} in top ${top}` +
    (ok ? '' : ` (got: ${results.map((c) => `${c.type} ${c.name}`).join(', ') || 'nothing'})`));
}

// Behaviour from the acceptance criteria that does not depend on catalog content.
const same = (a, b) => JSON.stringify(search(cards, terms(a)).map((r) => r.card.id)) ===
  JSON.stringify(search(cards, terms(b)).map((r) => r.card.id));
const checks = [
  ['query is case-insensitive', same('REVIEW', 'review')],
  ['stop-word-only query shows the full catalog', search(cards, terms('I need a skill')).length === cards.length],
  ['unmatched query returns nothing', search(cards, terms('zzzqqq')).length === 0],
];
for (const [label, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✘'} ${label}`);
}

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log(`\n✔ all ${CANONICAL.length + checks.length} search checks passed`);
