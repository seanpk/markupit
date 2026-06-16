// Proxy URL mode is deferred to a later release (tracked in #2). Until then, requesting a
// URL source serves a clear, friendly notice rather than failing obscurely (CLI surfaces
// the same note at startup). The full implementation will fetch the remote page
// server-side, rewrite relative assets, and strip CSP / X-Frame-Options (SRC-3,4,5,7).
const NO_STORE = {
  'cache-control': 'no-store, must-revalidate',
  pragma: 'no-cache',
  expires: '0',
};

export function proxyNotAvailable(res, source) {
  const url = source?.url ?? '';
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>markupit — proxy mode coming soon</title>
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; color: #1b2a3b; max-width: 32rem; margin: 12vh auto; padding: 0 1.5rem; }
      code { background: #eef2f6; padding: 0.1em 0.35em; border-radius: 4px; }
      .muted { color: #7b8fa0; }
    </style>
  </head>
  <body>
    <h1>Proxy mode is coming soon</h1>
    <p>markupit can't yet review a live URL${url ? ` (<code>${escapeHtml(url)}</code>)` : ''}.</p>
    <p>For now, point it at a local folder or an <code>.html</code> file:</p>
    <p><code>npx markupit ./dist</code></p>
    <p class="muted">Live-page proxying (fetch, asset rewriting, header stripping) lands in a later release.</p>
  </body>
</html>`;
  const buf = Buffer.from(html);
  res.writeHead(501, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': buf.length,
    ...NO_STORE,
  });
  res.end(buf);
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
}
