import { describe, expect, it } from 'vitest';
import { href, parseRoute } from './route';

describe('routes', () => {
  it('parses every screen', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/plugin/sdd-engineering')).toEqual({ name: 'plugin', plugin: 'sdd-engineering' });
    expect(parseRoute('#/artifact/sdd-engineering/agent/spec-creator'))
      .toEqual({ name: 'artifact', id: 'sdd-engineering/agent/spec-creator' });
    expect(parseRoute('#/whats-new')).toEqual({ name: 'whats-new' });
    expect(parseRoute('#/getting-started?lang=en')).toEqual({ name: 'getting-started' });
    expect(parseRoute('#/nope')).toEqual({ name: 'not-found' });
  });

  it('reads the search state from the URL', () => {
    expect(parseRoute('#/search?q=drizzle&type=skill')).toEqual({
      name: 'search', query: { q: 'drizzle', types: ['skill'], keywords: [], sort: 'relevance' },
    });
    expect(parseRoute('#/search?type=agent,bogus&kw=sdd,spec&sort=updated')).toEqual({
      name: 'search', query: { q: '', types: ['agent'], keywords: ['sdd', 'spec'], sort: 'updated' },
    });
  });

  it('writes the search state back to the URL', () => {
    expect(href.search({ q: 'drizzle', types: ['skill'] })).toBe('#/search?q=drizzle&type=skill');
    expect(href.search({ q: '', sort: 'relevance' })).toBe('#/search');
    const round = parseRoute(href.search({ q: 'a b', types: ['skill', 'hook'], keywords: ['x'], sort: 'name' }));
    expect(round).toEqual({ name: 'search', query: { q: 'a b', types: ['skill', 'hook'], keywords: ['x'], sort: 'name' } });
  });

  it('links entries to their pages', () => {
    expect(href.entry({ type: 'plugin', id: 'plugin/x', plugin: 'x' })).toBe('#/plugin/x');
    expect(href.entry({ type: 'hook', id: 'x/hook/PreToolUse', plugin: 'x' })).toBe('#/artifact/x/hook/PreToolUse');
  });
});
