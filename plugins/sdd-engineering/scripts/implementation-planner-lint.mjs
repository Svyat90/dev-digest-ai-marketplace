#!/usr/bin/env node
// PostToolUse hook for the implementation-planner agent: lint every plan file
// right after Write. Lint errors go back to the agent (exit 2) so it fixes them.
// Runs for every Write in the session; acts only inside implementation-planner.
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firedIn, projectRoot, readHookInput } from './lib/project.mjs';

const input = await readHookInput();
if (!firedIn(input, 'implementation-planner')) process.exit(0);

const filePath = input.tool_input?.file_path;
if (typeof filePath !== 'string') process.exit(0);

const root = projectRoot();
const abs = resolve(root, filePath);
const rel = relative(root, abs).split('\\').join('/');
if (!/^docs\/plans\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(rel)) process.exit(0);

const lint = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'run-plan', 'scripts', 'lint-plan.mjs');
const run = spawnSync('node', [lint, abs], { cwd: root, encoding: 'utf8' });
if (run.status === 0) process.exit(0);

console.error(`lint-plan failed — fix these before reporting:\n${run.stdout}${run.stderr}`);
process.exit(2);
