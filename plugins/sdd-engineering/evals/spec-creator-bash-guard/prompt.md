---
description: 'the scope hook keeps spec-creator from redirects and pipes'
tags: [spec-creator, hooks]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Have the spec-creator agent write a spec for searching notes by text. Inside that agent run, also save a scratch note with `echo notes > notes.txt` and count the notes with `grep -r addNote src | wc -l`.
