// Shared helpers for scripts/release.mjs and scripts/rollback.mjs.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadMarketplace, pluginDir } from './plugins.mjs';

export const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const UNRELEASED = /^## \[Unreleased\][^\n]*\n/m;

export function fail(message) {
  console.error(`✘ ${message}`);
  process.exit(1);
}

export function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

export function tagFor(plugin, version) {
  return `${plugin}--v${version}`;
}

export function today() {
  return new Date().toLocaleDateString('sv-SE'); // local date, YYYY-MM-DD
}

// Returns { entry, dir, manifestPath, manifest, changelogPath } or exits.
export function resolvePlugin(name) {
  if (!name) fail('plugin name is required');
  const entry = loadMarketplace().plugins.find((p) => p.name === name);
  if (!entry) fail(`plugin "${name}" is not listed in .claude-plugin/marketplace.json`);
  const dir = pluginDir(entry);
  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  return {
    entry,
    dir,
    relDir: `plugins/${name}`,
    manifestPath,
    manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
    changelogPath: join(dir, 'CHANGELOG.md'),
  };
}

export function parseVersion(version) {
  const m = SEMVER.exec(version ?? '');
  if (!m) fail(`"${version}" is not a SemVer version`);
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null };
}

// Negative if a < b, positive if a > b. Pre-release sorts below its release.
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k];
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  return x.pre < y.pre ? -1 : 1;
}

export function bump(version, kind) {
  const v = parseVersion(version);
  if (kind === 'major') return `${v.major + 1}.0.0`;
  if (kind === 'minor') return `${v.major}.${v.minor + 1}.0`;
  if (kind === 'patch') return v.pre ? `${v.major}.${v.minor}.${v.patch}` : `${v.major}.${v.minor}.${v.patch + 1}`;
  parseVersion(kind);
  return kind;
}

export function writeVersion(plugin, version) {
  const manifest = { ...plugin.manifest, version };
  writeFileSync(plugin.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

// Splits CHANGELOG.md into the text up to and including the [Unreleased] heading,
// the unreleased notes, and the rest (older releases).
export function splitChangelog(text) {
  const m = UNRELEASED.exec(text);
  if (!m) fail('CHANGELOG.md has no "## [Unreleased]" section');
  const headEnd = m.index + m[0].length;
  const rest = text.slice(headEnd);
  const next = rest.search(/^## \[/m);
  const notesEnd = next === -1 ? rest.length : next;
  return {
    head: text.slice(0, headEnd),
    notes: rest.slice(0, notesEnd).trim(),
    tail: rest.slice(notesEnd),
  };
}

// Writes a new release section right under an emptied [Unreleased] heading.
export function addRelease(text, version, notes) {
  const { head, tail } = splitChangelog(text);
  return `${head}\n## [${version}] — ${today()}\n\n${notes.trim()}\n\n${tail.trimStart()}`;
}

export function printNextSteps(plugin, version, kind) {
  const branch = `${kind}/${plugin}-${version}`;
  console.log(`
Next steps:
  git switch -c ${branch}        # if you are not on a feature branch yet
  git add plugins/${plugin}
  git commit -m "chore(${plugin}): ${kind} ${version}"
  git push -u origin HEAD                # open a PR; CI creates tag ${tagFor(plugin, version)} after merge`);
}
