import { useI18n } from '../i18n';
import { useCatalog } from '../context';
import { href } from '../lib/route';
import { localized } from '../lib/search';
import { CopyButton, MarkdownBody, Terminal, TypeBadge } from '../components/ui';
import { NotFound } from './NotFound';

export function ArtifactPage({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const { index } = useCatalog();
  const artifact = index.artifacts.find((a) => a.id === id);
  if (!artifact) return <NotFound message={t('artifact.notFound', { id })} />;
  const plugin = index.plugins.find((p) => p.name === artifact.plugin);
  const sourceUrl = `${index.repository}/blob/${index.commit ?? 'main'}/${artifact.path}`;
  const install = plugin?.install ?? '';

  return (
    <main id="main" className="page article">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href={href.search()}>{t('artifact.catalog')}</a>
        <span className="sep"> / </span>
        <a href={href.plugin(artifact.plugin)}>{plugin?.displayName ?? artifact.plugin}</a>
        <span className="sep"> / </span>
        <span aria-current="page">{artifact.name}</span>
      </nav>

      <div className="title-line" style={{ marginBottom: 6 }}>
        <TypeBadge type={artifact.type} />
        <h1 style={{ fontSize: 24 }}>{artifact.name}</h1>
        {artifact.invocation && <span className="invocation" title={t('artifact.invocation')}>{artifact.invocation}</span>}
      </div>
      {artifact.description && <p className="lead">{localized(artifact, lang)}</p>}

      {artifact.tools.length > 0 && (
        <>
          <div className="label-sm">{t('artifact.tools')}</div>
          <div className="kv">{artifact.tools.map((tool) => <span key={tool} className="tool">{tool}</span>)}</div>
        </>
      )}

      <div className="label-sm">{t('artifact.cost')}</div>
      <div className="cost">
        <span>{t('artifact.cost.idle', { tokens: artifact.tokens.idle })}</span>
        <span>{t('artifact.cost.invoked', { tokens: artifact.tokens.invoked })}</span>
      </div>

      <div className="label-sm">{t('artifact.install')}</div>
      <div className="install" style={{ marginTop: 0 }}>
        <Terminal command={install} id={`artifact:${artifact.id}`} />
        <CopyButton text={install} id={`artifact:${artifact.id}`} />
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t('artifact.docs')}</h2>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>{t('artifact.source')}</a>
        </div>
        <div className="panel">
          <MarkdownBody
            file={`${artifact.plugin}/${artifact.type}-${artifact.name}.md`}
            path={artifact.path}
            plain={artifact.type === 'hook' || artifact.type === 'mcp'}
          />
        </div>
      </section>
    </main>
  );
}
