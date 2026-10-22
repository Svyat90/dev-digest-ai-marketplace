# DevDigest AI Marketplace

A private Claude Code plugin marketplace for the DevDigest team: the skills, agents and hooks we use every day.

The marketplace lives **separately from the DevDigest product**. The product and the team harness have different owners and release cadences: a DevDigest UI change must not ship a new skill version, and a skill fix must not require a product release.

## Quick start

You need read access to this repository and working git credentials (an SSH key loaded in `ssh-agent`, **or** `gh auth login && gh auth setup-git`).

```bash
# 1. Add the marketplace (once)
claude plugin marketplace add Svyat90/dev-digest-ai-marketplace

# 2. Install the plugins you need
claude plugin install engineering-paved-path@dev-digest-ai-marketplace
```

Inside a Claude Code session: `/plugin marketplace add Svyat90/dev-digest-ai-marketplace`, then `/plugin`.

**Turn on auto-update:** `/plugin` → **Marketplaces** → `dev-digest-ai-marketplace` → **Enable auto-update**. It is off by default for third-party marketplaces; without it you only get updates via `claude plugin update <plugin>@dev-digest-ai-marketplace`.

No GitHub SSH key? Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`, otherwise installs from `/plugin` and updates fail.

## Plugins

| Plugin | Purpose |
| --- | --- |
| [architecture-review](plugins/architecture-review) | Read-only architecture review of a change. Depends on engineering-paved-path |
| [engineering-paved-path](plugins/engineering-paved-path) | Shared stack, architecture and security skills; review kit and pre-PR self-review; force-push guard |
| [research-tools](plugins/research-tools) | Read-only researcher agent for the codebase and the web, with cited sources |
| [sdd-engineering](plugins/sdd-engineering) | Spec-driven development: spec → plan → parallel implementation → verification → retro. Depends on engineering-paved-path, research-tools and architecture-review |

Browse every plugin, skill, agent and hook in the [catalog](https://svyat90.github.io/dev-digest-ai-marketplace/) (GitHub Pages, English and Ukrainian; see [docs/SITE-SPEC.md](docs/SITE-SPEC.md)). Old `artifact-search/?q=…` links redirect to its search.

### Run the catalog locally

Node 20.19 or later.

```bash
npm run build:index                              # repo root: writes site/public/ (index, releases, stats, bodies)
cd site && npm ci && npm run dev                 # http://localhost:5173 with hot reload
npm run build && npm run preview                 # production build in site/dist
npm test                                         # Vitest: search acceptance, data parsing, locale keys
```

Re-run `npm run build:index` after changing a plugin; the dev server picks up the new files on reload. `npm run i18n:todo -- uk` (repo root) lists plugin and component descriptions whose Ukrainian translation in `site/i18n/content/uk.json` is missing or stale.

## Enable the marketplace in a project repository

To give everyone who opens a project repository the marketplace and the right plugins, commit this to that project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "dev-digest-ai-marketplace": {
      "source": { "source": "github", "repo": "Svyat90/dev-digest-ai-marketplace" }
    }
  },
  "enabledPlugins": {
    "engineering-paved-path@dev-digest-ai-marketplace": true
  }
}
```

## Layout

```
.claude-plugin/marketplace.json   plugin catalog
plugins/<name>/                   plugin sources (one directory = one plugin)
docs/                             rules: structure, security, releases, site, cost
scripts/                          checks, release/rollback, site index build, i18n report, eval report
site/                             catalog site: React + Vite app (GitHub Pages), its own package.json
.github/workflows/                CI: validate.yml (checks, site tests and build, tags), pages.yml (site deploy)
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — add or change a plugin, PR checklist
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) — plugin structure, manifest, dependencies
- [docs/SECURITY.md](docs/SECURITY.md) — permissions, secrets, script review, incidents
- [docs/RELEASES.md](docs/RELEASES.md) — SemVer, tags, install in a project, updates, channels, rollback
- [docs/RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md) — record of each release: version, tag, SHA, eval results
- [docs/SITE-SPEC.md](docs/SITE-SPEC.md) — catalog site specification
- [docs/COST-BASELINE.md](docs/COST-BASELINE.md) — context cost of each plugin

## Trust

Plugins run code on your machine (hooks, MCP servers, scripts) with your permissions. Install only plugins that went through review in this repository.
