// Shapes of the files scripts/build-index.mjs writes to site/public/
// (docs/SITE-SPEC.md → Data contract).

export const ARTIFACT_TYPES = ['skill', 'agent', 'command', 'hook', 'mcp'] as const;
export const ENTRY_TYPES = ['plugin', ...ARTIFACT_TYPES] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type EntryType = (typeof ENTRY_TYPES)[number];

export interface Translation {
  description: string;
  stale: boolean;
}
export type Translations = Record<string, Translation>;

export interface Tokens {
  idle: number;
  invoked: number;
}

export interface Plugin {
  name: string;
  displayName: string;
  version: string | null;
  description: string;
  author: string | null;
  category: string | null;
  keywords: string[];
  dependencies: { name: string; range: string | null }[];
  compatibility: { claudeCode: string | null; node: string | null };
  install: string;
  homepage: string;
  path: string;
  updated: string | null;
  tokens: Tokens;
  components: string[];
  translations: Translations;
}

export interface Artifact {
  id: string;
  plugin: string;
  type: ArtifactType;
  name: string;
  description: string;
  invocation: string | null;
  tools: string[];
  path: string;
  text: string;
  tokens: Tokens;
  translations: Translations;
}

export interface CatalogIndex {
  marketplace: string;
  description: string;
  addCommand: string;
  repository: string;
  commit: string | null;
  builtAt: string;
  plugins: Plugin[];
  artifacts: Artifact[];
}

export interface Release {
  plugin: string;
  version: string;
  date: string | null;
  summary: string | null;
  sections: Record<string, string[]>;
}

export interface Stats {
  counts: Partial<Record<EntryType, number>>;
  tokens: Tokens;
  commit: string | null;
  builtAt: string;
}

export interface Catalog {
  index: CatalogIndex;
  releases: Release[];
  stats: Stats;
}
