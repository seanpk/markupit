// localStorage persistence keyed to the page (ANN-7). The persisted payload is the pure
// model state verbatim — its anchor objects are designed to survive serialization, which
// is exactly what re-anchoring needs on the next load. Writes are debounced so rapid edits
// don't hammer storage.
import { pageKey } from '../constants.js';
import { createState } from '../core/model.js';

export function load() {
  try {
    const raw = localStorage.getItem(pageKey());
    if (!raw) return createState(pageKey());
    const parsed = JSON.parse(raw);
    // Basic shape guard; fall back to a fresh state if anything looks off.
    if (!parsed || typeof parsed !== 'object' || !parsed.annotations) {
      return createState(pageKey());
    }
    // Backward-compat: states saved before review-note history lack the field.
    if (!Array.isArray(parsed.history)) parsed.history = [];
    return parsed;
  } catch {
    return createState(pageKey());
  }
}

let timer = null;
export function save(state, { immediate = false } = {}) {
  const write = () => {
    try {
      localStorage.setItem(pageKey(), JSON.stringify(state));
    } catch {
      /* storage full / unavailable — local-first best effort */
    }
  };
  if (immediate) {
    if (timer) clearTimeout(timer);
    timer = null;
    return write();
  }
  if (timer) clearTimeout(timer);
  timer = setTimeout(write, 150);
}
