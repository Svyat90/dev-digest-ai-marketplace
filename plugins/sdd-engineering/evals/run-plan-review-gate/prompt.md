---
description: 'after the waves run-plan calls architecture-review:architecture-reviewer and plan-verifier'
tags: [run-plan, review]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 120
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Run the plan docs/plans/2026-10-11-note-length-limit.md with mode=multi.

I'm away: take the defaults, don't stop to ask me, and report at the end.
