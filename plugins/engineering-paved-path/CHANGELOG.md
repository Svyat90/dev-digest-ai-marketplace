# Changelog — engineering-paved-path

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).
Release tag: `engineering-paved-path--v<version>` (see [docs/RELEASES.md](../../docs/RELEASES.md)).

## [Unreleased]

## [1.0.0] — 2026-10-19

### Added
- Stack skills: `react-best-practices`, `react-testing-library`, `frontend-ui-architecture`, `next-best-practices`, `fastify-best-practices`, `typescript-expert`, `zod`, `drizzle-orm-patterns`, `postgresql-table-design`.
- `COMPATIBILITY.md`: Claude Code `>=2.1.110` and the features this plugin relies on.
- Architecture and security skills: `onion-architecture`, `security`.
- `review-kit`: routing table (which skill section governs which file), one severity scale (C1–C13), and a dependency-free precheck (`precheck.mjs`, `collect-diff.mjs`) configured by an optional `.claude/paved-path.json`.
- `pr-self-review`: manual pre-PR self-review with a PASS/BLOCKED gate, built on `review-kit`.
- `LICENSES.md` with the MIT notices of the third-party skills.

### Changed
- All skills are project-agnostic: no paths, packages or commands of a specific repository.

## [0.1.0] — 2026-10-19

### Added
- Initial plugin skeleton.
