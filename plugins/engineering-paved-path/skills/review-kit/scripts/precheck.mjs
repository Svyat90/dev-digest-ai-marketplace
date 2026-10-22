#!/usr/bin/env node
// Deterministic half of a review: cheap, objective checks that run before any
// model reads the diff. Prints collect-diff.mjs's records, then one line per
// result:
//
//   CRITICAL <check> <location> — <message>   # blocks; see references/severity.md
//   MAJOR    <check> <location> — <message>
//   SIGNAL   <check> <location> — <message>   # grep hint; a reviewer must confirm it
//   DETAIL   <check> <location> — <message>   # tool output backing the CRITICAL after it
//   PASS     <check>
//   SKIP     <check> — <reason>
//   SUMMARY critical=<n> major=<n> signal=<n>
//
// Project facts (packages, checks, do-not-touch paths, coupled files) come from
// .claude/paved-path.json when present, else are detected: references/project-config.md.
// No tests run here, by design: the check has to stay fast.
// Exit code: 1 when any CRITICAL was reported, 0 otherwise, 2 on setup failure.
//
// Usage: node precheck.mjs [base-branch]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collect, format } from './collect-diff.mjs';
import { git } from './project.mjs';

let collected;
try {
  collected = collect(process.argv[2]);
} catch (e) {
  console.error(`precheck: cannot collect the diff — ${e.message}`);
  process.exit(2);
}
const { project, base, files } = collected;
console.log(format(collected));
if (!project.configFound) console.log('SKIP config — no .claude/paved-path.json; packages and checks were detected');

const counts = { CRITICAL: 0, MAJOR: 0, SIGNAL: 0 };
const report = (severity, check, location, message) => {
  if (severity in counts) counts[severity]++;
  console.log(`${severity} ${check} ${location} — ${message}`);
};
const pass = (check, before, severity = 'CRITICAL') => {
  if (counts[severity] === before) console.log(`PASS ${check}`);
};
const paths = new Set(files.map((f) => f.path));

if (files.length === 0) {
  console.log(`SKIP all — no open changes against ${base}`);
  console.log('SUMMARY critical=0 major=0 signal=0');
  process.exit(0);
}

// --- 1. Do-not-touch and generated paths ------------------------------------
// Generated files (migrations, codegen) may be ADDED next to a change in their
// source; editing or deleting an existing one is the violation.
let before = counts.CRITICAL;
for (const f of files) {
  if (f.kind === 'protected') {
    report('CRITICAL', 'do-not-touch', f.path, 'path is listed in doNotTouch (.claude/paved-path.json); revert the edit');
  } else if (f.kind === 'generated') {
    const rule = project.generated.find((g) => f.path.startsWith(g.path));
    const isNew = f.status === 'A' || f.status === '??';
    if (!isNew && !(rule.editable ?? []).includes(f.path)) {
      report('CRITICAL', 'do-not-touch', f.path, `existing generated file edited (${f.status}); regenerate instead${rule.by ? ` (${rule.by})` : ''}`);
    } else if (rule.source && ![...paths].some((p) => p.startsWith(rule.source))) {
      report('MAJOR', 'generated-without-source', f.path, `generated file changed but nothing under ${rule.source} did; was it produced by the generator?`);
    }
  }
}
pass('do-not-touch', before);

// --- Added lines of every reviewable file: { path, line, text } --------------
const added = [];
for (const f of files) {
  if (['protected', 'generated', 'lockfile'].includes(f.kind) || f.status === 'D') continue;
  if (!existsSync(f.path)) continue;
  if (f.status === '??') {
    readFileSync(f.path, 'utf8').split('\n').forEach((text, i) => added.push({ path: f.path, line: i + 1, text }));
    continue;
  }
  const diff = git(['diff', '-M', '-U0', base, '--', ...(f.old ? [f.old] : []), f.path]);
  let n = 0;
  let body = false;
  for (const l of diff.split('\n')) {
    const hunk = /^@@ .*\+(\d+)/.exec(l);
    if (hunk) {
      n = Number(hunk[1]);
      body = true;
    } else if (body && l.startsWith('+') && !l.startsWith('+++')) {
      added.push({ path: f.path, line: n++, text: l.slice(1) });
    }
  }
}
const hits = (pathRe, contentRe) =>
  added.filter((a) => pathRe.test(a.path) && contentRe.test(a.text)).slice(0, 10).map((a) => `${a.path}:${a.line}`);

