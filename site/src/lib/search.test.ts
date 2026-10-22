// Search acceptance tests (docs/SITE-SPEC.md → Acceptance criteria), run against
// the real index. Build it first from the repository root: npm run build:index.
//
// 1. Every artifact is found by its own name (top 3): works for any catalog, so
//    adding or removing plugins never needs a test edit.
// 2. The canonical queries name real artifacts: when one is renamed or removed,
//    the test says so and the list is updated here and in SITE-SPEC.md.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSearch, type Entry } from './search';
import type { CatalogIndex } from './types';

const INDEX = resolve(import.meta.dirname, '../../public/index.json');
if (!existsSync(INDEX)) throw new Error('site/public/index.json is missing — run "npm run build:index" in the repository root');
const index = JSON.parse(readFileSync(INDEX, 'utf8')) as CatalogIndex;

const CANONICAL: [query: string, plugin: string, type: string, name: string][] = [
  ['write tests for a react component', 'engineering-paved-path', 'skill', 'react-testing-library'],
  ['write a spec for a new feature', 'sdd-engineering', 'agent', 'spec-creator'],
  ['break a spec into tasks and waves', 'sdd-engineering', 'agent', 'implementation-planner'],
  ['execute an implementation plan', 'sdd-engineering', 'skill', 'run-plan'],
  ['check the code against the plan', 'sdd-engineering', 'agent', 'plan-verifier'],
  ['review the architecture of my change', 'architecture-review', 'agent', 'architecture-reviewer'],
  ['self review before a pull request', 'engineering-paved-path', 'skill', 'pr-self-review'],
  ['research a question in the codebase', 'research-tools', 'agent', 'researcher'],
  ['drizzle transactions', 'engineering-paved-path', 'skill', 'drizzle-orm-patterns'],
  ['next.js server components', 'engineering-paved-path', 'skill', 'next-best-practices'],
  ['block force push', 'engineering-paved-path', 'hook', 'PreToolUse'],
];

const label = (e: Entry) => `${e.plugin} ${e.type} ${e.name}`;
const en = createSearch(index, 'en');
const top = (query: string, n = 3, s = en) => s.search(query).slice(0, n);

describe('every artifact is findable by its name', () => {
  const artifacts = en.entries.filter((e) => e.type !== 'plugin');
  it.each(artifacts.map((e) => [label(e), e] as const))('%s', (_, entry) => {
    expect(top(entry.name).map(label)).toContain(label(entry));
  });
  it('covers the whole catalog', () => {
    expect(artifacts.length).toBe(index.artifacts.length);
  });
});

describe('canonical queries return the expected artifact in the top 3', () => {
  it.each(CANONICAL)('"%s" → %s %s %s', (query, plugin, type, name) => {
    const expected = `${plugin} ${type} ${name}`;
    const exists = en.entries.some((e) => label(e) === expected);
    expect(exists, `${expected} is not in the catalog — update CANONICAL here and in docs/SITE-SPEC.md`).toBe(true);
    expect(top(query).map(label)).toContain(expected);
  });
});

describe('behaviour that does not depend on catalog content', () => {
  const ids = (q: string) => en.search(q).map((e) => e.id);
  it('is case-insensitive', () => expect(ids('REVIEW')).toEqual(ids('review')));
  it('shows the whole catalog for a stop-words-only query', () => {
    expect(en.search('I need a skill')).toHaveLength(en.entries.length);
    expect(en.search('')).toHaveLength(en.entries.length);
  });
  it('returns nothing for an unmatched query', () => expect(en.search('zzzqqq')).toHaveLength(0));
  it('filters by type facet', () => {
    const skills = en.search('drizzle', { types: ['skill'] });
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every((e) => e.type === 'skill')).toBe(true);
  });
  it('filters by keyword facet', () => {
    const results = en.search('', { keywords: ['sdd'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.keywords.includes('sdd'))).toBe(true);
  });
  it('sorts by name', () => {
    const names = en.search('', { types: ['skill'], sort: 'name' }).map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('translated descriptions', () => {
  // A word that is in no English text of the catalog.
  const WORD = 'вимоги';
  const withTranslation = (stale: boolean): CatalogIndex => ({
    ...index,
    artifacts: index.artifacts.map((a) => a.id === 'sdd-engineering/agent/spec-creator'
      ? { ...a, translations: { uk: { description: `Пише специфікацію: ${WORD}, критерії приймання`, stale } } }
      : a),
  });

  it('finds an artifact by a word that appears only in its Ukrainian translation', () => {
    expect(en.search(WORD)).toHaveLength(0);
    const uk = createSearch(withTranslation(false), 'uk');
    expect(top(WORD, 3, uk).map((e) => e.id)).toContain('sdd-engineering/agent/spec-creator');
  });

  it('ignores a stale translation', () => {
    const uk = createSearch(withTranslation(true), 'uk');
    expect(uk.search(WORD).map((e) => e.id)).not.toContain('sdd-engineering/agent/spec-creator');
  });

  it('still answers English queries in Ukrainian', () => {
    const uk = createSearch(index, 'uk');
    expect(top('drizzle transactions', 3, uk).map(label)).toContain('engineering-paved-path skill drizzle-orm-patterns');
  });
});
