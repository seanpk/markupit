// The markupit dev server. A small router with no knowledge of annotations: it sources
// and serves the page, serves overlay assets from a reserved namespace, and (from
// milestone 3) injects the overlay into HTML responses.
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RESERVED_PREFIX } from '../constants.js';
import { safeJoin, serveFile } from './static.js';
import { injectOverlay } from './inject.js';
import { contentTypeFor } from './mime.js';

const overlayDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'overlay');

// Headers sent on every response so edits to local source (or a re-fetch) always show
// on a plain reload (SRC-6).
const NO_STORE = {
  'cache-control': 'no-store, must-revalidate',
  pragma: 'no-cache',
  expires: '0',
};

/**
 * @param {object} source  resolved source ({kind:'dir'|'file'|'proxy', ...})
 * @returns {http.Server}
 */
export function createServer(source) {
  return http.createServer(async (req, res) => {
    try {
      await handle(req, res, source);
    } catch (err) {
      send(
        res,
        500,
        { 'content-type': 'text/plain; charset=utf-8' },
        `markupit error: ${err.message}`
      );
    }
  });
}

async function handle(req, res, source) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(
      res,
      405,
      { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' },
      'Method Not Allowed'
    );
  }

  const pathname = (req.url || '/').split('?')[0].split('#')[0];

  // Reserved overlay namespace — checked FIRST so a reviewed page can never shadow our
  // assets (SRC-8).
  if (pathname.startsWith(RESERVED_PREFIX)) {
    return serveOverlayAsset(res, pathname);
  }

  if (source.kind === 'proxy') {
    // Proxy mode is deferred to a later release (tracked in #2; served by proxy.js stub).
    const { proxyNotAvailable } = await import('./proxy.js');
    return proxyNotAvailable(res, source);
  }

  return servePage(req, res, source, pathname);
}

async function serveOverlayAsset(res, pathname) {
  const rel = pathname.slice(RESERVED_PREFIX.length);
  const abs = safeJoin(overlayDir, '/' + rel);
  if (!abs) return notFound(res);
  try {
    const file = await serveFile(abs);
    return send(res, 200, { 'content-type': file.contentType, ...NO_STORE }, file.body);
  } catch {
    return notFound(res);
  }
}

async function servePage(req, res, source, pathname) {
  let abs;
  if (source.kind === 'file') {
    abs = pathname === '/' ? join(source.root, source.file) : safeJoin(source.root, pathname);
  } else {
    // dir mode: map "/" and any trailing-slash path to index.html.
    const target = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    abs = safeJoin(source.root, target);
  }
  if (!abs) return notFound(res);

  try {
    const file = await serveFile(abs);
    if (file.isHtml) {
      // Inject the (dormant) overlay before </body>; it self-activates on ?markupit.
      const injected = injectOverlay(file.body.toString('utf8'));
      return send(res, 200, { 'content-type': file.contentType, ...NO_STORE }, injected);
    }
    return send(res, 200, { 'content-type': file.contentType, ...NO_STORE }, file.body);
  } catch {
    return notFound(res);
  }
}

function notFound(res) {
  return send(res, 404, { 'content-type': 'text/plain; charset=utf-8', ...NO_STORE }, 'Not found');
}

function send(res, status, headers, body) {
  const buf =
    body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, { ...headers, 'content-length': buf.length });
  if (res.req.method === 'HEAD') return res.end();
  res.end(buf);
}

// Re-export so tests and the MIME table travel together if needed.
export { contentTypeFor };
