---
name: adr-review
description: Review an Architecture Decision Record or a proposed design change against the team checklist. Use when the user asks to review an ADR, a design doc, or whether an architecture decision is sound.
---

# ADR review

Review the ADR or design the user points to. If none is given, ask for the file path.

1. Read the document fully before commenting.
2. Check it against [checklist.md](checklist.md), one item at a time.
3. For deep analysis of trade-offs, delegate to the `architecture-review:architecture-reviewer` agent.
4. Report findings grouped as **Blocking**, **Should fix**, **Nit**. Quote the exact passage each finding refers to.
5. End with a one-line verdict: approve, approve with changes, or rework.

Do not rewrite the ADR yourself unless the user asks.