// --- 2. Secrets ----------------------------------------------------------------
const SECRET = new RegExp([
  'sk-(proj-|or-v1-|ant-)?[A-Za-z0-9_-]{20,}',
  'gh[pousr]_[A-Za-z0-9]{36}',
  'github_pat_[A-Za-z0-9_]{40,}',
  'AKIA[0-9A-Z]{16}',
  '-----BEGIN [A-Z ]*' + 'PRIVATE KEY-----',
  'xox[baprs]-[A-Za-z0-9-]{10,}',
].join('|'));
const FAKE = /fake|dummy|example|placeholder|xxxx|mock|redacted|<your/i;
before = counts.CRITICAL;
for (const a of added.filter((x) => SECRET.test(x.text) && !FAKE.test(x.text)).slice(0, 10)) {
  report('CRITICAL', 'secret', `${a.path}:${a.line}`, 'credential-shaped value in the diff; remove it and rotate the key');
}
for (const p of paths) {
  if (/(^|\/)\.env(\.[A-Za-z0-9_-]+)?$/.test(p) && !/\.env\.(example|sample|template)$/.test(p)) {
    report('CRITICAL', 'secret', p, '.env file in the change set; secrets never go in git');
  }
}
pass('secret', before);

// --- 3. Zod 4 imports in a Zod 3 project -------------------------------------
// zod 3.25 ships `zod/v4`, so Zod 4 API imported that way typechecks cleanly.
if (project.zod === 3) {
  before = counts.CRITICAL;
  for (const h of hits(/\.[cm]?[jt]sx?$/, /['"](zod\/v4|zod\/v4-mini|zod\/mini|@zod\/[a-z]+)['"]/)) {
    report('CRITICAL', 'zod-3-only', h, 'Zod 4 import; the project is on Zod 3');
  }
  pass('zod-3-only', before);
} else {
  console.log(`SKIP zod-3-only — project zod major is ${project.zod ?? 'unknown'}`);
}

// --- 4. Package checks (typecheck, arch-check, …), in parallel --------------
const touched = new Set(files.filter((f) => ['code', 'test', 'config'].includes(f.kind)).map((f) => f.pkg));
const jobs = [];
for (const [name, pkg] of Object.entries(project.packages)) {
  if (!touched.has(name)) continue;
  const dir = join(project.root, pkg.dir);
  for (const [check, cmd] of Object.entries(pkg.checks)) {
    const id = `${check}-${name}`;
    if (existsSync(join(dir, 'package.json')) && !existsSync(join(dir, 'node_modules')) && !existsSync(join(project.root, 'node_modules'))) {
      report('CRITICAL', id, `${pkg.dir}/`, 'cannot run: node_modules is missing; install dependencies and rerun');
      continue;
    }
    jobs.push(new Promise((resolve) => {
      let out = '';
      const child = spawn(cmd, { cwd: dir, shell: true });
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
      child.on('close', (code) => resolve({ id, check, pkg, cmd, code, out }));
    }));
  }
}
const results = await Promise.all(jobs);
for (const r of results) {
  if (r.code === 0) {
    console.log(`PASS ${r.id}`);
    continue;
  }
  const detail = r.out.split('\n').filter((l) => /error/i.test(l)).slice(0, 10);
  for (const l of detail) console.log(`DETAIL ${r.id} ${r.pkg.dir}/ — ${l.trim()}`);
  const hint = r.check === 'arch-check'
    ? 'new architecture violation; fix the import (onion-architecture §9), never re-baseline'
    : `failed; rerun \`${r.cmd}\` in ${r.pkg.dir}/ for the full output`;
  report('CRITICAL', r.id, `${r.pkg.dir}/`, hint);
}
if (jobs.length === 0) console.log('SKIP checks — no package with configured or detected checks was touched');

// --- 5. Architecture baseline must only shrink ------------------------------
for (const bl of [...paths].filter((p) => p.endsWith('.dependency-cruiser-known-violations.json'))) {
  const count = (text) => {
    try {
      return JSON.parse(text).length;
    } catch {
      return 0;
    }
  };
  let prev = null;
  try {
    prev = count(git(['show', `${base}:${bl}`], { stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    // new file
  }
  const now = existsSync(bl) ? count(readFileSync(bl, 'utf8')) : 0;
  const ruleChanged = [...paths].some((p) => /\.dependency-cruiser\.c?[jt]s$/.test(p));
  if (prev === null) report('MAJOR', 'arch-baseline', bl, `baseline introduced with ${now} entries; confirm each is pre-existing debt`);
  else if (now > prev && ruleChanged) report('MAJOR', 'arch-baseline', bl, `baseline grew ${prev} -> ${now} together with a rule change; confirm the new entries are old code caught by the new rule`);
  else if (now > prev) report('CRITICAL', 'arch-baseline', bl, `baseline grew ${prev} -> ${now}; the baseline only shrinks (onion-architecture §9)`);
  else console.log(`PASS arch-baseline (${prev} -> ${now})`);
}

// --- 6. Coupled files and contract copies -----------------------------------
// A change "touches" a symbol when the symbol appears within 10 lines of it.
const touches = (path, symbol) => {
  if (!paths.has(path)) return false;
  if (symbol === '*') return true;
  const f = files.find((x) => x.path === path);
  if (f.status === '??') return readFileSync(path, 'utf8').includes(symbol);
  return git(['diff', '-U10', base, '--', path])
    .split('\n')
    .filter((l) => !/^(\+\+\+|---) /.test(l))
    .some((l) => l.includes(symbol));
};
before = counts.MAJOR;
for (const c of project.coupled) {
  if (touches(c.a, c.symbolA) && !touches(c.b, c.symbolB)) {
    report('MAJOR', 'coupled-files', c.a, `\`${c.symbolA}\` changed but its twin \`${c.symbolB}\` in ${c.b} did not — ${c.why ?? 'coupled in .claude/paved-path.json'}`);
  } else if (touches(c.b, c.symbolB) && !touches(c.a, c.symbolA)) {
    report('MAJOR', 'coupled-files', c.b, `\`${c.symbolB}\` changed but its twin \`${c.symbolA}\` in ${c.a} did not — ${c.why ?? 'coupled in .claude/paved-path.json'}`);
  }
}
// Copies of one contract folder: only the touched file is compared with its twin.
for (const p of paths) {
  for (const pair of project.contractCopies) {
    const from = pair.find((dir) => p.startsWith(dir));
    if (!from) continue;
    for (const to of pair.filter((dir) => dir !== from)) {
      const twin = to + p.slice(from.length);
      if (existsSync(twin) && !paths.has(twin)) {
        report('MAJOR', 'contract-copy', p, `the other copy ${twin} was not changed; decide whether it needs the same edit`);
      }
    }
  }
}
pass('coupled-files', before, 'MAJOR');

// --- 7. Grep signals for the reviewers (never blocking on their own) ---------
for (const s of project.signals) {
  for (const h of hits(new RegExp(s.path), new RegExp(s.pattern))) report('SIGNAL', s.id, h, s.message);
}
// Several writes added to one backend file that has no transaction.
const backendDirs = Object.values(project.packages).filter((p) => p.area === 'backend').map((p) => p.dir);
const writes = new Map();
for (const a of added) {
  const inBackend = backendDirs.length === 0 || backendDirs.some((d) => d === '.' || a.path.startsWith(`${d}/`));
  if (inBackend && /\.[cm]?ts$/.test(a.path) && /\.(insert|update|delete)\(/.test(a.text)) {
    const w = writes.get(a.path) ?? { n: 0, line: a.line };
    w.n++;
    writes.set(a.path, w);
  }
}
for (const [path, w] of writes) {
  if (w.n >= 2 && !readFileSync(path, 'utf8').includes('transaction(')) {
    report('SIGNAL', 'multi-write-no-tx', `${path}:${w.line}`, 'several writes added and no transaction in the file (onion-architecture §6)');
  }
}

console.log(`SUMMARY critical=${counts.CRITICAL} major=${counts.MAJOR} signal=${counts.SIGNAL}`);
process.exit(counts.CRITICAL ? 1 : 0);
