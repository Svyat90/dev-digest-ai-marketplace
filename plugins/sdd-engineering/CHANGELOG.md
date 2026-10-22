# Changelog — sdd-engineering

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).
Release tag: `sdd-engineering--v<version>` (see [docs/RELEASES.md](../../docs/RELEASES.md)).

## [Unreleased]

## [1.0.0] — 2026-10-19

### Added
- Agents: `spec-creator` (EARS specs with open questions), `implementation-planner` (waves, file ownership, per-task rules), `implementer` (one task, test first), `plan-verifier` (per-item verdicts with evidence).
- Dependency on `research-tools` `^1.0.0`: `spec-creator` returns *Research needed* briefs that the main session runs through `researcher`.
- `COMPATIBILITY.md`: Claude Code `>=2.1.110` and the features this plugin relies on.
- Defined behaviour when a package has no test command: the planner asks, the implementer reports `DONE_WITH_CONCERNS`, plan-verifier judges by reading code.
- Skills: `run-plan` (orchestrates a plan end to end with a resumable execution log), `workflow-retro` (metrics and recommendations for a finished run), `engineering-insights`, `brainstorm`, `mermaid-diagram`.
- Behavioural evals for `claude plugin eval` in `evals/` (15 cases: spec-creator, implementation-planner, run-plan, the review gate, plan-verifier, agent namespaces, and two negative cases); they replace `evals/spec-creator.json`.
- Plugin hooks that keep `spec-creator` and `implementation-planner` inside their write scope and lint every spec and plan they write.
- `spec-writer-guard` hook: a new spec file can only be written by `spec-creator`; anywhere else Claude is told to dispatch the agent.
- Dependencies on `engineering-paved-path` `^1.0.0` and `architecture-review` `^1.0.0`.

### Removed
- `write-spec` and `plan-from-spec` skills, replaced by the `spec-creator` and `implementation-planner` agents.

## [0.1.0] — 2026-10-19

### Added
- Initial plugin skeleton.
