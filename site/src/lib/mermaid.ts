// Mermaid diagrams in rendered markdown. marked leaves ```mermaid fences as
// <pre><code class="language-mermaid">; this swaps each for its SVG. The library
// is large, so it loads only on pages that have a diagram; securityLevel
// "strict" keeps labels as text, and a block that fails to parse stays as code.

let seq = 0;

function isDark(): boolean {
  const pinned = document.documentElement.dataset.theme;
  if (pinned) return pinned === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export async function renderDiagrams(root: HTMLElement): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')];
  if (!blocks.length) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'default' });
  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre?.isConnected) continue;
    try {
      const { svg } = await mermaid.render(`mermaid-${++seq}`, code.textContent ?? '');
      const figure = document.createElement('div');
      figure.className = 'mermaid';
      figure.innerHTML = svg;
      pre.replaceWith(figure);
    } catch {
      // Not valid mermaid: the source stays visible as a code block.
    }
  }
}
