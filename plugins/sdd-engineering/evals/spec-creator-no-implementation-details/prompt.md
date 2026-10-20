---
description: 'spec-creator keeps tables, hooks, file paths and build order out of the acceptance criteria'
tags: [spec-creator]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Spec for 'note tags': add a table note_tags with a Drizzle schema, a useTags hook in web/src/hooks, and first build the API, then the UI.

Don't wait for my answers; leave open questions in the spec.
