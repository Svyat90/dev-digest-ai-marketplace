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

After a merge to `main`, CI (`validate.yml`, job `tag`) runs `claude plugin tag` for every plugin whose current version has no tag yet:

```
<plugin>--v<version>      e.g. sdd-engineering--v1.0.0
```

`claude plugin tag plugins/<name> --push` checks that `plugin.json` and the plugin's `marketplace.json` entry agree and that the tree is clean, then creates an annotated tag at `HEAD` and pushes it. This is the format Claude Code uses to resolve version ranges in `dependencies` ([Plugin dependencies](https://code.claude.com/docs/en/plugins/dependencies)), the ref a project pins to [return to a stable release](#return-a-project-to-a-stable-release), and the format `scripts/rollback.mjs` restores from. Never create or move tags by hand. Record each release in [RELEASE-EVIDENCE.md](RELEASE-EVIDENCE.md).

To preview locally: `claude plugin tag plugins/<name> --dry-run`.

## Install in another project

To share the plugins with everyone who works in a project, install them at **project** scope from that project's root. Both commands write to the project's `.claude/settings.json`, which you commit:

```bash
cd /path/to/project
claude plugin marketplace add Svyat90/dev-digest-ai-marketplace --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
```

`sdd-engineering` pulls in its dependencies (`engineering-paved-path`, `research-tools`, `architecture-review`, each `^1.0.0`); `claude plugin list` shows them. In an open session run `/reload-plugins`. Check with `claude plugin list --json` (scope `project`) and, inside a session, by dispatching `sdd-engineering:spec-creator` or running `/sdd-engineering:run-plan`.

If the project has its own copies of the same agents or skills in `.claude/agents/` or `.claude/skills/`, remove them in a separate branch first: project files and plugin components with the same name are easy to confuse, and the plugin versions are namespaced (`sdd-engineering:spec-creator`), so nothing in the project should depend on the unprefixed copies.

## How an update reaches users

1. PR with a version bump → review → merge.
2. Users **with auto-update**: in their next interactive session (random delay of up to 10 minutes after the first message) Claude Code updates the plugin and shows `Plugin updated … Run /reload-plugins`.
3. Users **without** auto-update update in two separate steps:

   ```bash
   claude plugin marketplace update dev-digest-ai-marketplace          # 1. refresh the catalog
   claude plugin update sdd-engineering@dev-digest-ai-marketplace      # 2. update one installed plugin
   ```

   **Catalog update** (`marketplace update`) re-reads `marketplace.json` and the plugin manifests from the marketplace source: which plugins exist and which version each is at. It changes no installed plugin. **Plugin update** (`plugin update`) moves one installed plugin to the newest version the catalog lists, with its dependencies; add `--scope project` for a project install. Claude Code updates a plugin only when its `version` changed. Then `/reload-plugins` in open sessions.

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

## Return a project to a stable release

When a new release misbehaves in a project and the fix is not merged yet, pin the project to the last good release. Claude Code has no rollback command; a marketplace added at a tag serves the catalog as it was at that commit. From the project root:

```bash
# 1. Remove the marketplace that follows main (from this project's scope).
claude plugin marketplace remove dev-digest-ai-marketplace --scope project

# 2. Add it pinned to the release tag. The catalog keeps its name, so
#    plugin ids stay <plugin>@dev-digest-ai-marketplace.
claude plugin marketplace add "Svyat90/dev-digest-ai-marketplace#sdd-engineering--v1.0.0" --scope project

# 3. Install the plugin from the pinned catalog (dependencies resolve to their tags too).
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
```

4. In every open session: `/reload-plugins`.
5. Smoke eval of the same tag (cheap: one case, one run, no baseline). The cases load the plugin's dependencies by relative path, so run them from a checkout of this repository at the tag, with the repository root as the target:

   ```bash
   git clone https://github.com/Svyat90/dev-digest-ai-marketplace /tmp/ddm-stable
   cd /tmp/ddm-stable && git switch --detach sdd-engineering--v1.0.0
   claude plugin eval . --eval-dir plugins/sdd-engineering/evals \
     --case agents-are-namespaced --runs 1 --ablation none --max-cost-usd 2 --no-publish
   ```

   A score of 1.00 means the agents of the plugin and its three dependencies load under their namespaces at that tag. Then, in the project, a short manual check: dispatch `sdd-engineering:spec-creator` on a small brief.

To go back to `main` later: remove the pinned marketplace and add `Svyat90/dev-digest-ai-marketplace` again, then `plugin update`.

**What a rollback does not touch.** These plugins keep no data of their own: no `userConfig` and nothing in their `${CLAUDE_PLUGIN_DATA}` directory. Check it with:

```bash
claude plugin list --json --data-size
```

A plugin with saved data would report its data directory size there; ours report none. Everything the workflow produces — `specs/`, `docs/plans/`, `docs/retros/`, `INSIGHTS.md`, `brainstorm/ideas.md`, commits — lives in the user's repository, so switching plugin versions neither deletes nor rewrites it. A spec or plan written by a newer version stays as it is; if its format changed, the release notes in `CHANGELOG.md` say so.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/release.mjs <plugin> <bump>` | Bump the version and release `[Unreleased]` notes |
| `scripts/rollback.mjs <plugin> <version>` | Restore an earlier release as a new version |
| `scripts/check-plugins.mjs --base <ref>` | Fail if a changed plugin has no new version (runs in CI) |
| `claude plugin tag plugins/<name> [--dry-run]` | Create the `<plugin>--v<version>` tag (CI runs it after merge) |
| `scripts/eval-report.mjs <results dir> --commit <sha>` | Eval results as a table for COST-BASELINE and RELEASE-EVIDENCE |
