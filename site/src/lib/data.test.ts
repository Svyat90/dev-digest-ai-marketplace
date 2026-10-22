// Data contract checks against the real index, and the parsers build-index.mjs uses.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contentHash, markdownToText, parseChangelog, parseCompatibility, parseTools, translationFor, translationTodo,
} from '../../../scripts/lib/catalog.mjs';
import type { CatalogIndex, Release, Stats } from './types';

const PUBLIC = resolve(import.meta.dirname, '../../public');
const read = <T,>(file: string): T => {
  const path = resolve(PUBLIC, file);
  if (!existsSync(path)) throw new Error(`site/public/${file} is missing — run "npm run build:index" in the repository root`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
};
const index = read<CatalogIndex>('index.json');
const releases = read<Release[]>('releases.json');
const stats = read<Stats>('stats.json');

describe('index.json', () => {
  it('describes sdd-engineering as the spec requires', () => {
    const sdd = index.plugins.find((p) => p.name === 'sdd-engineering')!;
    const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../plugins/sdd-engineering/.claude-plugin/plugin.json'), 'utf8'));
    expect(sdd.version).toBe(manifest.version);
    expect(sdd.compatibility.claudeCode).toBe('>=2.1.110');
    expect(sdd.dependencies).toEqual([
      { name: 'engineering-paved-path', range: '^1.0.0' },
      { name: 'research-tools', range: '^1.0.0' },
      { name: 'architecture-review', range: '^1.0.0' },
    ]);
    for (const d of sdd.dependencies) expect(index.plugins.some((p) => p.name === d.name)).toBe(true);
  });

  it('uses the marketplace install command everywhere', () => {
    for (const p of index.plugins) expect(p.install).toBe(`/plugin install ${p.name}@dev-digest-ai-marketplace`);
    expect(index.addCommand).toBe('/plugin marketplace add Svyat90/dev-digest-ai-marketplace');
  });

  it('links every component id to an artifact of the same plugin', () => {
    const ids = new Set(index.artifacts.map((a) => a.id));
    for (const p of index.plugins) for (const id of p.components) {
      expect(ids.has(id)).toBe(true);
      expect(id.startsWith(`${p.name}/`)).toBe(true);
    }
  });

  it('writes a body for every artifact and README', () => {
    for (const a of index.artifacts) expect(existsSync(resolve(PUBLIC, 'bodies', a.plugin, `${a.type}-${a.name}.md`))).toBe(true);
    for (const p of index.plugins) expect(existsSync(resolve(PUBLIC, 'bodies', p.name, 'README.md'))).toBe(true);
  });

  it('counts per type in stats.json match the index', () => {
    expect(stats.counts.plugin).toBe(index.plugins.length);
    const artifacts = Object.entries(stats.counts).filter(([k]) => k !== 'plugin').reduce((s, [, n]) => s + (n ?? 0), 0);
    expect(artifacts).toBe(index.artifacts.length);
  });

  it('lists releases newest first and never [Unreleased]', () => {
    expect(releases.length).toBeGreaterThan(0);
    expect(releases.every((r) => /^\d+\.\d+\.\d+/.test(r.version))).toBe(true);
    const dates = releases.map((r) => r.date ?? '');
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('parsers', () => {
  it('reads CHANGELOG.md releases, sections and the first bullet as summary', () => {
    const releases = parseChangelog([
      '# Changelog', '', '## [Unreleased]', '', '### Added', '- not yet', '',
      '## [1.1.0] — 2026-11-01', '', '### Added', '- New eval', '  wrapped line', '- Second', '', '### Fixed', '- Bug', '',
      '## [1.0.0] - 2026-10-19', '', '### Added', '- First release',
    ].join('\n'));
    expect(releases).toEqual([
      { version: '1.1.0', date: '2026-11-01', sections: { Added: ['New eval wrapped line', 'Second'], Fixed: ['Bug'] }, summary: 'New eval wrapped line' },
      { version: '1.0.0', date: '2026-10-19', sections: { Added: ['First release'] }, summary: 'First release' },
    ]);
  });

  it('reads COMPATIBILITY.md requirements', () => {
    const text = '| Requirement | Minimum | Why |\n|---|---|---|\n| Claude Code | `>=2.1.110` | deps |\n| Node.js | 18 | hooks |';
    expect(parseCompatibility(text)).toEqual({ claudeCode: '>=2.1.110', node: '18' });
    expect(parseCompatibility('no table')).toEqual({ claudeCode: null, node: null });
  });

  it('reads tools from frontmatter', () => {
    expect(parseTools('Read, Grep, Glob')).toEqual(['Read', 'Grep', 'Glob']);
    expect(parseTools(undefined)).toEqual([]);
  });

  it('turns markdown into searchable text', () => {
    expect(markdownToText('# Title\n\nUse [Drizzle](x.md) `tx` **now**')).toBe('Title Use Drizzle tx now');
  });
});

describe('content translations', () => {
  const english = 'Writes a spec.';
  const entry = { description: 'Пише специфікацію.', source: contentHash(english) };

  it('hashes with the first 8 hex characters of SHA-256', () => {
    expect(contentHash(english)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('marks a translation stale when its English source changes', () => {
    expect(translationFor(entry, english)).toEqual({ description: entry.description, stale: false });
    expect(translationFor(entry, 'Writes a specification.')).toEqual({ description: entry.description, stale: true });
    expect(translationFor(undefined, english)).toBeNull();
  });

  it('lists missing and stale entries for i18n:todo', () => {
    const items = [
      { kind: 'artifacts', key: 'p/agent/a', description: english },
      { kind: 'artifacts', key: 'p/agent/b', description: 'Changed text' },
      { kind: 'plugins', key: 'p', description: 'Plugin' },
    ];
    const content = { artifacts: { 'p/agent/a': entry, 'p/agent/b': { description: 'x', source: '00000000' } } };
    expect(translationTodo(items, content).map((t: { key: string; status: string }) => `${t.key}:${t.status}`))
      .toEqual(['p/agent/b:stale', 'p:missing']);
  });
});
