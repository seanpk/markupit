#!/usr/bin/env node
// Portable test discovery. `node --test` glob-string support landed in Node 21, and bare
// directory args are interpreted inconsistently across versions, so neither works on the
// whole Node 20/22/24 matrix. This walks a directory for *.test.js and passes explicit
// files to the runner — which every supported version (and every OS) handles identically.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: run-node-tests.mjs <dir>');
  process.exit(2);
}

function walk(d) {
  const out = [];
  for (const name of readdirSync(d)) {
    const full = join(d, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.test\.js$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(dir);
if (files.length === 0) {
  console.error(`no *.test.js files found under ${dir}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
