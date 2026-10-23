---
name: dev-digest-ai-marketplace-demo
description: Dev-digest-ai-marketplace-specific conventions for recording demo videos — where the scenario, cue and config files live, which URLs to film, how to stage the install project and which controls must never be clicked. Read this before using the screencast-demo-maker plugin's demo-scenario or demo-film skills in this repository.
---

# Dev-digest-ai-marketplace demo videos

Project conventions only. The engine is the `screencast-demo-maker` Claude Code plugin
(https://github.com/artemmmon/screencast-demo-maker): skills `demo-setup`, `demo-scenario`
(writes the shooting script), `demo-film` (records it) and the `frame-checker` subagent.

## Prerequisite

If `/screencast-demo-maker:demo-film` is not an available skill, the plugin is not
installed. Stop and give the user the two install commands from the plugin README; do not
improvise filming without it.

## Order

1. If `demo/<video>/` already holds `scenario.md` and `cues.json`, read them. Otherwise write
   them with `screencast-demo-maker:demo-scenario`, and let the user review them.
2. Ask the user to run `/screencast-demo-maker:demo-film` — it is user-invoked, an agent
   cannot start it. Never record before the user says "go".
3. Hand contact sheets to the `screencast-demo-maker:frame-checker` subagent; never read
   them in the main conversation.
4. Report what the frames and probes showed. The user judges the voice and the result.

## Layout

| What | Where |
|---|---|
| One video's inputs | `demo/<video>/{scenario.md,cues.json,scenes.mjs,config.json}` (first video: `demo/l08-release/`) |
| Source of truth the video must cover | Homework L08 — "Що здаєте" and "Критерії приймання" (marketplace, catalog UI, install of `sdd-engineering@1.0.0`, verified workflow, update to `1.1.0`, return through the stable channel, `claude plugin list --json`, trace of the active version, cost per successful workflow, green smoke eval) — plus `docs/RELEASES.md`, `docs/COST-BASELINE.md`, `docs/RELEASE-EVIDENCE.md` |
| Finished video | `demo/<video>/<video>.mp4` (first: `demo/l08-release/l08-release.mp4`) |

Working files (clips, narration, frames, staged app profiles) never enter the repo; they
live in `~/.cache/demo-video/<slug>/`.

## Filming this app

- Nothing to start locally: the browser films GitHub
  (https://github.com/Svyat90/dev-digest-ai-marketplace — manifests, plugins, docs, release
  tags, PRs) and the catalog on GitHub Pages
  (https://svyat90.github.io/dev-digest-ai-marketplace/). `config.healthUrls` checks both
  during preflight.
- On screen: the browser and a terminal.
- Narration: Ukrainian, for the course instructor and group. Filenames, code and this skill
  stay English.
- Install, update and rollback are filmed in a **throwaway copy** of
  `/Users/wekcook/code/gov`, which the pre-roll recreates before every take
  (`git clone` of the real repo into `~/.cache/demo-video/<slug>/gov`, then
  `claude plugin uninstall` of the four dev-digest plugins in that project scope). The real
  `/Users/wekcook/code/gov` is never changed by a take.
- The active version is proven with the session init event:
  `claude -p ok --max-turns 1 --output-format stream-json --verbose | jq 'select(.subtype=="init") | .plugins'`
  — it lists each plugin with `version` and its cache path.
- Evals on screen use the subscription, not the API: before a take, `ANTHROPIC_API_KEY`
  must be unset. Prefer showing a finished eval report over running a long eval live; a
  live run is `--case agents-are-namespaced --runs 1 --ablation none` only.

## Fixed narration takes

A cue with a `fixedAudio` field in `cues.json` is a take the user chose by ear; never
regenerate it. Run `tts.mjs <workDir> all` with every other cue id listed explicitly,
then convert the take into `<cache>/audio/<cueId>.wav` with the ffmpeg trim from the
video's `scenario.md` › Narration. In `l08-release` that is `s7-04`: the closing line with
a laugh, recorded with `eleven_v3` and the `[laughs]` tag — under the config's
`eleven_multilingual_v2` the tag would be read aloud.

## Never click

On GitHub, view only: "Merge pull request", "Close pull request", "Delete", "Settings",
"Edit", "Sync fork", "Create release", "Run workflow". In the terminal: no `git push`, and
no command run in the real `/Users/wekcook/code/gov`.

They cost money or destroy data, and a demo must be reproducible. Hover to show that a
control exists — that is enough to prove it is there.

## Numbers that have bitten us

Add a line here every time the reality check in `demo-scenario` catches a number that the
screen renders differently from what is stored (rounding, per-page vs total, cached values).

- `claude plugin list --json` shows dependency versions as `1.0.0-<sha>` (e.g.
  `1.0.0-a70d4bed6b80`) and `sdd-engineering` as plain `1.0.0`; the init event shows plain
  `1.0.0` for all. Say "1.0.0" and let the suffix be seen, do not explain it away.
- The catalog's idle cost for sdd-engineering is ~1208 tokens in 1.1.0 and ~1301 in 1.0.0
  (`docs/COST-BASELINE.md`); cost per successful spec-creator workflow is $0.86 → $0.57.
