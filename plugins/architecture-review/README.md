# Architecture Review

Review ADRs and design documents against the team checklist.

## Install

```bash
claude plugin install architecture-review@dev-digest-ai-marketplace
```

## Components

| Type | Invoke | What it does |
| --- | --- | --- |
| Skill | `/architecture-review:adr-review` | Reviews an ADR against `checklist.md` |
| Agent | `architecture-review:architecture-reviewer` | Read-only analysis of trade-offs and failure modes |

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
