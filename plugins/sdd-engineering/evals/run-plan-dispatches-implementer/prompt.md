---
description: 'run-plan hands each task to sdd-engineering:implementer and never writes code itself'
tags: [run-plan]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 80
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Run the plan docs/plans/2026-10-11-note-length-limit.md with mode=multi.

I'm away: take the defaults, don't stop to ask me, and report at the end.
