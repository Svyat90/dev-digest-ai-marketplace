# Security

A plugin runs code on the machine of everyone who installs it, with that person's permissions: hooks, MCP servers, scripts. Treat plugin code like production code.

## Secrets

**Never** commit secrets: tokens, API keys, passwords, private keys, `.env` files, internal URLs with credentials. `scripts/check-plugins.mjs` scans for common patterns, but it is a safety net, not a guarantee.

How to obtain secrets instead:

| Need | How |
| --- | --- |
| Token for an MCP server | `userConfig` with `"sensitive": true` → stored in the OS keychain, referenced as `${user_config.KEY}` in the config |
| Token in a hook | `userConfig` + the `CLAUDE_PLUGIN_OPTION_<KEY>` environment variable in the hook; **not** `${user_config.*}` in a shell-form command (it fails) |
| Access to private git sources | the user's git credential helper (`gh auth setup-git`) — `marketplace.json` never holds tokens |

If a secret lands in a commit, follow [Incidents](#incidents). Deleting the commit does **not** make the secret safe.

## Absolute paths

`/Users/…`, `/home/…`, `C:\Users\…` and any path to someone's machine are forbidden. They break for everyone but the author and leak the layout of someone's system. Use:

- `${CLAUDE_PLUGIN_ROOT}` — plugin files (changes with every version);
- `${CLAUDE_PLUGIN_DATA}` — state and caches (kept across updates);
- `${CLAUDE_PROJECT_DIR}` — the user's project root.

## Permissions

- **Agents** get the minimum `tools`. Reviewers and analysts: `Read, Grep, Glob` only. `Bash`/`Write`/`Edit` only with a justification in the plugin README.
- **Commands** use narrow `allowedTools` (`Bash(git status:*)`), never all of `Bash`.
- **Hooks** must not weaken protections: auto-approving permissions (`permissionDecision: "allow"`) for broad matchers is forbidden.
- **MCP servers** use `https://`/`wss://` for non-localhost hosts; no credentials in `headers` (only via `userConfig`).
- Network calls from hooks and scripts go only to domains listed in the plugin README.

## Script review

Any change under `hooks/`, `scripts/` or `.mcp.json` needs owner review (see [CODEOWNERS](../CODEOWNERS)). The reviewer checks:

- [ ] It is clear **what** runs and **when** (hook event, matcher)
- [ ] The script reads only what it needs and sends no data off the machine except to documented domains
- [ ] No `curl | sh`, no `eval` of input, no downloading and running code from the network
- [ ] Input (hook JSON, arguments) is never interpolated into a shell unescaped; variables are quoted
- [ ] There is a timeout; a script error does not block work (exit 0) unless the hook is an intentional guard (exit 2)
- [ ] Nothing is written to `${CLAUDE_PLUGIN_ROOT}` or the user's repository without an explicit request
- [ ] Dependencies are pinned in a lockfile; no git dependencies and no `postinstall`
- [ ] Tested by hand on macOS and Linux

## Repository ruleset

Configure on `main` (Settings → Rules → Rulesets):

- Require a pull request before merging
- Require status checks to pass: `validate`
- Block force pushes, restrict deletions

While the repository has a **single code owner**, do not enable "Require review from Code Owners" or a required approval count: GitHub does not let authors approve their own pull requests, so the owner could never merge. Turn both on (≥ 1 approval, dismiss stale approvals) once a second owner is added to CODEOWNERS.

## Incidents

A dangerous release is a plugin that runs malicious or destructive code, or exposes secrets or data.

1. **Stop the spread (minutes).** Either roll back to the last safe version with `node scripts/rollback.mjs <plugin> <safe-version>` (ships a new, higher version — see [RELEASES.md → Rollback](RELEASES.md#rollback)), or remove the entry from `marketplace.json` and add `"renames": { "<name>": null }` and `"forceRemoveDeletedPlugins": true` — Claude Code then uninstalls the plugin for users at their next session start.
2. **Notify** the team: what happened, affected versions, what to do (`claude plugin update <name>@dev-digest-ai-marketplace` or `claude plugin uninstall`). Not everyone has auto-update on.
3. **Secrets.** Revoke and rotate every key that was committed or could have been read. Only then clean up history.
4. **Post-mortem** within a week: root cause, why review and CI missed it, which check to add to `check-plugins.mjs`.

Found a vulnerability? Contact the owners in CODEOWNERS privately, not in a public issue.
