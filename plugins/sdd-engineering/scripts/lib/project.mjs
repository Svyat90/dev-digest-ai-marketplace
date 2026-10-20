// Project conventions shared by the sdd-engineering hooks and lint scripts.
// See the plugin README › Project conventions.
//
//   package      a top-level folder with its own CLAUDE.md
//   spec folders specs/ (root) and <package>/specs/
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'docs', 'specs', 'dist', 'build', 'vendor']);

export function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}

// Top-level folders that carry their own CLAUDE.md. Empty for a single-package project.
export function packages(root = projectRoot()) {
  return readdirSync(root)
    .filter((name) => !name.startsWith('.') && !SKIP.has(name))
    .filter((name) => statSync(join(root, name)).isDirectory() && existsSync(join(root, name, 'CLAUDE.md')))
    .sort();
}

export function specFolders(root = projectRoot()) {
  return ['specs', ...packages(root).map((p) => `${p}/specs`)];
}

// True when the hook fired inside the named agent. Plugin agents report a
// namespaced type ("sdd-engineering:spec-creator"), project agents a bare one.
export function firedIn(input, agent) {
  const type = input.agent_type ?? '';
  return type === agent || type.endsWith(`:${agent}`);
}

export async function readHookInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw || '{}');
}
