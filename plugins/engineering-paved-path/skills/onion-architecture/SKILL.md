---
name: onion-architecture
description: "Onion (clean / hexagonal, ports-and-adapters) architecture for a TypeScript backend, Fastify + Drizzle as the reference stack: which ring backend code belongs to, which way imports point, where queries, rules, validation, transactions, errors and mappers live, and how dependency-cruiser enforces it. Use when adding or restructuring a module, route, service, repository or adapter; when a route queries the database or a service imports the ORM, the framework or a concrete adapter; when adding a multi-table write; when the architecture check fails; when reviewing a backend PR for structure; or when the user mentions onion, clean or hexagonal architecture, layers, ports and adapters, the dependency rule or use cases. Not for Fastify, Drizzle or Zod API details or for frontend structure."
metadata:
  version: 2.0.0
---

# Onion Architecture (backend)

One rule drives this skill: **source-code dependencies point inwards only.**
Business rules sit in the middle and know nothing about the web framework, the
ORM, the database, GitHub or an LLM vendor; those are outer rings that plug in.
Everything below is that rule applied to a backend package.

The paths in this skill describe a **reference layout** (`src/modules/<m>/…`,
`src/core/`, `src/adapters/`, `src/db/`, `src/platform/`). A project with other
folder names keeps the rings and maps them onto its own folders (section 0).

## 0. Read the existing convention first

1. The backend package's `CLAUDE.md` and architecture docs — module anatomy, DI
   container, ports, error envelope. They are the local convention; this skill
   explains *why* it is shaped that way and fills the gaps. Map each ring in
   section 2 onto the project's folders before applying any rule.
2. The package's `INSIGHTS.md`, if there is one — known traps.
3. The project's architecture check (a dependency-cruiser script such as
   `arch:check`), if there is one — the rules below, machine-checked.

Change existing code in **small moves that each leave the architecture check
green**, never a big-bang rewrite. A module is refactored when you already have a
reason to touch it, not because it is "not onion yet".

## 1. When the full onion pays off — and when it does not

Palermo is explicit that the onion is for long-lived applications with complex
behaviour, not for small sites. Seemann (*Ports and fat adapters*) warns that an
extra use-case layer costs more than it returns when there is one entry point and
little logic. So:

- **Always:** the dependency direction (section 3). It is free and it is what the
  architecture check enforces.
- **When there is real logic** (pricing, workflows, scoring, rollups): a service
  that orchestrates, pure functions for the rules, a repository for the queries.
- **When a module is CRUD** (settings, simple lookups): `routes.ts` + a
  `repository.ts` is enough. Do not invent a service that only forwards calls.
  The one thing it may never do is query the ORM from the route.

Signals that a service or domain function is now warranted: a rule is
duplicated in two handlers; a handler branches on business state; a handler
calls two ports (DB + GitHub, DB + LLM); a test needs a database only to check a
calculation.

## 2. The rings

```
composition root   platform/container.ts · app.ts · server.ts · modules/index.ts
 └─ presentation   modules/<m>/routes.ts · modules/_shared/
     └─ application   modules/<m>/service.ts
         └─ domain        pure rules: helpers.ts · status.ts · constants.ts · domain/<topic>/
             └─ core          contracts (zod) + ports (interfaces)

infrastructure     modules/<m>/repository.ts · adapters/** · db/**
                   └─ implements the ports in core; wired in by the composition root
```

