// Parsers for the catalog site data (docs/SITE-SPEC.md → Data contract).
// Pure functions, no dependencies: used by build-index.mjs, i18n-todo.mjs and
// the site's Vitest suite.

import { createHash } from 'node:crypto';

// `## [1.2.0] — 2026-10-19` (em dash, en dash or hyphen). [Unreleased] is skipped.
const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\](?:\s*[—–-]\s*(\d{4}-\d{2}-\d{2}))?/;

// Returns one entry per released version, in file order (newest first by convention).
export function parseChangelog(text) {
  const releases = [];
  let current = null;
  let section = null;
  let bullet = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const m = RELEASE_HEADING.exec(line);
      current = m ? { version: m[1], date: m[2] ?? null, sections: {} } : null;
      if (current) releases.push(current);
      section = null;
      bullet = null;
      continue;
    }
    if (!current) continue;
    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      section = heading[1].trim();
      current.sections[section] = [];
      bullet = null;
      continue;
    }
    const item = /^[-*] (.+)$/.exec(line);
    if (item && section) {
      bullet = item[1].trim();
      current.sections[section].push(bullet);
    } else if (bullet !== null && section && /^\s+\S/.test(line)) {
      // Continuation line of a wrapped bullet.
      const list = current.sections[section];
      list[list.length - 1] += ' ' + line.trim();
    } else if (!line.trim()) {
      bullet = null;
    }
  }
  for (const r of releases) {
    r.summary = Object.values(r.sections).find((items) => items.length)?.[0] ?? null;
  }
  return releases;
}

// Reads the requirements table of COMPATIBILITY.md: `| Claude Code | \`>=2.1.110\` | … |`.
export function parseCompatibility(text) {
  const out = { claudeCode: null, node: null };
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 4) continue;
    const value = cells[2].replace(/`/g, '').trim();
    if (/^claude code$/i.test(cells[1])) out.claudeCode ??= value;
    if (/^node(\.js)?$/i.test(cells[1])) out.node ??= value;
  }
  return out;
}

// First 8 hex characters of the SHA-256 of the English source text.
export function contentHash(text) {
  return createHash('sha256').update(text ?? '', 'utf8').digest('hex').slice(0, 8);
}

// Picks the translation of one item for one language: null when there is none,
// otherwise the text and whether its English source changed since it was made.
export function translationFor(entry, english) {
  if (!entry?.description) return null;
  return { description: entry.description, stale: entry.source !== contentHash(english) };
}

// Lists the content entries of a language that are missing or stale.
export function translationTodo(items, content) {
  const todo = [];
  for (const item of items) {
    if (!item.description) continue;
    const entry = content?.[item.kind]?.[item.key];
    const hash = contentHash(item.description);
    if (!entry?.description) todo.push({ ...item, status: 'missing', hash });
    else if (entry.source !== hash) todo.push({ ...item, status: 'stale', hash });
  }
  return todo;
}

// Markdown to plain text for the search index: keeps words, drops syntax.
export function markdownToText(md) {
  return (md ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^```.*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#|~]+/g, ' ')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// `tools: Read, Grep` or `allowed-tools: Read Write` → ['Read', 'Grep'].
export function parseTools(value) {
  if (!value) return [];
  return value.replace(/^\[|\]$/g, '').split(/[,\s]+/).map((t) => t.replace(/^["']|["']$/g, '')).filter(Boolean);
}
