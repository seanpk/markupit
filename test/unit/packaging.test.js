import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

test('[NFR-1] ships as an npm package with zero runtime dependencies', () => {
  const deps = Object.keys(pkg.dependencies ?? {});
  assert.deepEqual(deps, [], `runtime dependencies must be empty, found: ${deps.join(', ')}`);
  assert.equal(pkg.type, 'module', 'package must be pure ESM');
});

test('[CLI-1] exposes a markupit bin for npx', () => {
  assert.ok(pkg.bin && pkg.bin.markupit, 'package.json must declare a markupit bin');
  assert.match(pkg.bin.markupit, /bin\/markupit\.js$/);
});
