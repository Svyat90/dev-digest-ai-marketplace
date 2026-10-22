---
description: 'spec-creator takes the next number from the repo-wide counter across all spec folders'
tags: [spec-creator]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Write a spec for a new 'saved filters' feature of the notes list.

Don't wait for my answers; leave open questions in the spec.
