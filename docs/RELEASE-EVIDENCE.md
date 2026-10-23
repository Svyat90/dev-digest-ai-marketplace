# Release evidence

One entry per released plugin version: what was released, where the tag points,
and the eval results it shipped with. Newest first. Fill it in after the `tag`
job of `validate.yml` created the tag (see [RELEASES.md](RELEASES.md#tags)).

## How to fill in an entry

```bash
git fetch --tags
git rev-list -n 1 <plugin>--v<version>                 # SHA the tag points to
git tag -l '<plugin>--v*' --sort=-v:refname | head -3  # tag exists, previous versions
claude plugin eval . --eval-dir plugins/<plugin>/evals --scaffold --allow-tools Write Edit Bash \
  --model <pinned model> --no-publish                    # full run, from a checkout at the tag
npm run --silent eval:report -- plugins/<plugin>/evals/results/<timestamp> --commit <sha>
```

Copy the report table, keep the `results/<timestamp>/report.html` path (or the
published link), and note anything that failed and why. A partial run
(`partial: true`, cost ceiling hit) is not evidence: re-run it.

## Template

```markdown
### <plugin> <version> — YYYY-MM-DD

| Field | Value |
| --- | --- |
| Version | `<version>` (plugin.json) |
| Tag | `<plugin>--v<version>` |
| Commit SHA | `<full sha from git rev-list -n 1 <tag>>` |
| PR | #<number> |
| Claude Code | `<version used for the eval run>` |
| Model / judge model | `<--model>` / `<--judge-model or default>` |
| Eval command | `claude plugin eval … ` |
| Report | `plugins/<plugin>/evals/results/<timestamp>/report.html` or link |

Eval results (from `scripts/eval-report.mjs`):

| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| … |

Cases below threshold, with the reason:
- <case> — <failing grader and explanation, or "none">

Smoke check after install (`--case agents-are-namespaced --runs 1 --ablation none`): <score>
Decision: shipped | rolled back to <tag> (see RELEASES.md › Return a project to a stable release)
```

## Entries

### sdd-engineering 1.1.0 — 2026-10-22

| Field | Value |
| --- | --- |
| Version | `1.1.0` (plugin.json) |
| Tag | `sdd-engineering--v1.1.0` |
| Commit SHA | `7ab354263b35d0dcdabdd0687438ff0edaee363f` |
| PR | #5 (replaces #4, closed unmerged) |

Smoke at the tag, 2026-10-22, Claude Code `2.1.309`, from a checkout of the tag:
`claude plugin eval . --eval-dir plugins/sdd-engineering/evals --tag smoke negative --runs 1 --ablation none --scaffold --allow-tools Write Edit Bash --model claude-sonnet-5-5 --no-publish`
(report `plugins/sdd-engineering/evals/results/2026-10-23T01-49-05-678Z/report.html`, local):

| Case | Score | Cost |
| --- | --- | --- |
| agents-are-namespaced | 1.00 | $0.09 |
| spec-creator-asks-clarifications | 1.00 | $0.69 |
| unrelated-request-stays-out-of-sdd | 1.00 | $0.06 |
| workflow-retro-needs-explicit-request | 1.00 | $0.07 |

4/4 cases, $0.90, 173 s. Decision: shipped.

Pre-merge smoke run, 2026-10-22 (4 of 15 cases, 3 runs each, with the baseline arm):

| Field | Value |
| --- | --- |
| Commit | `ebb22fc` (branch `feat/sdd-engineering-1.1.0`; the run had this code, only docs and the version bump came after it) |
| Claude Code | `2.1.308` |
| Model / judge model | `claude-sonnet-5-5` / default (haiku) |
| Eval command | `claude plugin eval . --eval-dir plugins/sdd-engineering/evals --tag smoke negative --runs 3 --scaffold --allow-tools Write Edit Bash --model claude-sonnet-5-5 --no-publish --max-cost-usd 8` |
| Report | `plugins/sdd-engineering/evals/results/2026-10-22T04-49-24-582Z/report.html` (local) |

| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sdd-engineering 1.1.0 | ebb22fc | claude-sonnet-5-5 | not recorded | 24 runs (12 with plugin) | $0.06 | 7 s | 100% · 4/4 cases | 0 |

| Case | With (3 runs) | Without (3 runs) | Δ |
| --- | --- | --- | --- |
| agents-are-namespaced | 1.00 | 0.14 | +0.86 |
| spec-creator-asks-clarifications | 1.00 | 0.44 | +0.56 |
| unrelated-request-stays-out-of-sdd | 1.00 | 1.00 | 0.00 |
| workflow-retro-needs-explicit-request | 1.00 | 1.00 | 0.00 |

Cases below threshold: none.

How `spec-creator-asks-clarifications` got from 0.56 in 1.0.0 to 1.00 in 1.1.0
(each step a 3-run measurement of the case with the plugin):

| Step | Score | What failed |
| --- | --- | --- |
| 1.0.0 | 0.56 | the main session wrote the spec itself in 2 of 3 runs, without `OQ<n>` questions |
| `spec-creator` description leads with the trigger and "never write `specs/` files yourself" | 0.78 | still not dispatched in 1 of 3 runs |
| `spec-writer-guard` hook blocks a new spec file outside `spec-creator` | 0.89 | dispatched in every run; in 1 of 3 the main session relayed the questions as a plain numbered list without the `OQ<n>` ids |
| Grader `open-questions-returned` relaxed (below), fixture index fixed | 1.00 | — |

**Relaxed grader.** `open-questions-returned` used to require an `OQ<n>` id in
the last message. It now also accepts a Markdown heading containing "open
questions" followed by a list. The case checks that the undecided points reach
the user as questions instead of invented numbers, and the run that failed did
exactly that (12 questions with recommended answers) — it only renumbered them.
A bare mention such as "18 open questions" or a heading with no list still fails.
Side effect: the no-plugin arm rose from 0.33 to 0.44, because one baseline run
also listed questions under such a heading.

**Fixture fix.** `evals/_fixtures/notes-app.sh` now writes a `## Index` heading
into `specs/README.md`. Without it `spec-creator-scope` blocked the agent's
index update, since it only allows edits inside that section; no grader checked
it.

### sdd-engineering 1.0.0 — 2026-10-21

| Field | Value |
| --- | --- |
| Version | `1.0.0` (plugin.json) |
| Tag | `sdd-engineering--v1.0.0` |
| Commit SHA | `a70d4bed6b8000c0896e2c0eea7fef1e84811bc4` |
| PR | #3 |
| Claude Code | `2.1.307` |
| Model / judge model | `claude-sonnet-5-5` / default (haiku) |
| Eval command | `claude plugin eval . --eval-dir plugins/sdd-engineering/evals --tag smoke negative --runs 1 --scaffold --allow-tools Write Edit Bash --model claude-sonnet-5-5 --no-publish --max-cost-usd 5` |
| Report | `plugins/sdd-engineering/evals/results/2026-10-22T03-34-52-240Z/report.html` (local) |

Eval results (smoke + negative, one run per case, on `6bce099`, the code the
merge commit carries):

| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sdd-engineering 1.0.0 | 6bce099 | claude-sonnet-5-5 | not recorded | 8 runs (4 with plugin) | $0.06 | 6 s | 75% · 3/4 cases | 0 |

Cases below threshold, with the reason:
- spec-creator-asks-clarifications — 0.33 in this run, 0.56 over 3 runs
  (`results/2026-10-22T03-53-42-856Z`): the main session wrote the spec itself
  in 2 of 3 runs instead of dispatching `spec-creator`. Fixed in 1.1.0.

Smoke check before the merge (`--case agents-are-namespaced --runs 1 --ablation none`, branch `feat/sdd-plugins`): 1.00 ($0.08); not yet repeated at the tag
Decision: shipped; superseded by 1.1.0. As the stable channel it passes
`agents-are-namespaced`, the check in RELEASES.md › Return a project to a
stable release.

`engineering-paved-path`, `research-tools` and `architecture-review` 1.0.0 are
tagged on the same commit (`a70d4be`); they have no eval suite yet.
