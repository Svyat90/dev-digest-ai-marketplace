// Scenes for the L08 release demo. See scenario.md for what each line says.
// s7 updates the real /Users/wekcook/code/gov and cannot be undone: film it last,
// alone (`--scenes=s7`), after s1–s6 are accepted.

// FILMING order: terminal scenes first, then the browser (Chrome starts once).
export const order = ['s5', 's7', 's1', 's2', 's3', 's4', 's6'];
export const browser = ['s1', 's2', 's3', 's4', 's6'];

import { execFileSync } from 'node:child_process';

const REPO = 'https://github.com/Svyat90/dev-digest-ai-marketplace';
const GOV = '/Users/wekcook/code/gov';
const LIST = `claude plugin list --json | jq -r '.[] | select(.projectPath==env.PWD) | "\\(.id)  \\(.version)"'`;
const INIT = `claude -p ok --model claude-haiku-5-5 --max-turns 1 --output-format stream-json --verbose | jq -c 'select(.subtype=="init").plugins[] | select(.source|test("dev-digest")) | {name, version}'`;

export default function scenes(stage) {
  const { sleep, record, stop, cue, shot, term, web, config, dry } = stage;
  const p = () => web.page;
  // GitHub renders each file row twice (wide and narrow layouts); take the visible one.
  const row = (name, kind = 'Directory') => p().locator(`a[aria-label="${name}, (${kind})"]:visible`).first();
  // A token inside a GitHub code line (the line box itself spans the full width).
  const token = text => p().locator('.react-file-line span', { hasText: text }).first();
  // Scroll so `loc` sits `pad` px under the sticky header, smoothly unless `instant`.
  const scrollTo = (loc, instant = false, pad = 24) => loc.evaluate((el, [instant, pad]) => {
    const header = Math.max(0, ...[...document.querySelectorAll('header, [class*=sticky]')]
      .filter(h => getComputedStyle(h).position.startsWith('sticky') || getComputedStyle(h).position === 'fixed')
      .map(h => h.getBoundingClientRect().bottom));
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - header - pad, behavior: instant ? 'instant' : 'smooth' });
  }, [instant, pad]);
  // Terminal drops a `do script` sent while a command is still running: wait until idle.
  const termBusy = () => {
    const id = JSON.parse(execFileSync('cat', [`${stage.cache}/stage.json`]).toString()).termWindowId;
    return execFileSync('osascript', ['-e', `tell application "Terminal" to get busy of selected tab of window id ${id}`]).toString().trim() === 'true';
  };
  const waitIdle = async (limit = 90000) => {
    await sleep(600);
    for (let t = 0; t < limit && termBusy(); t += 500) await sleep(500);
  };
  // Chrome must be the active app, or its window shows grey traffic lights on camera.
  const front = () => execFileSync('osascript', ['-e', 'tell application "Google Chrome" to activate']);

  return {
    // 1. The marketplace repository.
    async s1() {
      await web.open(REPO);
      front(); await sleep(400);
      await record('s1');
      await cue('s1-01', async () => {
        await web.glideTo(p().locator('#repo-title-component, strong[itemprop=name] a').first(), 1400);
      });
      await cue('s1-02', async ms => {
        await sleep(ms * 0.35);
        await web.glideTo(row('.claude-plugin'), 1000);
      });
      await cue('s1-03', async ms => {
        await web.glideTo(row('plugins'), 900);
        await sleep(ms * 0.45);
        await web.glideTo(row('docs'), 900);
      });
      if (dry) shot('dry-s1');
      await sleep(800);
      await stop();
    },

    // 2. The sdd-engineering plugin folder, then its manifest.
    async s2() {
      await web.open(`${REPO}/tree/main/plugins/sdd-engineering`);
      front(); await sleep(400);
      await record('s2');
      await cue('s2-01', async ms => {
        for (const name of ['agents', 'skills', 'hooks', 'scripts', 'evals']) {
          await web.glideTo(row(name), 700);
          await sleep(ms * 0.07);
        }
        await web.glideTo(row('README.md', 'File'), 700);
        await sleep(ms * 0.06);
        await web.glideTo(row('CHANGELOG.md', 'File'), 600);
      });
      await web.open(`${REPO}/blob/main/plugins/sdd-engineering/.claude-plugin/plugin.json`);
      await cue('s2-02', async ms => {
        // getByText hits GitHub's hidden textarea; the visible text is in .react-file-line.
        await web.glideTo(token('"1.1.0"'), 900);
        await sleep(ms * 0.3);
        await web.glideTo(token('"dependencies"'), 900);
      });
      if (dry) shot('dry-s2');
      await sleep(800);
      await stop();
    },

    // 3. Release tags.
    async s3() {
      await web.open(`${REPO}/tags`);
      front(); await sleep(400);
      await record('s3');
      await cue('s3-01', async ms => {
        await sleep(ms * 0.3);
        await web.glideTo(p().getByRole('link', { name: 'sdd-engineering--v0.1.0', exact: true }), 900);
        await web.glideTo(p().getByRole('link', { name: 'sdd-engineering--v1.0.0', exact: true }), 900);
        await web.glideTo(p().getByRole('link', { name: 'sdd-engineering--v1.1.0', exact: true }), 900);
      });
      if (dry) shot('dry-s3');
      await sleep(800);
      await stop();
    },

    // 4. The catalog: home page, click the SDD Engineering release, down to the diagram.
    async s4() {
      await web.open(`${config.web.baseUrl}?lang=en#/`);
      const entry = p().locator('main a[href="#/plugin/sdd-engineering"]').first();
      await entry.waitFor();
      front(); await sleep(400);
      await record('s4');
      await cue('s4-01', async ms => {
        // First sentence on the home page, the second one on the plugin page.
        await web.glideTo(p().getByRole('heading', { level: 1 }), 1000);
        await sleep(ms * 0.2);
        await web.clickOn(entry, 900);
        await p().getByRole('heading', { name: 'Dependencies' }).waitFor();
        await web.prep();
        await web.glideTo(p().getByText('v1.1.0').first(), 800);
        await sleep(ms * 0.25);
        await web.scrollIntoCenter(p().getByRole('heading', { name: 'Dependencies' }));
      });
      await cue('s4-02', async () => {
        await web.scrollIntoCenter(p().getByRole('heading', { name: 'Context cost' }));
        await web.glideTo(p().getByText(/tokens idle/).first(), 900);
      });
      await cue('s4-03', async ms => {
        // The heading lands just under the sticky header, the whole diagram below it.
        await scrollTo(p().getByRole('heading', { name: 'How it works' }));
        await sleep(Math.max(900, ms * 0.2));
        await web.glideTo(p().locator('.markdown .mermaid').first(), 1200);
      });
      if (dry) shot('dry-s4');
      await sleep(1000);
      await stop();
    },

    // 5. gov: what is installed, and which version a real session loads.
    async s5() {
      term.run(`cd ${GOV} && clear`); term.front(); await sleep(1500);
      await record('s5');
      await cue('s5-01', async ms => {
        await sleep(ms * 0.4);
        term.run(LIST);
      });
      await cue('s5-02', async () => {});
      term.run(INIT);
      await cue('s5-03', async () => {});
      await sleep(1500);
      if (dry) shot('dry-s5');
      await stop();
    },

    // 6. Why 1.1.0: the optimization, cost per successful workflow, quality gate.
    async s6() {
      const h2 = name => p().locator('article h2', { hasText: name }).first();
      await web.open(`${REPO}/blob/main/docs/COST-BASELINE.md`);
      await h2('Optimization: sdd-engineering 1.1.0').waitFor();
      await scrollTo(h2('Optimization: sdd-engineering 1.1.0'), true, 110);
      await web.prep();
      front(); await sleep(400);
      await record('s6');
      await cue('s6-01', async () => {
        await web.glideTo(h2('Optimization: sdd-engineering 1.1.0'), 1000);
      });
      await cue('s6-02', async () => {
        await web.glideTo(p().locator('article td', { hasText: '~1208' }).first(), 1000);
      });
      await cue('s6-03', async ms => {
        // The cost table and the "Quality gate" heading fit on one screen together.
        // GitHub's sticky file bar is not a <header>: leave room for it.
        await scrollTo(p().locator('article p', { hasText: 'Cost per successful workflow, case' }).first(), false, 110);
        await sleep(900);
        await web.glideTo(p().locator('article td', { hasText: '$0.57' }).first(), 900);
        await sleep(ms * 0.35);
        await web.glideTo(h2('Quality gate'), 900);
      });
      if (dry) shot('dry-s6');
      await sleep(1000);
      await stop();
    },

    // 7. Update the real gov to 1.1.0. One take: it cannot be undone.
    async s7() {
      if (dry) return;   // a dry run would already update gov
      term.run(`cd ${GOV} && clear`); term.front(); await sleep(1500);
      await record('s7');
      term.run('claude plugin marketplace update dev-digest-ai-marketplace');
      await cue('s7-01', async () => {});
      await waitIdle();
      term.run('claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project');
      await cue('s7-02', async () => {});
      await waitIdle();
      term.run(INIT);
      await cue('s7-03', async ms => { await sleep(ms * 0.2); await waitIdle(); });
      await cue('s7-04', async () => {});
      await sleep(1500);
      await stop();
    },
  };
}
