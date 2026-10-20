---
name: write-spec
description: Write a feature specification before any code - problem, user stories, acceptance criteria, non-goals. Use when the user starts a new feature, asks for a spec, or wants to do spec-driven development.
---

# Write spec

Produce `specs/<feature-slug>/spec.md` using [spec-template.md](spec-template.md).

1. Interview the user briefly: problem, who it is for, how success is measured. Skip questions the conversation already answers.
2. Write acceptance criteria as testable Given/When/Then statements.
3. Write explicit non-goals.
4. Mark every assumption with `[ASSUMPTION]` so the user can confirm it.
5. Do not write implementation details or code. Next step is `/sdd-engineering:plan-from-spec`.
