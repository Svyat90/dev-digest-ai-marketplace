---
description: 'the plugin and its dependencies expose their agents under plugin namespaces'
tags: [smoke, namespace]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 5
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

List every agent you can dispatch whose type starts with sdd-engineering:, research-tools: or architecture-review:. Write each exactly as you would pass it to the Agent tool, one per line. Do not dispatch any of them.
