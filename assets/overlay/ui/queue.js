// The queue / overview panel (QUE-1..4). Lists every annotation in document order with a
// human label and its kinds, scrolls to an element on click, and hosts Export + Reset.
import { orderedEntries, liveCount, historyBatches, summarizeKinds } from '../core/model.js';
import { labelFor } from '../core/label.js';

const KIND_LABEL = { comment: 'comment', edit: 'edit', remove: 'remove' };

// Inline trash-can icon (stroked, inherits currentColor) for the delete-history control.
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;

// "3 notes (2 comments, 1 edit)" — a compact description of an archived batch.
function summaryText(annotations) {
  const c = summarizeKinds(annotations);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const parts = [];
  if (c.comment) parts.push(plural(c.comment, 'comment'));
  if (c.edit) parts.push(plural(c.edit, 'edit'));
  if (c.remove) parts.push(plural(c.remove, 'remove'));
  const detail = parts.length ? ` (${parts.join(', ')})` : '';
  return `${plural(c.total, 'note')}${detail}`;
}

function formatTime(at) {
  try {
    return new Date(at).toLocaleString();
  } catch {
    return '';
  }
}

export function createQueue(root, handlers) {
  const panel = document.createElement('div');
  panel.className = 'mk-queue';
  panel.innerHTML = `
    <div class="mk-queue-head">
      <span class="mk-queue-title">Review notes</span>
      <button class="mk-btn mk-close" aria-label="Close">Close</button>
    </div>
    <div class="mk-queue-list"></div>
    <div class="mk-queue-history" hidden>
      <button class="mk-history-toggle" aria-expanded="false">History</button>
      <div class="mk-history-list" hidden></div>
    </div>
    <div class="mk-queue-foot">
      <button class="mk-btn mk-export">Copy notes</button>
      <button class="mk-btn mk-reset">Reset</button>
    </div>`;
  root.appendChild(panel);

  const list = panel.querySelector('.mk-queue-list');
  const historySection = panel.querySelector('.mk-queue-history');
  const historyToggle = panel.querySelector('.mk-history-toggle');
  const historyList = panel.querySelector('.mk-history-list');
  panel.querySelector('.mk-close').addEventListener('click', () => handlers.onClose());
  panel.querySelector('.mk-export').addEventListener('click', () => handlers.onExport());
  panel.querySelector('.mk-reset').addEventListener('click', () => handlers.onReset());
  historyToggle.addEventListener('click', () => {
    const expanded = historyToggle.getAttribute('aria-expanded') === 'true';
    historyToggle.setAttribute('aria-expanded', String(!expanded));
    historyList.hidden = expanded;
  });

  function render(state) {
    list.textContent = '';
    const entries = orderedEntries(state);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mk-queue-empty';
      empty.textContent = 'Nothing marked yet. Click an element on the page to start.';
      list.appendChild(empty);
    } else {
      for (const entry of entries) {
        list.appendChild(renderEntry(entry));
      }
    }
    renderHistory(state);
  }

  function renderHistory(state) {
    const batches = historyBatches(state);
    historySection.hidden = batches.length === 0;
    historyToggle.textContent = `History (${batches.length})`;
    historyList.textContent = '';
    if (batches.length === 0) return;
    for (const batch of batches) {
      historyList.appendChild(renderHistoryItem(batch));
    }
    const clear = document.createElement('button');
    clear.className = 'mk-btn mk-history-clear';
    clear.textContent = 'Clear history';
    clear.addEventListener('click', () => handlers.onClearHistory());
    historyList.appendChild(clear);
  }

  function renderHistoryItem(batch) {
    const item = document.createElement('div');
    item.className = 'mk-history-item';

    const meta = document.createElement('div');
    meta.className = 'mk-history-meta';
    const time = document.createElement('span');
    time.className = 'mk-history-time';
    time.textContent = formatTime(batch.at);
    const summary = document.createElement('span');
    summary.className = 'mk-history-summary';
    summary.textContent = summaryText(batch.annotations);
    meta.append(time, summary);
    item.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'mk-history-actions';
    const copy = document.createElement('button');
    copy.className = 'mk-btn mk-history-copy';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => handlers.onCopyHistory(batch.id));
    const del = document.createElement('button');
    del.className = 'mk-btn mk-history-del';
    del.setAttribute('aria-label', 'Delete history entry');
    del.title = 'Delete history entry';
    del.innerHTML = TRASH_ICON;
    del.addEventListener('click', () => handlers.onDeleteHistory(batch.id));
    actions.append(copy, del);
    item.appendChild(actions);

    return item;
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