| Ring | Paths (reference layout) | Knows | Must not import |
|---|---|---|---|
| **Contracts + ports** (core) | `src/core/**` — DTO schemas, ports such as `LLMProvider`, `GitHubClient`, `SecretsProvider` | zod, itself | anything else |
| **Domain** | pure functions: `modules/<m>/helpers.ts`, `status.ts`, `constants.ts`, `src/domain/<topic>/`; a separate pure package if the project has one | contracts | the web framework, the ORM, `db/*`, container, adapters, `process.env` |
| **Application** | `modules/<m>/service.ts` and other use-case files | domain, contracts, ports, its own repository's *type* | the ORM, `db/schema`, `db/client`, the web framework, `adapters/**` |
| **Presentation** | `modules/<m>/routes.ts`, `modules/_shared/` | application, contracts, the web framework, zod; in a CRUD module its own repository | the ORM, `db/*` |
| **Infrastructure** | `modules/<m>/repository.ts` + `repository/`, `adapters/**`, `db/**` | contracts, the ORM, SDKs | services, routes, the container |
| **Composition root** | `platform/container.ts`, `app.ts`, `server.ts`, `modules/index.ts` | everything | — (this is where rings are wired) |

Two facts that change the textbook picture:

- **Ports live in the core.** One file or folder in the core is the port
  catalogue; `adapters/*` are the implementations; the container picks one.
  A new external dependency gets a port there first.
- **A pure domain package is the model.** If the project has a package with no
  I/O of its own (a rules engine, a pricing library), treat it as the model for
  what a domain ring looks like; do not give it server knowledge.

## 3. The dependency rule, concretely

Palermo's first tenet: *all code can depend on layers more central, but code
cannot depend on layers further out from the core.* Uncle Bob's version: the
name of something declared in an outer circle must not be mentioned by code in an
inner circle — **type-only imports count**, which is why the dependency-cruiser
check runs with `tsPreCompilationDeps: true`.

Allowed direction: `routes → service → (domain, ports)` and
`repository / adapter → ports`. The composition root is the only file that sees
both a service and the concrete class that satisfies its port.

- A module never imports another module's folder. Cross-module access goes through
  the container (`container.ordersRepo`, `container.billing`) or through the
  core. `_shared/` is the one shared folder.
- Pure parsers are not adapters. Code that does no I/O is domain code even when it
  wraps a library (a diff parser, an AST matcher). New pure code shared across
  modules goes to `src/domain/<topic>/` (guarded by a `domain-is-pure` rule), not
  to `adapters/`.
- Nothing imports the seed or migration scripts; shared constants they own move
  to a module both can import.

## 4. Where does X go?

| Code | Home | Ring |
|---|---|---|
| Request/response schema used only by one route | top of that `routes.ts` | presentation |
| Request/response schema another package (the frontend) also uses | the shared contracts in the core (and every copy the project keeps) | contracts |
| Context resolution, param schemas shared by routes | `modules/_shared/` | presentation |
| Business rule, calculation, status derivation | pure function in `modules/<m>/helpers.ts` or a named file (`status.ts`) | domain |
| Rule shared by several deployables (server and a worker or CI runner) | a pure domain package | domain |
| Orchestration: load → decide → persist → call port | `modules/<m>/service.ts` | application |
| Transaction boundary | the service method that owns the use case | application |
| ORM query, SQL aggregate, row → domain mapping | `modules/<m>/repository.ts` | infrastructure |
| Tenant scoping (`tenantId`, `workspaceId`, `orgId`) | repository method signature takes the tenant id | infrastructure |
| Interface to an external system | the port catalogue in the core | ports |
| SDK call (Octokit, openai, simple-git, a payment SDK) | `adapters/<name>/` | infrastructure |
| Choosing which implementation runs | `platform/container.ts` (+ overrides for tests) | composition root |
| HTTP status for a failure | `AppError` subclass in `platform/errors.ts`; mapping in `app.ts` | presentation edge |
| Env / config | `platform/config.ts` (secrets through a secrets provider) | composition root |

## 5. Ring by ring

### Presentation — `routes.ts` (Fastify)

A route handler does four things: declare the zod `params`/`body`/`response`
schema, resolve the request context (user, tenant), call **one** service (or, for
CRUD modules, its own repository) method, return its DTO. No database handle, no
ORM import, no business branching, no `Schema.parse(req.body)`.

- Each module is an encapsulated plugin registered in `modules/index.ts`; plugins
  it depends on (helmet, cors, rate-limit, SSE) are registered before it.
