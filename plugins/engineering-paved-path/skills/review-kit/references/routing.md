# Routing: which skill reviews which file

A reviewer loads **only the sections listed** for the files it actually got, not
whole skills. The implementation-planner uses the same rows to write each plan
task's `Rules:` field; the implementer applies those Rules and comes back here
only to read one section for a question the Rules did not answer.

Skills are named by plugin: every skill below without a prefix is
`engineering-paved-path:<name>`. When a file matches several rows, it gets the
union. "Always" rows apply to every file of that area.

Files with kind `doc`, `lockfile` or `other` in `collect-diff.mjs` output are not
reviewed (list them in the report as "not reviewed"). `protected` and
`generated` files are handled by `precheck.mjs` only.

**Area.** A file's area is its package's `area` in `.claude/paved-path.json`.
Without one, decide by what the file is: UI components, pages, hooks and styles
are frontend; HTTP handlers, services, repositories, DB schema and workers are
backend.

**Project rules win.** The root and package `CLAUDE.md` files, `INSIGHTS.md` and
the project's test policy (`TESTING.md` or equivalent) add rows and override
these defaults. Read them first.

## Frontend

| Files | Skill → sections to load |
|---|---|
| always | `frontend-ui-architecture` → §3 Where does X go, §4 Where business logic lives, §6 Import rules, §8 Structural review checklist · the package `CLAUDE.md` |
| `*.tsx` components and `use*.ts(x)` hooks | `react-best-practices` → sections tagged CRITICAL and HIGH (skip MEDIUM unless the diff is about it) |
| Next.js route files (`app/**/page.tsx`, `layout.tsx`, `error.tsx`, `route.ts`), any file with `'use client'` or `server-only` | `frontend-ui-architecture` → §7, and `references/nextjs-app-router.md` · `next-best-practices` → RSC Boundaries, Directives, Async Patterns, Error Handling, Route Handlers |
| the API client and data hooks | the project's frontend architecture docs, if any (cache keys, error UX) |
| `*.test.ts(x)` | `react-testing-library` → Query Priority, Async Testing, Mocking Strategies, Anti-Patterns · the project's test policy |
| files importing `zod` | `zod` → see the Zod version caveat below |
| data sent to or read from the API, HTML rendering, URLs built from input | `security` → A01, A05, Framework Security Quirks |
| shared contract files | contract rules below |
| i18n message files | only check that keys added in code exist here |

## Backend

| Files | Skill → sections to load |
|---|---|
| always | `onion-architecture` → §2 rings table, §3 dependency rule, §5 ring by ring, §11 checklist · the package `CLAUDE.md` |
| HTTP routes, app setup, Fastify plugins | `fastify-best-practices` → rules/routes.md, rules/schemas.md, rules/error-handling.md, rules/plugins.md |
| repositories, `db/**` (not migrations), adapters touching the DB | `drizzle-orm-patterns` → references/queries-joins-aggregations.md, references/transactions.md · `onion-architecture` → §6 + references/transactions.md |
| DB schema files | `postgresql-table-design` → Core Rules, Constraints, Indexing · in a multi-tenant app, the tenant column on new tenant-owned tables |
| services and other use-case files | `onion-architecture` → §5 Application, §6, §7 |
| adapters (`adapters/**`) | `onion-architecture` → §5 Infrastructure; `security` → Secret Detection |
| shared contract files | contract rules below |
| files importing `zod` | `zod` → see the Zod version caveat below |
| routes, auth, anything taking user input, shelling out | `security` → A01, A05, A07, Agentic AI Security |
| a pure domain package | `onion-architecture` → §2 (pure domain, no server knowledge) |
| `*.test.ts`, integration tests | the project's test policy; `onion-architecture` → §8 Testing by ring |
| any `.ts` | `typescript-expert` → Code Review Checklist (only type-safety items: `any`, unsafe casts, non-null assertions hiding a real null) |

## Contracts (both areas)

- When the project keeps copies of a contract folder in several packages
  (`contractCopies` in `.claude/paved-path.json`), `precheck.mjs` flags a touched
  file whose twin was not touched (`contract-copy`, MAJOR); the reviewer decides
  whether the other copy really needs the edit.
- A field removed or renamed in a contract another package reads → MAJOR at least.

## Zod version caveat

The `zod` skill is written against Zod 4. Check the project's Zod major version
(`zod` in `.claude/paved-path.json`, else `package.json`). On **Zod 3**, ignore
any advice that exists only in Zod 4 — `zod/mini`, top-level `z.email()` /
`z.url()`, `z.strictObject()`, `.check()`, `z.toJSONSchema()`, the `error:`
param — and never propose migrating; proposing it is itself a finding.

## Always, both areas

- `INSIGHTS.md` of the touched package + the root one, if they exist: every entry
  whose path is in the diff is a rule to check explicitly.
- The `coupled` pairs in `.claude/paved-path.json`.
