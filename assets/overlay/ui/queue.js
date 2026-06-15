// The queue / overview panel (QUE-1..4). Lists every annotation in document order with a
// human label and its kinds, scrolls to an element on click, and hosts Export + Reset.
import { orderedEntries, liveCount } from '../core/model.js';
import { labelFor } from '../core/label.js';

const KIND_LABEL = { comment: 'comment', edit: 'edit', remove: 'remove' };

export function createQueue(root, handlers) {
  const panel = document.createElement('div');
  panel.className = 'mk-queue';
  panel.innerHTML = `
    <div class="mk-queue-head">
      <span class="mk-queue-title">Review notes</span>
      <button class="mk-btn mk-close" aria-label="Close">Close</button>
    </div>
    <div class="mk-queue-list"></div>
    <div class="mk-queue-foot">
      <button class="mk-btn mk-export">Copy notes</button>
      <button class="mk-btn mk-reset">Reset</button>
    </div>`;
  root.appendChild(panel);

  const list = panel.querySelector('.mk-queue-list');
  panel.querySelector('.mk-close').addEventListener('click', () => handlers.onClose());
  panel.querySelector('.mk-export').addEventListener('click', () => handlers.onExport());
  panel.querySelector('.mk-reset').addEventListener('click', () => handlers.onReset());

  function render(state) {
    list.textContent = '';
    const entries = orderedEntries(state);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mk-queue-empty';
      empty.textContent = 'Nothing marked yet. Click an element on the page to start.';
      list.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      list.appendChild(renderEntry(entry));
    }
  }

  function renderEntry(entry) {
    const row = document.createElement('div');
    row.className = 'mk-entry';
    row.tabIndex = 0;

    const label = document.createElement('div');
    label.className = 'mk-entry-label';
    label.textContent = labelFor(entry.anchor);
    row.appendChild(label);

    const kinds = document.createElement('div');
    kinds.className = 'mk-entry-kinds';
    for (const kind of ['comment', 'edit', 'remove']) {
      if (!entry[kind]) continue;
      const chip = document.createElement('span');
      chip.className = `mk-chip mk-k-${kind}`;
      chip.textContent = KIND_LABEL[kind];
      kinds.appendChild(chip);
    }
    row.appendChild(kinds);

    if (entry.orphaned) {
      const orphan = document.createElement('div');
      orphan.className = 'mk-entry-orphan';
      orphan.textContent = '⚠ couldn’t re-locate on this page';
      row.appendChild(orphan);
    }

    const activate = () => handlers.onSelectEntry(entry.anchor.id);
    row.addEventListener('click', activate);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    return row;
  }

  return {
    render,
    open() {
      panel.classList.add('mk-open');
    },
    close() {
      panel.classList.remove('mk-open');
    },
    toggle() {
      panel.classList.toggle('mk-open');
    },
    isOpen: () => panel.classList.contains('mk-open'),
    count: (state) => liveCount(state),
  };
}