- Construct the service once per plugin (`const service = new XService(...)`),
  not per request.
- Hooks (`onRequest`, `preHandler`) are for cross-cutting transport concerns —
  never for business rules.

### Application — `service.ts`

A service method is a use case: load through repositories and ports, call pure
functions to decide, persist through repositories, return a DTO.

- **Depend on narrow ports, not the whole container.** New services take a
  `Deps` object with exactly what they use; the route plugin or container builds
  it. Existing services that take the container migrate when touched — see
  `references/examples.md` (example 3).
- Never `new SomeAdapter()` and never `new SomeRepository(db)` inside a service
  method; construction belongs to the composition side.
- Keep side effects at the edges of the method (Seemann's *impureim sandwich*):
  read → pure decision → write. The middle is a plain function you can unit-test.
- Services throw `AppError` subclasses, never framework replies.

### Domain — pure functions and contracts

- Plain TypeScript over contract types. No I/O, no clock or randomness unless
  passed in, no `process.env`.
- zod is allowed here: the contracts *are* zod schemas, and parsing is how data
  becomes a domain type ("parse, don't validate"). Parse once, at the edge; inner
  code receives the parsed type and does not re-validate.
- Domain rules the product relies on stay explicit and written down (for example
  "`null` cost means unknown, `0` means free"), in the domain code and in the spec.
- An anemic model is fine — functional-style code does not need entity classes.
  What must not happen is the rule leaking into routes or SQL.

### Infrastructure — repositories (Drizzle) and adapters

- A repository owns the queries for its module's tables and **returns contract or
  domain types**, not raw rows, whenever the value leaves the repository. Row →
  DTO mappers live next to the repository (a pure `helpers.ts` is acceptable, but
  it must not import services).
- ORM quirks are handled inside the repository: Drizzle's `sum()` is
  `string | null`, `count()` is a number. Callers never see them.
- In a multi-tenant app, every repository method that reads tenant-owned tables
  takes the tenant id and scopes by it; a child table without its own tenant
  column is scoped by the join to its parent.
- Adapters implement a port from the core. They may use any SDK; they must not
  import services, routes or the container.

### Composition root — `platform/container.ts`

The only place that knows concrete classes. Lazy construction, memoised, secrets
resolved at call time, test doubles via overrides. If a new port needs wiring, it
is added here and nowhere else.

## 6. Transactions

Every multi-statement write that is not in a transaction is non-atomic. Rule for
new and touched code:

- Any write that deletes-then-reinserts, or writes more than one table for one use
  case, runs in `db.transaction(async (tx) => …)`.
- The **service** owns the boundary (it knows the use case) but must not import
  the ORM to open it. It gets a `UnitOfWork` port in its `Deps` and calls
  `uow.run(async (tx) => …)`; `tx` is an opaque `TxScope` the service only passes
  on. Repository methods accept an optional `TxScope` and run every statement on
  it. The Drizzle-backed implementation lives in infrastructure.
- Never call an external port (GitHub, LLM, git, payments) *inside* a
  transaction: fetch first, then open the transaction for the writes only.

Code shape and the `Tx` type: `references/transactions.md`.

## 7. Errors

`platform/errors.ts` is framework-free: `AppError(code, message, statusCode)` and
its subclasses. Inner rings throw these; `app.ts` is the only place that turns
them into the error envelope (e.g. `{ error: { code, message, details } }`). Do
not catch an error in a service just to rethrow it as a different HTTP status,
and do not set a reply status from anywhere but a route.

## 8. Testing by ring

| Ring | Test | Needs |
|---|---|---|
| Domain | unit test of the pure function | nothing — no container, no DB |
| Application | unit test with fake `Deps` / container overrides | no network, no keys |
| Infrastructure (repository) | integration test against a real database (e.g. testcontainers) | Docker |
| Presentation | `app.inject()` integration test | full app |

If testing a rule forces you to start a database, the rule is in the wrong ring.
The project's own test policy (`TESTING.md` or its `CLAUDE.md`) wins on naming and
scope.

## 9. Enforcement — the architecture check

A dependency-cruiser config (`.dependency-cruiser.cjs` in the backend package)
encodes sections 2–3 as rules, for example:
`contracts-are-the-core`, `domain-is-pure`, `routes-do-not-touch-the-db`,
`application-does-not-know-the-orm`, `no-framework-below-routes`,
`no-concrete-adapters-in-modules`, `infrastructure-does-not-call-inwards-code`,
`no-cross-module-imports`, `nothing-imports-db-scripts`, `no-circular`.

- The check fails only on **new** violations; the ones that existed when the
  rules were introduced are in a known-violations baseline file.
- Fixed a known violation? Regenerate the baseline and commit the smaller file.
- **Never regenerate the baseline to make a new violation pass.** Fix the import,
  or — if the rule is wrong — change the rule in the config with a comment saying why.

A project without the check yet: `references/enforcement.md` shows how to add it.

## 10. Known debt

Existing violations are recorded where the project keeps them — the
known-violations baseline, the backend `CLAUDE.md`, or `INSIGHTS.md`. Read them
before reviewing so nobody mistakes debt for the convention, and never report
debt that is already on the main branch as a finding of a new change.

## 11. Structural review checklist

- [ ] The architecture check passes and the baseline did not grow.
- [ ] Route handlers only validate, resolve context, call one method, return.
- [ ] No ORM / `db/schema` import outside repositories, `db/`, adapters and the container.
- [ ] Business rules are pure functions with unit tests that need no DB.
- [ ] New services take narrow `Deps`, not the container; nothing is `new`-ed inside a method.
- [ ] Multi-statement writes are in a transaction; no external call inside it.
- [ ] In a multi-tenant app, every repository read of a tenant-owned table is scoped by the tenant id.
- [ ] New external systems got a port in the core and a test double.
- [ ] No module imports another module's folder.
- [ ] Every outside call uses a method that is declared on its port.
- [ ] No repository or network call inside a loop over rows (N+1).
- [ ] A write → outside call → write sequence leaves a safe state if the middle step fails.

## 12. How to answer

- **"Review this module / PR"** — read `references/audit.md` and go through its
  seven passes in order (imports, construction, ports, tenancy, writes, queries,
  output). Two checks it adds are easy to miss: the method the code calls must
  really exist on the port, and a repository or network call inside a loop is N+1.
- **"Where does this go?"** — name the ring and the path from section 4, and the
  rule from section 3 that decides it.
- **"Add endpoint / feature X"** — list the files per ring (schema in route,
  service method, repository method, pure function + test), in that order.
- **Refactor requests** — one small move at a time, each keeping the architecture
  check green, and remove the matching baseline entries.
- **The architecture check failed** — quote the rule name, explain which ring
  boundary was crossed, and show the move that fixes it; do not touch the baseline.

## Reference files

| File | Read when |
|---|---|
| `references/layers-in-this-stack.md` | writing a route, service, repository or adapter and you want the Fastify / Drizzle / Zod / vitest specifics for that ring |
| `references/transactions.md` | a use case writes more than one statement or table |
| `references/enforcement.md` | the architecture check fails, you add or change a rule, or you set the check up |
| `references/audit.md` | reviewing a backend module or PR for structure, or the user asks what is wrong with a module |
| `references/examples.md` | moving queries out of a route, splitting a service, extracting a pure rule, adding a port |

## Scope

Defer to other skills instead of restating them:

- Fastify API (plugins, hooks, serialization, logging) → `fastify-best-practices`
- Drizzle queries, relations, migrations → `drizzle-orm-patterns`
- table design, indexes → `postgresql-table-design`
- schema authoring → `zod`; type-level tricks → `typescript-expert`
- auth, injection, secrets → `security`
- client-side structure → `frontend-ui-architecture`
