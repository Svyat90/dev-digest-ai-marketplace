// ⌘K / Ctrl+K: jump to any plugin or artifact. Esc closes.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useCatalog, useUi } from '../context';
import { navigate } from '../lib/hooks';
import { href } from '../lib/route';
import { Dot } from './ui';

const LIMIT = 10;

export function Palette() {
  const { t } = useI18n();
  const { search } = useCatalog();
  const { setPaletteOpen } = useUi();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(document.activeElement);

  const results = useMemo(() => search.search(query).slice(0, LIMIT), [search, query]);

  useEffect(() => {
    input.current?.focus();
    const previous = opener.current;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  useEffect(() => setActive(0), [query]);

  const close = () => setPaletteOpen(false);
  const open = (i: number) => {
    const entry = results[i];
    if (!entry) return;
    close();
    navigate(href.entry(entry));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      open(active);
    } else if (e.key === 'Tab') {
      // Keep focus inside the dialog: the input is its only tab stop.
      e.preventDefault();
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('palette.label')}>
        <div className="palette-input">
          <span className="faint" aria-hidden="true">⌕</span>
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            aria-label={t('palette.placeholder')}
          />
          <span className="esc">{t('palette.close')}</span>
        </div>
        {results.length ? (
          <ul className="palette-list" id="palette-list" role="listbox">
            {results.map((e, i) => (
              <li key={e.id} role="presentation">
                <button
                  type="button"
                  id={`palette-${i}`}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  className="palette-item"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => open(i)}
                >
                  <Dot type={e.type} />
                  <span className="main">
                    <span className="name">{e.name}</span>{' '}
                    <span className="meta">· {e.type === 'plugin' ? e.pluginDisplayName : e.plugin}</span>
                  </span>
                  <span className="kind">{t(`type.${e.type}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="palette-empty">{t('palette.empty')}</div>
        )}
      </div>
    </div>
  );
}
