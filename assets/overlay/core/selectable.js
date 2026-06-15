// What is targetable for annotation (SEL-3, SEL-5, SEL-6). PURE: visibility is injected
// as a callback so this runs unchanged under linkedom (attribute heuristic) and in the
// browser (real computed-style check).

// Never content: scripts, styles, metadata, document plumbing, void formatting tags.
const EXCLUDED = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'meta',
  'link',
  'head',
  'title',
  'base',
  'html',
  'br',
  'wbr',
]);

function tagOf(node) {
  return node && node.tagName ? node.tagName.toLowerCase() : '';
}

function inHead(node) {
  let el = node;
  while (el && el.nodeType === 1) {
    if (tagOf(el) === 'head') return true;
    el = el.parentElement;
  }
  return false;
}

// Tag/structure check only — ignores visibility. Used to walk up to a candidate.
export function isContentElement(node) {
  if (!node || node.nodeType !== 1) return false;
  const tag = tagOf(node);
  if (EXCLUDED.has(tag)) return false;
  if (inHead(node)) return false;
  // The overlay's own in-page treatments (inline edit / remove marks) are flagged so
  // they are never re-selected as page content (SEL-5).
  if (node.hasAttribute && node.hasAttribute('data-mk-chrome')) return false;
  return true;
}

/**
 * Full selectability test (SEL-3, SEL-6).
 * @param {Node} node
 * @param {{isVisible?: (n:Node)=>boolean}} [opts]
 */
export function isSelectable(node, { isVisible } = {}) {
  if (!isContentElement(node)) return false;
  if (isVisible && !isVisible(node)) return false;
  return true;
}

/** Nearest content element at or above `node` (SEL-2: resolves to a real element).
 * A click can land on a text node; start from its containing element. */
export function candidateAt(node) {
  let el = node && node.nodeType === 1 ? node : node && node.parentElement;
  while (el && el.nodeType === 1) {
    if (isContentElement(el)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Widen or narrow the current selection (SEL-4).
 * @param {Element} current
 * @param {'parent'|'child'} direction
 * @param {{isVisible?: (n:Node)=>boolean}} [opts]
 */
export function widen(current, direction, opts = {}) {
  if (!current) return null;
  if (direction === 'parent') {
    let el = current.parentElement;
    while (el && el.nodeType === 1) {
      if (isSelectable(el, opts)) return el;
      el = el.parentElement;
    }
    return null;
  }
  if (direction === 'child') {
    for (const child of current.children || []) {
      if (isSelectable(child, opts)) return child;
    }
    return null;
  }
  return null;
}
