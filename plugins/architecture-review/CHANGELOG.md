# Changelog — architecture-review

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).
Release tag: `architecture-review--v<version>` (see [docs/RELEASES.md](../../docs/RELEASES.md)).

## [Unreleased]

## [1.0.0] — 2026-10-19

### Changed
- `architecture-reviewer` is a full read-only boundary review: deterministic checks first (review-kit precheck, the project's architecture check), then onion and frontend rules on changed lines only, with file:line evidence and a severity verdict.

### Added
- `COMPATIBILITY.md`: Claude Code `>=2.1.110` and the features this plugin relies on.
- Dependency on `engineering-paved-path` `^1.0.0` (the reviewer applies `onion-architecture`, `frontend-ui-architecture` and `review-kit`).

### Removed
- `adr-review` skill: a skeleton placeholder that duplicated the agent.

## [0.1.0] — 2026-10-19

### Added
- Initial plugin skeleton.
