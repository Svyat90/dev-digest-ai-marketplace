# Site spec: artifact search

A static catalog site on GitHub Pages where a user types what they need ("I need a skill to review an ADR") and gets every matching artifact of this marketplace — skills, agents, commands, hooks, MCP servers — as cards with everything needed to install it.

Next step: `/sdd-engineering:plan-from-spec`.

## Problem

The marketplace is a Git repository. To find out whether a skill for some task exists, a user has to browse `plugins/*`, open `SKILL.md` files and guess which plugin bundles them. There is no way to search by intent, and nothing tells the user how much context a plugin costs before they install it.

## Who it is for

- **Engineers on the team** who use Claude Code and want to find and install an existing artifact instead of writing their own.
- **Plugin authors** who want to check that a similar artifact does not already exist before adding one.

## Constraints

- **No backend.** GitHub Pages serves static files only. The search index is built at build time; searching happens in the browser.
- **Everything user-facing is in English**: the site UI and the catalog text it shows.
- **Minimal scope.** Only the features listed under *User stories* ship in this version.

## User stories

1. As an engineer, I want to describe my task in free text and see matching artifacts, so that I find a fitting skill or agent without browsing the repository.
2. As an engineer, I want to narrow results to one artifact type, so that I only see agents (or skills, hooks…) when that is what I need.
3. As an engineer, I want to copy the install command from a card, so that I go from finding an artifact to using it in one step.
4. As an engineer, I want to open an artifact's source on GitHub, so that I can read what it does before installing it.
5. As an engineer, I want to see an artifact's context cost, so that I know what installing its plugin adds to every session.
6. As an engineer, I want to share a link to my search, so that a teammate sees the same results.

## Search behaviour

**Search unit.** One card per component: every skill, agent, command, hook event and MCP server of every plugin in `.claude-plugin/marketplace.json`. Plugins themselves are not cards; each card names its plugin.

**Searched fields and weights** (higher weight ranks higher):

| Field | Source | Weight |
|---|---|---|
| Component name | frontmatter `name`, hook event, MCP server name | 5 |
| Plugin tags | `marketplace.json` `tags` | 4 |
| Component description | frontmatter `description` | 3 |
| Plugin name, description, category | `marketplace.json` / `plugin.json` | 2 |
| File content | body of the component file (frontmatter stripped); for hooks, the hook commands | 1 |

**Query processing.**
- Case-insensitive. Words are split on whitespace and punctuation, including `-`, `_`, `/` and `.` (so `guard-force-push.mjs` yields `guard`, `force`, `push`, `mjs`).
- Stop words are dropped: common English function words (`i`, `a`, `an`, `the`, `to`, `for`, `of`, `with`, `that`, `need`, `want`, `something`, `tool`…) and the artifact type words (`skill`, `skills`, `agent`, `agents`, `command`, `hook`, `plugin`…). Type is chosen with the type filter, not by words in the query.
- A query term matches a word when one is a prefix of the other and the shorter one is at least 3 characters (`review` matches `reviewing`, `adrs` matches `adr`).
- If no terms remain after dropping stop words, the full catalog is shown.

**Ranking.** A card is shown if at least one query term matches. Cards are ordered by the number of distinct query terms matched, then by total weight, then alphabetically by name.

## Page

- **Header:** marketplace name and description; the "add marketplace" command (`addCommand`) with a Copy button; the search field (focused on load); the type filter.
- **Type filter:** `All` plus one option per artifact type present in the catalog (types with zero artifacts are not shown).
- **Result count:** e.g. "3 artifacts".
- **Card:**
  - type badge (Skill / Agent / Command / Hook / MCP);
  - component name, with matched words highlighted;
  - plugin display name and version;
  - component description, with matched words highlighted; hooks and MCP servers, which have no description of their own, show the plugin description;
  - "Matched in file content" note when the only matches are in the file content;
  - context cost badge: `~56 tokens idle · ~142 on use` (from `tokens.idle` / `tokens.invoked`);
  - the plugin's install command with a Copy button;
  - a "Source" link to the component file on GitHub.
- **Footer:** build commit, link to `CONTRIBUTING.md`.

## Acceptance criteria

**Search**
- **Given** the catalog has loaded, **When** the user types `I need a skill to review an ADR`, **Then** the `adr-review` skill is the first card.
- **Given** any query, **When** the user types, **Then** results update without a page reload and without a submit button.
- **Given** the query `REVIEW`, **When** results render, **Then** they are identical to the query `review`.
- **Given** a query made only of stop words (e.g. `I need a skill`), **When** results render, **Then** the full catalog is shown.
- **Given** a query that matches nothing, **When** results render, **Then** the page shows "No artifacts match" and a "Clear search" action that empties the query and shows the full catalog.
- **Given** a query whose only match is in a component's file content, **When** its card renders, **Then** the card shows "Matched in file content".
- **Given** a query, **When** a card renders, **Then** query terms found in the card's name and description are highlighted.

**Filter**
- **Given** results for any query, **When** the user selects `Agent`, **Then** only agent cards are shown and the result count updates.
- **Given** the catalog has no MCP servers, **When** the page renders, **Then** the type filter has no `MCP` option.

