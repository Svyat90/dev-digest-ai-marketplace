#!/usr/bin/env node
// Collects every open change on the branch — commits since the merge-base with
// the base branch, staged, unstaged and untracked files — and classifies each
// file by package and kind. Prints one record per line:
//
//   BASE <sha>
//   HEAD <sha>
//   DIFF_HASH <sha256>        # changes whenever any reviewed byte changes
//   FILE <package> <kind> <status> <path> [<old path>]   # old path on renames
//
// package: a package from .claude/paved-path.json or detected (see project.mjs), or root
// kind:    code | test | config | doc | protected | generated | lockfile | other
// status:  A | M | D | R | ?? (untracked)
//
// Usage: node collect-diff.mjs [base-branch]   (default: config "base", else main)
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { git, loadProject, packageOf, repoRoot } from './project.mjs';

const LOCKFILE = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|Cargo\.lock|poetry\.lock|go\.sum)$/;
const TEST = /(\.(test|spec|it\.test)\.[cm]?[jt]sx?$)|(^|\/)(__tests__|test|tests)\//;
const DOC = /(\.(md|mdx|txt|rst)$)|(^|\/)(docs|specs)\//;
const CONFIG = /((^|\/)(package\.json|tsconfig[^/]*\.json|\.dependency-cruiser[^/]*)$)|(\.config\.[cm]?[jt]s$)|(\.(ya?ml|toml)$)|(^\.claude\/)|(^scripts\/)|(^\.github\/)/;
const CODE = /\.([cm]?[jt]sx?|css|scss|json|py|go|rs|java|kt|rb|php|sql|vue|svelte)$/;

export function kindOf(project, path) {
  if (project.generated.some((g) => path.startsWith(g.path))) return 'generated';
  if (project.doNotTouch.some((p) => path.startsWith(p))) return 'protected';
  if (LOCKFILE.test(path)) return 'lockfile';
  if (TEST.test(path)) return 'test';
  if (DOC.test(path)) return 'doc';
  if (CONFIG.test(path)) return 'config';
  if (CODE.test(path)) return 'code';
  return 'other';
}

export function collect(baseArg) {
  const root = repoRoot();
  process.chdir(root);
  const project = loadProject(root);
  let baseRef = baseArg ?? project.base;
  try {
    git(['rev-parse', '--verify', '--quiet', baseRef]);
  } catch {
    baseRef = `origin/${baseRef.replace(/^origin\//, '')}`;
  }
  const base = git(['merge-base', 'HEAD', baseRef]).trim();
  const head = git(['rev-parse', 'HEAD']).trim();

  const tracked = git(['diff', '--name-status', '--find-renames', base, '--']).split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);

  const hash = createHash('sha256');
  hash.update(git(['diff', '--binary', base, '--']));
  for (const f of untracked) {
    hash.update(`\n@@untracked ${f}\n`);
    try {
      hash.update(readFileSync(f));
    } catch {
      // unreadable (socket, permission) — the name still counts
    }
  }

  const files = [];
  for (const line of tracked) {
    const [status, a, b] = line.split('\t');
    // Renames print "R100<TAB>old<TAB>new"; review the new path, keep the old one.
    const path = b ?? a;
    files.push({ pkg: packageOf(project, path), kind: kindOf(project, path), status: status[0], path, old: b ? a : null });
  }
  for (const path of untracked) {
    files.push({ pkg: packageOf(project, path), kind: kindOf(project, path), status: '??', path, old: null });
  }
  return { project, base, head, diffHash: hash.digest('hex'), files };
}

export function format({ base, head, diffHash, files }) {
  return [
    `BASE ${base}`,
    `HEAD ${head}`,
    `DIFF_HASH ${diffHash}`,
    ...files.map((f) => `FILE ${f.pkg} ${f.kind} ${f.status} ${f.path}${f.old ? ` ${f.old}` : ''}`),
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(format(collect(process.argv[2])));
}
