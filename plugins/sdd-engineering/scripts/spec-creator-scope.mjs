#!/usr/bin/env node
// PreToolUse guard for the spec-creator agent.
//
//   Bash   → only an allow-list of read-only commands, no redirects or pipes
//            into writers.
//   Write  → only a NEW spec file (or a new README.md index) in a spec folder.
//   Edit   → an existing draft spec with a Spec ID; the "## Index" section of
//            specs/README.md; append-only edits to a package specs/README.md
//            and to the "## Read when" section of <pkg>/CLAUDE.md.
//   Status → an edit of ONLY a `Status:` line asks the user for permission.
//
// Runs for every Write/Edit/Bash in the session; acts only inside spec-creator.
// Exit 2 blocks; stdout JSON with permissionDecision "ask" prompts the user.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { firedIn, packages, projectRoot, readHookInput, specFolders } from './lib/project.mjs';

const SPEC_NAME = /^\d{2}-[a-z0-9]+(-[a-z0-9]+){0,2}-\d{4}-\d{2}-\d{2}\.md$/;
const STATUS_ONLY = /^Status: \S+$/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LINT = escape(`${process.env.CLAUDE_PLUGIN_ROOT ?? ''}/scripts/lint-spec.mjs`);

const BASH_ALLOWED = [
  /^(ls|wc|head|cat)( [^;&|<>`$]*)?$/,
  /^grep( [^;&|<>`$]*)?$/,
  /^git (log|diff|show|status|branch --show-current)( [^;&|<>`$]*)?$/,
  /^date \+%F$/,
  new RegExp(`^node "?${LINT}"? [\\w./-]+$`),
];

const deny = (msg) => {
  console.error(`spec-creator blocked: ${msg}`);
  process.exit(2);
};
const ask = (reason) => {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
};
// [start, end) of a "## <title>" section, or null.
const sectionRange = (text, title) => {
  const m = new RegExp(`^## ${title}\\s*$`, 'm').exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return [m.index, next === -1 ? text.length : m.index + m[0].length + next];
};
const inside = (text, needle, range) => {
  const at = text.indexOf(needle);
  return needle !== '' && range && at >= range[0] && at + needle.length <= range[1];
};

const input = await readHookInput();
if (!firedIn(input, 'spec-creator')) process.exit(0);
const tool = input.tool_name;
const args = input.tool_input ?? {};

if (tool === 'Bash') {
  const cmd = String(args.command ?? '').trim();
  if (!BASH_ALLOWED.some((re) => re.test(cmd))) {
    deny(
      `Bash is read-only for this agent. Allowed: ls, wc, head, cat, grep, ` +
        `git log|diff|show|status, date +%F, the plugin's lint-spec.mjs <spec> — ` +
        `one command, no pipes, redirects, ";" or "&&". Got: ${cmd.slice(0, 120)}`,
    );
  }
  process.exit(0);
}

if (typeof args.file_path !== 'string') process.exit(0);

const root = projectRoot();
const abs = resolve(root, args.file_path);
const rel = relative(root, abs).split('\\').join('/');
const name = basename(rel);
const exists = existsSync(abs);
const current = exists ? readFileSync(abs, 'utf8') : '';

const inSpecDir = specFolders(root).includes(dirname(rel));
const isReadme = name === 'README.md';
const isRootIndex = rel === 'specs/README.md';
const isPkgClaude = packages(root).some((p) => rel === `${p}/CLAUDE.md`);

if (!inSpecDir && !isPkgClaude) {
  deny(
    `${rel} is outside the write scope (specs/*.md, <pkg>/specs/*.md, ` +
      `<pkg>/CLAUDE.md › Read when).`,
  );
}

if (tool === 'Write') {
  if (exists) deny(`${rel} already exists — Write may only create new files; use Edit.`);
  if (isPkgClaude) deny(`${rel} must be edited, never created or overwritten.`);
  if (!isReadme && !SPEC_NAME.test(name)) {
    deny(`new spec files must be named <NN>-<slug>-<YYYY-MM-DD>.md (got ${name}).`);
  }
  const status = /^Status:\s*(\S+)/m.exec(args.content ?? '')?.[1];
  if (!isReadme && status !== 'draft') {
    ask(`New spec ${name} sets Status: ${status ?? '(missing)'} instead of draft. Allow?`);
  }
  process.exit(0);
}

if (tool !== 'Edit') deny(`${tool} is not allowed on ${rel}.`);
if (!exists) deny(`${rel} does not exist — Edit needs an existing file.`);
const oldS = args.old_string ?? '';
const newS = args.new_string ?? '';
const appendOnly = oldS !== '' && newS.startsWith(oldS);

if (isPkgClaude) {
  if (!inside(current, oldS, sectionRange(current, 'Read when')) || !appendOnly) {
    deny(`only appending inside the "## Read when" section of ${rel} is allowed.`);
  }
  process.exit(0);
}

if (isRootIndex) {
  if (!inside(current, oldS, sectionRange(current, 'Index'))) {
    deny('only the "## Index" section of specs/README.md may be edited.');
  }
  process.exit(0);
}

if (isReadme) {
  // Package index: append a bullet, or change a bullet that links a numbered spec.
  const specBullets = oldS
    .split('\n')
    .filter((l) => l.trim())
    .every((l) => /^\s*- .*\(\d{2}-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.md\)/.test(l) || /^\s{2,}\S/.test(l));
  if (!appendOnly && !specBullets) {
    deny(`${rel}: only append a bullet or change the bullet of a numbered spec.`);
  }
  process.exit(0);
}

// A spec file. Specs without a Spec ID were written by others: read-only.
if (!/^Spec ID: SPEC-\d{2}-/m.test(current)) {
  deny(`${rel} has no "Spec ID" — it is an existing spec and is never edited.`);
}
// A status change = the Status value differs between old_string and new_string.
// Keeping the same "Status: draft" line as an anchor is an ordinary edit.
const valueOf = (s) => /^Status:\s*(\S+)/m.exec(s)?.[1];
const touchesStatus = valueOf(oldS) !== valueOf(newS);
if (touchesStatus) {
  if (!STATUS_ONLY.test(oldS.trim()) || !STATUS_ONLY.test(newS.trim())) {
    deny('a Status change must be its own Edit: old_string and new_string are one "Status: <value>" line each.');
  }
  const target = newS.trim().slice('Status: '.length);
  const openQs = (current.match(/^- OQ\d+\b/gm) ?? []).length;
  if (target === 'approved' && openQs > 0) {
    deny(`${name} still has ${openQs} open question(s); resolve them before proposing approved.`);
  }
  ask(`Change the Status of ${name}: "${oldS.trim()}" → "${newS.trim()}"?`);
}
const status = /^Status:\s*(\S+)/m.exec(current)?.[1];
if (status !== 'draft') {
  deny(`${name} is ${status}: only a draft may be edited. Write a new spec with Supersedes instead.`);
}
process.exit(0);
