// Hover + selection highlight rectangles, drawn inside the shadow root so we never touch
// the page's own styles (the page stays byte-for-byte original when the tool is off). The
// rectangles are fixed-position and re-tracked on scroll/resize.
import { rectOf } from '../dom/geometry.js';

export function createHighlight(root, tracker) {
  const layer = document.createElement('div');
  layer.className = 'mk-layer';
  const hover = rect('mk-hover');
  const selected = rect('mk-selected');
  layer.append(hover, selected);
  root.appendChild(layer);

  let hoverEl = null;
  let selectedEl = null;

  function rect(kind) {
    const el = document.createElement('div');
    el.className = `mk-rect ${kind}`;
    el.style.opacity = '0';
    return el;
  }

  function place(box, el) {
    if (!el || !el.isConnected) {
      box.style.opacity = '0';
      return;
    }
    const r = rectOf(el);
    if (r.width === 0 && r.height === 0) {
      box.style.opacity = '0';
      return;
    }
    box.style.top = `${r.top}px`;
    box.style.left = `${r.left}px`;
    box.style.width = `${r.width}px`;
    box.style.height = `${r.height}px`;
    box.style.opacity = '1';
  }

  function reposition() {
    place(hover, hoverEl);
    place(selected, selectedEl);
  }

  tracker.add(reposition);

  return {
    setHover(el) {
      // Don't draw a hover ring on the already-selected element.
      hoverEl = el === selectedEl ? null : el;
      place(hover, hoverEl);
    },
    setSelected(el) {
      selectedEl = el;
      place(selected, selectedEl);
      if (el) {
        hoverEl = null;
        place(hover, null);
      }
    },
    clear() {
      hoverEl = null;
      selectedEl = null;
      hover.style.opacity = '0';
      selected.style.opacity = '0';
    },
  };
}
