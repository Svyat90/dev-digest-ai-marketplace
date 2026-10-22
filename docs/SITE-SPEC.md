# Site spec: marketplace catalog (v2)

A static catalog of this marketplace on GitHub Pages. The Claude Code CLI stays the way to **install**; the site is for **discovery**: find a plugin or an artifact, read its docs, see its dependencies and compatibility, and copy the install command.

v2 replaces the zero-build Artifact Search page (v1, see git history) with a React + TypeScript + Vite app built in CI. Design reference: the *Catalog* Claude Design prototype (`Catalog.dc.html`); its mock plugins, accent picker and `support.js` runtime are not shipped; its Ukrainian copy seeds `uk.json`.

Next step: an implementation plan from `sdd-engineering:implementation-planner`.

## Who it is for

- **Engineers** who want an existing skill or agent instead of writing their own, and the command to install it.
- **Plugin authors** who check what exists, what depends on what, and what changed recently.

## Constraints

- **No backend.** GitHub Pages serves static files. All data is generated at build time; search runs in the browser.
- **Real data only.** Everything shown comes from `marketplace.json`, `plugin.json`, `README.md`, `CHANGELOG.md`, `COMPATIBILITY.md` and component files. No placeholders.
- **Multi-language.** No UI string is hard-coded in components; every string comes from a locale file (see *Languages*). v2 ships `en` and `uk`.
- **Plugins stay English.** Translated catalog text lives in the site, never in `plugins/` (descriptions are what Claude reads to pick a skill, and `check-plugins.mjs` rejects non-English text there).
- Out of scope: ratings, download counters, accounts, RSS, semantic search.

## Stack

| Concern | Choice |
|---|---|
| App | React 18, TypeScript (strict), Vite; lives in `site/` with its own `package.json` and lockfile |
| Routing | hash routing (works on Pages without server rewrites); Vite `base: './'` |
| Search | MiniSearch, index built in the browser from `index.json` |
| Markdown | `marked`, output always passed through DOMPurify; relative links rewritten to GitHub at the build commit |
| Tests | Vitest for search and data parsing |

## Routes and screens

| Route | Screen |
|---|---|
| `#/` | **Home**: hero search, top keyword chips, counts per type (from `stats.json`), latest 4 releases, browse by type |
| `#/search?q=&type=&kw=&sort=` | **Search**: facets (type, keywords; author only when there is more than one), sort (relevance, name, recently updated), result cards with *Copy install* and *Open* |
| `#/plugin/<name>` | **Plugin**: display name, version, compatibility badge, author, last updated, install command with Copy, *View on GitHub*, components grouped by type, dependencies with ranges (links to their pages), rendered README, changelog, idle context cost |
| `#/artifact/<plugin>/<type>/<name>` | **Artifact**: breadcrumb, type, invocation (`/plugin:skill` or `plugin:agent`), tools/permissions from frontmatter, install command of its plugin, idle and on-use cost, rendered body, source link |
| `#/whats-new` | **What's new**: every release from every changelog, newest first |
| `#/getting-started` | **Getting started**: add marketplace → install → update, the difference between `marketplace update` and `plugin update`, how to turn on auto-update |

Global: header search (Enter goes to Search), ⌘K / Ctrl+K command palette (jump to any plugin or artifact; Esc closes), light/dark theme toggle (default: system preference, choice remembered in `localStorage`), toast on copy. Old `artifact-search/?q=…&type=…` links redirect to `#/search` with the same query.

Install command everywhere: `/plugin install <plugin>@dev-digest-ai-marketplace`. Add command: `/plugin marketplace add Svyat90/dev-digest-ai-marketplace`.

## Data contract

`scripts/build-index.mjs` (Node, no dependencies; root script `npm run build:index`) writes to `site/public/`. None of it is committed.

| File | Contents |
|---|---|
| `index.json` | marketplace name, description, add command, repository, commit, build time; `plugins[]`: name, displayName, version, description, author, category, keywords, dependencies (name + range), compatibility (Claude Code range, Node if any, from `COMPATIBILITY.md`), install, homepage, last updated (date of the last commit touching the plugin), tokens, component ids; `artifacts[]`: id, plugin, type, name, description, invocation, tools, path, searchable plain text, tokens |
| `releases.json` | one entry per released version in every `CHANGELOG.md` (not `[Unreleased]`): plugin, version, date, summary (first bullet), sections |
| `stats.json` | counts per type, total idle and on-use tokens, commit, build time |
| `bodies/<plugin>/README.md`, `bodies/<plugin>/<type>-<name>.md` | raw markdown (frontmatter stripped), fetched when a page opens |

Indexed components are the ones Claude Code loads: `skills/*/SKILL.md`, `.md` with frontmatter in `agents/` and `commands/`, events in `hooks/hooks.json`, servers in `.mcp.json`. Token estimates keep the v1 rules (hooks and `disable-model-invocation` skills cost 0 idle). `build-index.mjs --cost` still prints the COST-BASELINE table.

## Languages

### UI strings

- One file per language: `site/src/i18n/locales/<code>.json` (`en.json`, `uk.json`). Flat dotted keys (`search.placeholder`, `plugin.dependencies`), `{name}` placeholders, plural forms as `key.one|few|many|other` resolved with `Intl.PluralRules`.
- `en.json` is the source of truth: the TypeScript key type is derived from it, so a missing key in a component is a compile error. A Vitest test fails when another locale lacks a key, has an extra one, or uses different placeholders.
- Locales are discovered with `import.meta.glob`; **adding a language = adding `<code>.json`** (plus, optionally, a content file below). The language list in the header switcher shows each locale's `meta.nativeName`.
- Active language: `?lang=` in the URL if present, else the remembered choice (`localStorage`), else the browser language if supported, else `en`. `<html lang>` follows it. Dates and numbers use `Intl` with the active locale.
- A small in-house `t()` hook and provider; no i18n library.

