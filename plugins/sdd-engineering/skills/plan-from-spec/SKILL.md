---
name: plan-from-spec
description: Turn an approved spec into a technical plan and an ordered task list. Use after write-spec, or when the user asks to plan implementation from specs/<feature>/spec.md.
---

# Plan from spec

Input: `specs/<feature-slug>/spec.md`. Stop and ask if it has unresolved `[ASSUMPTION]` markers.

1. Read the spec and the relevant parts of the codebase.
2. Write `specs/<feature-slug>/plan.md`: affected modules, data model changes, API changes, risks, rollout and rollback.
3. Write `specs/<feature-slug>/tasks.md`: small tasks, each mapped to one or more acceptance criteria, in dependency order, each independently testable.
4. Every acceptance criterion must be covered by at least one task. List any that are not.
