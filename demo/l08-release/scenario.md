# Demo ddm-l08-release — shooting script

~2.5 min. Final homework (L08) of the AI Agentic Engineering course. Filmed by `demo-film` from `cues.json`; this file is the human view.
Narration in Ukrainian, for the course instructor and group.

## Assumptions
- Short video on request: not every L08 criterion is covered (see Coverage).
- No rollback scene: the user chose to skip it (see Not covered).
- Scenes 1–6 are read-only. Scene 7 updates the real `/Users/wekcook/code/gov` from
  1.0.0 to 1.1.0, approved by the user. It cannot be undone, so it is filmed **last, in one
  take**, after scenes 1–6 are accepted.

## Preconditions
- PR `fix/site-mermaid` merged and the `pages` workflow finished, so the catalog renders the README diagram.
- `/Users/wekcook/code/gov` has `sdd-engineering` 1.0.0 at project scope (checked
  2026-10-22: `sdd-engineering@dev-digest-ai-marketplace 1.0.0`, three dependencies
  `1.0.0-a70d4bed6b80`).
- `ANTHROPIC_API_KEY` is unset in the filming terminal (the init check runs on the subscription).
- Terminal cwd: `/Users/wekcook/code/gov`.

## 1. The marketplace repository — 28 s
**Show:** https://github.com/Svyat90/dev-digest-ai-marketplace, file list.
**Do:** hold on the repository header during s1-01; then hover `.claude-plugin`, `plugins`, `docs`.
**Say (s1-01):** "Це фінальна домашка курсу AI Agentic Engineering. Покажу marketplace і каталог, плагін в іншому проєкті, евали з вартістю й оновлення до нової версії."
**Say (s1-02):** "Marketplace живе у звичайному GitHub-репозиторії. Каталог описує файл marketplace.json у теці .claude-plugin."
**Say (s1-03):** "У теці plugins чотири плагіни, а в docs правила релізів, базова лінія вартості та докази релізів."

## 2. The sdd-engineering plugin — 30 s
**Show:** https://github.com/Svyat90/dev-digest-ai-marketplace/tree/main/plugins/sdd-engineering
(folders `.claude-plugin`, `agents`, `evals`, `hooks`, `scripts`, `skills`; files
`CHANGELOG.md`, `COMPATIBILITY.md`, `README.md`), then
https://github.com/Svyat90/dev-digest-ai-marketplace/blob/main/plugins/sdd-engineering/.claude-plugin/plugin.json
(`"version": "1.1.0"`, three `dependencies`, each `"^1.0.0"`).
**Do:** hover `agents`, `skills`, `hooks`, `evals`; open `.claude-plugin/plugin.json`
(read-only navigation); hover `version`, then the `dependencies` block.
**Say (s2-01):** "Головний плагін — sdd-engineering. У ньому чотири агенти, п'ять скілів, хуки, скрипти й евали, а поруч README, CHANGELOG і вимоги сумісності."
**Say (s2-02):** "Маніфест plugin.json задає версію один один нуль і три залежності, кожна з будь-якою сумісною версією першої мажорної."

## 3. Release tags — 12 s
**Show:** https://github.com/Svyat90/dev-digest-ai-marketplace/tags
**Say (s3-01):** "Кожен реліз CI позначає тегом після merge. Для sdd-engineering тут три релізи, і останній збігається з маніфестом."

## 4. Catalog on GitHub Pages — 32 s
**Show:** the catalog home https://svyat90.github.io/dev-digest-ai-marketplace/?lang=en#/ (English UI), then the SDD Engineering page `#/plugin/sdd-engineering`.
**Do:** on the home page, glide over the title; during the first sentence of s4-01 click the "What's new" entry `v1.1.0 SDD Engineering …` (read-only navigation); on the plugin page hover the `v1.1.0` badge, scroll to "Dependencies", then "Context cost" (`~1,208 tokens idle`); then put the "How it works" heading under the sticky header with the rendered flowchart below it.
**Say (s4-01):** "Каталог збирається з того самого репозиторію і публікується на GitHub Pages. На сторінці sdd-engineering та сама актуальна версія і ті самі три залежності."
**Say (s4-02):** "І вартість контексту: близько тисячі двохсот восьми токенів у фоні в кожній сесії, поки плагін увімкнено."
**Say (s4-03):** "Нижче README плагіна і схема процесу: бриф, spec-creator, план, хвилі імплементації з рев'ю і ретро наприкінці."

## 5. Installed in another project — 30 s
**Show:** terminal in `/Users/wekcook/code/gov`.
**Do:** run
`claude plugin list --json | jq -r '.[] | select(.projectPath==env.PWD) | "\(.id) \(.version) \(.scope)"'`
then
`claude -p ok --model claude-haiku-5-5 --max-turns 1 --output-format stream-json --verbose | jq -c 'select(.subtype=="init") | .plugins[] | select(.source|test("dev-digest")) | {name, version}'`
**Say (s5-01):** "Тепер проєкт gov, куди плагін встановлено на рівні проєкту. Локальних копій агентів і скілів у ньому вже немає."
**Say (s5-02):** "plugin list показує sdd-engineering один нуль нуль і три залежності, які встановилися разом із ним, без помилок."
**Say (s5-03):** "А init-подія справжньої сесії підтверджує, що активна саме ця версія."

