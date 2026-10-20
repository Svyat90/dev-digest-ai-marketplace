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
| [architecture-review](plugins/architecture-review) | Review ADRs and design documents |
| [engineering-paved-path](plugins/engineering-paved-path) | Code, commit and PR conventions; force-push guard |
| [research-tools](plugins/research-tools) | Technical research with cited sources |
| [sdd-engineering](plugins/sdd-engineering) | Spec-driven development: spec → plan → tasks |

Search every skill, agent and hook on [Artifact Search](https://svyat90.github.io/dev-digest-ai-marketplace/artifact-search/) (GitHub Pages; see [docs/SITE-SPEC.md](docs/SITE-SPEC.md)).

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
scripts/                          checks, release/rollback, site index build
site/artifact-search/             Artifact Search site (GitHub Pages)
.github/workflows/                CI: validate.yml (checks + tags), pages.yml (site)
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — add or change a plugin, PR checklist
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md) — plugin structure, manifest, dependencies
- [docs/SECURITY.md](docs/SECURITY.md) — permissions, secrets, script review, incidents
- [docs/RELEASES.md](docs/RELEASES.md) — SemVer, tags, updates, channels, rollback
- [docs/SITE-SPEC.md](docs/SITE-SPEC.md) — catalog site specification
- [docs/COST-BASELINE.md](docs/COST-BASELINE.md) — context cost of each plugin

## Trust

Plugins run code on your machine (hooks, MCP servers, scripts) with your permissions. Install only plugins that went through review in this repository.
