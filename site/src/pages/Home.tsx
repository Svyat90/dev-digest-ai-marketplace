import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { navigate } from '../lib/hooks';
import { href } from '../lib/route';
import { ENTRY_TYPES } from '../lib/types';
import { Dot, InlineMarkdown } from '../components/ui';

const CHIPS = 7;

export function Home() {
  const { t, formatDate, formatNumber } = useI18n();
  const { index, releases, stats } = useCatalog();
  const [query, setQuery] = useState('');
  const plugins = new Map(index.plugins.map((p) => [p.name, p]));

  // Top keywords: plugin keywords weighted by how many artifacts carry them.
  const chips = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of index.plugins) for (const k of p.keywords) count.set(k, (count.get(k) ?? 0) + 1 + p.components.length);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, CHIPS).map(([k]) => k);
  }, [index.plugins]);

  const types = ENTRY_TYPES.filter((type) => (stats.counts[type] ?? 0) > 0);

  return (
    <main id="main" className="page">
      <section className="hero">
        <div className="eyebrow">{t('home.eyebrow')}</div>
        <h1>{t('home.title')}</h1>
        <p>{t('home.lead')}</p>
        <form className="search-field hero" role="search" onSubmit={(e) => { e.preventDefault(); navigate(href.search({ q: query })); }}>
          <span className="glyph" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.search.placeholder')}
            aria-label={t('header.search.label')}
          />
        </form>
        <div className="chips">
          {chips.map((k) => <a key={k} className="chip" href={href.search({ keywords: [k] })}>#{k}</a>)}
        </div>
      </section>

      {index.plugins.length === 0 ? (
        <section className="empty">
          <div className="big" aria-hidden="true">📦</div>
          <h2>{t('home.empty.title')}</h2>
          <p>{t('home.empty.text')}</p>
          <a className="btn primary" href={href.gettingStarted()}>{t('home.empty.start')}</a>{' '}
          <a className="btn" href={`${index.repository}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">CONTRIBUTING.md</a>
        </section>
      ) : (
        <>
          <section className="stats" aria-label={t('home.browse')}>
            {types.map((type) => {
              const n = stats.counts[type] ?? 0;
              return (
                <a key={type} className="stat card-link" href={href.search({ types: [type] })}>
                  <div className="n">{formatNumber(n)}</div>
                  <div className="l">{t(`count.${type}`, { count: n })}</div>
                </a>
              );
            })}
          </section>
          <p className="cost-line">{t('home.cost', { tokens: stats.tokens.idle })}</p>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">{t('home.whatsNew')}</h2>
              <a href={href.whatsNew()} className="dim" style={{ fontSize: 12 }}>{t('home.whatsNew.all')}</a>
            </div>
            <div className="stack">
              {releases.slice(0, 4).map((r) => (
                <a key={`${r.plugin}@${r.version}`} className="release-row card-link" href={href.plugin(r.plugin)}>
                  <span className="badge version k-plugin">v{r.version}</span>
                  <div className="body">
                    <div className="title">{plugins.get(r.plugin)?.displayName ?? r.plugin}</div>
                    {r.summary && <div className="summary"><InlineMarkdown text={r.summary} /></div>}
                  </div>
                  <span className="date">{formatDate(r.date)}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">{t('home.browse')}</h2>
            <div className="browse">
              {types.map((type) => (
                <a key={type} className="card-link" href={href.search({ types: [type] })}>
                  <Dot type={type} />
                  <span style={{ fontWeight: 500 }}>{t(`types.${type}`)}</span>
                  <span className="count">{formatNumber(stats.counts[type] ?? 0)}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
