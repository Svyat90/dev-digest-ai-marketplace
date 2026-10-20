// Shared helpers for reading the marketplace catalog and plugin contents.
// No dependencies: runs on plain Node >= 20.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadMarketplace() {
  return readJson(join(ROOT, '.claude-plugin', 'marketplace.json'));
}

export function pluginDir(entry) {
  return resolve(ROOT, entry.source);
}

export function loadManifest(dir) {
  const path = join(dir, '.claude-plugin', 'plugin.json');
  return existsSync(path) ? readJson(path) : null;
}

export function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Minimal YAML frontmatter reader: top-level `key: value` pairs only.
export function readFrontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: null, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { data, body: text.slice(match[0].length) };
}

// Lists skills, agents and commands from their default locations.
export function listComponents(dir) {
  const components = [];
  const skillsDir = join(dir, 'skills');
  if (existsSync(skillsDir)) {
    for (const name of readdirSync(skillsDir)) {
      const file = join(skillsDir, name, 'SKILL.md');
      if (existsSync(file)) components.push({ type: 'skill', file, ...readFrontmatter(file) });
    }
  }
  for (const type of ['agents', 'commands']) {
    const typeDir = join(dir, type);
    if (!existsSync(typeDir)) continue;
    for (const file of walk(typeDir).filter((f) => f.endsWith('.md'))) {
      components.push({ type: type.slice(0, -1), file, ...readFrontmatter(file) });
    }
  }
  if (existsSync(join(dir, 'hooks', 'hooks.json'))) {
    const hooks = readJson(join(dir, 'hooks', 'hooks.json')).hooks ?? {};
    for (const event of Object.keys(hooks)) {
      components.push({ type: 'hook', file: join(dir, 'hooks', 'hooks.json'), data: { name: event }, body: '' });
    }
  }
  if (existsSync(join(dir, '.mcp.json'))) {
    for (const name of Object.keys(readJson(join(dir, '.mcp.json')).mcpServers ?? {})) {
      components.push({ type: 'mcp', file: join(dir, '.mcp.json'), data: { name }, body: '' });
    }
  }
  return components;
}

// Rough token estimate for English text: ~4 characters per token.
export function estimateTokens(text) {
  return text ? Math.ceil(text.length / 4) : 0;
}

export function rel(path) {
  return relative(ROOT, path);
}