**Cards**
- **Given** a card, **When** the user clicks Copy next to the install command, **Then** `claude plugin install <plugin>@dev-digest-ai-marketplace` is on the clipboard and the button shows "Copied" for about 2 seconds.
- **Given** the header, **When** the user clicks Copy next to the add command, **Then** `/plugin marketplace add Svyat90/dev-digest-ai-marketplace` is on the clipboard.
- **Given** a card, **When** the user clicks "Source", **Then** the component's file opens on GitHub at the build commit (or `main` when the commit is unknown).
- **Given** a card, **When** it renders, **Then** it shows the idle and on-use token estimates from `plugins.json`.

**Shareable URL**
- **Given** the user has typed `adr` and selected `Skill`, **When** they copy the address bar, **Then** the URL contains `?q=adr&type=skill`.
- **Given** a URL with `?q=adr&type=skill`, **When** the page opens, **Then** the search field contains `adr`, the filter is `Skill`, and the results match.

**Errors**
- **Given** `plugins.json` fails to load or parse, **When** the page renders, **Then** it shows "Could not load the catalog" with a link to the repository, and no empty card grid.

## Data contract

`site/plugins.json` is generated by `scripts/build-index.mjs` from `.claude-plugin/marketplace.json` and `plugins/*`. It is not committed (`.gitignore`); CI builds it. The site has no data of its own: everything it shows comes from the manifests and component files.

This version adds two fields to the existing schema: `repository` at the top level and `text` on each component.

```jsonc
{
  "marketplace": "dev-digest-ai-marketplace",
  "description": "…",
  "addCommand": "/plugin marketplace add Svyat90/dev-digest-ai-marketplace",
  "repository": "https://github.com/Svyat90/dev-digest-ai-marketplace", // new: base for Source links
  "commit": "abc1234",
  "plugins": [{
    "name": "…", "displayName": "…", "version": "0.1.0",
    "description": "…", "category": "…", "tags": ["…"], "dependencies": [],
    "install": "claude plugin install <name>@dev-digest-ai-marketplace",
    "homepage": "…",
    "components": [{
      "type": "skill|agent|command|hook|mcp",
      "name": "…", "description": "…", "path": "…",
      "text": "…",                          // new: searchable file content (frontmatter stripped; hook commands for hooks)
      "tokens": { "idle": 0, "invoked": 0 }
    }],
    "tokens": { "idle": 0, "invoked": 0 }
  }]
}
```

## Non-functional requirements

- No build step and no frameworks: `index.html` + `style.css` + `app.js`; no external CDNs, fonts or libraries.
- Results update within 100 ms of a keystroke for the current catalog size.
- `plugins.json` stays under 500 KB.
- Light and dark themes via `prefers-color-scheme`.
- Works from 320 px wide with no horizontal scroll.
- Keyboard accessible: the search field, filter, Copy buttons and Source links are reachable with Tab; Copy buttons have accessible labels.
- No analytics, cookies or tracking.

## Non-goals

- Semantic or AI-powered search, synonyms, or searching in languages other than English.
- Per-plugin pages, README rendering, changelog feed.
- Choosing several plugins to generate a `settings.json` or install script (candidate for a later version).
- Ratings, reviews, install counts, accounts — they need a backend.
- Sorting controls beyond relevance; filters other than type.

## Success metrics

- **Canonical queries:** each query below returns the expected artifact in the top 3 results. This list becomes the site's acceptance test.

  | Query | Expected first-3 result |
  |---|---|
  | `I need a skill to review an ADR` | `adr-review` (skill) |
  | `review a design change` | `architecture-reviewer` (agent) |
  | `write a spec for a new feature` | `write-spec` (skill) |
  | `break a spec into tasks` | `plan-from-spec` (skill) |
  | `prepare a pull request` | `pr-ready` (skill) |
  | `research a technology with sources` | `tech-research` (skill) |
  | `block force push` | `PreToolUse` hook of `engineering-paved-path` |

- **Time to install:** a teammate new to the marketplace finds an artifact and copies its install command in under a minute (checked by hand with 2–3 people).

## Deploy

`.github/workflows/pages.yml` runs on every push to `main` that touches the catalog, plugins, scripts or site: `build-index.mjs` → `site/` → GitHub Pages.

One-time setup: Settings → Pages → Source: **GitHub Actions**.

> **Privacy.** GitHub Pages for a private repository needs a paid plan, and the site is **public** by default even when the repository is private. Only GitHub Enterprise Cloud offers private Pages (Pages → Visibility: Private). The site shows names, descriptions and the full content of plugin files. If that must not be public, do not enable Pages; preview locally instead.

## Local preview

```bash
node scripts/build-index.mjs
python3 -m http.server -d site 8000   # http://localhost:8000
```

## Assumptions and open questions

- Decided: all catalog text is in English — plugin and component descriptions, skill bodies, READMEs and docs. Skill descriptions contain no non-English trigger phrases.
- [ASSUMPTION] Hooks have no description in `hooks.json`, so a hook card shows its plugin's description, and the hook's command (e.g. `guard-force-push.mjs`) is its searchable content. That is what makes the `block force push` query work.
- [ASSUMPTION] Full file content is indexed with the lowest weight. If it makes results noisy, we drop it to metadata only.
- [ASSUMPTION] Source links point at the build commit so they always match what the index described.
- Decided: `README.md`, `CONTRIBUTING.md` and all docs are in English.
