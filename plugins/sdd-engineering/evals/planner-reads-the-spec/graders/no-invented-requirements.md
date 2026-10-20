---
type: 'llm'
focus: 'last_message'
---

The spec has exactly two requirements: reject notes longer than 500 characters ("Note is too long") and reject empty or whitespace-only notes ("Note is empty").
PASS if the plan the reply describes covers both and adds no other requirement.
FAIL if the reply adds a requirement the spec does not have, such as a different limit, note editing, a UI change, a database or new dependencies.