## 6. Why 1.1.0: evals and cost — 25 s
**Show:** https://github.com/Svyat90/dev-digest-ai-marketplace/blob/main/docs/COST-BASELINE.md#optimization-sdd-engineering-110
**Do:** scroll from the idle-cost table to «Cost per successful workflow», then to «Quality gate».
**Say (s6-01):** "Smoke eval показав, що у версії, яка зараз стоїть у gov, головна сесія часто писала специфікацію сама, без агента spec-creator."
**Say (s6-02):** "У новому релізі хук спрямовує нові специфікації через агента, а опис агента став коротшим."
**Say (s6-03):** "Вартість одного успішного workflow впала з вісімдесяти шести до п'ятдесяти семи центів. Quality gate вимагає зелений smoke eval у кожному прогоні."

## 7. Update to 1.1.0 — 30 s (filmed last, one take)
**Show:** terminal in `/Users/wekcook/code/gov`.
**Do:** run
`claude plugin marketplace update dev-digest-ai-marketplace`
`claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project`
then the init command from scene 5 again.
**Say (s7-01):** "Оновлення йде у два кроки. Спершу оновлюємо каталог, потім сам плагін на рівні проєкту."
**Say (s7-02):** "Залежності не змінилися, тож оновлюється лише sdd-engineering."
**Say (s7-03):** "Нова init-подія показує один один нуль. Отже, проєкт отримав нову версію з marketplace без жодних локальних файлів."
**Say (s7-04):** "Фінальна домашка здана. Агенти, дякую за співпрацю, далі ви самі. [laughs]" — fixed take, see Narration.

## Narration
- Voice: ElevenLabs Daniel (`onwK4e9ZLuTAKqWW03F9`), model `eleven_multilingual_v2` for every cue except s7-04.
- **s7-04 is a fixed take** recorded with `eleven_v3` (the `[laughs]` tag makes it laugh;
  v2 would read the tag aloud). Its audio is `audio/s7-04-laugh.mp3`, chosen by the user.
  Never regenerate s7-04: run `tts.mjs . all` with every cue id **except** `s7-04`, then
  convert the take into the cue's wav with the same trim `tts.mjs` uses:
  ```sh
  ffmpeg -y -loglevel error -i audio/s7-04-laugh.mp3 -af 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse' -ar 48000 -ac 1 ~/.cache/demo-video/ddm-l08-release/audio/s7-04.wav
  ```

## Coverage
| Criterion (L08) | Scene | Cue |
|---|---|---|
| intro: final homework of the course | 1 | s1-01 |
| repository marketplace: manifests, plugins, docs | 1, 2 | s1-02, s1-03, s2-01, s2-02 |
| release tags | 3 | s3-01 |
| catalog UI shows current contents and version | 4 | s4-01 |
| `sdd-engineering@1.0.0` works without local DevDigest files | 5 | s5-01 |
| dependencies install and activate without errors in `claude plugin list --json` | 5 | s5-02 |
| trace or telemetry confirms the active version | 5, 7 | s5-03, s7-03 |
| new 1.1.0 behaviour passes eval | 6 | s6-01, s6-02 |
| cost per successful workflow before/after the optimization | 6 | s6-03 |
| update to 1.1.0 | 7 | s7-01 … s7-03 |
| closing line | 7 | s7-04 |

### Not covered
- **Verified workflow** (spec-creator run on a brief): a live run takes ~2 minutes;
  left out to keep the video short. Could be added as a scene between 5 and 6 showing a
  finished `specs/*.md` instead.
- **Return through the stable channel; green smoke eval at 1.0.0**: skipped by the
  user. Reason found during the reality check: Claude Code keeps one local clone per
  marketplace name, so a project cannot be pinned to `#sdd-engineering--v1.0.0` while the
  same name follows `main` (the add fails: "its source doesn't match its
  extraKnownMarketplaces entry"). `docs/RELEASES.md` › "Return a project to a stable
  release" needs a separately named stable channel to work.

## Unverified claims
- Scene 7 output: `marketplace update` / `plugin update` were not dry-run, because a dry
  run would already move the real `gov` to 1.1.0. Expected: `sdd-engineering` → 1.1.0,
  dependencies stay `1.0.0-a70d4bed6b80`; s7-02 says so — re-check the frame.
- s6-01 … s6-03 quote `docs/COST-BASELINE.md` (0.56 → 1.00, $0.86 → $0.57); the
  numbers are in the file, but the eval runs themselves are not on screen.
- "Локальних копій агентів і скілів у ньому вже немає" (s5-01): true since
  econsul-slot-monitor PR #1; no frame lists `.claude/`.
- s2-01 counts (4 agents, 5 skills) come from `git ls-tree` of `main`; the GitHub folder
  view shows the folders, not the counts — the counts are visible only in the catalog.
