// The overlay orchestrator. Holds the session state, wires page selection to the UI,
// applies/reverts in-page treatments, persists, and renders. All state changes go through
// the pure model; this layer is the "conductor" that turns gestures into transitions and
// transitions into pixels.
import * as model from './core/model.js';
import { makeAnchor } from './core/ids.js';
import { textSnippet } from './core/snippet.js';
import { widen } from './core/selectable.js';
import { toMarkdown } from './core/export.js';
import { load, save } from './dom/persistence.js';
import { resolveAll } from './dom/anchor.js';
import { createTracker, scrollIntoViewCentered, rectOf } from './dom/geometry.js';
import { createSelection } from './dom/selection.js';
import { createShadow } from './ui/shadow.js';
import { createHighlight } from './ui/highlight.js';
import { createPopover } from './ui/popover.js';
import { createQueue } from './ui/queue.js';
import { createToolbar } from './ui/toolbar.js';
import { createToast } from './ui/toast.js';
import { createConfirm } from './ui/confirm.js';
import { createHint } from './ui/hint.js';
import {
  createDots,
  applyEdit,
  revertEditTreatment,
  applyRemove,
  revertRemoveTreatment,
} from './ui/markers.js';

function isVisibleBrowser(el) {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// Document-order index, used so the export reads top-to-bottom (EXP-4).
function documentOrder(el) {
  const all = document.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) if (all[i] === el) return i;
  return Number.MAX_SAFE_INTEGER;
}

