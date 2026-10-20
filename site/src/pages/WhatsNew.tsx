import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { href } from '../lib/route';
import { ReleaseNotes } from './PluginPage';

export function WhatsNew() {
  const { t, formatDate } = useI18n();
  const { index, releases } = useCatalog();
  const names = new Map(index.plugins.map((p) => [p.name, p.displayName]));
  return (
    <main id="main" className="page feed">
      <a className="back" href={href.home()}>{t('whatsNew.home')}</a>
      <h1 style={{ fontSize: 26, margin: '0 0 6px' }}>{t('whatsNew.title')}</h1>
      <p className="dim" style={{ margin: '0 0 22px' }}>{t('whatsNew.lead')}</p>
      {releases.length === 0 ? (
        <p className="dim">{t('whatsNew.empty')}</p>
      ) : (
        <div className="stack">
          {releases.map((r) => (
            <article key={`${r.plugin}@${r.version}`} className="feed-item card-link release">
              <div className="when">
                <div className="v">v{r.version}</div>
                <div className="d">{formatDate(r.date)}</div>
              </div>
              <div className="what">
                <a href={href.plugin(r.plugin)}>{names.get(r.plugin) ?? r.plugin}</a>
                <ReleaseNotes release={r} />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
