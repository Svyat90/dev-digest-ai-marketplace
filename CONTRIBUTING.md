# Contributing

Everything you need to prepare a pull request without asking in chat.

## Setup

- Claude Code CLI (the version in `CLAUDE_CODE_VERSION` in [validate.yml](.github/workflows/validate.yml) or newer)
- Node.js 20+
- Git with access to this repository

```bash
git clone git@github.com:Svyat90/dev-digest-ai-marketplace.git
cd dev-digest-ai-marketplace
claude plugin marketplace add ./      # local marketplace: edits apply without a version bump
```

> A marketplace added from a local path loads plugins **in place**: edits apply after `/reload-plugins` or a new session. Users who install from GitHub get a cached copy and need a version bump.
>
> The local and GitHub marketplaces share the name `dev-digest-ai-marketplace`, so only one can be registered at a time. Before developing: `claude plugin marketplace remove dev-digest-ai-marketplace`; afterwards, add the GitHub one back.

## Add a new plugin

1. Create `plugins/<name>/` following [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md). The quickest start is copying `plugins/research-tools/`.
2. Fill in `.claude-plugin/plugin.json`: `name` = directory name, `version: "0.1.0"`. Keep an empty `## [Unreleased]` section and a `## [0.1.0]` section in `CHANGELOG.md`.
3. Add an entry to `.claude-plugin/marketplace.json`, **in alphabetical order**:
   ```json
   { "name": "<name>", "source": "./plugins/<name>", "description": "…", "category": "…", "tags": ["…"] }
   ```
   Do **not** set `version` in the entry.
4. Add a row to the plugin table in [README.md](README.md) and a line to [CODEOWNERS](CODEOWNERS).
5. Run the checks below and open a PR.

## Change an existing plugin

1. Make your changes and describe them under `## [Unreleased]` in the plugin's `CHANGELOG.md`.
2. Cut the release (picks the version, moves the notes, updates `plugin.json`):
   ```bash
   node scripts/release.mjs <plugin> <patch|minor|major> --dry-run   # preview
   node scripts/release.mjs <plugin> <patch|minor|major>
   ```
   Without a version change users **do not** receive the update, and CI fails. See [docs/RELEASES.md](docs/RELEASES.md) for which bump to choose.

## Checks before a PR

```bash
claude plugin validate . --strict                        # marketplace
for d in plugins/*/; do claude plugin validate "$d" --strict; done
node scripts/check-plugins.mjs --base origin/main         # team rules + version bump
node scripts/build-index.mjs --cost                       # site index + context cost
```

Then check by hand:

```bash
claude plugin install <name>@dev-digest-ai-marketplace
claude plugin details <name>                              # Component inventory
```

and invoke the skill in a session: `/<name>:<skill>`.

CI ([validate.yml](.github/workflows/validate.yml)) runs the same checks on every PR.

## What `check-plugins.mjs` enforces

Rules that `claude plugin validate` does not cover:

- catalog entries are sorted, `source` is `./plugins/<name>`, no `version`;
- `name` in `plugin.json` equals the catalog entry `name`;
- `version` is SemVer and has a `CHANGELOG.md` section; `## [Unreleased]` exists; changed plugins have a new version;
- required fields: `description`, `author`, `license`, `keywords`, `repository`; `README.md` exists;
- every skill/agent/command has frontmatter with `description`;
- no top-level `bin/`, no `CLAUDE.md`, no LFS files, no files over 1 MiB;
- no secrets and no absolute local paths;
- dependencies exist in this marketplace.

## Pull request checklist

- [ ] `claude plugin validate --strict` and `node scripts/check-plugins.mjs --base origin/main` pass
- [ ] Version bumped with `scripts/release.mjs`, `CHANGELOG.md` updated
- [ ] Plugin installed from the local marketplace and tested by hand
- [ ] Each skill `description` says **when** to use it (this drives automatic invocation)
- [ ] All text is in English
- [ ] No secrets, tokens or absolute paths; hook paths use `"${CLAUDE_PLUGIN_ROOT}"`
- [ ] New hooks / MCP servers / scripts are documented in the plugin README and passed the [security review](docs/SECURITY.md#script-review)
- [ ] A changed `name` or removed plugin is recorded in `renames`
- [ ] [docs/COST-BASELINE.md](docs/COST-BASELINE.md) updated if idle cost grew by more than 20%

## Review

[CODEOWNERS](CODEOWNERS) defines who approves changes. Direct pushes to `main` are blocked by the repository ruleset.
