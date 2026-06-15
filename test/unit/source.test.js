import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isUrlSource, resolveSource, describeSource } from '../../src/source.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

test('[CLI-3] http(s) sources classify as proxy mode', () => {
  assert.equal(isUrlSource('https://example.com'), true);
  assert.equal(isUrlSource('http://localhost:3000/x'), true);
  assert.equal(isUrlSource('./dist'), false);
  assert.equal(isUrlSource('/var/www'), false);
});

test('[CLI-2] a directory resolves to dir mode', async () => {
  const s = await resolveSource(join(fixtures, 'static-site'));
  assert.equal(s.kind, 'dir');
  assert.equal(s.root, join(fixtures, 'static-site'));
});

test('[CLI-2] a single .html file resolves to file mode rooted at its dir', async () => {
  const s = await resolveSource(join(fixtures, 'single.html'));
  assert.equal(s.kind, 'file');
  assert.equal(s.file, 'single.html');
  assert.equal(s.root, fixtures);
});

test('a missing source throws a clear error', async () => {
  await assert.rejects(() => resolveSource(join(fixtures, 'nope')), /not found/i);
});

test('[CLI-4] describeSource produces a human banner label per mode', () => {
  assert.match(describeSource({ kind: 'dir', root: '/a' }), /local dir/);
  assert.match(describeSource({ kind: 'file', file: 'x.html' }), /local file/);
  assert.match(describeSource({ kind: 'proxy', url: 'https://x' }), /proxy/);
});
