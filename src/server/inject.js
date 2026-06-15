// PURE overlay injection (ACT-1, ACT-4). Given an HTML string, insert the overlay's
// module script before the closing </body>, touching nothing else. Idempotent: a
// document that already carries the injection marker is returned unchanged, so
// re-serving never doubles the overlay.
//
// The overlay is injected into EVERY served HTML document but stays dormant until the
// page URL carries the activation flag (the overlay self-gates). This keeps the served
// bytes identical for a given path regardless of activation, which makes idempotency and
// no-store behavior trivial to reason about (ACT-2, ACT-3, ACT-5).
import { RESERVED_PREFIX, INJECTION_MARKER } from '../constants.js';

/**
 * @param {string} html
 * @param {object} [opts]
 * @param {string} [opts.assetBase]  base URL for overlay assets (default reserved prefix).
 *   In proxy mode this must be the fully-qualified local origin so a page <base> tag can't
 *   redirect overlay assets to the remote host.
 * @returns {string}
 */
export function injectOverlay(html, { assetBase = RESERVED_PREFIX } = {}) {
  if (typeof html !== 'string') return html;
  if (html.includes(INJECTION_MARKER)) return html; // already injected (ACT-4)

  const tag = `<script type="module" src="${assetBase}main.js" ${INJECTION_MARKER}></script>`;

  // Insert before the LAST </body>, matched case-insensitively but spliced into the
  // original string so the document's own casing/markup is preserved (ACT-1).
  const idx = lastIndexOfCaseInsensitive(html, '</body>');
  if (idx === -1) {
    // Malformed or fragment HTML: append so the overlay still loads.
    return html + '\n' + tag + '\n';
  }
  return html.slice(0, idx) + tag + '\n' + html.slice(idx);
}

function lastIndexOfCaseInsensitive(haystack, needle) {
  return haystack.toLowerCase().lastIndexOf(needle.toLowerCase());
}
