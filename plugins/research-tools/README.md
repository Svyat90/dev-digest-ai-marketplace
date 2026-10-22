# Research Tools

Answers to concrete questions about your codebase or the outside world, with
evidence for every claim and an honest list of what was not found.

## Install

```bash
/plugin marketplace add Svyat90/dev-digest-ai-marketplace
claude plugin install research-tools@dev-digest-ai-marketplace
```

No dependencies.

## Components

| Type | Name | Does |
|---|---|---|
| Agent | `research-tools:researcher` | read-only research in the repository, on the web, or both |

## The researcher

- **Modes:** `project` (code, docs, specs, `INSIGHTS.md`, git history), `web`
  (official docs, changelogs, specs — dated, version-checked), or `mixed`.
- **Read-only:** no file writes, no installs, no git writes, no network calls
  that send data.
- **Report:** a fixed structure — status `FOUND | PARTIAL | NOT FOUND`,
  confidence, findings with `path:line` or URL and date, *Not found*, and a
  search log.
- **Vague question?** Before running it, Claude asks you 1–3 questions with
  options; if the agent still finds the brief ambiguous, it returns
  `NEEDS CLARIFICATION` with its questions instead of guessing.

Ask for it in plain words:

> Use the researcher: where do we validate webhook signatures, and since when?
> Use the researcher on the web: what changed in Fastify 5 error handling?

## Versions

Release notes: [CHANGELOG.md](CHANGELOG.md). Requirements (Claude Code `>=2.1.110`): [COMPATIBILITY.md](COMPATIBILITY.md).

## Owner

See [CODEOWNERS](../../CODEOWNERS). Changes go through a pull request per [CONTRIBUTING.md](../../CONTRIBUTING.md).
