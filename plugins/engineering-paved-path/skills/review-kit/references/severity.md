# Severity: one scale for every skill

Each skill ships its own scale (`react-best-practices` tags whole sections
CRITICAL, `security` has CRITICAL/HIGH/MEDIUM/LOW, the architecture skills have
none). Reviews map all of them onto four levels. **Only CRITICAL blocks**, so the
bar for it is "this will break, leak, or corrupt", not "this is not how we like
it".

| Level | Meaning | Blocks |
|---|---|---|
| CRITICAL | will break at runtime, leak data or secrets, corrupt data, or breaks a hard project rule | yes |
| MAJOR | wrong ring/folder, a convention the next change will trip over, missing guard test | no — listed first |
| MINOR | readability, naming, local simplification | no — counted |
| NIT | taste | no — counted |

Findings only ever apply to lines the diff adds or changes. Debt that is already
on the base branch (the architecture baseline, known debt in the project's
`CLAUDE.md`, `INSIGHTS.md` entries describing existing code) is never a finding of
this diff.

## CRITICAL

Each row names whether an override is possible (see `pr-self-review`, Override).

| # | Finding | Source | Override |
|---|---|---|---|
| C1 | secret or credential in the diff, `.env` committed | precheck `secret` | **never** |
| C2 | a package check (typecheck, …) fails in a touched package | precheck `<check>-<package>` | **never** |
| C3 | new architecture-check violation, or the baseline grew without a rule change | precheck `arch-check-*`, `arch-baseline` | **never** |
| C4 | edit to a do-not-touch path, an existing generated file edited | precheck `do-not-touch` | **never** |
| C5 | Zod 4 import (`zod/v4`, `zod/mini`) in a Zod 3 project | precheck `zod-3-only` | **never** |
| C6 | security: exploitable injection, auth or tenancy bypass, secret shipped to the client bundle — `security` CRITICAL or HIGH with attacker-controlled input confirmed | security | yes |
| C7 | multi-tenant app: query on a tenant-owned table without tenant scope, or a child table read without the join to its scoped parent | onion §5 Infrastructure | yes |
| C8 | new delete-then-insert or multi-table write for one use case without a transaction, or an external call (GitHub, LLM, payments, git) inside a transaction | onion §6 | yes |
| C9 | new DB access from a route, or an ORM / `db/*` import in a service, that the architecture check does not catch (e.g. a DB handle passed through) | onion §3, §5 | yes |
| C10 | server-only code or a secret reachable from a `'use client'` module | frontend-ui-architecture §7 | yes |
| C11 | React bug, not style: hook called conditionally or in a loop, state mutated in place, list `key` that breaks identity on reorder/insert, effect with a missing dependency that reads stale data | react-best-practices | yes |
| C12 | a hard domain invariant the project wrote down is broken (in a spec, `CLAUDE.md` or `INSIGHTS.md` — e.g. "unknown cost is `null`, never `0`") | the project's spec or insight | yes |
| C13 | a contract field removed or renamed that another package still reads | contracts | yes |

## MAJOR

- Code in the wrong ring or folder (onion §4, frontend-ui-architecture §3).
- A new service takes the whole container, or `new`s its own repository/adapter.
- Business rule inside a route, a hook body or JSX instead of a pure function.
- A feature imports another feature; a re-export shim left behind.
- Data fetching in a component instead of the project's data layer; hardcoded
  user-facing text in a project that uses i18n.
- `'use client'` on a layout/page by convenience.
- A coupled twin not updated (`coupled-files`, `contract-copy`).
- A rule the diff adds that the project's test policy says should be guarded, with no test.
- `security` MEDIUM; `react-best-practices` CRITICAL-tagged sections that are
  about structure, not bugs (Component Design, Over-Engineering, Render Factories).

## MINOR / NIT

Everything else: `react-best-practices` HIGH/MEDIUM items that are not bugs,
naming, file length, local simplification, `security` LOW.

## Verification (before a verdict)

Every CRITICAL coming from a reviewer (C6–C13) is confirmed by the orchestrator:

1. The cited `file:line` exists and is an added or changed line of this diff.
2. The cited rule says what the finding claims (open the skill section).
3. The failure scenario is concrete: which input or state produces which wrong
   result.

Any check that fails → downgrade to MAJOR and add "(unconfirmed critical)".
Precheck CRITICALs (C1–C5) are facts from tools and are not re-verified — except
a `secret` hit that is plainly a fixture (a test value spelled as fake), which
the orchestrator may downgrade with the reason written in the report.
