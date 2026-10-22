# Enforcing the rings — dependency-cruiser

`dependency-cruiser` is one dev dependency in the backend package. Add two scripts:
`arch:check` and `arch:baseline`.

| File | Role |
|---|---|
| `.dependency-cruiser.cjs` (backend package root) | the rules (`forbidden`) and resolver options |
| `.dependency-cruiser-known-violations.json` | baseline: violations that existed when the rules were introduced |
| `arch:check` | `depcruise src --ignore-known` — fails on violations **not** in the baseline |
| the baseline script (`arch:baseline`) | `depcruise-baseline src` — rewrites the baseline from the current code |

## The rules

| Rule | From | Forbidden target | Why |
|---|---|---|---|
| `contracts-are-the-core` | `src/core/**` | anything but itself and zod | innermost ring; may also be consumed by other packages |
| `domain-is-pure` | `src/domain/**` (home for pure rules shared across modules) | anything but itself, contracts, zod | the domain ring has no I/O and no framework |
| `routes-do-not-touch-the-db` | `modules/*/routes.ts` | `src/db/**`, drizzle-orm | routes call a service, or in a CRUD module its own repository; they never build queries |
| `application-does-not-know-the-orm` | `service.ts` and other use-case files | `db/schema`, `db/client`, drizzle-orm | data goes through repositories |
| `no-framework-below-routes` | everything except routes, `_shared`, composition root, `platform/sse.ts` | fastify, `@fastify/*`, fastify plugins | only the edge knows HTTP |
| `no-concrete-adapters-in-modules` | `src/modules/**` | `src/adapters/**` | ports come from the core contracts, implementations from the container |
| `infrastructure-does-not-call-inwards-code` | adapters, repositories | routes, services, container | infrastructure implements ports, it does not orchestrate |
| `no-cross-module-imports` | `modules/<a>/**` | `modules/<b>/**` (except `_shared`) | share through the container or contracts |
| `nothing-imports-db-scripts` | anything | `db/migrate.ts`, `db/seed.ts` | entry points are not libraries |
| `no-circular` | anything | a cycle | a cycle means two rings know each other |

`tsPreCompilationDeps: true` is deliberate: `import type` counts. The dependency
rule is about names, and a type name is a name.

## Workflow

- **New violation** → fix the import. The error names the rule; section 3–4 of
  `SKILL.md` says where the code should live instead.
- **Fixed an old one** → the baseline script (`arch:baseline`), commit the smaller baseline in the
  same commit as the fix.
- **Rule is wrong for a real case** → change the rule (add a `pathNot` with a
  comment saying why), not the baseline. Adding a fresh violation to the baseline
  is how the rules silently die.
- Check a single file: `npx depcruise src/modules/<m>/routes.ts --config .dependency-cruiser.cjs --output-type err`.
- See everything including known debt: `npx depcruise src --config .dependency-cruiser.cjs --output-type err`.

## Gotchas

- **pnpm paths.** Under pnpm a package resolves to
  `node_modules/.pnpm/drizzle-orm@<version>_postgres@<version>/node_modules/drizzle-orm/…`,
  so a pattern anchored as `^node_modules/drizzle-orm/` never matches and the
  rule passes silently. The config matches the unanchored `node_modules/<pkg>/`,
  which appears in both layouts.
- **safe-regex.** dependency-cruiser refuses patterns it thinks are slow
  (`(\.pnpm/[^/]+/node_modules/)?…[^/]*` was rejected: "cowardly refusing to
  run"). Keep package alternations literal.
- **Baseline entries contain the pnpm store path.** Upgrading drizzle-orm
  changes the versioned store folder, so the known `routes → drizzle`
  violations reappear as "new". After a dependency bump, run the full report,
  confirm the only new entries are those renamed paths, then the baseline script (`arch:baseline`).
- **A rule that never fires may be broken, not satisfied.** When adding a rule,
  prove it with a throwaway file that violates it (then delete the file).

## Not enforced by the tool

- "Services take narrow `Deps`, not `Container`" — a type-level design rule; only
  the resulting cycle (`container ↔ service`) is visible to the cruiser.
- "Every statement in a use case uses the same `tx`" — needs review or an
  integration test.
- "Repositories scope by the tenant id" — needs review (`audit.md`, pass 4).
