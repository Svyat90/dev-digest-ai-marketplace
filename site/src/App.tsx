import { useEffect, useState } from 'react';
import { useI18n } from './i18n';
import { CatalogProvider, UiProvider, useUi } from './context';
import { REPOSITORY_FALLBACK, loadCatalog } from './lib/data';
import { useRoute, useTheme } from './lib/hooks';
import type { Route } from './lib/route';
import type { Catalog } from './lib/types';
import { Header } from './components/Header';
import { Palette } from './components/Palette';
import { Toast } from './components/ui';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { PluginPage } from './pages/PluginPage';
import { ArtifactPage } from './pages/ArtifactPage';
import { WhatsNew } from './pages/WhatsNew';
import { GettingStarted } from './pages/GettingStarted';
import { NotFound } from './pages/NotFound';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; catalog: Catalog };

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home': return <Home />;
    case 'search': return <Search query={route.query} />;
    case 'plugin': return <PluginPage name={route.plugin} />;
    case 'artifact': return <ArtifactPage id={route.id} />;
    case 'whats-new': return <WhatsNew />;
    case 'getting-started': return <GettingStarted />;
    default: return <NotFound />;
  }
}

function Shortcuts() {
  const { setPaletteOpen } = useUi();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);
  return null;
}

function PaletteSlot() {
  const { paletteOpen } = useUi();
  return paletteOpen ? <Palette /> : null;
}

export function App() {
  const { t, formatDate } = useI18n();
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    loadCatalog().then(
      (catalog) => setLoad({ state: 'ready', catalog }),
      () => setLoad({ state: 'error' }),
    );
  }, []);

  // A new screen starts at the top, like a page load.
  const routeKey = route.name === 'search' ? 'search' : window.location.hash.split('?')[0];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  const index = load.state === 'ready' ? load.catalog.index : null;
  const repository = index?.repository ?? REPOSITORY_FALLBACK;

  return (
    <UiProvider>
      <a className="skip" href="#main" onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById('main');
        main?.setAttribute('tabindex', '-1');
        main?.focus();
      }}>
        {t('app.skip')}
      </a>
      <Header route={route} theme={theme} onToggleTheme={toggleTheme} repository={repository} marketplace={index?.marketplace ?? null} />
      {load.state === 'loading' && <main id="main" className="page"><p className="faint">{t('app.loading')}</p></main>}
      {load.state === 'error' && (
        <main id="main" className="page narrow">
          <div className="empty" role="alert">
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{t('error.title')}</h1>
            <p>{t('error.text')}</p>
            <a className="btn" href={repository} target="_blank" rel="noopener noreferrer">{t('error.repo')}</a>
          </div>
        </main>
      )}
      {load.state === 'ready' && (
        <CatalogProvider catalog={load.catalog}>
          <Screen route={route} />
          <Shortcuts />
          <PaletteSlot />
          <footer className="footer">
            {t('app.footer', {
              commit: load.catalog.index.commit?.slice(0, 7) ?? 'local',
              date: formatDate(load.catalog.index.builtAt),
            })}
          </footer>
        </CatalogProvider>
      )}
      <Toast />
    </UiProvider>
  );
}
