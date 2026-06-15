import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectOverlay } from '../../src/server/inject.js';
import { RESERVED_PREFIX, INJECTION_MARKER } from '../../src/constants.js';

const countTags = (html) => html.split(INJECTION_MARKER).length - 1;

test('[ACT-1] injects the overlay module script before </body>', () => {
  const out = injectOverlay('<html><body><h1>hi</h1></body></html>');
  assert.match(out, /<script type="module" src="\/__markupit__\/main\.js"/);
  // The tag sits immediately before the closing body tag.
  assert.match(out, /<\/script>\s*<\/body>/);
  assert.ok(out.includes(RESERVED_PREFIX));
});

test('[ACT-1] preserves the rest of the document untouched', () => {
  const src = '<!doctype html><HTML><Body class="x"><p>keep me</p></Body></HTML>';
  const out = injectOverlay(src);
  assert.ok(out.includes('<p>keep me</p>'));
  assert.ok(out.includes('class="x"'));
  // Original closing tag casing preserved.
  assert.ok(out.includes('</Body>'));
});

test('[ACT-4] injection is idempotent — re-injecting does not double the overlay', () => {
  const once = injectOverlay('<html><body></body></html>');
  const twice = injectOverlay(once);
  assert.equal(countTags(twice), 1);
  assert.equal(once, twice);
});

test('[ACT-1] inserts before the LAST </body> when more than one appears in text', () => {
  // A literal "</body>" inside text plus the real one: inject before the last.
  const src = '<html><body><pre>&lt;/body&gt;</pre></body></html>';
  const out = injectOverlay(src);
  assert.equal(countTags(out), 1);
  assert.match(out, /<\/script>\s*<\/body><\/html>$/);
});

test('appends the overlay when there is no body tag (fragment)', () => {
  const out = injectOverlay('<div>fragment</div>');
  assert.equal(countTags(out), 1);
});

test('a custom assetBase is honored (proxy mode uses a fully-qualified origin)', () => {
  const out = injectOverlay('<body></body>', { assetBase: 'http://127.0.0.1:9/__markupit__/' });
  assert.match(out, /src="http:\/\/127\.0\.0\.1:9\/__markupit__\/main\.js"/);
});
