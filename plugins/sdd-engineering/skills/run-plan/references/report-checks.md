# Accepting a report

A report is a claim (`SKILL.md` rule 3). Accept it only when every check of its
agent passes; a failed check means re-dispatching the same task with the
reason. Read the report, not the agent's whole transcript.

## implementer

1. **Shape.** All fields of the agent's report template are present and
   `Status:` holds exactly one value.
2. **Files.** `git status --porcelain -- <task Files>` shows every file the
   report lists, and *Files changed* ⊆ the task's *Files*. Any other path
   changed since the wave started that no task of the wave owns → ask the
   agent's owner (re-dispatch) or the user; never commit it.
3. **Rules.** *Rules applied* is `all`, or each skipped `Rules:` line has a
   reason you accept; a skipped line without one → re-dispatch. *Skills
   loaded* is `none` for a task that has `Rules:` (a whole-skill load there
   means the agent ignored the field — accept the work, note it in the log).
   A task without `Rules:` (legacy) must list every skill of its area.
   Copy each *Rules gap* to the log's *Rules gaps* list — they tell the next
   plan what its Rules missed.
4. **Verification.** Each line of the task's *Verify* appears with its output
   line, and no error sits in one of the task's own files. A bare "passes" is
   not evidence.
5. **Red run.** A task that adds or changes a test shows `Red run:` with a
   failing count and the failing line from before the change; `no test` only
   when the task itself says so, and `no test command (<pkg>)` only when the
   task's *Verify* says none was found — accept that and carry it into the
   wave summary as a concern. Missing or "skipped" → re-dispatch once with
   `Previous attempt: no red run`. Still missing → accept the work, then prove
   the test red yourself in a detached scratch worktree (`git worktree add
   --detach` in the scratchpad, apply only the test) before the commit, and log
   the result.
6. **Foreign errors.** Each file in *Foreign errors* is owned by another
   task of the running wave. A foreign error in a file nobody in the wave owns is a real
   problem — raise it at the wave gate.
7. **Extra and designs.** Every `Extra: X<n>` of the dispatch is named in the
   report as met, or under *Concerns* with the reason; a task given `Designs:`
   says which design states it built.
8. **Collect.** Copy *Deviations*, *Concerns*, *Rules gaps* and *Insight
   candidates* (non-"none" only) to the log, one line each.

## architecture-reviewer

- `Status:` `PASS` | `BLOCKED` | `NEEDS_CONTEXT`.
- Each finding has `file`, `line`, a quoted `rule` and `confidence` ≥ 80.
- A finding on a line no task changed, or on baseline debt, is dropped and
  the drop is noted in the log (the reviewer's own Hard rules 5 and 8).
- An environment line (a missing dependency folder, a service not running) is
  not a finding.

## plan-verifier

- `Overall:` `VERIFIED` | `GAPS` | `NEEDS_CONTEXT`.
- Every non-`MET` row has evidence or a stated "what would verify it".
- *Scope creep* entries: a file the user changed by hand on purpose is
  confirmed with the user and recorded as a decision; anything else is a fix
  task (remove it) or a plan amendment the user approves.
- *Reports contradicted* entries are always shown to the user.

# Wave gate

Run once per wave, in each package the wave touched, **after** all its tasks
are accepted and **before** any commit, from the repo root:

the package's typecheck, its unit tests, and its architecture check if it has
one — the commands the plan's *Verify* fields use, without the per-task file
scoping. Add integration tests when a task of the wave owns one and its
database is up.

Every error counts now (no own/foreign split): the whole wave is in the tree.
Re-run a single failing file to read the failure in full. End-to-end: only the
flow the wave added, and only when the stack is up (preflight answer).

Attributing a failure: the file in the error line belongs to exactly one task
of the wave (the ownership table) — re-dispatch that task with those lines.

A package typecheck may not cover its test folder (check the `include` of its
`tsconfig`). When the wave added or changed test files there, type-check them
with a scratch tsconfig in the session scratchpad that `extends` the package
one and adds the test folder.
