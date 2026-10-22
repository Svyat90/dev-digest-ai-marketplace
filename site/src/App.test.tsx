import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from './i18n';
import { App } from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('catalog load failure', () => {
  it('shows "Could not load the catalog" with a link to the repository', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    Object.defineProperty(navigator, 'languages', { value: ['en-US'], configurable: true });
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => {
      createRoot(el).render(<I18nProvider><App /></I18nProvider>);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(el.textContent).toContain('Could not load the catalog');
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent?.includes('Open the repository'));
    expect(link?.getAttribute('href')).toBe('https://github.com/Svyat90/dev-digest-ai-marketplace');
  });
});
