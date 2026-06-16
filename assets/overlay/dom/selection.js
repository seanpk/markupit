// Hover + click handling on the page (SEL-1, SEL-2). Clicks are captured at the window
// level; while the tool is active a click on page content selects that element for
// annotation (an intentional interception — NFR-4 allows it) rather than doing nothing.
// Clicks and hovers over the overlay's own shadow host are ignored, so chrome is never
// treated as content (SEL-5).
import { candidateAt, isSelectable } from '../core/selectable.js';

export function createSelection({ host, isVisible, onHover, onSelect }) {
  let current = null;
  let enabled = false;

  const insideHost = (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    return e.target === host || path.includes(host);
  };

  const resolve = (target) => {
    const cand = candidateAt(target);
    return cand && isSelectable(cand, { isVisible }) ? cand : null;
  };

  function onMove(e) {
    if (!enabled) return;
    if (insideHost(e)) {
      current = null;
      onHover(null);
      return;
    }
    const cand = resolve(e.target);
    current = cand;
    onHover(cand);
  }

  function onClick(e) {
    if (!enabled || insideHost(e)) return;
    const cand = resolve(e.target);
    if (!cand) return;
    e.preventDefault();
    e.stopPropagation();
    current = cand;
    onSelect(cand, { x: e.clientX, y: e.clientY });
  }

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      addEventListener('mousemove', onMove, true);
      addEventListener('click', onClick, true);
    },
    disable() {
      enabled = false;
      removeEventListener('mousemove', onMove, true);
      removeEventListener('click', onClick, true);
      onHover(null);
    },
    getCurrent: () => current,
    setCurrent: (el) => {
      current = el;
      onHover(el);
    },
  };
}
