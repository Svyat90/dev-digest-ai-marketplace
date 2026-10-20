#!/usr/bin/env node
// Rolls a plugin back to the content of an earlier release, shipped as a NEW, higher version.
// Users only receive a change when the version changes, and a lower number would confuse
// tags and changelogs, so a rollback is a forward release with old content.
//
//   node scripts/rollback.mjs <plugin> <target-version> [--dry-run]
//
// Restores plugins/<plugin>/ from tag <plugin>--v<target-version> (files added since are
// removed), keeps the current CHANGELOG.md, sets version to the next patch above current.

import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import {
  fail, git, resolvePlugin, tagFor, bump, compareVersions, parseVersion, writeVersion,
  splitChangelog, addRelease, printNextSteps,
} from './lib/release.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [name, target] = args.filter((a) => !a.startsWith('--'));

if (!name || !target) fail('usage: node scripts/rollback.mjs <plugin> <target-version> [--dry-run]');
parseVersion(target);

const plugin = resolvePlugin(name);
const current = plugin.manifest.version;
const tag = tagFor(name, target);

if (compareVersions(target, current) >= 0) {
  fail(`target ${target} must be lower than current ${current}`);
}
try {
  git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`);
} catch {
  fail(`tag ${tag} not found — run "git fetch --tags" or pick a version from: git tag -l "${name}--v*"`);
}
if (git('status', '--porcelain', '--', plugin.relDir).trim()) {
  fail(`${plugin.relDir} has uncommitted changes — commit or stash them first`);
}

const next = bump(current, 'patch');
const changelog = readFileSync(plugin.changelogPath, 'utf8');
const { notes: discarded } = splitChangelog(changelog);
const reverted = git('tag', '-l', `${name}--v*`).split('\n').filter(Boolean)
  .map((t) => t.slice(`${name}--v`.length))
  .filter((v) => compareVersions(v, target) > 0 && compareVersions(v, current) <= 0)
  .sort(compareVersions);

const notes = [
  '### Reverted',
  `- Restored the content of ${target} (tag \`${tag}\`).`,
  reverted.length ? `- Reverts ${reverted.join(', ')}.` : null,
].filter(Boolean).join('\n');

console.log(`${name}: ${current} → ${next} (content of ${target})`);
console.log(`\n## [${next}]\n\n${notes}\n`);
if (discarded) console.log(`⚠ unreleased changes in CHANGELOG.md will be dropped:\n${discarded}\n`);

if (dryRun) {
  console.log('(dry run — nothing written)');
  process.exit(0);
}

// Remove the directory first so files added after the target release disappear too.
rmSync(plugin.dir, { recursive: true, force: true });
git('checkout', tag, '--', plugin.relDir);

writeVersion({ ...plugin, manifest: JSON.parse(readFileSync(plugin.manifestPath, 'utf8')) }, next);
writeFileSync(plugin.changelogPath, addRelease(changelog, next, notes));

console.log(`✔ restored ${plugin.relDir} from ${tag}, version set to ${next}`);
console.log('  Review with: git status && git diff --staged');
printNextSteps(name, next, 'rollback');
