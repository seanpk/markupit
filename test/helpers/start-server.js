// Boots a real markupit server on an ephemeral port for integration tests, and a
// throwaway "remote origin" server for (future) proxy-mode tests. Both use only
// node:http + global fetch, so the test suite stays zero-dependency too.
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export function fixturePath(rel) {
  return join(fixturesDir, rel);
}

// Starts markupit's own server against a resolved source config and returns
// { origin, port, close }. Imports the real factory lazily so this helper can be
// loaded before the server module exists during early milestones.
export async function startMarkupit(config) {
  const { createServer } = await import('../../src/server/index.js');
  const server = createServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

// A minimal mock remote origin for proxy-mode tests (used in a later release). It serves
// the given body with deliberately hostile headers so CSP/X-Frame-Options stripping is
// observable.
export async function startMockRemote({ body, headers = {}, status = 200 } = {}) {
  const server = http.createServer((req, res) => {
    res.writeHead(status, {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'self'",
      'x-frame-options': 'DENY',
      ...headers,
    });
    res.end(body ?? '<!doctype html><html><body><h1>remote</h1></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
