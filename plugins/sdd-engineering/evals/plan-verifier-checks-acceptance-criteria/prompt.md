---
description: 'plan-verifier reports the acceptance criterion the branch does not meet'
tags: [plan-verifier]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Check the code on this branch against docs/plans/2026-10-11-note-length-limit.md and tell me which acceptance criteria are met.
