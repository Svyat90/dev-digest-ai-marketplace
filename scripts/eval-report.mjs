#!/usr/bin/env node
// Turns `claude plugin eval` results (aggregate-result.json) into the eval table of
// docs/COST-BASELINE.md. It reports only what the JSON records: a value the JSON
// does not carry is printed as "not recorded", never estimated.
//
//   node scripts/eval-report.mjs <aggregate-result.json | results dir>... [--commit <sha>]
//   npm run eval:report -- plugins/sdd-engineering/evals/results/<timestamp>
//
// --commit names the commit the suite ran against (the JSON has no commit field);
// without it the column says "not recorded".

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const commitAt = args.indexOf('--commit');
const commit = commitAt > -1 ? args[commitAt + 1] : null;
const inputs = args.filter((a, i) => !a.startsWith('--') && i !== commitAt + 1);

if (!inputs.length) {
  console.error('usage: node scripts/eval-report.mjs <aggregate-result.json | results dir>... [--commit <sha>]');
  process.exit(1);
}

const NOT_RECORDED = 'not recorded';

const median = (xs) => {
  const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const usd = (n) => (n === null ? NOT_RECORDED : `$${n.toFixed(2)}`);
const secs = (n) => (n === null ? NOT_RECORDED : `${Math.round(n)} s`);
const pct = (n) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : NOT_RECORDED);

// The model is recorded only when a run or the suite names one (e.g. --model).
const modelOf = (doc) => {
  const found = new Set();
  if (doc.suite?.model) found.add(doc.suite.model);
  for (const c of doc.cases ?? []) {
    if (c.model) found.add(c.model);
    for (const r of c.arms?.with ?? []) if (r.model) found.add(r.model);
  }
  return found.size ? [...found].join(', ') : NOT_RECORDED;
};

// Token counts and tool-call counts are recorded only if a run carries them.
const sumField = (runs, keys) => {
  let total = 0;
  let seen = false;
  for (const r of runs) {
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => o?.[p], r);
      if (typeof v === 'number') {
        total += v;
        seen = true;
      }
    }
  }
  return seen ? total.toLocaleString('en-US') : NOT_RECORDED;
};

function load(path) {
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'aggregate-result.json') : path;
  if (!existsSync(file)) {
    console.error(`✘ ${file} not found`);
    process.exit(1);
  }
  return { file, doc: JSON.parse(readFileSync(file, 'utf8')) };
}

const rows = [];
const notes = [];
for (const input of inputs) {
  const { file, doc } = load(input);
  if (doc.schemaVersion !== 1) notes.push(`${file}: schemaVersion ${doc.schemaVersion}, expected 1 — check the fields below by hand`);
  const cases = doc.cases ?? [];
  const runs = cases.flatMap((c) => [...(c.arms?.with ?? []), ...(c.arms?.without ?? [])]);
  const withRuns = cases.flatMap((c) => c.arms?.with ?? []);
  const errors = cases.flatMap((c) => (c.arms?.with ?? [])
    .filter((r) => r.error || r.aborted)
    .map((r) => `${c.name}: ${r.error ?? `aborted by ${r.aborted.server}/${r.aborted.tool}: ${r.aborted.reason}`}`));
  const plugin = (doc.suite?.plugins ?? []).map((p) => `${p.name} ${p.version}`)[0] ?? NOT_RECORDED;
  const deps = (doc.suite?.plugins ?? []).slice(1).map((p) => `${p.name} ${p.version}`);
  const a = doc.aggregates ?? {};

  rows.push([
    plugin,
    commit ?? NOT_RECORDED,
    modelOf(doc),
    sumField(runs, ['tokens.total', 'usage.totalTokens', 'totalTokens']),
    `${runs.length} runs (${withRuns.length} with plugin)`,
    usd(median(withRuns.map((r) => r.costUsd))),
    secs(median(withRuns.map((r) => r.durationSeconds))),
    `${pct(a.overallPassRate)} · ${a.casesPassed ?? '?'}/${a.casesTotal ?? '?'} cases`,
    errors.length ? `${errors.length}` : '0',
  ]);
  notes.push(`${file}: Claude Code ${doc.claudeVersion ?? NOT_RECORDED}, started ${doc.startedAt ?? NOT_RECORDED}, ` +
    `ablation ${doc.suite?.ablation ?? NOT_RECORDED}, total ${usd(doc.costUsd ?? null)}, ${secs(doc.durationSeconds ?? null)}` +
    (typeof a.meanDelta === 'number' ? `, mean Δ ${a.meanDelta.toFixed(2)}` : '') +
    (deps.length ? `; loaded with ${deps.join(', ')}` : ''));
  if (doc.partial) notes.push(`${file}: PARTIAL (${doc.partialReason ?? 'no reason given'}) — keep it out of the baseline`);
  if (withRuns.some((r) => r.skippedPaidGraders)) notes.push(`${file}: some runs skipped paid graders — scores not comparable`);
  for (const e of errors) notes.push(`critical: ${e}`);
}

console.log([
  '| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.join(' | ')} |`),
].join('\n'));
console.log();
for (const n of notes) console.log(`- ${n}`);
