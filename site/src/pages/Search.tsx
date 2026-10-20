import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { navigate } from '../lib/hooks';
import { href, type SearchQuery } from '../lib/route';
import type { SortOrder } from '../lib/search';
import { ENTRY_TYPES, type EntryType } from '../lib/types';
import { Dot, ResultCard } from '../components/ui';

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Search({ query }: { query: SearchQuery }) {
  const { t, formatNumber } = useI18n();
  const { search } = useCatalog();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Author is not in the URL contract; it is a facet only when there is more than one.
  const [author, setAuthor] = useState<string | null>(null);

  const update = (patch: Partial<SearchQuery>) => navigate(href.search({ ...query, ...patch }), { replace: true });

  const results = useMemo(
    () => search.search(query.q, { types: query.types, keywords: query.keywords, author, sort: query.sort }),
    [search, query, author],
  );
  // Facet counts follow the query and the other facets, not the facet itself.
  const forTypes = useMemo(() => search.search(query.q, { keywords: query.keywords, author }), [search, query, author]);
  const typeCount = (type: EntryType) => forTypes.filter((e) => e.type === type).length;
  const keywords = useMemo(() => [...new Set(search.entries.flatMap((e) => e.keywords))].sort(), [search]);
  const authors = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of search.entries) if (e.author) count.set(e.author, (count.get(e.author) ?? 0) + 1);
    return [...count.entries()];
  }, [search]);

  const reset = () => {
    setAuthor(null);
    navigate(href.search({ q: query.q, sort: query.sort }), { replace: true });
  };

  const facets = (
    <>
      <div className="facet-label">{t('search.type')}</div>
      <div className="facet-list">
        {ENTRY_TYPES.filter((type) => search.entries.some((e) => e.type === type)).map((type) => (
          <button
            key={type}
            type="button"
            className="facet"
            aria-pressed={query.types.includes(type)}
            onClick={() => update({ types: toggle(query.types, type) })}
          >
            <Dot type={type} />
            <span className="label">{t(`types.${type}`)}</span>
            <span className="count">{formatNumber(typeCount(type))}</span>
          </button>
        ))}
      </div>
      <div className="facet-label">{t('search.keywords')}</div>
      <div className="kw-list">
        {keywords.map((k) => (
          <button key={k} type="button" className="kw" aria-pressed={query.keywords.includes(k)}
            onClick={() => update({ keywords: toggle(query.keywords, k) })}>
            {k}
          </button>
        ))}
      </div>
      {authors.length > 1 && (
        <>
          <div className="facet-label">{t('search.author')}</div>
          <div className="facet-list">
            {authors.map(([a, n]) => (
              <button key={a} type="button" className="facet" aria-pressed={author === a}
                onClick={() => setAuthor(author === a ? null : a)}>
                <span className="label">{a}</span>
                <span className="count">{formatNumber(n)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );

  return (
    <main id="main" className="page search-layout">
      <aside className={`facets${filtersOpen ? ' open' : ''}`}>
        <div className="facets-head">
          <button type="button" className="btn small facets-toggle" aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}>
            {t('search.filters')}
            {query.types.length + query.keywords.length > 0 && ` · ${query.types.length + query.keywords.length}`}
          </button>
          <span className="facets-title">{t('search.filters')}</span>
          <button type="button" className="link-btn" onClick={reset}>{t('search.reset')}</button>
        </div>
        <div className="facets-body">{facets}</div>
      </aside>

      <section>
        <div className="results-head">
          <div>
            <h1>{query.q.trim() ? t('search.title.query', { query: query.q.trim() }) : t('search.title.all')}</h1>
            <div className="dim" style={{ fontSize: 13 }} aria-live="polite">{t('search.count', { count: results.length })}</div>
          </div>
          <label className="sort">
            {t('search.sort')}
            <select value={query.sort} onChange={(e) => update({ sort: e.target.value as SortOrder })}>
              <option value="relevance">{t('search.sort.relevance')}</option>
              <option value="name">{t('search.sort.name')}</option>
              <option value="updated">{t('search.sort.updated')}</option>
            </select>
          </label>
        </div>

        {results.length ? (
          <div className="results">
            {results.map((e) => <ResultCard key={e.id} entry={e} />)}
          </div>
        ) : (
          <div className="empty">
            <div className="big" aria-hidden="true">🔍</div>
            <h3>{t('search.empty.title')}</h3>
            <p>{t('search.empty.text')}</p>
            <button type="button" className="btn" onClick={reset}>{t('search.empty.reset')}</button>
          </div>
        )}
      </section>
    </main>
  );
}
