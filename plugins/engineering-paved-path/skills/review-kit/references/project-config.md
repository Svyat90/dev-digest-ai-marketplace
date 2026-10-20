# Project config: `.claude/paved-path.json`

One optional file in the project tells the review scripts what they cannot
guess. Everything in it is optional; without the file the scripts detect what
they can and say so (`SKIP config — …`).

```json
{
  "base": "main",
  "zod": 3,
  "packages": {
    "api": {
      "dir": "api",
      "area": "backend",
      "checks": {
        "typecheck": "pnpm run typecheck",
        "arch-check": "pnpm run arch:check"
      }
    },
    "web": { "dir": "web", "area": "frontend", "checks": { "typecheck": "pnpm run typecheck" } }
  },
  "doNotTouch": ["web/src/vendor/ui/", "web/.next/"],
  "generated": [
    { "path": "api/src/db/migrations/", "source": "api/src/db/schema/", "by": "pnpm db:generate" }
  ],
  "contractCopies": [["api/src/contracts/", "web/src/contracts/"]],
  "coupled": [
    {
      "a": "api/src/domain/pricing.ts", "symbolA": "priceOf",
      "b": "web/src/lib/pricing.ts", "symbolB": "displayPrice",
      "why": "both apply the discount rule; one side alone shows a price the API will not charge"
    }
  ],
  "signals": [
    {
      "id": "fetch-in-ui",
      "path": "^web/src/(app|components)/.*\\.tsx?$",
      "pattern": "(^|[^A-Za-z.])fetch\\(",
      "message": "direct fetch in UI; go through the data hooks"
    }
  ]
}
```

| Key | Meaning | Without it |
|---|---|---|
| `base` | branch the diff is taken against | `main`, falling back to `origin/main` |
| `zod` | Zod major version; `3` turns on the Zod 4 import check | read from `package.json` |
| `packages` | package folders, their area (`backend` / `frontend`) and the commands to run in them; check names become precheck lines (`typecheck-api`) | top-level folders with their own `CLAUDE.md` or `package.json`; `typecheck` and `arch:check` scripts are run when present; area decided per file |
| `doNotTouch` | path prefixes nobody edits by hand (vendored UI kits, build output) | none |
| `generated` | path prefixes a tool writes: a new file is fine next to a change under `source`, editing an existing one is CRITICAL; `editable` lists exceptions (a journal file the tool updates) | none |
| `contractCopies` | folders that hold copies of the same contracts; a touched file whose twin was not touched is a MAJOR | none |
| `coupled` | pairs of symbols that must change together and that no compiler links; `"*"` as a symbol means any change to the file | none |
| `signals` | grep hints for reviewers: `path` and `pattern` are regular expressions over the path and the added line | none |

Add a `coupled` pair when a bug came from changing one side only, and cite where
it came from in `why`. Remove it when the duplication is gone.

The `sdd-engineering` plugin reads `doNotTouch` too: the implementation planner
copies it into a plan's `## Do not touch` section.
