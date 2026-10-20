# Engineering Paved Path

The team's standard path from commit to pull request.

## Install

```bash
claude plugin install engineering-paved-path@dev-digest-ai-marketplace
```

## Components

| Type | Invoke | What it does |
| --- | --- | --- |
| Skill | `/engineering-paved-path:pr-ready` | Self-review, Conventional Commits, PR description |
| Hook | `PreToolUse` (Bash) | Blocks `git push --force` to `main`/`master` |

The hook requires `node` on `PATH`.

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
