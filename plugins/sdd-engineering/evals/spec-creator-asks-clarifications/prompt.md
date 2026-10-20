---
description: 'spec-creator turns vague words into open questions instead of inventing numbers'
tags: [spec-creator, smoke]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Write a spec: the notes list should work well with lots of notes and not be slow.

I can't answer questions right now. Put everything undecided into the spec as open questions and list them for me at the end.
