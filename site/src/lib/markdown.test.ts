import { describe, expect, it } from 'vitest';
import { renderInline, renderMarkdown, resolvePath, rewriteHref } from './markdown';

const ref = { repository: 'https://github.com/o/r', commit: 'abc123', path: 'plugins/p/skills/s/SKILL.md' };

describe('sanitizing', () => {
  it('strips scripts, event handlers and javascript: links', () => {
    const html = renderMarkdown([
      '<script>alert(1)</script>',
      '<img src="x.png" onerror="alert(2)">',
      '<a href="javascript:alert(3)">click</a>',
      '[md link](javascript:alert(4))',
      '<div onclick="alert(5)">box</div>',
      '<iframe src="https://evil.example"></iframe>',
    ].join('\n\n'), ref);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror|onclick/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).toContain('box');
  });

  it('sanitizes inline markdown too', () => {
    expect(renderInline('`code` <img src=x onerror=alert(1)>')).not.toMatch(/onerror/);
  });
});

describe('links', () => {
  it('rewrites relative links to GitHub at the build commit', () => {
    expect(rewriteHref('examples.md', ref)).toBe('https://github.com/o/r/blob/abc123/plugins/p/skills/s/examples.md');
    expect(rewriteHref('../../README.md#usage', ref)).toBe('https://github.com/o/r/blob/abc123/plugins/p/README.md#usage');
    expect(rewriteHref('#top', ref)).toBe('https://github.com/o/r/blob/abc123/plugins/p/skills/s/SKILL.md#top');
    expect(rewriteHref('img.png', ref, 'raw')).toBe('https://github.com/o/r/raw/abc123/plugins/p/skills/s/img.png');
  });

  it('leaves absolute links alone and opens them in a new tab', () => {
    expect(rewriteHref('https://example.com/x', ref)).toBe('https://example.com/x');
    const html = renderMarkdown('[a](https://example.com) [b](./b.md)', ref);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="https://github.com/o/r/blob/abc123/plugins/p/skills/s/b.md"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('resolves paths POSIX style', () => {
    expect(resolvePath('a/b/c.md', './d/../e.md')).toBe('a/b/e.md');
    expect(resolvePath('a/b/c.md', '/docs/x.md')).toBe('docs/x.md');
  });
});
