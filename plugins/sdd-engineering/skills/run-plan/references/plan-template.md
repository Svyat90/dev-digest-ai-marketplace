# Implementation plan template

Plans are written by `sdd-engineering:implementation-planner` to
`docs/plans/YYYY-MM-DD-<kebab-topic>.md` and executed by
`/sdd-engineering:run-plan`. A plan is a working document for one feature
branch; lasting behaviour belongs in the spec once the feature ships.

The lint (`scripts/lint-plan.mjs` in this skill) runs on every plan write and
checks: task fields, file ownership per wave, existing or `(new)` paths written
in full, dependencies on earlier waves only, `Rules:` of 5–15 lines with a `§`
source, no file under a `## Do not touch` prefix, and that every spec `AC` is
covered by a task.

````markdown
# <Feature name> — Implementation Plan

Date: YYYY-MM-DD · Branch: feature/<topic> · Status: draft | approved | done

## Goal
<1–3 sentences: what the user gets when this ships.>

## Context
- Request: <the ask, in one line>
- Spec: <SPEC-NN-slug — path, or "none">
- INSIGHTS entries that apply: <entry title — path, or "none">
- Closest existing feature followed: <path>

## Requirements review
<Unclear / contradictory / missing / already there — or "nothing unclear,
contradictory or missing". Every spec `AC` id and the task that covers it.>

## Assumptions
- <point settled by a default instead of a question, and why> (or "none")

## Recommendations
- <how to do it better> — why: … · cost: … (not part of Scope until the user
  accepts it; or "none")

## Scope
- In: …
- Out: …

## Design
<Rings / folders each piece lives in, with the reason from the architecture skill.>

```mermaid
<data flow>
```

### Contracts
<New / changed shapes; every copy the project keeps named.>

### Database
<Tables, columns, indexes, tenant column; migration through the project's generator. "None" if none.>

## Global constraints
- <project-wide rules: Zod major version, test policy, feature-specific rules>

## Do not touch
- `<path prefix>` — <why: vendored, generated, build output>

## Tasks

### Wave 0 — foundation (sequential)

#### T001 — <title>
- Area: backend | frontend
- Agent: implementer
- Depends on: —
- Files (exclusive):
  - `api/src/contracts/orders.ts` (modified)
  - `web/src/contracts/orders.ts` (modified)
- Skills: <skill → sections, from review-kit routing>
- Rules (applied by the agent instead of loading the skills; 5–15 lines):
  - <one concrete, checkable rule for these files> — <skill> §<section>
  - <e.g. the repository owns the queries; the route never builds one> — onion-architecture §5
- Interface (only when another task calls what this task exports, or this task calls another's export):
  - `<name>(<param>: <Type>, …): <ReturnType>` — exported here | (from T00x)
- Steps:
  1. <test to write, and what it asserts>
  2. <change>
- Acceptance criteria:
  - <observable behaviour / shape> (AC<n>)
- Verify (the project's own commands, scoped to this task where they allow it):
  - `<typecheck command for the touched package>`
  - `<test command for this task's test files>`
- Constraints (quoted, not just referenced — the agent does not read the whole INSIGHTS file):
  - <INSIGHTS entry title> — Rule: <its rule line> — `<package>/INSIGHTS.md` (<date>)
  - <spec invariant / AC id and its wording>

### Wave 1 — parallel

#### T002 [P] — <title>
…

### Wave 2 — integration

#### T00N — <title>
…

## Ownership check
| File | Task |
|---|---|
| … | T00x |

## Risks
- <risk> → <mitigation>

## Open questions
- <question> (blocks T00x | does not block)
````

While a plan runs, its last section is an `## Execution log` kept by `run-plan`
(inputs, mode, base commit, task results and commits, decisions, check rounds,
fix tasks). A fresh session resumes from it.
