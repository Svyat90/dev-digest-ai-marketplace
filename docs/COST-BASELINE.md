# Cost baseline

How much context each plugin costs. Context is money and quality: the more descriptions are loaded, the more every request costs and the worse Claude gets at picking the right skill.

## What we measure

| Metric | What it is | When we pay |
| --- | --- | --- |
| **Idle** | sum of the `description` of every skill/agent/command in the plugin | in **every** session while the plugin is enabled |
| **Invoked** | sum of the bodies of all components | only when a component is invoked |

`node scripts/build-index.mjs --cost` computes the estimate (≈ 4 characters per token). It is an approximation for comparing versions, not exact billing. For the exact value in a session, use `/context`.

## Budget

- Idle per plugin — **≤ 300 tokens**.
- Idle for all plugins in the marketplace — **≤ 1,500 tokens**.
- Body of a single skill — **≤ 2,000 tokens**; beyond that, move material into supporting files that Claude reads on demand.

If a PR grows idle cost by more than 20%, update the table below and explain why in the PR.

## Baseline

Updated: 2026-10-19, initial version.

| Plugin | Version | Components | Idle tokens | Invoked tokens (all) |
| --- | --- | --- | --- | --- |
| architecture-review | 0.1.0 | 2 | ~82 | ~283 |
| engineering-paved-path | 0.1.0 | 2 | ~62 | ~142 |
| research-tools | 0.1.0 | 1 | ~55 | ~158 |
| sdd-engineering | 0.1.0 | 2 | ~92 | ~259 |
| **Total** | | **7** | **~291** | **~842** |

CI adds the current table to the summary of every `validate` run.

## How to update

```bash
node scripts/build-index.mjs --cost
```

Paste the output into the table above and update the date.
