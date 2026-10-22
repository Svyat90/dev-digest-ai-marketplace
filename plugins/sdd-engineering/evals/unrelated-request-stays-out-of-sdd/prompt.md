---
description: 'an unrelated question triggers no SDD skill or agent'
tags: [negative, smoke]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 5
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Agent, TodoWrite]
---

Convert 98.6 degrees Fahrenheit to Celsius and show the formula.
