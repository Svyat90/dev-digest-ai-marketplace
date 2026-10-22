import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { href } from '../lib/route';
import { localized } from '../lib/search';
import { ARTIFACT_TYPES, type Release } from '../lib/types';
import { CopyButton, Dot, InlineMarkdown, MarkdownBody, Terminal } from '../components/ui';
import { NotFound } from './NotFound';

export function ReleaseNotes({ release, open = false }: { release: Release; open?: boolean }) {
  const { t } = useI18n();
  const sections = Object.entries(release.sections).filter(([, items]) => items.length);
  const body = sections.map(([name, items]) => (
    <div key={name}>
      <h4>{name}</h4>
      <ul>{items.map((item, i) => <li key={i}><InlineMarkdown text={item} /></li>)}</ul>
    </div>
  ));
  if (open) return <>{body}</>;
  return (
    <>
      {release.summary && <div className="summary"><InlineMarkdown text={release.summary} /></div>}
      {sections.length > 0 && (
        <details>
          <summary>{t('whatsNew.details')}</summary>
          {body}
        </details>
      )}
    </>
  );
}

export function PluginPage({ name }: { name: string }) {
  const { t, lang, formatDate } = useI18n();
  const { index, releases } = useCatalog();
  const plugin = index.plugins.find((p) => p.name === name);
  if (!plugin) return <NotFound message={t('plugin.notFound', { name })} />;

  const known = new Set(index.plugins.map((p) => p.name));
  const artifacts = index.artifacts.filter((a) => a.plugin === plugin.name);
  const dependents = index.plugins.filter((p) => p.dependencies.some((d) => d.name === plugin.name));
  const changelog = releases.filter((r) => r.plugin === plugin.name);

  return (
    <main id="main" className="page narrow">
      <a className="back" href={href.search()}>{t('plugin.back')}</a>
      <div className="title-row">
        <div className="plugin-icon" aria-hidden="true">◆</div>
        <div className="grow">
          <div className="title-line">
            <h1>{plugin.displayName}</h1>
            {plugin.version && <span className="badge version k-plugin">v{plugin.version}</span>}
            {plugin.compatibility.claudeCode && (
              <span className="badge compat">✓ {t('plugin.compatibility', { range: plugin.compatibility.claudeCode })}</span>
            )}
            {plugin.compatibility.node && (
              <span className="badge compat">{t('plugin.node', { version: plugin.compatibility.node })}</span>
            )}
          </div>
          <p className="lead">{localized(plugin, lang)}</p>
          <div className="byline">
            {plugin.name}{plugin.author && ` · ${plugin.author}`}
            {plugin.updated && ` · ${t('plugin.updated', { date: formatDate(plugin.updated) })}`}
          </div>
        </div>
      </div>

      <div className="install">
        <Terminal command={plugin.install} id={`plugin:${plugin.name}`} />
        <CopyButton text={plugin.install} id={`plugin:${plugin.name}`} />
        <a className="btn large" href={plugin.homepage} target="_blank" rel="noopener noreferrer">{t('plugin.github')}</a>
      </div>

      <section className="section">
        <h2 className="section-title">{t('plugin.components')}</h2>
        {ARTIFACT_TYPES.map((type) => {
          const items = artifacts.filter((a) => a.type === type);
          if (!items.length) return null;
          return (
            <div className="group" key={type}>
              <div className="group-head">
                <Dot type={type} />
                <span className="label">{t(`types.${type}`)}</span>
                <span className="mono faint" style={{ fontSize: 11 }}>{items.length}</span>
              </div>
              <div className="group-grid">
                {items.map((a) => (
                  <a key={a.id} className="comp card-link" href={href.artifact(a.id)}>
                    <div className="head">
                      <span className="name">{a.name}</span>
                      {a.invocation && <span className="inv">{a.invocation}</span>}
                    </div>
                    <div className="desc">{localized(a, lang)}</div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {plugin.dependencies.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('plugin.dependencies')}</h2>
          <div className="deps">
            {plugin.dependencies.map((d) => known.has(d.name) ? (
              <a key={d.name} className="dep card-link" href={href.plugin(d.name)}>
                {d.name}{d.range && <span className="range">{d.range}</span>}
              </a>
            ) : (
              <span key={d.name} className="dep card-link">{d.name}{d.range && <span className="range">{d.range}</span>}</span>
            ))}
          </div>
        </section>
      )}

      {dependents.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('plugin.dependents')}</h2>
          <div className="deps">
            {dependents.map((p) => (
              <a key={p.name} className="dep card-link" href={href.plugin(p.name)}>
                {p.name}
                <span className="range">{p.dependencies.find((d) => d.name === plugin.name)?.range}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">{t('plugin.cost')}</h2>
        <div className="cost">
          <span>{t('plugin.cost.idle', { tokens: plugin.tokens.idle })}</span>
          <span>{t('plugin.cost.invoked', { tokens: plugin.tokens.invoked })}</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t('plugin.readme')}</h2>
        <div className="panel">
          <MarkdownBody file={`${plugin.name}/README.md`} path={`${plugin.path}/README.md`} />
        </div>
      </section>

      {changelog.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t('plugin.changelog')}</h2>
          <div className="stack">
            {changelog.map((r) => (
              <div key={r.version} className="release">
                <div className="head">
                  <span className="v">v{r.version}</span>
                  <span className="d">{formatDate(r.date)}</span>
                </div>
                <ReleaseNotes release={r} open />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
