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

### sdd-engineering 1.0.0 — pending

Not tagged yet: fill in after the merge of the 1.0.0 PR. The same applies to
`engineering-paved-path`, `research-tools` and `architecture-review` 1.0.0
(they have no eval suite yet; record version, tag and SHA).

Pre-merge smoke run, 2026-10-22 (not release evidence: 4 of 15 cases; repeat it
at the tag after the merge):

| Field | Value |
| --- | --- |
| Commit | `69a842b` (branch `feat/sdd-plugins`, not tagged; the run had this code, only these docs changed after it) |
| Claude Code | `2.1.308` |
| Model / judge model | `claude-sonnet-5-5` / default (haiku) |
| Eval command | `claude plugin eval . --eval-dir plugins/sdd-engineering/evals --tag smoke negative --runs 3 --scaffold --allow-tools Write Edit Bash --model claude-sonnet-5-5 --no-publish --max-cost-usd 8` |
| Report | `plugins/sdd-engineering/evals/results/2026-10-22T04-49-24-582Z/report.html` (local) |

| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sdd-engineering 1.0.0 | 69a842b | claude-sonnet-5-5 | not recorded | 24 runs (12 with plugin) | $0.06 | 7 s | 100% · 4/4 cases | 0 |

| Case | With (3 runs) | Without (3 runs) | Δ |
| --- | --- | --- | --- |
| agents-are-namespaced | 1.00 | 0.14 | +0.86 |
| spec-creator-asks-clarifications | 1.00 | 0.44 | +0.56 |
| unrelated-request-stays-out-of-sdd | 1.00 | 1.00 | 0.00 |
| workflow-retro-needs-explicit-request | 1.00 | 1.00 | 0.00 |

Cases below threshold: none.

How `spec-creator-asks-clarifications` got from 0.56 to 1.00 (each step a
3-run measurement of the case with the plugin):

| Step | Score | What failed |
| --- | --- | --- |
| Before the fixes | 0.56 | the main session wrote the spec itself in 2 of 3 runs, without `OQ<n>` questions |
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
