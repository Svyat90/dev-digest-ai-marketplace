---
description: 'workflow-retro is manual only: a question about a finished run does not start it'
tags: [negative, smoke]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

We just finished running a plan with several agents in this session. How did it go overall, and is there anything we should do better next time?
