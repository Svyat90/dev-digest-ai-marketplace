// Markdown rendering for READMEs and component bodies. The output always goes
// through DOMPurify; relative links point to GitHub at the build commit.

import DOMPurify from 'dompurify';
import { Marked, type Token } from 'marked';

export interface SourceRef {
  repository: string;
  commit: string | null;
  // Repository-relative path of the markdown file, e.g. plugins/x/skills/y/SKILL.md.
  path: string;
}

const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

// Resolves `target` against the directory of `file`, POSIX style.
export function resolvePath(file: string, target: string): string {
  const parts = target.startsWith('/') ? [] : file.split('/').slice(0, -1);
  for (const seg of target.replace(/^\//, '').split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

export function rewriteHref(href: string, ref: SourceRef, kind: 'blob' | 'raw' = 'blob'): string {
  if (!href || ABSOLUTE.test(href)) return href;
  const base = `${ref.repository.replace(/\/$/, '')}/${kind}/${ref.commit ?? 'main'}`;
  if (href.startsWith('#')) return `${base}/${ref.path}${href}`;
  const [path = '', hash] = href.split('#');
  return `${base}/${resolvePath(ref.path, path)}${hash ? `#${hash}` : ''}`;
}

let hooked = false;
function sanitize(html: string): string {
  if (!hooked) {
    // Links leave the single-page app: open them in a new tab without an opener.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.getAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'] });
}

export function renderMarkdown(markdown: string, ref: SourceRef): string {
  const marked = new Marked({
    gfm: true,
    walkTokens(token: Token) {
      if (token.type === 'link') token.href = rewriteHref(token.href, ref);
      if (token.type === 'image') token.href = rewriteHref(token.href, ref, 'raw');
    },
  });
  return sanitize(marked.parse(markdown, { async: false }));
}

// One line of markdown (changelog bullets): inline formatting only.
export function renderInline(markdown: string): string {
  return sanitize(new Marked({ gfm: true }).parseInline(markdown, { async: false }));
}
