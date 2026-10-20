# Plugin guidelines

Rules for plugin structure, manifest and dependencies. Enforced by `claude plugin validate --strict` and `scripts/check-plugins.mjs`.

Primary sources: [Plugin manifest reference](https://code.claude.com/docs/en/plugins-reference), [Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference).

## Structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json          required; the manifest and nothing else
├── skills/
│   └── <skill>/
│       ├── SKILL.md         frontmatter: name, description
│       └── *.md             supporting files referenced from SKILL.md
├── agents/<agent>.md        frontmatter: name, description, tools
├── commands/<cmd>.md        legacy only; use skills for new work
├── hooks/hooks.json         { "hooks": { <Event>: [...] } }
├── scripts/                 executables called by hooks and MCP servers
├── .mcp.json                MCP servers
├── README.md                required
└── CHANGELOG.md             required; keeps a "## [Unreleased]" section
```

Rules:

- All components live at the **plugin root**, not inside `.claude-plugin/`.
- Stick to the default directories. The `commands`, `agents` and `outputStyles` keys in `plugin.json` **replace** the default directory instead of adding to it — a common surprise.
- **No top-level `bin/`**: claude.ai/Cowork and claude.ai organization sync reject such a plugin. Put executables in `scripts/` and call them as `"${CLAUDE_PLUGIN_ROOT}"/scripts/<file>`.
- **No `CLAUDE.md`** — it is not loaded from a plugin. Put instructions in a skill.
- **No paths outside the plugin** (`../shared`). The plugin is copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` and anything outside its directory is lost. To share files between plugins, use a symlink inside the marketplace (it is dereferenced on copy).
- **No Git LFS** — the clone does not fetch LFS content; users get pointer files.
- Forward slashes only: `\` in a path breaks the component on macOS/Linux.
- **English only** for all text: descriptions, skill bodies, templates, READMEs, changelogs.

## Naming

| What | Rule | Example |
| --- | --- | --- |
| Plugin | kebab-case; equals the directory name, `plugin.json` `name` and `marketplace.json` `name` | `sdd-engineering` |
| Skill | kebab-case, a verb or action | `write-spec`, `pr-ready` |
| Agent | kebab-case, a role | `architecture-reviewer` |

Forbidden: the prefixes `claude-`, `anthropic-`, `cc-plugin-`; `official` next to `claude`/`anthropic`. `claude` as a standalone word triggers a warning. Every component is namespaced by its plugin (`/sdd-engineering:write-spec`), so do not repeat the plugin name in a skill name.

**`name` is immutable.** It is the key in every user's `enabledPlugins` and `pluginConfigs`. To change the UI label, use `displayName`. If a rename is unavoidable, see [renames](RELEASES.md#renames-and-removals).

## plugin.json

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "0.1.0",
  "description": "One sentence: what the plugin gives you",
  "author": { "name": "DevDigest AI Platform", "url": "https://github.com/Svyat90" },
  "homepage": "https://github.com/Svyat90/dev-digest-ai-marketplace/tree/main/plugins/my-plugin",
  "repository": "https://github.com/Svyat90/dev-digest-ai-marketplace",
  "license": "UNLICENSED",
  "keywords": ["…"]
}
```

| Field | Status | Note |
| --- | --- | --- |
| `name` | required | see naming |
| `version` | required (team rule) | SemVer; **only here**, never in `marketplace.json`; change it with `scripts/release.mjs` |
| `description`, `author`, `license`, `keywords`, `repository` | required (team rule) | without them `validate` warns and `--strict` fails |
| `displayName`, `homepage` | recommended | `homepage` must be a valid URL or the plugin fails to load |
| `dependencies` | when needed | see below |
| `userConfig` | when needed | tokens use `"sensitive": true` (see SECURITY) |
| `defaultEnabled` | rarely | changing it after release does nothing for existing users |

Unknown top-level keys are silently dropped — only `validate` catches typos.

## Catalog entry in marketplace.json

```json
{ "name": "my-plugin", "source": "./plugins/my-plugin", "description": "…", "category": "…", "tags": ["…"] }
```

- `source` is always `./plugins/<name>` — relative to the **repository root**, not to `.claude-plugin/`.
- Entries are sorted alphabetically.
- Do not declare components (`skills`, `hooks`, …) in the entry — `plugin.json` describes everything. Do not set `version`.
- `category` is one of: `engineering`, `review`, `research`, `productivity`, `ops`.

## Skills

```markdown
---
name: write-spec
description: <what it does>. Use when <when to invoke it — concrete requests and situations>.
---
```

- The `description` is always in context while the plugin is enabled, and Claude decides whether to invoke the skill from it. Say **when** to use it, not only **what** it does. Keep it under ~300 characters.
- The body loads only on invocation: put detailed instructions there and reference material in separate files next to it.
- Link skill files relatively (`[checklist.md](checklist.md)`) or via `${CLAUDE_PLUGIN_ROOT}`.

## Hooks, MCP, scripts

- Paths only via `${CLAUDE_PLUGIN_ROOT}` (plugin files) and `${CLAUDE_PLUGIN_DATA}` (state, caches, `node_modules` — survives updates). `CLAUDE_PLUGIN_ROOT` changes with every version; never write state there.
- Quote the variable in shell form: `"command": "node \"${CLAUDE_PLUGIN_ROOT}\"/scripts/x.mjs"`.
- `hooks/hooks.json` is wrapped in `{ "hooks": { … } }` — without the wrapper it does not load.
- Node dependencies install automatically only with `package.json` + `package-lock.json` (v2/v3) at the plugin root; `yarn.lock`/`pnpm-lock.yaml` are ignored and `postinstall` never runs. Prefer dependency-free scripts.
- Every hook and script goes through the [security review](SECURITY.md#script-review).

## Dependencies between plugins

```json
"dependencies": ["engineering-paved-path"]
```

- A bare name resolves in this marketplace — the default choice.
- Version range: `{ "name": "engineering-paved-path", "version": "^1.0.0" }`. Resolved against the `<plugin>--v<version>` git tags that CI creates ([RELEASES.md](RELEASES.md#tags)).
- Dependencies on other marketplaces are forbidden until that marketplace is added to `allowCrossMarketplaceDependenciesOn` (platform owner decision).
- No cycles. Add a dependency only when the plugin genuinely does not work without the other one — each dependency adds context.

## Size and context

Every enabled plugin permanently occupies context with the descriptions of its skills and agents. Keep plugins narrow (3–7 components) and move rarely used parts into a separate plugin. Budget: [COST-BASELINE.md](COST-BASELINE.md).
