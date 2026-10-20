---
name: review-kit
description: "Shared review toolkit for planning, implementing and reviewing code with the paved-path skills: which skill and section applies to which file (routing), one severity scale for findings (CRITICAL/MAJOR/MINOR/NIT, codes C1–C13), and a deterministic precheck over the open diff (secrets, do-not-touch and generated paths, Zod 4 imports, package typecheck and architecture checks, coupled files, contract copies). Load it before writing a plan's per-task rules, before implementing a plan task, or before reviewing a diff or a branch, and whenever an agent needs to know which skill sections govern a file. Not a review by itself: pr-self-review and architecture-reviewer use it."
metadata:
  version: 1.0.0
---

# Review kit

Three tools other skills and agents share, so a planner, an implementer and a
reviewer apply the same rules to the same file.

## 1. Routing — which skill governs which file

Read `${CLAUDE_SKILL_DIR}/references/routing.md`. For each file you plan, write
or review, take the rows that match it and load **only the listed sections** of
the listed skills (all from the `engineering-paved-path` plugin unless named
otherwise). The project's own `CLAUDE.md` files, `INSIGHTS.md` and test policy
add to these rows and win where they disagree.

## 2. Severity — one scale for findings

Read `${CLAUDE_SKILL_DIR}/references/severity.md` before classifying a finding.
Only CRITICAL blocks; every reviewer CRITICAL (C6–C13) must survive the three
verification points there, or it drops to MAJOR.

## 3. Precheck — the deterministic half

```sh
node "${CLAUDE_SKILL_DIR}/scripts/precheck.mjs" [base-branch]
```

It prints `FILE` records (package, kind, status, path), one line per check
(`CRITICAL`, `MAJOR`, `SIGNAL`, `DETAIL`, `PASS`, `SKIP`) and a `SUMMARY`. A
precheck CRITICAL is a fact from a tool, not an opinion. `SIGNAL` lines are grep
hints a reviewer confirms or dismisses. Only the diff hash and the file list:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/collect-diff.mjs" [base-branch]
```

Line format and every check: the header of `scripts/precheck.mjs`.

## Project config

What the scripts cannot guess — package folders and their check commands,
do-not-touch and generated paths, coupled files, contract copies, extra grep
signals — comes from the project's optional `.claude/paved-path.json`. Schema and
defaults: `${CLAUDE_SKILL_DIR}/references/project-config.md`. When the precheck
prints `SKIP config`, say once that adding the file would make the checks
sharper; never write it without the user asking.

## Reference files

| File | Read when |
|---|---|
| `references/routing.md` | planning, implementing or reviewing: which skill sections apply to which files |
| `references/severity.md` | classifying a finding, verifying a CRITICAL, deciding if it can be overridden |
| `references/project-config.md` | the precheck misses a project rule, or the user asks how to configure it |
| `scripts/precheck.mjs` | reading its output format, or a check misfires |
