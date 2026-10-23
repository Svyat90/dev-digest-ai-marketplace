# Spec: SDD plugin set

Port the Spec Driven Development workflow from the DevDigest project ([Svyat90/dev-digest](https://github.com/Svyat90/dev-digest/tree/main), `.claude/`) into this marketplace as four plugins. `sdd-engineering` holds the workflow itself. `engineering-paved-path`, `research-tools` and `architecture-review` are its dependencies, and each one is useful on its own too.

Next step: an implementation plan for the port.

## Problem

The SDD workflow (spec → plan → implementation → verification → retro) lives inside one product repository. It is tied to DevDigest paths (`server/`, `client/`, `reviewer-core/`), DevDigest scripts and DevDigest-only instructions. Other teams cannot install it, and the stack skills it depends on are copied by hand from project to project.

## Who it is for

- **Engineers** who want the full SDD workflow in their repository with one install.
- **Plugin authors** who need a researcher, an architecture reviewer or stack best-practice skills without the whole workflow.

## Dependency graph

```
sdd-engineering ──┬──> engineering-paved-path
                  ├──> research-tools
                  └──> architecture-review ──> engineering-paved-path

research-tools        no dependencies; also installable on its own
```

| Plugin | Role | Provides | Depends on |
|---|---|---|---|
| `engineering-paved-path` | shared | stack, architecture, testing and security skills; existing `pr-ready` skill and force-push hook | — |
| `architecture-review` | shared | generalized agent `architecture-reviewer` | `engineering-paved-path` `^1.0.0` |
| `research-tools` | shared | read-only agent `researcher` | — |
| `sdd-engineering` | workflow | agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skills `run-plan`, `workflow-retro` | `engineering-paved-path`, `research-tools`, `architecture-review`, all `^1.0.0` |

`sdd-engineering` depends on `research-tools`: `spec-creator` returns the facts that only outside sources can settle (library limits, API behaviour, standards) as *Research needed* briefs, and the caller runs `research-tools:researcher` on each before the revision run. Subagents cannot spawn other subagents, so the caller does the dispatch. The ported `architecture-reviewer` copies the read-only Bash allow-list that it currently borrows from `researcher.md`, so it does not need `research-tools` either.

Dependencies use the version-range form from [PLUGIN-GUIDELINES.md](PLUGIN-GUIDELINES.md#dependencies-between-plugins):

```json
"dependencies": [
  { "name": "engineering-paved-path", "version": "^1.0.0" },
  { "name": "architecture-review", "version": "^1.0.0" }
]
```

All four plugins are released as `1.0.0`, so the `^1.0.0` ranges resolve against the `<plugin>--v1.0.0` tags.

## Where shared skills live

**Rule:** a skill lives in the plugin that owns its subject. If more than one plugin uses it, it goes into a plugin that all of its users already depend on. It is never copied. Skills used by only one plugin stay in that plugin.

Who references each source skill today:

| Source skill | Used by | Target plugin |
|---|---|---|
| `react-best-practices`, `react-testing-library`, `frontend-ui-architecture` | planner, implementer, arch-reviewer | `engineering-paved-path` |
| `next-best-practices` | planner, implementer, arch-reviewer | `engineering-paved-path` (written by the maintainer, not a copy of an upstream skill) |
| `fastify-best-practices`, `typescript-expert`, `zod`, `drizzle-orm-patterns`, `postgresql-table-design` | spec-creator, planner, implementer | `engineering-paved-path` |
| `onion-architecture`, `security` | all four SDD agents, arch-reviewer | `engineering-paved-path` |
| `pr-self-review` | the user, before a PR | `engineering-paved-path` |
| new `review-kit`: routing, severity and the precheck, split out of `pr-self-review` | arch-reviewer, planner, implementer, `pr-self-review` | `engineering-paved-path` |
| `engineering-insights` | spec-creator, planner, run-plan, workflow-retro | `sdd-engineering` |
| `brainstorm`, `mermaid-diagram` | spec-creator, planner | `sdd-engineering` |

Not ported: `devdigest-demo` (product-specific), `dependency-checker` (no SDD component uses it).

`review-kit` exists because agents in other plugins cannot read another plugin's
files by path. `pr-self-review` is manual-only (`disable-model-invocation`), so
agents cannot load it; `review-kit` is model-invocable, and once loaded its
`${CLAUDE_SKILL_DIR}` gives any agent the absolute path of its references and
scripts.

## Plugin layout

```
plugins/
├── engineering-paved-path/
│   ├── skills/  pr-ready/ (existing) react-best-practices/ react-testing-library/
│   │            frontend-ui-architecture/ fastify-best-practices/
│   │            typescript-expert/ zod/ drizzle-orm-patterns/ postgresql-table-design/
│   │            next-best-practices/ onion-architecture/ security/ pr-self-review/ review-kit/
│   ├── hooks/hooks.json, scripts/guard-force-push.mjs   (existing)
│   └── README.md, CHANGELOG.md, COMPATIBILITY.md, LICENSES.md (third-party sources)
├── research-tools/
│   ├── agents/researcher.md
│   └── README.md, CHANGELOG.md, COMPATIBILITY.md
├── architecture-review/
│   ├── agents/architecture-reviewer.md
│   └── README.md, CHANGELOG.md, COMPATIBILITY.md
└── sdd-engineering/
    ├── agents/  spec-creator.md implementation-planner.md implementer.md plan-verifier.md
    ├── skills/
    │   ├── run-plan/          SKILL.md, references/ (incl. plan-template.md), evals/, scripts/lint-plan.mjs
    │   ├── workflow-retro/    SKILL.md, references/ (metrics, prices.json, report-template), scripts/collect.mjs
    │   └── engineering-insights/ brainstorm/ mermaid-diagram/
    ├── hooks/hooks.json       scope and lint guards for spec-creator and implementation-planner, spec-writer guard
    ├── scripts/               spec-creator-scope.mjs spec-creator-lint.mjs lint-spec.mjs
    │                          implementation-planner-scope.mjs implementation-planner-lint.mjs
    │                          spec-writer-guard.mjs
    │                          lib/project.mjs (package and spec-folder conventions)
    ├── evals/                 behavioural cases for `claude plugin eval` (prompt.md + graders/*.md)
    ├── README.md              how the workflow fits together
    ├── CHANGELOG.md           releases
    └── COMPATIBILITY.md       Claude Code >=2.1.110 and the features relied on
```

The current placeholder skills `write-spec` and `plan-from-spec` are removed, because `spec-creator` and `implementation-planner` replace them.

## Porting rules

1. **No DevDigest paths.** Hard-coded `server/`, `client/`, `reviewer-core/`, `e2e/` and package-specific commands (`pnpm run …`, `scripts/verify-task.sh`, `scripts/dev.sh`) are replaced by conventions any project can follow:
   - a package is a top-level folder with its own `CLAUDE.md`; a project without one is a single package;
   - fixed folders: specs `specs/` and `<pkg>/specs/`, plans `docs/plans/`, retros `docs/retros/`, insights `INSIGHTS.md`. They are not configurable, because the hooks and lint scripts must agree with the agents;
   - verification commands come from each package's `package.json` scripts; the planner writes them into each task's *Verify*;
   - project rules the scripts cannot guess (package checks, do-not-touch and generated paths, coupled files, contract copies) live in an optional `.claude/paved-path.json`, read by `review-kit`'s precheck and copied by the planner into each plan's `## Do not touch`.
2. **Namespaced references.** Skills and agents are called by their plugin namespace, e.g. `engineering-paved-path:react-best-practices`, `research-tools:researcher`, `architecture-review:architecture-reviewer`, `sdd-engineering:implementer`.
3. **Bundled files through variables.** A skill finds its own scripts and references through `${CLAUDE_SKILL_DIR}`. Hooks use `${CLAUDE_PLUGIN_ROOT}`. Nothing refers to `.claude/skills/…`, `.claude/agents/…` or `$CLAUDE_PROJECT_DIR/.claude/hooks/…`.
4. **Agent hooks move to the plugin.** Plugin agents do not support `hooks` in frontmatter, so the `spec-creator` and `implementation-planner` scope and lint hooks go into `sdd-engineering/hooks/hooks.json`. Each script reads the hook input's `agent_type` (bare `spec-creator` or namespaced `sdd-engineering:spec-creator`) and does nothing for any other agent or the main session. The agent runs the spec lint through `${CLAUDE_PLUGIN_ROOT}`, which Claude Code substitutes in agent content.
5. **Not ported:** product specs, plans, retros, `INSIGHTS.md` content, secrets, caches, `settings.json`, DevDigest-specific instructions and examples.
6. **Generalized `architecture-reviewer`.** The onion-ring and package rules become the `onion-architecture` skill's rules, applied to whatever layers the project declares. The agent runs the project's own deterministic checks (named in `CLAUDE.md` or passed in) instead of `arch:check`.

## `sdd-engineering` README

The README explains how the parts work together, in this order:

1. **Install.** One command installs the workflow and pulls in its three dependencies.
2. **Flow** (diagram and one paragraph per step):
   `brief → spec-creator → spec` → `implementation-planner → plan` → `/run-plan` (waves of `implementer` → `architecture-reviewer` ∥ `plan-verifier` → fix rounds) → `/workflow-retro`.
3. **Who calls what.** For each agent and skill: whether the user starts it or another component does, what it reads, and what it writes.
4. **Project setup.** The fixed folders, the package convention, and what the project should provide (package scripts, optional `.claude/paved-path.json`).
5. **Dependencies.** Which skills and agents come from which plugin, and the supported version ranges.
6. **Limits.** What the workflow does not do.

## Releases file

`CHANGELOG.md` in each plugin, in the Keep a Changelog format from [RELEASES.md](RELEASES.md). The `1.0.0` entry of `sdd-engineering` lists the ported components, the removed `write-spec` and `plan-from-spec`, and the dependency ranges. The README links to it and keeps a short compatibility table:

| sdd-engineering | engineering-paved-path | architecture-review |
|---|---|---|
| 1.0.x | ^1.0.0 | ^1.0.0 |

## Acceptance criteria

- **Given** a repository with only this marketplace added, **When** the user installs `sdd-engineering`, **Then** `engineering-paved-path`, `research-tools` and `architecture-review` are installed too, and all four are enabled.
- **Given** the four plugins, **When** `claude plugin validate --strict` and `node scripts/check-plugins.mjs` run, **Then** both pass.
- **Given** any file in the four plugins, **When** it is searched for `server/`, `client/`, `reviewer-core/`, `.claude/skills/`, `.claude/agents/`, `CLAUDE_PROJECT_DIR` or `DevDigest`, **Then** there are no matches outside the third-party skill content and changelogs.
- **Given** any skill or agent reference between plugins, **When** it is read, **Then** it uses the `plugin:name` form, and its target exists in a declared dependency.
- **Given** `spec-creator` is running, **When** it tries to write outside the specs folder, **Then** the scope hook blocks it. **Given** any other agent or the main session, **When** it writes the same file, **Then** the hook does not interfere.
- **Given** an approved plan in a project that is not DevDigest, **When** the user runs `/sdd-engineering:run-plan`, **Then** implementers run in waves, `architecture-reviewer` and `plan-verifier` run, and the plan's Execution log is updated.
- **Given** a finished `run-plan` session, **When** the user runs `/sdd-engineering:workflow-retro`, **Then** `collect.mjs` is found through `${CLAUDE_SKILL_DIR}` and the retro is written to the retros folder.
- **Given** the ported `run-plan`, `spec-creator`, `pr-self-review`, `brainstorm` and `frontend-ui-architecture` evals, **When** they run, **Then** they pass with the generalized prompts. (`onion-architecture` eval fixtures and the `architecture-reviewer` TypeScript evals are not ported: the fixtures were product code and the TS evals need DevDigest's eval harness.)
- **Given** `sdd-engineering/README.md`, **When** a new user reads it, **Then** they can tell which component to start first and what each step produces, without opening the agent files.

## Non-goals

- Porting `test-writer`, `doc-writer` or `architecture-reviewer-lite`.
- Rewriting the content of third-party stack skills beyond removing DevDigest references.
- New workflow features. This is a port with the DevDigest specifics removed.
- Cross-marketplace dependencies.

## Success metrics

- `sdd-engineering` runs end to end (spec → plan → run-plan → retro) on one repository other than DevDigest without edits to plugin files.
- The idle context cost of the four plugins, from `node scripts/build-index.mjs --cost`, is recorded in `docs/COST-BASELINE.md`. The 13 stack skills in `engineering-paved-path` add their descriptions to every session.

## Decisions and open questions

- Decided: `doc-writer` and `test-writer` are not ported; documentation and test tasks are `implementer` tasks, and the plan lint accepts only `Agent: implementer`.
- Decided: `architecture-review` depends on `engineering-paved-path` `^1.0.0` (the reviewer applies `onion-architecture`, `frontend-ui-architecture` and `review-kit`).
- Verified: hook input carries `agent_type`, so agent-scoped hooks work at plugin level (Claude Code hooks reference; smoke-tested with simulated input).
- Decided: licenses checked. `fastify-best-practices`, `postgresql-table-design`, `drizzle-orm-patterns`, `typescript-expert` and `zod` are MIT; their notices are in `engineering-paved-path/LICENSES.md`. `next-best-practices` was written by the maintainer and is ported as an in-house skill.
- Decided: `adr-review` and `tech-research`, placeholders from the marketplace skeleton that overlapped the `architecture-reviewer` and `researcher` agents, are removed.
- Decided: `sdd-engineering` depends on `research-tools` `^1.0.0`, as on the course slide; `spec-creator` hands research briefs to the caller, who runs `researcher`.
- Decided: the idle context budget is raised to what the SDD workflow needs (see `docs/COST-BASELINE.md`); descriptions keep their trigger phrases.
