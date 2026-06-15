// In-page annotation treatments and the on-page dots (QUE-5). Edit and remove are the only
// two cases where we touch a page element directly, and we do it with inline styles we
// fully own, recording enough to revert exactly (ANN-2, ANN-3, ANN-4). Hover/selection
// never touch the page (those are drawn in the shadow layer).
import { EDITED_ATTR, REMOVED_ATTR } from '../constants.js';
import { rectOf } from '../dom/geometry.js';

const EDIT_STYLE =
  'text-decoration: underline; text-decoration-color: #2f6df0; text-decoration-thickness: 2px;';
const REMOVE_STYLE = 'text-decoration: line-through; opacity: 0.45;';

export function applyEdit(el, nextText) {
  if (!el) return;
  el.textContent = nextText;
  el.setAttribute(EDITED_ATTR, '');
  el.style.cssText += EDIT_STYLE;
}

export function revertEditTreatment(el, originalText) {
  if (!el) return;
  el.textContent = originalText;
  el.removeAttribute(EDITED_ATTR);
  el.style.textDecoration = '';
  el.style.textDecorationColor = '';
  el.style.textDecorationThickness = '';
}

export function applyRemove(el) {
  if (!el) return;
  el.setAttribute(REMOVED_ATTR, '');
  el.style.cssText += REMOVE_STYLE;
}

export function revertRemoveTreatment(el) {
  if (!el) return;
  el.removeAttribute(REMOVED_ATTR);
  el.style.textDecoration = '';
  el.style.opacity = '';
}

// A small dot per annotated element, coloured by its most salient kind, positioned at the
// element's top-left corner. Clicking a dot re-opens that element's actions.
export function createDots(root, tracker, onDotClick) {
  const layer = document.createElement('div');
  layer.className = 'mk-layer';
  layer.style.zIndex = '2';
  root.appendChild(layer);

  let items = []; // { id, el, kind }

  function kindOf(entry) {
    if (entry.comment) return 'comment';
    if (entry.edit) return 'edit';
    return 'remove';
  }

  function reposition() {
    for (const it of items) {
      if (!it.el || !it.el.isConnected) {
        it.dot.style.opacity = '0';
        continue;
      }
      const r = rectOf(it.el);
      it.dot.style.opacity = '1';
      it.dot.style.left = `${r.left}px`;
      it.dot.style.top = `${r.top}px`;
    }
  }

  tracker.add(reposition);

  return {
    render(state, elements) {
      layer.textContent = '';
      items = [];
      for (const [id, entry] of Object.entries(state.annotations)) {
        const el = elements.get(id);
        if (!el) continue;
        const kind = kindOf(entry);
        const dot = document.createElement('div');
        dot.className = `mk-dot mk-k-${kind}`;
        dot.title = 'View annotation';
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          onDotClick(id);
        });
        layer.appendChild(dot);
        items.push({ id, el, dot, kind });
      }
      reposition();
    },
  };
}
