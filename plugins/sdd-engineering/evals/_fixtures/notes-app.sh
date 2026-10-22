# Shared fixture for the sdd-engineering eval cases. Sourced by each case's
# scaffold.sh, which runs in the empty run workspace (claude plugin eval --scaffold).
# A tiny single-package Node project: a notes store, its tests, and the SDD
# folders the agents write to. Functions add the spec, the plan and partial code.

set -euo pipefail

git_init() {
  git init -q -b main
  git config user.email eval@example.com
  git config user.name "Eval Fixture"
}

commit() {
  git add -A
  git commit -q -m "$1"
}

base_repo() {
  git_init
  mkdir -p src test specs docs/plans
  cat > package.json <<'JSON'
{
  "name": "notes-app",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test test/" }
}
JSON
  cat > CLAUDE.md <<'MD'
# notes-app

A notes store used by the team's demo service. Node 20, no dependencies.
Tests: `npm test` (node:test).
MD
  cat > src/notes.mjs <<'JS'
const notes = [];

export function addNote(text) {
  const note = { id: notes.length + 1, text };
  notes.push(note);
  return note;
}

export function listNotes() {
  return [...notes];
}
JS
  cat > test/notes.test.mjs <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addNote, listNotes } from '../src/notes.mjs';

test('adds a note', () => {
  const note = addNote('buy milk');
  assert.equal(note.text, 'buy milk');
  assert.ok(listNotes().some((n) => n.id === note.id));
});
JS
  cat > specs/README.md <<'MD'
# Specs

## Index

| # | Spec | Status |
|---|---|---|
MD
  commit "chore: notes app"
}

add_spec() {
  local status="${1:-approved}"
  cat > specs/01-note-length-limit-2026-10-10.md <<MD
# Spec: Note length limit

Spec ID: SPEC-01-note-length-limit
Status: ${status}
Supersedes: none
Packages: root
Depends on: none

## Problem and user
Notes longer than a screen break the demo list view, and empty notes clutter it.

## Goals / Non-goals
- Goal: every stored note has visible text that fits the list view.
- Non-goal: editing existing notes.

## User stories
- US1: As a note author, I want an over-long note rejected, so that the list stays readable.
- US2: As a note author, I want an empty note rejected, so that the list has no blank rows.

## Acceptance criteria (EARS)
- AC1 [US1]: WHEN an author adds a note longer than 500 characters, the system shall reject it with the message "Note is too long".
- AC2 [US2]: WHEN an author adds a note that is empty or only whitespace, the system shall reject it with the message "Note is empty".

## Edge cases
- EC1: A note of exactly 500 characters is accepted (AC1).
- EC2: A note of three spaces is rejected (AC2).

## Non-functional requirements
- None beyond the existing service limits.

## Inputs and provenance
| fact | source | date |
|---|---|---|
| 500-character limit | product owner brief | 2026-10-10 |

## Untrusted inputs
| input | handling | AC |
|---|---|---|
| note text | length and emptiness checked before storing | AC1, AC2 |

## Open questions
none
MD
  printf '| 01 | [Note length limit](01-note-length-limit-2026-10-10.md) | %s |\n' "$status" >> specs/README.md
}

