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
