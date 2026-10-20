## What changed
<!-- plugin(s), version before → after -->

## How it was tested
<!-- commands, manual /plugin:skill check -->

## Checklist ([CONTRIBUTING.md](../CONTRIBUTING.md#pull-request-checklist))
- [ ] `claude plugin validate --strict` and `node scripts/check-plugins.mjs --base origin/main` pass
- [ ] Version bumped with `scripts/release.mjs`, `CHANGELOG.md` updated
- [ ] Plugin installed from the local marketplace and tested by hand
- [ ] All text is in English; no secrets or absolute paths
- [ ] New hooks / MCP servers / scripts passed the [security review](../docs/SECURITY.md#script-review)
- [ ] Renames/removals recorded in `renames`
