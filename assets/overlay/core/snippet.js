// Human-readable snippet + selector for an element (EXP-3, QUE-2). PURE.
import { normalizeText, selectorFor } from './ids.js';

const MEDIA = new Set(['img', 'svg', 'video', 'audio', 'iframe', 'canvas']);
const FIELDS = new Set(['input', 'textarea', 'select']);

/**
 * A short, meaningful description of the element's content. Prefers visible text; for
 * media and form fields, falls back to alt / aria-label / placeholder / value so the
 * snippet is never empty for non-text elements.
 */
export function textSnippet(node, max = 80) {
  const tag = (node.tagName || '').toLowerCase();
  const attr = (name) => (node.getAttribute ? node.getAttribute(name) : null);

  const text = normalizeText(node.textContent);
  if (!text) {
    if (MEDIA.has(tag)) {
      const alt = attr('alt') || attr('aria-label') || attr('title');
      if (alt) return `alt: "${truncate(normalizeText(alt), max)}"`;
      const src = attr('src');
      if (src) return src.split('/').pop();
    }
    if (FIELDS.has(tag)) {
      const label = attr('aria-label') || attr('placeholder') || attr('name') || attr('value');
      if (label) return truncate(normalizeText(label), max);
    }
    const aria = attr('aria-label') || attr('title');
    if (aria) return truncate(normalizeText(aria), max);
  }
  return truncate(text, max);
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export { selectorFor };
