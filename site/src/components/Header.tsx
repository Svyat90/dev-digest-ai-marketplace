import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useUi } from '../context';
import { navigate, type Theme } from '../lib/hooks';
import { href, type Route } from '../lib/route';

export function Header({ route, theme, onToggleTheme, repository, marketplace }: {
  route: Route;
  theme: Theme;
  onToggleTheme(): void;
  repository: string;
  marketplace: string | null;
}) {
  const { t, lang, locales, setLang } = useI18n();
  const { setPaletteOpen } = useUi();
  const onSearch = route.name === 'search';
  const [draft, setDraft] = useState(onSearch ? route.query.q : '');

  // On the search screen the field mirrors the URL; elsewhere it is a draft.
  useEffect(() => {
    if (route.name === 'search') setDraft(route.query.q);
  }, [route]);

  const onChange = (value: string) => {
    setDraft(value);
    if (route.name === 'search') navigate(href.search({ ...route.query, q: value }), { replace: true });
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="header">
      <a className="brand" href={href.home()}>
        <span className="brand-mark" aria-hidden="true">◆</span>
        <span className="brand-name">{t('app.name')}</span>
        {marketplace && <span className="brand-badge">{marketplace.replace(/-ai-marketplace$/, '')}</span>}
      </a>
      <form
        className="header-search search-field"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(href.search(route.name === 'search' ? { ...route.query, q: draft } : { q: draft }));
        }}
      >
        <span className="glyph" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('header.search.placeholder')}
          aria-label={t('header.search.label')}
        />
      </form>
      <nav className="header-nav">
        <a className="navlink" href={href.whatsNew()} aria-current={route.name === 'whats-new' ? 'page' : undefined}>
          {t('nav.whatsNew')}
        </a>
        <a className="navlink" href={href.gettingStarted()} aria-current={route.name === 'getting-started' ? 'page' : undefined}>
          {t('nav.gettingStarted')}
        </a>
        <button type="button" className="icon-btn kbd" onClick={() => setPaletteOpen(true)} aria-label={t('header.palette')}>
          {isMac ? '⌘K' : 'Ctrl K'}
        </button>
        {locales.length > 1 && (
          <select className="select-sm" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('header.language')}>
            {locales.map((l) => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
          </select>
        )}
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('header.theme.light') : t('header.theme.dark')}
          title={theme === 'dark' ? t('header.theme.light') : t('header.theme.dark')}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <a className="navlink" href={repository} target="_blank" rel="noopener noreferrer">{t('header.github')}</a>
      </nav>
    </header>
  );
}
