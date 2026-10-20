# Engineering Paved Path

The team's shared engineering knowledge as skills: how to write React, Next.js,
Fastify, Drizzle, PostgreSQL, Zod and TypeScript code, where code belongs in a
backend (onion) and a frontend (feature folders), what to check for security,
and how to review a branch before a PR. Other plugins depend on it —
`sdd-engineering` distils these skills into task rules, `architecture-review`
reviews against them.

## Install

```bash
/plugin marketplace add Svyat90/dev-digest-ai-marketplace
claude plugin install engineering-paved-path@dev-digest-ai-marketplace
```

## Components

### Stack skills (model-invoked)

Claude loads them when the task matches; you can also name them.

| Skill | Use it for |
|---|---|
| `react-best-practices` | component design, derived state, hooks, keys, accessibility |
| `react-testing-library` | component tests: query priority, async, mocking, what to skip |
| `frontend-ui-architecture` | where components, hooks, API calls and logic live; feature folders; the `'use client'` boundary |
| `fastify-best-practices` | routes, schemas, plugins, hooks, errors, logging, security headers |
| `drizzle-orm-patterns` | schema, queries, relations, transactions, migrations |
| `postgresql-table-design` | types, constraints, indexes, partitioning |
| `zod` | schemas, parsing, errors, composition; has a Zod 3 / Zod 4 caveat |
| `typescript-expert` | type-level problems, strictness, tooling |
| `onion-architecture` | backend rings, dependency direction, transactions, errors, testing by ring, dependency-cruiser enforcement |
| `security` | OWASP Top 10:2025 checklist, secrets, agentic-AI risks |
| `next-best-practices` | Next.js App Router: file conventions, RSC boundaries, async APIs, data patterns, route handlers, metadata, images, fonts, bundling |

### Review skills

| Skill | Invoke | Does |
|---|---|---|
| `review-kit` | model-invoked (agents load it) | routing (which skill section governs which file), one severity scale C1–C13, and a dependency-free precheck over the open diff |
| `pr-self-review` | `/engineering-paved-path:pr-self-review` (manual only) | full pre-PR review: precheck, frontend and backend reviewers, verified CRITICALs, a PASS/BLOCKED gate that Claude respects before `git push` and `gh pr create` |
| `pr-ready` | `/engineering-paved-path:pr-ready` | Conventional Commits and a PR description |

### Hook

| Hook | Does |
|---|---|
| `PreToolUse` (Bash) | blocks `git push --force` to `main`/`master` |

Hooks and scripts need `node` on `PATH`.

## Configure for your project (optional)

The precheck works without configuration: it finds packages (top-level folders
with their own `CLAUDE.md` or `package.json`), runs their `typecheck` and
`arch:check` scripts, and reads the Zod version from `package.json`. To teach it
your project's rules, add `.claude/paved-path.json`:

```json
{
  "packages": { "api": { "area": "backend", "checks": { "typecheck": "pnpm run typecheck", "arch-check": "pnpm run arch:check" } } },
  "doNotTouch": ["web/src/vendor/ui/"],
  "generated": [{ "path": "api/src/db/migrations/", "source": "api/src/db/schema/" }],
  "coupled": [{ "a": "api/src/domain/pricing.ts", "symbolA": "priceOf", "b": "web/src/lib/pricing.ts", "symbolB": "displayPrice", "why": "same discount rule" }]
}
```

Every key and its default: `skills/review-kit/references/project-config.md`.

Your project's own `CLAUDE.md`, `INSIGHTS.md` and test policy always win over
these skills' defaults.

## Licenses

Several stack skills are MIT-licensed copies of upstream skills. Sources and
license notices: [LICENSES.md](LICENSES.md).

## Versions

Release notes: [CHANGELOG.md](CHANGELOG.md). Requirements (Claude Code `>=2.1.110`): [COMPATIBILITY.md](COMPATIBILITY.md). Plugins that depend on this one use
the range `^1.0.0`; a breaking change to a skill name, a section other plugins
cite, or the precheck output format is a major release.

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
