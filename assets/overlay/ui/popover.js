// The anchored action popover (ANN-1, ANN-2, ANN-6). It grows from the click point and
// offers Comment / Edit / Remove for the selected element, opening a focused textarea for
// comment and edit. It is presentational: it calls back into the app for every state
// change and is re-opened with fresh data after each one.
import { placePopover } from '../dom/geometry.js';
import { labelFor } from '../core/label.js';

export function createPopover(root) {
  let el = null;
  let lastPoint = null;
  let ctx = null; // { element, entry, anchor, callbacks }
  let mode = 'actions';

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

    const label = document.createElement('p');
    label.className = 'mk-label';
    label.textContent = labelFor(ctx.anchor);
    el.appendChild(label);

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
    const { left, top } = placePopover(point, size);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.setProperty('--mk-origin', `${point.x - left}px ${point.y - top}px`);
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
      if (!el) {
        el = document.createElement('div');
        el.className = 'mk-popover mk-anim';
        // Stop page-level click capture from treating popover clicks as selection.
        el.addEventListener('click', (e) => e.stopPropagation());
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
