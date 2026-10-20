---
name: pr-ready
description: Prepare the current branch for a pull request following the team paved path - conventional commit messages, PR description template, self-review. Use when the user says the work is done, asks to open a PR, or asks to get a branch ready for review.
---

# PR ready

1. Run `git status` and `git diff <base>...HEAD` to see the full change.
2. Check that commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Propose reworded messages if not; do not rewrite history without asking.
3. Self-review the diff: leftover debug output, commented-out code, TODOs without a ticket, secrets, absolute local paths.
4. Run the project's test and lint commands if they exist.
5. Draft the PR description from [pr-template.md](pr-template.md).

Never force-push to `main` or `master`.
