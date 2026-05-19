#!/usr/bin/env node
/**
 * Build + run all TheSteamerZone automated tests (unit + connector integration).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('=== build shared ===');
run('npm', ['run', 'build:shared']);

console.log('=== build connector ===');
run('npm', ['run', 'build:connector']);

console.log('=== unit tests ===');
run('node', ['--test', 'tests/unit/shared.test.mjs', 'tests/unit/gifts.test.mjs']);

console.log('=== integration (connector API) ===');
run('node', ['--test', 'tests/integration/connector-api.test.mjs']);

console.log('=== build web ===');
run('npm', ['run', 'build:web']);

console.log('\n✅ TheSteamerZone local tests passed\n');
