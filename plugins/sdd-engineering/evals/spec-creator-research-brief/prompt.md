---
description: 'spec-creator returns a research brief for facts it must not guess'
tags: [spec-creator, research]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Spec: let users sign in with a passkey. Support every browser our users have.

Don't wait for my answers.
