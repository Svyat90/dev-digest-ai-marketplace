#!/usr/bin/env node
// PreToolUse hook: blocks force-push to protected branches.
// Reads the hook payload from stdin; exit code 2 blocks the tool call
// and sends stderr back to Claude.

const PROTECTED = ['main', 'master'];

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = JSON.parse(input)?.tool_input?.command ?? '';
  } catch {
    process.exit(0);
  }

  const isPush = /\bgit\s+push\b/.test(command);
  const isForce = /\s(--force(-with-lease)?|-f)\b/.test(command);
  const hitsProtected = PROTECTED.some((b) => new RegExp(`\\b${b}\\b`).test(command));

  if (isPush && isForce && hitsProtected) {
    process.stderr.write(
      `Blocked by engineering-paved-path: force-push to ${PROTECTED.join('/')} is not allowed. ` +
        'Push to a feature branch and open a pull request instead.\n',
    );
    process.exit(2);
  }
  process.exit(0);
});
