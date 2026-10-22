# Compatibility — architecture-review

| Requirement | Minimum | Why |
|---|---|---|
| Claude Code | `>=2.1.110` | version-constrained plugin `dependencies` (`engineering-paved-path ^1.0.0`) are installed and honoured from 2.1.110 |

The agent is read-only and runs no plugin scripts. Tested with Claude Code
2.1.304. If a release starts using a newer feature, list it here and raise the
minimum to the version that introduced it.
