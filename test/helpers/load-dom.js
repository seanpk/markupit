// Loads a fixture HTML file into a linkedom document for the pure-logic unit tests.
// linkedom gives us a real DOM tree (tags, text, attributes, traversal) without layout
// or a JS event loop — exactly the surface the pure `core/` modules operate on (NFR-5).
//
// linkedom does NOT compute styles, so visibility checks that depend on the cascade
// (display:none via a stylesheet rule, off-screen, zero-rect) are verified in the
// Playwright layer instead. The pure modules accept an `isVisible` callback so tests
// can supply an attribute/inline-style heuristic here.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseHTML } from 'linkedom';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export function loadFixture(relPath) {
  const html = readFileSync(join(fixturesDir, relPath), 'utf8');
  return parseHTML(html);
}

export function parse(html) {
  return parseHTML(html);
}

// A pragmatic visibility heuristic for unit tests: hidden if it (or an ancestor) has an
// inline display:none / visibility:hidden, or the `hidden` attribute. Real computed-style
// visibility is a browser-layer concern.
export function inlineIsVisible(node) {
  let el = node;
  while (el && el.nodeType === 1) {
    if (el.hasAttribute && el.hasAttribute('hidden')) return false;
    const style = (el.getAttribute && el.getAttribute('style')) || '';
    if (/display\s*:\s*none/i.test(style)) return false;
    if (/visibility\s*:\s*hidden/i.test(style)) return false;
    el = el.parentElement;
  }
  return true;
}
