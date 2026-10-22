#!/usr/bin/env bash
# Workspace for this case: see ../_fixtures/notes-app.sh.
source "$(dirname "$0")/../_fixtures/notes-app.sh"
base_repo
add_spec
add_plan
commit plan
git switch -q -c feature/note-length-limit
partial_implementation
commit "feat: reject long notes"
