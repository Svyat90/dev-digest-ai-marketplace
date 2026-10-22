// Project facts for the review-kit scripts: the optional .claude/paved-path.json
// (schema: ../references/project-config.md) plus what can be detected from the repo.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}

export function repoRoot() {
  return git(['rev-parse', '--show-toplevel']).trim();
}

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

function packageManager(root, dir) {
  for (const d of [dir, root]) {
    if (existsSync(join(d, 'pnpm-lock.yaml'))) return 'pnpm run';
    if (existsSync(join(d, 'yarn.lock'))) return 'yarn run';
    if (existsSync(join(d, 'bun.lockb')) || existsSync(join(d, 'bun.lock'))) return 'bun run';
  }
  return 'npm run --silent';
}

// Package folders: from the config, else top-level folders with their own
// CLAUDE.md or package.json, else the repo root as one package named "root".
function detectPackages(root) {
  const found = readdirSync(root)
    .filter((n) => !n.startsWith('.') && !['node_modules', 'docs', 'specs', 'dist', 'build'].includes(n))
    .filter((n) => statSync(join(root, n)).isDirectory())
    .filter((n) => existsSync(join(root, n, 'CLAUDE.md')) || existsSync(join(root, n, 'package.json')));
  const pkgs = {};
  for (const name of found.length ? found : ['.']) {
    const dir = join(root, name);
    const scripts = readJson(join(dir, 'package.json'))?.scripts ?? {};
    const run = packageManager(root, dir);
    const checks = {};
    if (scripts.typecheck) checks.typecheck = `${run} typecheck`;
    if (scripts['arch:check']) checks['arch-check'] = `${run} arch:check`;
    pkgs[name === '.' ? 'root' : name] = { dir: name, area: null, checks };
  }
  return pkgs;
}

function zodMajor(root, pkgDirs) {
  for (const d of ['.', ...pkgDirs]) {
    const pj = readJson(join(root, d, 'package.json'));
    const v = pj?.dependencies?.zod ?? pj?.devDependencies?.zod;
    const m = v && /(\d+)/.exec(v);
    if (m) return Number(m[1]);
  }
  return null;
}

export function loadProject(root = repoRoot()) {
  const cfg = readJson(join(root, '.claude', 'paved-path.json')) ?? {};
  const packages = cfg.packages
    ? Object.fromEntries(Object.entries(cfg.packages).map(([name, p]) => [
        name,
        { dir: p.dir ?? name, area: p.area ?? null, checks: p.checks ?? {} },
      ]))
    : detectPackages(root);
  const dirs = Object.values(packages).map((p) => p.dir).filter((d) => d !== '.');
  return {
    root,
    configFound: Object.keys(cfg).length > 0,
    base: cfg.base ?? 'main',
    packages,
    doNotTouch: cfg.doNotTouch ?? [],
    generated: cfg.generated ?? [],
    coupled: cfg.coupled ?? [],
    contractCopies: cfg.contractCopies ?? [],
    signals: cfg.signals ?? [],
    zod: cfg.zod ?? zodMajor(root, dirs),
  };
}

// The package a path belongs to: the longest matching package folder.
export function packageOf(project, path) {
  let best = null;
  for (const [name, p] of Object.entries(project.packages)) {
    if (p.dir === '.' || path.startsWith(`${p.dir}/`)) {
      if (!best || p.dir.length > project.packages[best].dir.length) best = name;
    }
  }
  return best ?? 'root';
}
