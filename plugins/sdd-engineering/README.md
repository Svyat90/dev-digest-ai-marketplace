# SDD Engineering

Spec-driven development: specification first, then plan and tasks.

## Install

```bash
claude plugin install sdd-engineering@dev-digest-ai-marketplace
```

## Components

| Type | Invoke | What it does |
| --- | --- | --- |
| Skill | `/sdd-engineering:write-spec` | `specs/<feature>/spec.md` with acceptance criteria |
| Skill | `/sdd-engineering:plan-from-spec` | `plan.md` and `tasks.md` from the spec |

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