add_plan() {
  cat > docs/plans/2026-10-11-note-length-limit.md <<'MD'
# Note length limit — Implementation Plan

Date: 2026-10-11 · Branch: feature/note-length-limit · Status: approved

## Goal
Authors cannot store over-long or empty notes.

## Context
- Request: implement SPEC-01-note-length-limit
- Spec: SPEC-01-note-length-limit — specs/01-note-length-limit-2026-10-10.md
- INSIGHTS entries that apply: none
- Closest existing feature followed: src/notes.mjs

## Requirements review
Nothing unclear, contradictory or missing. AC1 → T001, AC2 → T001.

## Assumptions
- none

## Recommendations
- none

## Scope
- In: validation in addNote.
- Out: editing notes.

## Design
Validation lives in `addNote`, the only write path.

## Global constraints
- No new dependencies.

## Do not touch
- `node_modules/` — installed packages

## Tasks

### Wave 1 — validation

#### T001 — Reject over-long and empty notes
- Area: backend
- Agent: implementer
- Depends on: —
- Files (exclusive):
  - `src/notes.mjs` (modified)
  - `test/notes.test.mjs` (modified)
- Rules (applied by the agent instead of loading the skills; 5–15 lines):
  - Throw an Error whose message is exactly the spec text — security §Input validation
  - Validate before mutating any state — security §Input validation
  - Trim only for the emptiness check; store the text as given — typescript-expert §Strings
  - One test per acceptance criterion and one per edge case — review-kit §Tests
  - No new dependencies — review-kit §Dependencies
- Steps:
  1. Write tests for AC1, AC2, EC1 and EC2.
  2. Add the checks to addNote.
- Acceptance criteria:
  - A 501-character note throws "Note is too long"; a 500-character note is stored (AC1)
  - An empty or whitespace-only note throws "Note is empty" (AC2)
- Verify:
  - `npm test`

## Ownership check
| File | Task |
|---|---|
| src/notes.mjs | T001 |
| test/notes.test.mjs | T001 |

## Risks
- none

## Open questions
- none
MD
}

# Implements AC1 only: plan-verifier must report AC2 as not met.
partial_implementation() {
  cat > src/notes.mjs <<'JS'
const notes = [];

export function addNote(text) {
  if (text.length > 500) throw new Error('Note is too long');
  const note = { id: notes.length + 1, text };
  notes.push(note);
  return note;
}

export function listNotes() {
  return [...notes];
}
JS
  cat >> test/notes.test.mjs <<'JS'

test('rejects a note longer than 500 characters', () => {
  assert.throws(() => addNote('x'.repeat(501)), /Note is too long/);
  assert.equal(addNote('x'.repeat(500)).text.length, 500);
});
JS
}

# A draft spec with two open questions, for the approve and revise cases.
add_draft_spec() {
  cat > specs/01-note-tags-2026-10-12.md <<'MD'
# Spec: Note tags

Spec ID: SPEC-01-note-tags
Status: draft
Supersedes: none
Packages: root
Depends on: none

## Problem and user
Authors cannot group related notes, so finding them again means scrolling the whole list.

## Goals / Non-goals
- Goal: an author can label a note and list the notes with a label.
- Non-goal: sharing tags between authors.

## User stories
- US1: As a note author, I want to add tags to a note, so that I can find related notes later.

## Acceptance criteria (EARS)
- AC1 [US1]: WHEN an author adds a tag to a note, the system shall list that note under the tag.

## Edge cases
- EC1: Adding the same tag twice keeps one tag on the note (AC1).

## Non-functional requirements
- None beyond the existing service limits.

## Inputs and provenance
| fact | source | date |
|---|---|---|
| tags requested | product owner brief | 2026-10-12 |

## Untrusted inputs
| input | handling | AC |
|---|---|---|
| tag text | stored as plain text, never interpreted | AC1 |

## Open questions
- OQ1 (owner: product): How many tags may one note carry?
- OQ2 (owner: product): Are tags case-sensitive?
MD
  printf '| 01 | [Note tags](01-note-tags-2026-10-12.md) | draft |\n' >> specs/README.md
}

# Specs 03 (root) and 05 (api package) already exist: the next number is 06.
add_numbered_specs() {
  mkdir -p api/specs
  printf '# api\n\nThe notes HTTP API.\n' > api/CLAUDE.md
  printf '# Spec: Order notes\n\nSpec ID: SPEC-03-order-notes\nStatus: approved\n' > specs/03-order-notes-2026-10-01.md
  printf '# Spec: Refunds\n\nSpec ID: SPEC-05-refunds\nStatus: approved\n' > api/specs/05-refunds-2026-10-02.md
  printf '# Specs\n\n| # | Spec | Status |\n|---|---|---|\n| 05 | [Refunds](05-refunds-2026-10-02.md) | approved |\n' > api/specs/README.md
  printf '| 03 | [Order notes](03-order-notes-2026-10-01.md) | approved |\n' >> specs/README.md
}
