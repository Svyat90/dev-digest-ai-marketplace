# Releases

How plugins are versioned, how updates reach users, and how to roll back.

Primary sources: [Host and maintain a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace), [Plugin loading → Versions and updates](https://code.claude.com/docs/en/plugins/loading#versions-and-updates).

## The core rule

Claude Code updates a user's copy of a plugin **only when `version` in `plugin.json` changes**. New commits without a version change never reach users. Therefore:

- `version` lives **only** in `plugins/<name>/.claude-plugin/plugin.json`, never in `marketplace.json` (otherwise `plugin.json` silently wins and `validate` warns);
- every PR that changes a plugin's files changes its version — CI enforces this (`check-plugins.mjs --base`).

## SemVer

| Change | Version | Examples |
| --- | --- | --- |
| **MAJOR** | `1.4.2 → 2.0.0` | a skill, agent or command removed or renamed; the format of files a skill produces changed; a new required `userConfig`; a new dependency |
| **MINOR** | `1.4.2 → 1.5.0` | a new skill/agent/hook; a new optional option; a noticeable backward-compatible behaviour change |
| **PATCH** | `1.4.2 → 1.4.3` | wording fixes, a script bug fix, plugin documentation |

`0.x` means the plugin is in development: breaking changes are allowed in MINOR. The first stable version is `1.0.0`, once at least two teams use the plugin.

## Cutting a release

1. While working, describe changes under `## [Unreleased]` in the plugin's `CHANGELOG.md` (Keep a Changelog headings: `### Added`, `### Changed`, `### Fixed`, `### Removed`).
2. Run the release script:

   ```bash
   node scripts/release.mjs <plugin> <patch|minor|major|x.y.z> --dry-run   # preview
   node scripts/release.mjs <plugin> <patch|minor|major|x.y.z>
   ```

   It refuses to run if the new version is not higher than the current one, if `[Unreleased]` is empty, or if the version already has a section. It then sets `version` in `plugin.json` and moves the `[Unreleased]` notes under `## [<version>] — <date>`.
3. Commit, push, open a PR. After merge, CI creates the tag.

## Tags

After a merge to `main`, CI (`validate.yml`, job `tag`) creates an annotated tag for every new version:

```
<plugin>--v<version>      e.g. sdd-engineering--v0.2.0
```

This is the format Claude Code uses to resolve version ranges in `dependencies` ([Plugin dependencies](https://code.claude.com/docs/en/plugins/dependencies)), and the format `scripts/rollback.mjs` restores from. Never create or move tags by hand.

## How an update reaches users

1. PR with a version bump → review → merge.
2. Users **with auto-update**: in their next interactive session (random delay of up to 10 minutes after the first message) Claude Code updates the plugin and shows `Plugin updated … Run /reload-plugins`.
3. Users **without** auto-update: `claude plugin update <name>@dev-digest-ai-marketplace` or `/plugin marketplace update dev-digest-ai-marketplace`.

Auto-update is **off by default** for this marketplace — remind people to turn it on (see README). For an organization, an admin can set `"autoUpdate": true` on the `extraKnownMarketplaces` entry in managed settings.

Previous versions stay in the cache for 14 days, so sessions that already started keep working.

## Release channels

Claude Code has no channel concept: one marketplace serves one version of each plugin. If a beta channel becomes necessary:

- a `latest` branch whose `marketplace.json` has `"name": "dev-digest-ai-marketplace-beta"` (channel names **must** differ);
- beta testers add `Svyat90/dev-digest-ai-marketplace#latest`, everyone else uses `main`;
- beta versions carry a pre-release suffix: `1.5.0-beta.1` (`node scripts/release.mjs <plugin> 1.5.0-beta.1`).

While the team is small, we ship from a single channel, `main`.

## Renames and removals

A `name` is the key in every user's settings, so:

- to change the label, change `displayName` and leave `name` alone;
- if a rename is unavoidable, add `"renames": { "old-name": "new-name" }` to `marketplace.json`; Claude Code migrates users automatically;
- to remove a plugin, delete its entry and add `"renames": { "old-name": null }`.

`renames` is append-only: never delete or edit old entries (Claude Code follows the chain from the oldest name).

## Rollback

Users only receive a change when the version changes, and a lower number would confuse tags and changelogs. So a rollback is a **new, higher release with old content**:

```bash
git fetch --tags
git switch -c rollback/sdd-engineering
node scripts/rollback.mjs sdd-engineering 0.2.0 --dry-run   # preview
node scripts/rollback.mjs sdd-engineering 0.2.0
```

The script:

1. checks that tag `sdd-engineering--v0.2.0` exists and the plugin directory has no uncommitted changes;
2. restores `plugins/sdd-engineering/` from the tag, removing files added since;
3. keeps the current `CHANGELOG.md` and adds a `### Reverted` section;
4. sets `version` to the next patch above the current one (e.g. `0.3.0 → 0.3.1`).

Review `git status`, commit, open a PR, fast review, merge. If the release is dangerous, follow [SECURITY.md → Incidents](SECURITY.md#incidents).

A user who needs to back out immediately, before the merge: `claude plugin disable <name>@dev-digest-ai-marketplace`.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/release.mjs <plugin> <bump>` | Bump the version and release `[Unreleased]` notes |
| `scripts/rollback.mjs <plugin> <version>` | Restore an earlier release as a new version |
| `scripts/check-plugins.mjs --base <ref>` | Fail if a changed plugin has no new version (runs in CI) |
