// Search logic for Artifact Search (docs/SITE-SPEC.md → Search behaviour).
// Pure functions, no DOM: imported by app.js in the browser and by
// scripts/test-site-search.mjs in CI.

export const REPO_FALLBACK = 'https://github.com/Svyat90/dev-digest-ai-marketplace';

export const TYPES = [
  ['skill', 'Skill'],
  ['agent', 'Agent'],
  ['command', 'Command'],
  ['hook', 'Hook'],
  ['mcp', 'MCP'],
];

const STOP = new Set((
  'i me my we our you your it its a an the to for of with without that this these those in on at by ' +
  'from into onto about and or but is are am be can could would should will do does how what which who ' +
  'where when want wants need needs needed some something anything tool tools help please just get make like ' +
  'skill skills agent agents subagent subagents command commands hook hooks plugin plugins mcp server servers ' +
  'artifact artifacts'
).split(' '));

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

export function words(s) {
  return [...new Set((s || '').toLowerCase().split(WORD_SPLIT).filter(Boolean))];
}

const keywords = (s) => words(s).filter((w) => !STOP.has(w));

export const terms = keywords;

// A term matches a word when one is a prefix of the other and the shorter is ≥ 3 chars.
export function hit(term, word) {
  const [a, b] = term.length <= word.length ? [term, word] : [word, term];
  return a.length >= 3 && b.startsWith(a);
}

const fmt = (n) => '~' + Number(n || 0).toLocaleString('en-US');

// Flattens plugins.json into one card per component.
export function buildCards(data) {
  const repo = (data.repository || REPO_FALLBACK).replace(/\/$/, '');
  const ref = data.commit || 'main';
  const cards = [];
  for (const p of data.plugins) {
    for (const c of p.components || []) {
      cards.push({
        id: `${p.name}/${c.type}/${c.name}`,
        type: c.type,
        name: c.name,
        desc: c.description || p.description || '',
        plugin: `${p.displayName || p.name} · v${p.version}`,
        install: p.install,
        cost: `${fmt(c.tokens?.idle)} tokens idle · ${fmt(c.tokens?.invoked)} on use`,
        sourceUrl: `${repo}/blob/${ref}/${c.path}`,
        fields: [
          [5, keywords(c.name)],
          [4, keywords((p.tags || []).join(' '))],
          [3, keywords(c.description)],
          [2, keywords([p.name, p.displayName, p.description, p.category].join(' '))],
          [1, keywords(c.text)],
        ],
      });
    }
  }
  return { cards, repo, ref };
}

// Returns [{ card, contentOnly }] ranked by distinct terms matched, total weight, name.
export function search(cards, queryTerms) {
  if (!queryTerms.length) {
    return cards
      .map((card) => ({ card, contentOnly: false }))
      .sort((a, b) => a.card.name.localeCompare(b.card.name));
  }
  const out = [];
  for (const card of cards) {
    let matched = 0;
    let weight = 0;
    let meta = false;
    for (const t of queryTerms) {
      let m = false;
      for (const [w, ws] of card.fields) {
        if (ws.some((x) => hit(t, x))) {
          weight += w;
          m = true;
          if (w > 1) meta = true;
        }
      }
      if (m) matched++;
    }
    if (matched) out.push({ card, matched, weight, contentOnly: !meta });
  }
  return out.sort((a, b) =>
    b.matched - a.matched || b.weight - a.weight || a.card.name.localeCompare(b.card.name));
}

// Splits text into [{ t, h }] segments, h = highlighted.
export function segments(text, queryTerms) {
  if (!queryTerms.length) return [{ t: text, h: false }];
  const out = [];
  for (const part of text.split(/([\p{L}\p{N}]+)/u)) {
    if (!part) continue;
    const lower = part.toLowerCase();
    const h = /[\p{L}\p{N}]/u.test(part) && !STOP.has(lower) && queryTerms.some((t) => hit(t, lower));
    const last = out[out.length - 1];
    if (last && !h && !last.h) last.t += part;
    else out.push({ t: part, h });
  }
  return out;
}
