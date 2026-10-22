#!/usr/bin/env bash
# Workspace for this case: see ../_fixtures/notes-app.sh.
source "$(dirname "$0")/../_fixtures/notes-app.sh"
base_repo
add_spec
commit spec
