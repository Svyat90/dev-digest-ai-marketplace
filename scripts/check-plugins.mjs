#!/usr/bin/env node
// Team rules that `claude plugin validate` does not enforce.
// See docs/PLUGIN-GUIDELINES.md and docs/SECURITY.md for the reasoning behind each rule.
//
//   node scripts/check-plugins.mjs                    static checks
//   node scripts/check-plugins.mjs --base origin/main also require a version bump for changed plugins

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  ROOT, loadMarketplace, loadManifest, pluginDir, listComponents, walk, rel,
} from './lib/plugins.mjs';

const errors = [];
const warnings = [];
const error = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_FILE_BYTES = 1024 * 1024;
const TEXT_EXT = /\.(md|json|mjs|js|ts|sh|py|ya?ml|txt|toml)$/;

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/\bsk-[A-Za-z0-9]{32,}\b/, 'API secret key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/(api[_-]?key|secret|password|token)["']?\s*[:=]\s*["'][^"'$\s{]{12,}["']/i, 'hardcoded credential'],
];
const NON_ENGLISH = /[Ѐ-ӿ]/;
const ABSOLUTE_PATH =/(^|[\s"'`(=])(\/Users\/[^\s"'`]+|\/home\/[^\s"'`]+|[A-Za-z]:\\Users\\[^\s"'`]+)/;

const base = (() => {
  const i = process.argv.indexOf('--base');
  return i > -1 ? process.argv[i + 1] : null;
})();

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

const marketplace = loadMarketplace();

// --- Catalog rules -----------------------------------------------------------

const names = marketplace.plugins.map((p) => p.name);
const sorted = [...names].sort();
if (names.join() !== sorted.join()) {
  error(`marketplace.json: plugins must be sorted by name (expected: ${sorted.join(', ')})`);
}
for (const [oldName, newName] of Object.entries(marketplace.renames ?? {})) {
  if (names.includes(oldName)) error(`renames: "${oldName}" is still listed in plugins`);
  if (newName !== null && !names.includes(newName) && !(newName in marketplace.renames)) {
    error(`renames: "${oldName}" -> "${newName}" does not resolve`);
  }
}

// --- Per-plugin rules --------------------------------------------------------

for (const entry of marketplace.plugins) {
  const where = `plugins/${entry.name}`;
  const dir = pluginDir(entry);

  if (!KEBAB.test(entry.name)) error(`${where}: name must be kebab-case`);
  if (entry.source !== `./plugins/${entry.name}`) {
    error(`${where}: source must be "./plugins/${entry.name}" (got ${JSON.stringify(entry.source)})`);
  }
  if ('version' in entry) {
    error(`${where}: do not set "version" in marketplace.json — plugin.json is the single source of truth`);
  }
  if (!existsSync(dir)) {
    error(`${where}: directory does not exist`);
    continue;
  }

  const manifest = loadManifest(dir);
  if (!manifest) {
    error(`${where}: .claude-plugin/plugin.json is required`);
    continue;
  }
  if (manifest.name !== entry.name) {
    error(`${where}: plugin.json name "${manifest.name}" must equal marketplace entry name "${entry.name}"`);
  }
  if (!SEMVER.test(manifest.version ?? '')) {
    error(`${where}: plugin.json version must be SemVer (got ${JSON.stringify(manifest.version)})`);
  }
  for (const field of ['description', 'author', 'license', 'keywords', 'repository']) {
    if (!manifest[field]) error(`${where}: plugin.json "${field}" is required`);
  }

  for (const dep of manifest.dependencies ?? []) {
    const depName = typeof dep === 'string' ? dep : dep.name;
    const depMarket = typeof dep === 'string' ? dep.split('@')[1] : dep.marketplace;
    if (depMarket && depMarket !== marketplace.name) {
      if (!(marketplace.allowCrossMarketplaceDependenciesOn ?? []).includes(depMarket)) {
        error(`${where}: dependency "${depName}" comes from "${depMarket}", which is not in allowCrossMarketplaceDependenciesOn`);
      }
    } else if (!names.includes(depName.split('@')[0])) {
      error(`${where}: dependency "${depName}" is not in this marketplace`);
    }
  }

  for (const file of ['README.md', 'CHANGELOG.md']) {
    if (!existsSync(join(dir, file))) error(`${where}: ${file} is required`);
  }
  if (existsSync(join(dir, 'CHANGELOG.md'))) {
    const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
    if (manifest.version && !changelog.includes(`## [${manifest.version}]`)) {
      error(`${where}: CHANGELOG.md has no section for version ${manifest.version} — use scripts/release.mjs`);
    }
    if (!/^## \[Unreleased\]/m.test(changelog)) {
      error(`${where}: CHANGELOG.md must keep a "## [Unreleased]" section`);
    }
  }

  if (existsSync(join(dir, 'bin'))) {
    error(`${where}: top-level bin/ is rejected by claude.ai org sync — move executables to scripts/`);
  }
  if (existsSync(join(dir, 'CLAUDE.md'))) {
    error(`${where}: CLAUDE.md is not loaded from plugins — put instructions in a skill`);
  }

  const components = listComponents(dir);
  if (components.length === 0) error(`${where}: plugin has no components`);
  for (const c of components.filter((c) => ['skill', 'agent', 'command'].includes(c.type))) {
    if (!c.data) error(`${rel(c.file)}: missing YAML frontmatter`);
    else if (!c.data.description) error(`${rel(c.file)}: frontmatter "description" is required`);
    else if (c.data.description.length > 1024) warn(`${rel(c.file)}: description over 1024 chars costs context in every session`);
    if (c.type === 'skill' && c.data && !c.data.name) warn(`${rel(c.file)}: frontmatter "name" is recommended`);
  }

  for (const file of walk(dir)) {
    const size = statSync(file).size;
    if (size > MAX_FILE_BYTES) error(`${rel(file)}: ${(size / 1024 / 1024).toFixed(1)} MiB exceeds the 1 MiB limit`);
    if (!TEXT_EXT.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.startsWith('version https://git-lfs')) error(`${rel(file)}: Git LFS pointer — LFS files are not fetched on install`);
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(text)) error(`${rel(file)}: looks like a ${label}`);
    }
    if (NON_ENGLISH.test(text)) error(`${rel(file)}: contains Cyrillic text — all plugin text must be in English`);
    const abs = text.match(ABSOLUTE_PATH);
    if (abs) error(`${rel(file)}: absolute local path "${abs[2]}" — use \${CLAUDE_PLUGIN_ROOT} or \${CLAUDE_PLUGIN_DATA}`);
  }
}

// --- Version bump against base ----------------------------------------------

if (base) {
  for (const entry of marketplace.plugins) {
    const path = `plugins/${entry.name}`;
    let changed;
    try {
      changed = git(`diff --name-only ${base}...HEAD -- ${path}`).trim();
    } catch (e) {
      error(`cannot diff against ${base}: ${e.stderr?.toString().trim() || e.message}`);
      break;
    }
    if (!changed) continue;

    let baseVersion = null;
    try {
      baseVersion = JSON.parse(git(`show ${base}:${path}/.claude-plugin/plugin.json`)).version;
    } catch {
      continue; // new plugin
    }
    const headVersion = loadManifest(pluginDir(entry))?.version;
    if (baseVersion === headVersion) {
      error(`${path}: files changed but version is still ${headVersion} — run: node scripts/release.mjs ${entry.name} <patch|minor|major>`);
    }
  }
}

// --- Report -------------------------------------------------------------------

for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✘ ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`✔ ${marketplace.plugins.length} plugins passed team checks (${warnings.length} warning(s))`);
