# Eval fixtures

`notes-app.sh` builds the workspace for the cases that need a repository. Each
case's `scaffold.sh` sources it and calls the functions it needs. Not a case:
it has no `prompt.md` or `case.yaml`.

Scaffold scripts run only with `claude plugin eval --scaffold`.
