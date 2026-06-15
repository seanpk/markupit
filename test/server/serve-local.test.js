import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { resolveSource } from '../../src/source.js';
import { createServer } from '../../src/server/index.js';
import { listenWithFallback } from '../../src/server/net.js';
import { startMarkupit, fixturePath } from '../helpers/start-server.js';
import { RESERVED_PREFIX } from '../../src/constants.js';

async function dirServer() {
  return startMarkupit(await resolveSource(fixturePath('static-site')));
}

test('[SRC-1] directory mode serves index.html at /', async () => {
  const srv = await dirServer();
  try {
    const res = await fetch(`${srv.origin}/`);
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(body, /Simple, honest pricing/);
  } finally {
    await srv.close();
  }
});

test('[SRC-1] directory mode serves nested files and correct MIME', async () => {
  const srv = await dirServer();
  try {
    const css = await fetch(`${srv.origin}/styles.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);

    const png = await fetch(`${srv.origin}/team.png`);
    assert.equal(png.status, 200);
    assert.equal(png.headers.get('content-type'), 'image/png');

    const missing = await fetch(`${srv.origin}/does-not-exist.html`);
    assert.equal(missing.status, 404);
  } finally {
    await srv.close();
  }
});

test('[SRC-2] single-file mode serves that file at /', async () => {
  const srv = await startMarkupit(await resolveSource(fixturePath('single.html')));
  try {
    const res = await fetch(`${srv.origin}/`);
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.match(body, /One self-contained page/);
  } finally {
    await srv.close();
  }
});

test('[SRC-6] all responses carry no-store cache headers', async () => {
  const srv = await dirServer();
  try {
    const res = await fetch(`${srv.origin}/`);
    assert.match(res.headers.get('cache-control'), /no-store/);
  } finally {
    await srv.close();
  }
});

test('[SRC-8] reserved namespace serves overlay assets and is never shadowed by page files', async () => {
  const srv = await dirServer();
  try {
    const res = await fetch(`${srv.origin}${RESERVED_PREFIX}main.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /javascript/);
    // A page does not get to define content under the reserved prefix: even a path that
    // looks like a page file resolves through the overlay handler (404 from overlay dir),
    // not the static page root.
    const collide = await fetch(`${srv.origin}${RESERVED_PREFIX}index.html`);
    assert.equal(collide.status, 404);
  } finally {
    await srv.close();
  }
});

test('path traversal outside the root is rejected', async () => {
  const srv = await dirServer();
  try {
    const res = await fetch(`${srv.origin}/../../package.json`);
    // Either normalized away to a 404 or blocked; never 200 with package.json.
    assert.notEqual(res.status, 200);
  } finally {
    await srv.close();
  }
});

test('[CLI-6] binds to loopback by default', async () => {
  const srv = await dirServer();
  try {
    assert.match(srv.origin, /^http:\/\/127\.0\.0\.1:/);
  } finally {
    await srv.close();
  }
});

test('[CLI-5] port fallback picks the next free port when one is taken', async () => {
  // Occupy a port, then ask markupit for it; it should land on a different one.
  const blocker = net.createServer();
  await new Promise((r) => blocker.listen(0, '127.0.0.1', r));
  const taken = blocker.address().port;
  try {
    const server = createServer(await resolveSource(fixturePath('static-site')));
    const got = await listenWithFallback(server, { host: '127.0.0.1', port: taken });
    assert.notEqual(got, taken);
    await new Promise((r) => server.close(r));
  } finally {
    await new Promise((r) => blocker.close(r));
  }
});

test('[CLI-8] server releases its port on close (no orphan)', async () => {
  const srv = await dirServer();
  const { port } = srv;
  await srv.close();
  // If the port was released, we can immediately bind it again.
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((r) => probe.close(r));
});
