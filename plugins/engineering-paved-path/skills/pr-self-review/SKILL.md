---
name: pr-self-review
description: "Local pre-PR self-review of every open change in the repository (branch commits since the base branch, staged, unstaged, untracked): runs fast deterministic checks (secrets, do-not-touch and generated paths, package typecheck and architecture checks, Zod 4 imports, coupled files), then reviews UI files with the frontend skills (frontend-ui-architecture, react-best-practices, react-testing-library) and backend files with the backend skills (onion-architecture, fastify-best-practices, drizzle-orm-patterns, postgresql-table-design), plus zod, typescript-expert and security on both, and returns a PASS or BLOCKED verdict. Any confirmed CRITICAL blocks. Use before `gh pr create`, `gh pr merge` or `git push`, and whenever the user asks to self-review, pre-review, check the branch or the diff before a PR, run PR checks locally, or asks 'is this ready for a PR' / 'can I push' — even if they never name the skill. Not for reviewing someone else's GitHub PR and not a hunt for logic bugs."
metadata:
  version: 2.0.0
disable-model-invocation: true
---

# PR Self-Review

Catch what a reviewer would reject **before** the PR exists. Two halves: cheap
deterministic checks that are facts, then skill-driven review of the changed
lines, split between a frontend and a backend reviewer. One confirmed CRITICAL
means the verdict is BLOCKED, and a BLOCKED branch is not pushed or turned into a
PR by Claude.

No tests run here, on purpose — the self-review must stay fast. CI runs them.

The routing table, the severity scale and the precheck script live in the
`engineering-paved-path:review-kit` skill. Load it with the `Skill` tool first;
its text gives the paths of its files.

## Workflow

Copy this checklist and work through it:

```
Self-review:
- [ ] 1. Load review-kit, read project rules
- [ ] 2. Run precheck
- [ ] 3. Plan the review
- [ ] 4. Review (inline or subagents)
- [ ] 5. Verify every CRITICAL
- [ ] 6. Verdict + verdict.json
- [ ] 7. Report
```

### 1. Load review-kit, read project rules

Load `engineering-paved-path:review-kit`. Then read the root `CLAUDE.md`, the
`CLAUDE.md` of each package the diff touches, and their `INSIGHTS.md` if they
exist. Say in one line which entries bear on this diff.

### 2. Run precheck

Run the precheck command from review-kit (`precheck.mjs [base-branch]`). It
prints `FILE` records (package, kind, status, path) and one line per check:
`CRITICAL`, `MAJOR`, `SIGNAL`, `DETAIL`, `PASS`, `SKIP`, then `SUMMARY`. It runs
the configured or detected checks of touched packages in parallel.

- `SKIP all — no open changes` → report "nothing to review" and stop.
- A precheck CRITICAL is a fact. Keep going anyway: the user wants the full list
  in one pass, not one blocker at a time.

### 3. Plan the review

Reviewable files are those with kind `code`, `test` or `config`. `doc`,
`lockfile` and `other` are listed as "not reviewed"; `protected` and `generated`
are precheck's.

Split reviewable files by area — frontend or backend — as review-kit's routing
says. Root config (`.claude/**`, `scripts/**`, CI yaml) is glanced at by the
orchestrator, no subagent.

**Inline or subagents:**

- ≤ 8 reviewable files and a single area → review inline yourself, same brief.
- Otherwise → one subagent per non-empty area, spawned **in one message** so they
  run in parallel. An area with > 40 files is split in two subagents by top-level
  folder.

### 4. Review

Subagent prompt: `references/reviewer-brief.md`, slots filled with the file
list, base sha, the precheck lines for that area and the review-kit paths. Each
reviewer returns JSON findings on review-kit's severity scale. Inline review
follows the same brief and the same output shape.

Merge the results: drop duplicates (same file, line and rule), and turn each
confirmed SIGNAL into a finding at the severity the reviewer gave.

### 5. Verify every CRITICAL