export function boot() {
  let state = load();
  const { root } = createShadow();
  const tracker = createTracker();

  const highlight = createHighlight(root, tracker);
  const popover = createPopover(root, tracker);
  const toast = createToast(root);
  const confirm = createConfirm(root);
  const hint = createHint(root);
  const dots = createDots(root, tracker, (id) => locate(id));
  const queue = createQueue(root, {
    onSelectEntry: (id) => locate(id),
    onExport: () => doExport(),
    onReset: () => doReset(),
    onClose: () => queue.close(),
    onCopyHistory: (id) => doCopyHistory(id),
    onDeleteHistory: (id) => doDeleteHistory(id),
    onClearHistory: () => doClearHistory(),
  });
  const toolbar = createToolbar(root, () => queue.toggle());

  // Re-anchor everything persisted; flag anything we couldn't find as orphaned (ANN-7).
  const { elements, orphans } = resolveAll(state);
  for (const id of Object.keys(state.annotations)) {
    state = model.markOrphaned(state, id, orphans.includes(id));
  }
  applyAllTreatments();
  save(state, { immediate: true });

  const selection = createSelection({
    host: root.host, // ShadowRoot.host — used to ignore clicks/hovers on our own chrome
    isVisible: isVisibleBrowser,
    onHover: (el) => highlight.setHover(el),
    onSelect: (el, point) => openForSelection(el, point),
  });
  selection.enable();

  installKeyboard();
  render();
  hint.maybeShow();

  // --- rendering ---
  function render() {
    toolbar.render(model.liveCount(state));
    queue.render(state);
    dots.render(state, elements);
  }

  function commit(next) {
    state = next;
    save(state);
    render();
  }

  function applyAllTreatments() {
    for (const [id, entry] of Object.entries(state.annotations)) {
      const el = elements.get(id);
      if (!el) continue;
      if (entry.edit) applyEdit(el, entry.edit.next);
      if (entry.remove) applyRemove(el);
    }
  }

  // True while the popover is in a text-entry mode (comment/edit) with unsaved input.
  function isComposing() {
    const m = popover.getMode();
    return m === 'comment' || m === 'edit';
  }

  // --- opening the action popover ---
  function openForSelection(el, point) {
    // While composing a comment or edit, a stray click on the page must not swap the
    // popover or discard in-progress text (ANN-10).
    if (popover.isOpen() && isComposing()) return;
    const anchor = makeAnchor(el, textSnippet(el));
    highlight.setSelected(el);
    popover.open({
      element: el,
      anchor,
      entry: state.annotations[anchor.id] || null,
      point,
      mode: 'actions',
      callbacks: callbacksFor(el, anchor),
    });
  }

  function openForEntry(id, mode = 'actions') {
    const entry = state.annotations[id];
    const el = elements.get(id);
    if (!entry || !el) return;
    const r = rectOf(el);
    const point = { x: r.left + Math.min(r.width, 40), y: r.top + Math.min(r.height, 20) };
    highlight.setSelected(el);
    popover.open({
      element: el,
      anchor: entry.anchor,
      entry,
      point,
      mode,
      callbacks: callbacksFor(el, entry.anchor),
    });
  }

  function refresh(el, anchor) {
    // Re-render chrome and re-open the popover (if open) so action states update.
    if (state.annotations[anchor.id]) elements.set(anchor.id, el);
    render();
    if (popover.isOpen()) {
      popover.open({
        element: el,
        anchor,
        entry: state.annotations[anchor.id] || null,
        point: null,
        mode: 'actions',
        callbacks: callbacksFor(el, anchor),
      });
    }
  }

  function callbacksFor(el, anchor) {
    const order = documentOrder(el);
    return {
      comment(text) {
        commit(model.addComment(state, anchor, text, order));
        refresh(el, anchor);
        toast('Comment added');
      },
      edit(original, next) {
        commit(model.setEdit(state, anchor, original, next, order));
        applyEdit(el, next);
        refresh(el, anchor);
        toast('Edit noted');
      },
      remove() {
        commit(model.requestRemove(state, anchor, order));
        applyRemove(el);
        refresh(el, anchor);
        toast('Marked for removal');
      },
      undoRemove() {
        revertRemoveTreatment(el);
        commit(model.undoRemove(state, anchor.id));
        refresh(el, anchor);
      },
      removeComment() {
        commit(model.removeComment(state, anchor.id));
        refresh(el, anchor);
      },
      revertEdit() {
        const entry = state.annotations[anchor.id];
        if (entry && entry.edit) revertEditTreatment(el, entry.edit.original);
        commit(model.revertEdit(state, anchor.id));
        refresh(el, anchor);
      },
    };
  }

  // --- queue / dot navigation ---
  function locate(id) {
    const el = elements.get(id);
    if (!el) {
      toast('Couldn’t find this element on the page');
      return;
    }
    queue.close();
    scrollIntoViewCentered(el);
    requestAnimationFrame(() => openForEntry(id));
  }

  // --- export / reset ---
  async function doExport() {
    const md = toMarkdown(state, { pageUrl: location.href, pageTitle: document.title });
    const ok = await copyText(md);
    toast(ok ? 'Copied notes to clipboard' : 'Copy failed — select and copy manually');
  }

  async function doReset() {
    if (model.liveCount(state) === 0) return;
    const choice = await confirm(
      'Clear all annotations for this page\nand reset for a new review?',
      {
        confirmText: 'Reset',
        cancelText: 'Cancel',
        extraText: 'Copy notes and Clear',
        danger: true,
      }
    );
    if (choice === 'cancel') return;

    let copied = null;
    if (choice === 'extra') {
      const md = toMarkdown(state, { pageUrl: location.href, pageTitle: document.title });
      copied = await copyText(md);
    }
    archiveAndClear();
    if (choice === 'extra') {
      toast(copied ? 'Copied notes — cleared (kept in history)' : 'Copy failed — cleared (kept in history)');
    } else {
      toast('Cleared — kept in history');
    }
  }

  // Revert in-page treatments and archive the live set into history (shared by Reset and
  // Copy-and-Clear). The notes are never discarded — they move into history.
  function archiveAndClear() {
    for (const [id, entry] of Object.entries(state.annotations)) {
      const el = elements.get(id);
      if (!el) continue;
      if (entry.edit) revertEditTreatment(el, entry.edit.original);
      if (entry.remove) revertRemoveTreatment(el);
    }
    elements.clear();
    const at = Date.now();
    state = model.archiveAndReset(state, {
      id: `${at}-${state.revision}`,
      at,
      pageTitle: document.title,
      pageUrl: location.href,
    });
    save(state, { immediate: true });
    popover.close();
    highlight.clear();
    render();
  }

  // --- history ---
  async function doCopyHistory(id) {
    const batch = (state.history || []).find((b) => b.id === id);
    if (!batch) return;
    const md = toMarkdown(
      { annotations: batch.annotations },
      { pageUrl: batch.pageUrl, pageTitle: batch.pageTitle }
    );
    const ok = await copyText(md);
    toast(ok ? 'Copied notes to clipboard' : 'Copy failed — select and copy manually');
  }

  async function doDeleteHistory(id) {
    const choice = await confirm('Delete this history entry?\nThis can’t be undone.', {
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (choice !== 'confirm') return;
    state = model.deleteHistoryBatch(state, id);
    save(state, { immediate: true });
    render();
    toast('History entry deleted');
  }

  async function doClearHistory() {
    if (!(state.history || []).length) return;
    const choice = await confirm('Clear all history?\nThis can’t be undone.', {
      confirmText: 'Clear history',
      cancelText: 'Cancel',
      danger: true,
    });
    if (choice !== 'confirm') return;
    state = model.clearHistory(state);
    save(state, { immediate: true });
    render();
    toast('History cleared');
  }

  // --- keyboard (UX-7) ---
  function installKeyboard() {
    addEventListener(
      'keydown',
      (e) => {
        // Export shortcut works anywhere.
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          doExport();
          return;
        }
        // Let typing flow when our textarea is focused.
        const ae = root.activeElement;
        if (ae && ae.tagName === 'TEXTAREA') return;

        if (e.key === 'Escape') {
          popover.close();
          highlight.clear();
          selection.setCurrent(null);
          return;
        }
        if (e.key === '?') {
          queue.toggle();
          return;
        }

        const current = selection.getCurrent();
        if (!current) return;

        if (e.key === '[' || e.key === ']') {
          const dir = e.key === '[' ? 'parent' : 'child';
          const next = widen(current, dir, { isVisible: isVisibleBrowser });
          if (next) {
            selection.setCurrent(next);
            openForSelection(next, centerOf(next));
          }
          return;
        }
        if (popover.getMode() === 'actions') {
          if (e.key === 'c') bumpMode('comment', current);
          else if (e.key === 'e') bumpMode('edit', current);
          else if (e.key === 'r') quickRemove(current);
        }
      },
      true
    );
  }

  function bumpMode(mode, el) {
    const target = el || (popover.getContext() && popover.getContext().element);
    if (!target) return;
    const anchor = makeAnchor(target, textSnippet(target));
    popover.open({
      element: target,
      anchor,
      entry: state.annotations[anchor.id] || null,
      point: centerOf(target),
      mode,
      callbacks: callbacksFor(target, anchor),
    });
  }

  function quickRemove(el) {
    const anchor = makeAnchor(el, textSnippet(el));
    callbacksFor(el, anchor).remove();
    openForSelection(el, centerOf(el));
  }

  function centerOf(el) {
    const r = rectOf(el);
    return { x: r.left + Math.min(r.width, 40), y: r.top + Math.min(r.height, 20) };
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