### Catalog content

Plugin and component **descriptions** (and plugin display names, if wanted) can be translated in `site/i18n/content/<code>.json`:

```jsonc
{
  "plugins":   { "sdd-engineering": { "description": "…", "source": "3f9a1c2e" } },
  "artifacts": { "sdd-engineering/agent/spec-creator": { "description": "…", "source": "b71d04aa" } }
}
```

- `source` is the first 8 hex characters of the SHA-256 of the English text the translation was made from. `build-index.mjs` copies translations into `index.json` per item and marks them `stale` when the English text has changed since.
- The site shows a translation only when it exists and is not stale; otherwise the English text, unmarked. Search in a non-English language indexes both the English and the translated description, so queries work in either language.
- `npm run i18n:todo -- uk` prints every missing or stale entry with its current English text and hash, ready to hand to Claude for a draft; drafts are reviewed and committed like code. CI prints the same report to the job summary and never fails on it.
- Not translated: READMEs, skill and agent bodies, changelogs (they stay English and are shown as is).

## Search

Fields and boosts: name 5, plugin keywords 4, description 3 (plus the translated description in the active language), plugin name and description 2, file content 1. Prefix matching on, light fuzzy matching, stop words of the active language and type words (`skill`, `agent`, …) dropped; type is chosen with the facet. A query of stop words only shows the whole catalog.

## Acceptance criteria

- **Every artifact is findable by its name** in the top 3, for the whole catalog (no per-plugin test edits).
- **Canonical queries** return the expected artifact in the top 3:

  | Query | Expected |
  |---|---|
  | `write tests for a react component` | `engineering-paved-path` skill `react-testing-library` |
  | `write a spec for a new feature` | `sdd-engineering` agent `spec-creator` |
  | `break a spec into tasks and waves` | `sdd-engineering` agent `implementation-planner` |
  | `execute an implementation plan` | `sdd-engineering` skill `run-plan` |
  | `check the code against the plan` | `sdd-engineering` agent `plan-verifier` |
  | `review the architecture of my change` | `architecture-review` agent `architecture-reviewer` |
  | `self review before a pull request` | `engineering-paved-path` skill `pr-self-review` |
  | `research a question in the codebase` | `research-tools` agent `researcher` |
  | `drizzle transactions` | `engineering-paved-path` skill `drizzle-orm-patterns` |
  | `next.js server components` | `engineering-paved-path` skill `next-best-practices` |
  | `block force push` | `engineering-paved-path` hook `PreToolUse` |

- **Given** the plugin page of `sdd-engineering`, **Then** it shows the version from `plugin.json`, `>=2.1.110` from `COMPATIBILITY.md`, and the three dependencies with `^1.0.0`, each linking to its plugin page.
- **Given** any *Copy install* button, **When** clicked, **Then** the clipboard holds `/plugin install <plugin>@dev-digest-ai-marketplace` and a toast confirms it.
- **Given** a README or skill body containing raw HTML or a `javascript:` link, **When** rendered, **Then** scripts and event handlers are stripped (DOMPurify).
- **Given** a URL `#/search?q=drizzle&type=skill`, **When** opened, **Then** the search field, facet and results match it; changing them updates the URL.
- **Given** `index.json` fails to load, **Then** the page shows "Could not load the catalog" with a link to the repository.
- **Given** a new release in a `CHANGELOG.md` merged to `main`, **Then** it appears on Home and What's new after the Pages deploy, with no site change.
- **Given** the language switcher set to Українська, **Then** every UI string comes from `uk.json`, the choice survives a reload, and `#/…?lang=en` overrides it.
- **Given** a description translated in `content/uk.json` whose English source then changes, **When** the index is rebuilt, **Then** the site shows the English text and `i18n:todo` lists the entry as stale.
- **Given** Ukrainian is active and `uk.json` translates the `spec-creator` description, **When** the user searches a word that appears only in that translation, **Then** `spec-creator` is in the top 3.
- **Given** a new file `locales/pl.json` with every key, **When** the site is built, **Then** Polski appears in the switcher with no code change.
- Works from 320 px wide with no horizontal scroll; keyboard reachable; no analytics or cookies.

## Build, CI and local run

```bash
npm run build:index                              # repo root: writes site/public/*
cd site && npm ci && npm run dev                 # dev server with hot reload
cd site && npm run build && npm run preview      # production build in site/dist
cd site && npm test                              # Vitest: search acceptance, data parsing, locale keys
npm run i18n:todo -- uk                          # repo root: missing or stale content translations
```

- `validate.yml` (pull requests and `main`): build the index, `npm ci`, `npm test`, `npm run build`.
- `pages.yml` (push to `main`): the same build, then publish `site/dist`.
- `.gitignore`: `site/public/*.json`, `site/public/bodies/`, `site/dist/`, `site/node_modules/`.
- Removed with v1: `site/artifact-search/*` (except a redirect page), `scripts/test-site-search.mjs`, `scripts/serve-site.mjs`.

> **Privacy.** Pages sites are public by default even for a private repository, and the catalog shows the full content of plugin files.

## Open questions

- [ASSUMPTION] v2 ships Ukrainian translations of all plugin and component descriptions (~35 entries); READMEs and bodies stay English.
- [ASSUMPTION] Default theme follows the system setting rather than the design's dark-first default.
- [ASSUMPTION] "Last updated" is the date of the last commit touching the plugin directory; the changelog date is used when git history is unavailable.
