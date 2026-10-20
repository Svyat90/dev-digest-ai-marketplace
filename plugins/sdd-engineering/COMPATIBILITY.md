# Compatibility — sdd-engineering

| Requirement | Minimum | Why |
|---|---|---|
| Claude Code | `>=2.1.110` | version-constrained plugin `dependencies` in `plugin.json` are installed and honoured from 2.1.110 |
| Node.js | 18 | hook scripts (`scripts/*.mjs`) and skill scripts (`lint-plan.mjs`, `collect.mjs`) run with `node`; no npm dependencies |
| git | any recent | `run-plan` and `workflow-retro` read history and diffs |

Features this plugin relies on, all available at the minimum above:

| Feature | Since | Used by |
|---|---|---|
| `agent_type` in hook input | 2.1.69 | scope and lint hooks act only for their own agent |
| `${CLAUDE_SKILL_DIR}` in `SKILL.md` | 2.1.69 | `run-plan`, `brainstorm` and `workflow-retro` call their bundled files |
| `${CLAUDE_PLUGIN_ROOT}` in `hooks.json` | — | hook commands |
| plugin `dependencies` with semver ranges | 2.1.110 | `engineering-paved-path`, `research-tools`, `architecture-review`, all `^1.0.0` |

Tested with Claude Code 2.1.304. If a release starts using a newer feature, add it
to the table above and raise the minimum to the version that introduced it
(see the official Claude Code changelog).
