import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs, UsageError } from '../../src/args.js';
import { DEFAULT_PORT, DEFAULT_HOST } from '../../src/constants.js';

test('[CLI-2] accepts a single source positional', () => {
  const opts = parseCliArgs(['./dist']);
  assert.equal(opts.source, './dist');
  assert.equal(opts.port, DEFAULT_PORT);
  assert.equal(opts.host, DEFAULT_HOST);
  assert.equal(opts.open, false);
});

test('[CLI-5] --port overrides the default and is validated', () => {
  assert.equal(parseCliArgs(['./dist', '--port', '8080']).port, 8080);
  assert.equal(parseCliArgs(['./dist', '-p', '0']).port, 0);
  assert.throws(() => parseCliArgs(['./dist', '--port', 'abc']), UsageError);
  assert.throws(() => parseCliArgs(['./dist', '--port', '99999']), UsageError);
});

test('[CLI-6] --host overrides the loopback default', () => {
  assert.equal(parseCliArgs(['./dist']).host, '127.0.0.1');
  assert.equal(parseCliArgs(['./dist', '--host', '0.0.0.0']).host, '0.0.0.0');
});

test('[CLI-7] --open flag is parsed', () => {
  assert.equal(parseCliArgs(['./dist', '--open']).open, true);
  assert.equal(parseCliArgs(['./dist', '-o']).open, true);
});

test('missing or extra source is a usage error', () => {
  assert.throws(() => parseCliArgs([]), UsageError);
  assert.throws(() => parseCliArgs(['a', 'b']), UsageError);
});

test('--help and --version short-circuit', () => {
  assert.equal(parseCliArgs(['--help']).help, true);
  assert.equal(parseCliArgs(['--version']).version, true);
});