For each reviewer CRITICAL (C6–C13), open the cited line yourself and confirm the
three points in review-kit's severity.md → Verification. Anything unconfirmed
drops to MAJOR with "(unconfirmed critical)". This step is what keeps the gate
from blocking on noise; do not skip it for "obvious" ones.

### 6. Verdict

- **BLOCKED** — at least one CRITICAL remains after verification and overrides.
- **PASS** — none. MAJORs do not block, but they are listed first.

Write `.claude/pr-self-review/verdict.json` and make sure the folder is
gitignored (add `.claude/pr-self-review/` to `.gitignore` if it is not):

```json
{
  "verdict": "BLOCKED",
  "base": "<sha>", "head": "<sha>", "diffHash": "<DIFF_HASH from precheck>",
  "generatedAt": "<ISO time>",
  "criticals": [{ "code": "C8", "file": "…", "line": 264, "rule": "…", "problem": "…" }],
  "overrides": [{ "code": "C9", "file": "…", "line": 170, "reason": "user's words", "at": "<ISO time>" }],
  "counts": { "critical": 1, "major": 3, "minor": 5, "nit": 2 }
}
```

### 7. Report

```
PR self-review — BLOCKED (1 critical, 3 major, 7 minor/nit)   base main @ c6af1e4

CRITICAL
  C8  api/src/modules/orders/service.ts:88 — multi-table write without a transaction
      → fetch first, then wrap the writes in one transaction (onion-architecture §6)
MAJOR
  …
Checks: typecheck-api ✓ typecheck-web ✓ · arch-check-api ✓ · secrets ✓ · zod ✓ · coupled files ✓
Not reviewed: 12 docs, 1 lockfile
```

Then:

- BLOCKED → offer to fix the CRITICALs; mechanical ones (an import moved, a type
  taken from the right module) can be applied on a yes, then rerun from step 2.
- PASS → offer a "Self-review" block for the PR description (verdict, checks,
  MAJORs left open, overrides with reasons).
- Either way, suggest a correctness review (`/code-review`) for logic bugs: this
  skill checks conventions and architecture, not correctness.

## The gate

Claude does **not** run `gh pr create`, `gh pr merge` or `git push` for this
branch when:

- there is no `verdict.json`, or its `verdict` is `BLOCKED`, or
- the diff changed since: rerun review-kit's `collect-diff.mjs` and compare its
  `DIFF_HASH` with the file's `diffHash`. Different → run the self-review again.

Say which of the three it was and offer to run the review. There is no hook
behind this rule: it binds Claude, not a human pushing from a terminal.

## Override

An override accepts one specific CRITICAL — a false positive, or a risk taken on
purpose — without fixing it.

- Only C6–C13 can be overridden. C1–C5 (secret, failing check, architecture
  check or baseline, do-not-touch, Zod 4) are facts: they get fixed, never
  overridden.
- Only on an explicit user message that names the finding and gives a reason
  ("override C9 in orders/routes.ts:170 — debt, extracted in the next PR").
  Claude never proposes an override and never reads one into "ok", "push it" or
  "ship".
- It is recorded in `verdict.json` → `overrides` and must appear in the PR
  description's Self-review block.
- It is valid for the current `diffHash` only. Any change to the diff → the
  finding is reviewed again.

## After the task

If the project uses `INSIGHTS.md` files (the `sdd-engineering:engineering-insights`
skill), offer to capture a lesson. A false positive belongs there only if it is a
repo trap; a noisy check belongs in `.claude/paved-path.json`. A bug caused by
editing one side of a duplicated rule is a new `coupled` pair there.

## Reference files

| File | Read when |
|---|---|
| `references/reviewer-brief.md` | spawning a reviewer subagent, or reviewing inline |
| review-kit's `references/routing.md` | planning the review: which skill sections apply to which files |
| review-kit's `references/severity.md` | classifying a finding, verifying a CRITICAL, deciding if it can be overridden |
| review-kit's `references/project-config.md` | a check misfires or a project rule is missing |
