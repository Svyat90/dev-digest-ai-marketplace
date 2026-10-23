import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useCatalog, useUi } from '../context';
import { loadBody } from '../lib/data';
import { renderInline, renderMarkdown } from '../lib/markdown';
import { renderDiagrams } from '../lib/mermaid';
import { href } from '../lib/route';
import { localized, type Entry } from '../lib/search';
import type { EntryType } from '../lib/types';

export function TypeBadge({ type }: { type: EntryType }) {
  const { t } = useI18n();
  return <span className={`badge kind k-${type}`}>{t(`type.${type}`)}</span>;
}

export function Dot({ type }: { type: EntryType }) {
  return <span className={`dot k-${type}`} aria-hidden="true" />;
}

export function CopyButton({ text, id, variant = 'primary large', label }: {
  text: string;
  id: string;
  variant?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const { copy, copiedKey } = useUi();
  const copied = copiedKey === id;
  return (
    <button type="button" className={`btn ${variant}${copied ? ' copied' : ''}`} onClick={() => copy(text, id)}>
      {copied ? t('card.copied') : (label ?? t('card.copyInstall'))}
    </button>
  );
}

// Terminal-style line with the command; `inlineCopy` puts a small Copy inside it.
export function Terminal({ command, id, inlineCopy = false }: { command: string; id: string; inlineCopy?: boolean }) {
  const { t } = useI18n();
  const { copy, copiedKey } = useUi();
  return (
    <div className="terminal">
      <span className="prompt" aria-hidden="true">$</span>
      <code>{command}</code>
      {inlineCopy && (
        <button type="button" className="link-btn" onClick={() => copy(command, id)}>
          {copiedKey === id ? t('start.copied') : t('start.copy')}
        </button>
      )}
    </div>
  );
}

export function InlineMarkdown({ text }: { text: string }) {
  const html = useMemo(() => renderInline(text), [text]);
  return <span className="inline-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Fetches a body from bodies/ and renders it; `path` is the repository path the
// relative links resolve against.
export function MarkdownBody({ file, path, plain = false }: { file: string; path: string; plain?: boolean }) {
  const { t } = useI18n();
  const { index } = useCatalog();
  const [state, setState] = useState<{ file: string; text?: string; error?: boolean }>({ file });

  useEffect(() => {
    let alive = true;
    setState({ file });
    loadBody(file).then(
      (text) => alive && setState({ file, text }),
      () => alive && setState({ file, error: true }),
    );
    return () => {
      alive = false;
    };
  }, [file]);

  const html = useMemo(
    () => (state.text !== undefined && !plain
      ? renderMarkdown(state.text, { repository: index.repository, commit: index.commit, path })
      : ''),
    [state.text, plain, index.repository, index.commit, path],
  );
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (html && body.current) renderDiagrams(body.current).catch(() => {});
  }, [html]);

  if (state.error) return <p className="dim">{t('doc.error')}</p>;
  if (state.text === undefined) return <p className="faint">{t('doc.loading')}</p>;
  if (plain) return <div className="markdown"><pre><code>{state.text}</code></pre></div>;
  return <div ref={body} className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ResultCard({ entry }: { entry: Entry }) {
  const { t, lang } = useI18n();
  const link = href.entry(entry);
  return (
    <article className="result">
      <div className="top">
        <div className="row">
          <TypeBadge type={entry.type} />
          {entry.version && <span className="mono faint">v{entry.version}</span>}
        </div>
        <h2><a href={link}>{entry.name}</a></h2>
        <p>{localized(entry.source, lang)}</p>
        {entry.keywords.length > 0 && (
          <div className="kws">{entry.keywords.slice(0, 3).map((k) => <span key={k}>#{k}</span>)}</div>
        )}
      </div>
      <div className="foot">
        <span className="meta">
          {entry.type === 'plugin' ? entry.author : t('card.in', { plugin: entry.pluginDisplayName })}
        </span>
        <div className="actions">
          <CopyButton text={entry.install} id={`card:${entry.id}`} variant="small" />
          <a className="btn small primary" href={link}>{t('card.open')}</a>
        </div>
      </div>
    </article>
  );
}

export function Toast() {
  const { t } = useI18n();
  const { toast } = useUi();
  return (
    <div aria-live="polite" role="status">
      {toast && (
        <div className="toast" key={toast.id}>
          {toast.ok ? <span className="ok">✓</span> : <span className="err">!</span>}
          {toast.ok ? t('toast.copied') : t('toast.copyFailed')}
        </div>
      )}
    </div>
  );
}
