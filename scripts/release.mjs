#!/usr/bin/env node
// Prepares a plugin release: bumps plugin.json and moves [Unreleased] notes in CHANGELOG.md
// under the new version. The release tag is created by CI after the PR is merged.
//
//   node scripts/release.mjs <plugin> <patch|minor|major|x.y.z> [--dry-run]
//
// See docs/RELEASES.md for which bump to choose.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  fail, resolvePlugin, bump, compareVersions, writeVersion, splitChangelog, addRelease, printNextSteps,
} from './lib/release.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [name, kind] = args.filter((a) => !a.startsWith('--'));

if (!name || !kind) fail('usage: node scripts/release.mjs <plugin> <patch|minor|major|x.y.z> [--dry-run]');

const plugin = resolvePlugin(name);
const current = plugin.manifest.version;
const next = bump(current, kind);

if (compareVersions(next, current) <= 0) {
  fail(`new version ${next} must be greater than current ${current}`);
}

const changelog = readFileSync(plugin.changelogPath, 'utf8');
if (changelog.includes(`## [${next}]`)) fail(`CHANGELOG.md already has a section for ${next}`);

const { notes } = splitChangelog(changelog);
if (!notes) {
  fail('the [Unreleased] section of CHANGELOG.md is empty — describe the changes there first');
}

console.log(`${name}: ${current} → ${next}`);
console.log(`\n## [${next}]\n\n${notes}\n`);

if (dryRun) {
  console.log('(dry run — nothing written)');
  process.exit(0);
}

writeVersion(plugin, next);
writeFileSync(plugin.changelogPath, addRelease(changelog, next, notes));
console.log(`✔ updated ${plugin.relDir}/.claude-plugin/plugin.json and CHANGELOG.md`);
printNextSteps(name, next, 'release');
