// Shared helpers for reading the marketplace catalog and plugin contents.
// No dependencies: runs on plain Node >= 20.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

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
    // `claude plugin eval` output: local, git-ignored, holds absolute paths.
    if (name === 'results' && basename(dir) === 'evals') continue;
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

// Agent and command files are Markdown with frontmatter. A .md file without one
// (a README next to the agents) is not a component: Claude Code does not load it,
// so the catalog does not list it either.
export function strayMarkdown(dir) {
  const out = [];
  for (const type of ['agents', 'commands']) {
    const typeDir = join(dir, type);
    if (!existsSync(typeDir)) continue;
    for (const file of walk(typeDir).filter((f) => f.endsWith('.md'))) {
      if (!readFrontmatter(file).data) out.push(file);
    }
  }
  return out;
}

// Lists skills, agents, commands, hooks and MCP servers from their default locations.
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
      const parsed = readFrontmatter(file);
      if (parsed.data) components.push({ type: type.slice(0, -1), file, ...parsed });
    }
  }
  if (existsSync(join(dir, 'hooks', 'hooks.json'))) {
    const file = join(dir, 'hooks', 'hooks.json');
    const config = readJson(file);
    const hooks = config.hooks ?? {};
    for (const [event, groups] of Object.entries(hooks)) {
      // A hook has no description; its matchers and commands are its searchable content.
      const body = groups.map((g) => [
        g.matcher ? `matcher: ${g.matcher}` : null,
        ...(g.hooks ?? []).map((h) => h.command ?? h.url ?? h.prompt ?? ''),
      ].filter(Boolean).join('\n')).join('\n');
      components.push({ type: 'hook', file, data: { name: event, description: config.description ?? null }, body });
    }
  }
  if (existsSync(join(dir, '.mcp.json'))) {
    const file = join(dir, '.mcp.json');
    for (const [name, cfg] of Object.entries(readJson(file).mcpServers ?? {})) {
      const body = [cfg.command, ...(cfg.args ?? []), cfg.url].filter(Boolean).join(' ');
      components.push({ type: 'mcp', file, data: { name }, body });
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
