// Artifact Search UI. Loads plugins.json (built by scripts/build-index.mjs) from this
// directory, so the page works at any base path, including GitHub Pages project sites.

import { TYPES, REPO_FALLBACK, buildCards, search, segments, terms } from './search.js';

const $ = (id) => document.getElementById(id);
const LABEL = Object.fromEntries(TYPES);
const COPIED_MS = 2000;

const state = {
  status: 'loading',
  catalog: null,
  cards: [],
  q: '',
  type: 'all',
  copied: null,
};

let copyTimer;

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get('q') || '';
  state.type = (p.get('type') || 'all').toLowerCase();
}

function syncUrl() {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q);
  if (state.type !== 'all') p.set('type', state.type);
  const s = p.toString();
  history.replaceState(null, '', location.pathname + (s ? `?${s}` : '') + location.hash);
}

function copy(key, text) {
  const done = () => {
    state.copied = key;
    render();
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { state.copied = null; render(); }, COPIED_MS);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
    done();
  };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch { fallback(); }
}

function setQuery(q) {
  state.q = q;
  syncUrl();
  render();
}

function setType(type) {
  state.type = type;
  syncUrl();
  render();
}

function clear() {
  state.q = '';
  state.type = 'all';
  $('artifact-q').value = '';
  syncUrl();
  render();
  $('artifact-q').focus();
}

function fillSegments(el, segs) {
  el.replaceChildren(...segs.map((s) => {
    if (!s.h) return document.createTextNode(s.t);
    const m = document.createElement('mark');
    m.textContent = s.t;
    return m;
  }));
}

function renderPills(present, type, all) {
  const pills = [['all', 'All'], ...present].map(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill';
    b.setAttribute('aria-pressed', String(key === type));
    const count = key === 'all' ? all.length : all.filter((r) => r.card.type === key).length;
    const name = document.createElement('span');
    name.textContent = label;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = count;
    b.append(name, n);
    b.addEventListener('click', () => setType(key));
    return b;
  });
  $('pills').replaceChildren(...pills);
}

function renderCards(shown, queryTerms) {
  const tpl = $('card-tpl');
  $('grid').replaceChildren(...shown.map(({ card, contentOnly }) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.type').textContent = LABEL[card.type] || card.type;
    node.querySelector('.cost').textContent = card.cost;
    fillSegments(node.querySelector('.name'), segments(card.name, queryTerms));
    node.querySelector('.plugin').textContent = card.plugin;
    fillSegments(node.querySelector('.desc'), segments(card.desc, queryTerms));
    node.querySelector('.content-only').hidden = !contentOnly;
    node.querySelector('.install').textContent = card.install;
    const btn = node.querySelector('.copy');
    btn.textContent = state.copied === card.id ? 'Copied' : 'Copy';
    btn.setAttribute('aria-label', `Copy install command for ${card.name}`);
    btn.addEventListener('click', () => copy(card.id, card.install));
    const src = node.querySelector('.source');
    src.href = card.sourceUrl;
    src.setAttribute('aria-label', `Source of ${card.name} on GitHub`);
    return node;
  }));
}

function render() {
  const { status } = state;
  $('loading').hidden = status !== 'loading';
  $('error').hidden = status !== 'error';
  $('ready').hidden = status !== 'ready';
  $('add-copy').textContent = state.copied === '__add' ? 'Copied' : 'Copy';
  if (status !== 'ready') {
    $('pills').replaceChildren();
    return;
  }

  const queryTerms = terms(state.q);
  const present = TYPES.filter(([k]) => state.cards.some((c) => c.type === k));
  const type = state.type !== 'all' && present.some(([k]) => k === state.type) ? state.type : 'all';
  const all = search(state.cards, queryTerms);
  const shown = type === 'all' ? all : all.filter((r) => r.card.type === type);

  renderPills(present, type, all);
  $('count').textContent = `${shown.length} ${shown.length === 1 ? 'artifact' : 'artifacts'}`;
  $('grid').hidden = shown.length === 0;
  $('empty').hidden = shown.length > 0;
  if (shown.length === 0) {
    const typeName = type === 'all' ? '' : ` in ${LABEL[type]}${type === 'mcp' ? ' servers' : 's'}`;
    $('empty-detail').textContent = `Nothing matches “${state.q.trim()}”${typeName}.`;
  }
  renderCards(shown, queryTerms);
}

function applyCatalog(data, repo, ref) {
  $('title').textContent = data.marketplace;
  if (data.description) $('subtitle').textContent = data.description;
  $('add-cmd').textContent = data.addCommand;
  $('commit-link').textContent = data.commit || 'main';
  $('commit-link').href = data.commit ? `${repo}/commit/${data.commit}` : `${repo}/tree/main`;
  $('contributing-link').href = `${repo}/blob/${ref}/CONTRIBUTING.md`;
  $('repo-link').href = repo;
}

async function load() {
  try {
    const res = await fetch('plugins.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!data || !Array.isArray(data.plugins)) throw new Error('bad catalog');
    const { cards, repo, ref } = buildCards(data);
    Object.assign(state, { status: 'ready', catalog: data, cards });
    applyCatalog(data, repo, ref);
  } catch {
    Object.assign(state, { status: 'error', catalog: null, cards: [] });
    $('repo-link').href = REPO_FALLBACK;
  }
  render();
}

function init() {
  readUrl();
  const input = $('artifact-q');
  input.value = state.q;
  input.addEventListener('input', (e) => setQuery(e.target.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.q) {
      e.preventDefault();
      clear();
    }
  });
  $('add-copy').addEventListener('click', () => copy('__add', $('add-cmd').textContent));
  $('clear').addEventListener('click', clear);
  input.focus();
  render();
  load();
}

init();
