# Cost baseline

How much context each plugin costs. Context is money and quality: the more descriptions are loaded, the more every request costs and the worse Claude gets at picking the right skill.

## What we measure

| Metric | What it is | When we pay |
| --- | --- | --- |
| **Idle** | sum of the `description` of every skill/agent/command in the plugin | in **every** session while the plugin is enabled |
| **Invoked** | sum of the bodies of all components | only when a component is invoked |

`npm run build:index -- --cost` (or `node scripts/build-index.mjs --cost`) computes the estimate (≈ 4 characters per token). It is an approximation for comparing versions, not exact billing. For the exact value in a session, use `/context`.

## Budget

- Idle per plugin — **≤ 1,500 tokens**.
- Idle for all plugins in the marketplace — **≤ 3,500 tokens**.
- Body of a single skill — **≤ 2,000 tokens**; beyond that, move material into supporting files that Claude reads on demand.

Raised in 1.0.0 from 300 / 1,500: the SDD workflow needs four agents and the
stack skills they cite, and their descriptions carry the trigger phrases that
decide when Claude picks them. The new limits leave ~15% headroom over the 1.0.0
baseline; growth past them means shortening descriptions or splitting a plugin.

If a PR grows idle cost by more than 20%, update the table below and explain why in the PR.

## Baseline

Updated: 2026-10-19, release 1.0.0 of all four plugins (SDD port, `next-best-practices`, skeleton placeholders removed).

| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |
| --- | --- | --- | --- | --- |
| architecture-review | 1.0.0 | 1 | ~198 | ~1921 |
| engineering-paved-path | 1.0.0 | 15 | ~1334 | ~32237 |
| research-tools | 1.0.0 | 1 | ~170 | ~1463 |
| sdd-engineering | 1.0.0 | 11 | ~1301 | ~23119 |
| **Total** | | **28** | **~3003** | **~58740** |

**Within budget.** The largest descriptions: `spec-creator` ~250,
`frontend-ui-architecture` ~213, `run-plan` ~206, `implementation-planner` ~205,
`onion-architecture` ~199, `architecture-reviewer` ~198 — shorten these first if
a plugin nears its limit. Hooks and skills with `disable-model-invocation`
(`pr-self-review`, `workflow-retro`) cost nothing idle.

CI adds the current table to the summary of every `validate` run.

## Optimization: sdd-engineering 1.1.0

The `spec-creator` description was the largest in the marketplace (~250 tokens)
and put its trigger last; in 1.0.0 the main session often wrote specs itself.
1.1.0 rewrites it trigger-first (1004 → 632 characters) and adds the
`spec-writer-guard` hook, which costs nothing idle.

| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |
| --- | --- | --- | --- | --- |
| sdd-engineering | 1.0.0 | 11 | ~1301 | ~23119 |
| sdd-engineering | 1.1.0 | 11 | ~1208 | ~23144 |
| **Total, all plugins** | 1.1.0 | **28** | **~2910** (−93) | **~58765** |

Cost per successful workflow, case `spec-creator-asks-clarifications` (brief →
dispatched `spec-creator` → draft spec → open questions back to the user),
3 runs with the plugin, `claude-sonnet-5-5`:

| Version | Successful runs | Total cost | Cost per successful workflow | Median time / run |
| --- | --- | --- | --- | --- |
| 1.0.0 | 1 of 3 | $0.86 | **$0.86** | 28 s |
| 1.1.0 | 3 of 3 | $1.71 | **$0.57** (−34%) | 143 s |

A single run costs more in 1.1.0 because the agent now does the full gap
analysis every time; the failed 1.0.0 runs were cheap and useless. Results:
`evals/results/2026-10-22T03-53-42-856Z` (1.0.0) and
`2026-10-22T04-49-24-582Z` (1.1.0).

## Quality gate

A plugin version is releasable when, on the pinned model:

- `check-plugins` and `claude plugin validate --strict` pass (CI `validate`);
- idle cost stays within the budget above;
- the smoke + negative evals (`--tag smoke negative --runs 3`, with the
  baseline arm) score 1.00 in every run with the plugin, with no critical errors;
- cost per successful workflow does not grow by more than 20% over the
  previous release without a reason in the PR.

1.1.0 meets all four (table below); 1.0.0 failed the eval gate
(`spec-creator-asks-clarifications` 0.56), which is why 1.1.0 exists.

## How to update

From the repository root:

```bash
npm run build:index -- --cost
```

It writes the site data to `site/public/` and prints the table above to stdout
(progress goes to stderr, so `npm run --silent build:index -- --cost > table.md`
captures only the table). Paste it above, add the **Total** row, update the date.
CI appends the same table to the summary of every `validate` run.

## Behavioural evals

Context cost says what a plugin costs while idle; evals say what it costs and how
reliably it works when used. The suite of `sdd-engineering` lives in
`plugins/sdd-engineering/evals/` (see its README). After a full run, turn the
result into a table row:

```bash
npm run --silent eval:report -- plugins/sdd-engineering/evals/results/<timestamp> --commit "$(git rev-parse --short HEAD)"
```

The script reads only `aggregate-result.json`. Fields the JSON does not record
(Claude Code 2.1.308 writes neither token counts nor the model, even with
`--model`) print as *not recorded*; the commit comes from `--commit`, because
the JSON has none. *Calls* counts agent runs; *Critical errors* counts runs that
ended with an error or were aborted.

| Plugin | Commit | Model | Tokens | Calls | Median cost / run | Median time / run | Pass rate | Critical errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sdd-engineering 1.0.0 | 6bce099 | claude-sonnet-5-5 | not recorded | 8 runs (4 with plugin) | $0.06 | 6 s | 75% · 3/4 cases | 0 |
| sdd-engineering 1.1.0 | ebb22fc | claude-sonnet-5-5 | not recorded | 24 runs (12 with plugin) | $0.06 | 7 s | 100% · 4/4 cases | 0 |

*Smoke + negative only* (2026-10-22): 4 of 15 cases, so not a full release
baseline. 1.0.0: one run per case (`spec-creator-asks-clarifications` failed).
1.1.0: three runs per case, baseline arm on, total $2.85, 575 s, mean Δ +0.35.
The model column is filled by hand. Details are in
[RELEASE-EVIDENCE.md](RELEASE-EVIDENCE.md); add rows from `eval:report` after
each full run.
