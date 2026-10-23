#!/usr/bin/env node
// PreToolUse guard for everyone except the spec-creator agent.
//
//   Write → a NEW spec file in a spec folder is blocked: specs are written by
//           sdd-engineering:spec-creator, which adds the gap analysis, the
//           EARS criteria and the open questions a hand-written spec lacks.
//
// Edits, existing files and README.md indexes pass. Exit 2 blocks.
import { existsSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { firedIn, projectRoot, readHookInput, specFolders } from './lib/project.mjs';

const input = await readHookInput();
if (firedIn(input, 'spec-creator') || input.tool_name !== 'Write') process.exit(0);

const path = input.tool_input?.file_path;
if (typeof path !== 'string' || !path.endsWith('.md')) process.exit(0);

const root = projectRoot();
const abs = resolve(root, path);
const rel = relative(root, abs).split('\\').join('/');
if (basename(rel) === 'README.md' || existsSync(abs)) process.exit(0);
if (!specFolders(root).includes(dirname(rel))) process.exit(0);

console.error(
  `New specs are written by the sdd-engineering:spec-creator agent, not directly. ` +
    `Dispatch it (Agent, subagent_type "sdd-engineering:spec-creator") with the user's brief ` +
    `and relay the open questions it returns. Blocked: ${rel}`,
);
process.exit(2);
