# Architecture Review

Read-only review of a change's architecture: backend onion rings and import
direction, domain purity, frontend layer placement and the client/server
boundary.

## Install

```bash
/plugin marketplace add Svyat90/dev-digest-ai-marketplace
claude plugin install architecture-review@dev-digest-ai-marketplace
```

Installing it also installs `engineering-paved-path` (`^1.0.0`): the reviewer
applies its `onion-architecture`, `frontend-ui-architecture` and `review-kit`
skills.

## Components

| Type | Name | Does |
|---|---|---|
| Agent | `architecture-review:architecture-reviewer` | reviews a branch (default: all open changes against `main`) or a list of paths |

## How the reviewer works

1. Reads the root and package `CLAUDE.md` and `INSIGHTS.md`.
2. Runs the deterministic checks first — the `review-kit` precheck (typecheck,
   the project's architecture check, baseline growth, contract copies) — and
   treats their results as facts.
3. Loads only the skill sections the routing table names for the changed files.
4. Reports findings **only on changed lines**, each with `file:line`, the quoted
   rule it breaks, a concrete failure scenario and a confidence ≥ 80. Debt that
   is already on `main` is listed separately, never as a finding.

Status: `PASS` (no confirmed CRITICAL), `BLOCKED`, or `NEEDS_CONTEXT`.

Ask for it in plain words:

> Run architecture-reviewer on this branch.
> Review the architecture of `api/src/modules/orders/` only.

`sdd-engineering`'s `/run-plan` runs it automatically after the implementation
waves, in parallel with `plan-verifier`.

## Not covered

Style, naming, security and React correctness — use
`/engineering-paved-path:pr-self-review` for the full pre-PR review.

## Versions

Release notes: [CHANGELOG.md](CHANGELOG.md). Requirements (Claude Code `>=2.1.110`): [COMPATIBILITY.md](COMPATIBILITY.md).

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
