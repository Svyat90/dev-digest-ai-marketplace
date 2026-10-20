#!/usr/bin/env node
// PostToolUse hook for the spec-creator agent: lint every spec file right after
// Write/Edit. Lint errors go back to the agent (exit 2) so it fixes them.
// Runs for every Write/Edit in the session; acts only inside spec-creator.
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firedIn, projectRoot, readHookInput } from './lib/project.mjs';

const input = await readHookInput();
if (!firedIn(input, 'spec-creator')) process.exit(0);

const filePath = input.tool_input?.file_path;
if (typeof filePath !== 'string') process.exit(0);
if (!/^\d{2}-.+-\d{4}-\d{2}-\d{2}\.md$/.test(basename(filePath))) process.exit(0);

const root = projectRoot();
const lint = join(dirname(fileURLToPath(import.meta.url)), 'lint-spec.mjs');
const run = spawnSync('node', [lint, resolve(root, filePath)], { cwd: root, encoding: 'utf8' });
if (run.status === 0) process.exit(0);

console.error(`lint-spec failed — fix these before reporting:\n${run.stdout}${run.stderr}`);
process.exit(2);
