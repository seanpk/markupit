// The anchored action popover (ANN-1, ANN-2, ANN-6). It grows from the click point and
// offers Comment / Edit / Remove for the selected element, opening a focused textarea for
// comment and edit. It is presentational: it calls back into the app for every state
// change and is re-opened with fresh data after each one.
import { placePopover, clampBox } from '../dom/geometry.js';
import { labelFor } from '../core/label.js';

// Two columns of dots — a "grab here" affordance on the title bar (ANN-11).
const GRIP_ICON = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/><circle cx="6" cy="8" r="1.3"/><circle cx="10" cy="8" r="1.3"/><circle cx="6" cy="12" r="1.3"/><circle cx="10" cy="12" r="1.3"/></svg>`;

export function createPopover(root, tracker) {
  let el = null;
  let lastPoint = null;
  let ctx = null; // { element, entry, anchor, callbacks }
  let mode = 'actions';
  // Absolute {left, top} once the reviewer drags the popover; null = auto-place at the anchor.
  let draggedPos = null;

  function close() {
    if (el) {
      el.remove();
      el = null;
    }
    ctx = null;
  }

  function isOpen() {
    return !!el;
  }

  // Live text the reviewer currently sees on the element (the basis for an edit).
  function currentText(element, entry) {
    if (entry && entry.edit) return entry.edit.next;
    return (element.textContent || '').trim();
  }

  function render(m) {
    mode = m === 'actions' ? 'actions' : m;
    el.textContent = '';

    // Title bar doubles as the drag handle (ANN-11): a grip affordance + the element label.
    const head = document.createElement('div');
    head.className = 'mk-pop-head mk-drag';
    const grip = document.createElement('span');
    grip.className = 'mk-grip';
    grip.innerHTML = GRIP_ICON;
    const label = document.createElement('span');
    label.className = 'mk-label';
    label.textContent = labelFor(ctx.anchor);
    head.append(grip, label);
    el.appendChild(head);

    if (mode === 'comment') return renderTextMode('comment');
    if (mode === 'edit') return renderTextMode('edit');
    renderActions();
  }

  function renderActions() {
    const row = document.createElement('div');
    row.className = 'mk-actions';
    const e = ctx.entry || {};
    row.append(
      actionBtn('Comment', 'comment', !!e.comment, () => render('comment')),
      actionBtn('Edit', 'edit', !!e.edit, () => render('edit')),
      toggleRemoveBtn(!!e.remove)
    );
    el.appendChild(row);
  }

  function actionBtn(text, kind, on, onClick) {
    const b = document.createElement('button');
    b.className = `mk-btn${on ? ' mk-on-' + kind : ''}`;
    b.textContent = on ? `${text} ✓` : text;
    b.addEventListener('click', onClick);
    return b;
  }

  function toggleRemoveBtn(on) {
    const b = document.createElement('button');
    b.className = `mk-btn${on ? ' mk-on-remove' : ''}`;
    b.textContent = on ? 'Undo remove' : 'Remove';
    b.addEventListener('click', () => {
      if (on) ctx.callbacks.undoRemove();
      else ctx.callbacks.remove();
    });
    return b;
  }

  function renderTextMode(kind) {
    const e = ctx.entry || {};
    const ta = document.createElement('textarea');
    ta.className = 'mk-textarea';
    if (kind === 'comment') {
      ta.placeholder = 'Say what you mean…';
      ta.value = e.comment ? e.comment.text : '';
    } else {
      ta.value = currentText(ctx.element, e);
    }
    el.appendChild(ta);

    const row = document.createElement('div');
    row.className = 'mk-row';

    if (kind === 'comment' && e.comment) {
      row.appendChild(textBtn('Delete', () => ctx.callbacks.removeComment()));
    }
    if (kind === 'edit' && e.edit) {
      row.appendChild(textBtn('Revert', () => ctx.callbacks.revertEdit()));
    }
    row.appendChild(textBtn('Cancel', () => render('actions')));
    row.appendChild(
      textBtn('Save', () => {
        const v = ta.value.trim();
        if (kind === 'comment') {
          if (v) ctx.callbacks.comment(v);
        } else {
          const original = e.edit ? e.edit.original : (ctx.element.textContent || '').trim();
          if (v && v !== original) ctx.callbacks.edit(original, v);
        }
      })
    );
    el.appendChild(row);

    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault();
        row.lastChild.click(); // Save
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        render('actions');
      }
    });
  }

  function textBtn(text, onClick) {
    const b = document.createElement('button');
    b.className = 'mk-btn';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function position(point) {
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    // A dragged position wins over auto-placement, so it survives re-renders (ANN-11).
    const { left, top } = draggedPos
      ? clampBox(draggedPos.left, draggedPos.top, size)
      : placePopover(point, size);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.setProperty('--mk-origin', `${point.x - left}px ${point.y - top}px`);
  }

  // Re-clamp a dragged popover when the viewport shrinks (scroll is a no-op for a fixed box).
  function reclamp() {
    if (!el || !draggedPos) return;
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    draggedPos = clampBox(draggedPos.left, draggedPos.top, size);
    el.style.left = `${draggedPos.left}px`;
    el.style.top = `${draggedPos.top}px`;
  }
  if (tracker) tracker.add(reclamp);

  // Drag the popover by its title bar (.mk-drag). Pointer Events + capture so the drag tracks
  // outside the box; preventDefault keeps a focused textarea from blurring and stops text
  // selection; stopPropagation keeps the gesture clear of page selection (dom/selection.js).
  function onPointerDown(e) {
    if (!el || !e.target.closest('.mk-drag')) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    el.setPointerCapture(e.pointerId);
    el.classList.add('mk-dragging');

    const move = (ev) => {
      const size = { width: el.offsetWidth, height: el.offsetHeight };
      draggedPos = clampBox(ev.clientX - dx, ev.clientY - dy, size);
      el.style.left = `${draggedPos.left}px`;
      el.style.top = `${draggedPos.top}px`;
    };
    const end = () => {
      el.classList.remove('mk-dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  return {
    isOpen,
    close,
    getMode: () => mode,
    getContext: () => ctx,
    /**
     * @param {{element:Element, anchor:object, entry:object|null, point:{x,y}, mode?:string,
     *          callbacks:object}} opts
     */
    open(opts) {
      const point = opts.point || lastPoint || { x: innerWidth / 2, y: innerHeight / 2 };
      lastPoint = point;
      // A fresh target re-anchors; same-element re-opens (refresh, mode switch) keep the drag.
      if (!ctx || ctx.anchor.id !== opts.anchor.id) draggedPos = null;
      if (!el) {
        el = document.createElement('div');
        el.className = 'mk-popover mk-anim';
        // Stop page-level click capture from treating popover clicks as selection.
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('pointerdown', onPointerDown);
        root.appendChild(el);
      }
      ctx = {
        element: opts.element,
        anchor: opts.anchor,
        entry: opts.entry,
        callbacks: opts.callbacks,
      };
      render(opts.mode || 'actions');
      position(point);
    },
  };
}
