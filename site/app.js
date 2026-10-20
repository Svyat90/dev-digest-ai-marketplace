// Renders plugins.json (built by scripts/build-index.mjs) as a searchable catalog.

const list = document.getElementById('plugins');
const template = document.getElementById('card');
const filter = document.getElementById('filter');

function copy(button, text) {
  navigator.clipboard?.writeText(text).then(() => {
    const label = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => (button.textContent = label), 1200);
  });
}

function render(plugins) {
  list.replaceChildren();
  if (plugins.length === 0) {
    list.textContent = 'No plugins match.';
    return;
  }
  for (const p of plugins) {
    const card = template.content.cloneNode(true);
    card.querySelector('.name').textContent = p.displayName;
    card.querySelector('.version').textContent = p.version ? `v${p.version}` : '';
    card.querySelector('.desc').textContent = p.description;

    const tags = card.querySelector('.tags');
    for (const tag of p.tags) tags.append(Object.assign(document.createElement('li'), { textContent: tag }));

    const components = card.querySelector('.components');
    for (const c of p.components) {
      const li = document.createElement('li');
      li.append(Object.assign(document.createElement('b'), { textContent: `${c.type}` }), ` ${c.name ?? ''}`);
      components.append(li);
    }

    card.querySelector('.install').textContent = p.install;
    const btn = card.querySelector('.card button');
    btn.addEventListener('click', () => copy(btn, p.install));

    card.querySelector('.meta').textContent =
      `~${p.tokens.idle} tokens idle · ~${p.tokens.invoked} on use`;
    list.append(card);
  }
}

function matches(p, q) {
  const haystack = [p.name, p.displayName, p.description, p.category, ...p.tags,
    ...p.components.map((c) => c.name)].join(' ').toLowerCase();
  return haystack.includes(q);
}

document.querySelector('[data-copy="add-cmd"]').addEventListener('click', (e) =>
  copy(e.currentTarget, document.getElementById('add-cmd').textContent));

try {
  const index = await (await fetch('plugins.json', { cache: 'no-cache' })).json();
  document.getElementById('add-cmd').textContent = index.addCommand;
  document.getElementById('description').textContent = index.description;
  if (index.commit) document.getElementById('commit').textContent = `Build ${index.commit}`;
  render(index.plugins);
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    render(q ? index.plugins.filter((p) => matches(p, q)) : index.plugins);
  });
} catch {
  list.textContent = 'Could not load the catalog. Run node scripts/build-index.mjs.';
}
