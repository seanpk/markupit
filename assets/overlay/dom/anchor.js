// Bridges persisted anchors to live page elements (the DOM-bound counterpart of the pure
// resolveAnchor). On load we re-locate every annotation; anything we can't find stays in
// the session flagged orphaned (never dropped, ANN-7).
import { resolveAnchor } from '../core/ids.js';

/**
 * @param {object} state
 * @returns {{ elements: Map<string, Element>, orphans: string[] }}
 */
export function resolveAll(state) {
  const elements = new Map();
  const orphans = [];
  for (const id of Object.keys(state.annotations)) {
    const { anchor } = state.annotations[id];
    const el = resolveAnchor(anchor, document);
    if (el) elements.set(id, el);
    else orphans.push(id);
  }
  return { elements, orphans };
}
