# Compatibility — engineering-paved-path

| Requirement | Minimum | Why |
|---|---|---|
| Claude Code | `>=2.1.110` | the marketplace's floor; `pr-self-review` uses `disable-model-invocation`, fixed for mid-message `/<skill>` in 2.1.110 |
| Node.js | 18 | the force-push hook and `review-kit` scripts run with `node`; no npm dependencies |
| git | any recent | `review-kit` precheck collects the diff |

Features this plugin relies on: `${CLAUDE_SKILL_DIR}` in `SKILL.md` (2.1.69),
`${CLAUDE_PLUGIN_ROOT}` in `hooks.json`. Tested with Claude Code 2.1.304. If a
release starts using a newer feature, list it here and raise the minimum to the
version that introduced it.
