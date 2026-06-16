// Annotation state model (ANN-*, EXP-6). PURE reducer: every transition returns a new
// state object, so it is trivial to test and to persist/serialize. One entry per element;
// comment / edit / remove are independent slots that coexist (ANN-5) and are each
// individually reversible (ANN-4).

export function createState(pageKey) {
  return { pageKey, annotations: {}, history: [], revision: 0, seq: 0 };
}

function clone(state) {
  return structuredClone(state);
}

function ensureEntry(s, anchor, order) {
  let entry = s.annotations[anchor.id];
  if (!entry) {
    entry = {
      anchor,
      comment: null,
      edit: null,
      remove: null,
      orphaned: false,
      order: order != null ? order : s.seq,
    };
    s.annotations[anchor.id] = entry;
    s.seq = Math.max(s.seq, entry.order) + 1;
  } else {
    entry.anchor = anchor; // refresh locator (e.g. after re-anchoring)
    if (order != null) entry.order = order;
  }
  return entry;
}

// Drop an entry once it carries no annotations.
function pruneIfEmpty(s, id) {
  const e = s.annotations[id];
  if (e && !e.comment && !e.edit && !e.remove) delete s.annotations[id];
}

// --- create / update ----------------------------------------------------------

export function addComment(state, anchor, text, order) {
  const s = clone(state);
  ensureEntry(s, anchor, order).comment = { text };
  s.revision++;
  return s;
}

export function setEdit(state, anchor, original, next, order) {
  const s = clone(state);
  ensureEntry(s, anchor, order).edit = { original, next };
  s.revision++;
  return s;
}

export function requestRemove(state, anchor, order) {
  const s = clone(state);
  ensureEntry(s, anchor, order).remove = { requested: true };
  s.revision++;
  return s;
}

// --- reverse (ANN-4) ----------------------------------------------------------

export function removeComment(state, id) {
  const s = clone(state);
  if (s.annotations[id]) {
    s.annotations[id].comment = null;
    pruneIfEmpty(s, id);
    s.revision++;
  }
  return s;
}

export function revertEdit(state, id) {
  const s = clone(state);
  if (s.annotations[id]) {
    s.annotations[id].edit = null;
    pruneIfEmpty(s, id);
    s.revision++;
  }
  return s;
}

export function undoRemove(state, id) {
  const s = clone(state);
  if (s.annotations[id]) {
    s.annotations[id].remove = null;
    pruneIfEmpty(s, id);
    s.revision++;
  }
  return s;
}

export function clearElement(state, id) {
  const s = clone(state);
  delete s.annotations[id];
  s.revision++;
  return s;
}

// Clear the live set, but keep the cleared notes as a timestamped history batch (one entry
// per clear) rather than discarding them. The model stays pure — the caller supplies `id`,
// `at`, and the page meta. An empty live set archives nothing.
export function archiveAndReset(state, { id, at, pageTitle = '', pageUrl = '' } = {}) {
  const s = clone(state);
  if (!Array.isArray(s.history)) s.history = [];
  if (Object.keys(s.annotations).length > 0) {
    s.history.push({ id, at, pageTitle, pageUrl, annotations: s.annotations });
  }
  s.annotations = {};
  s.revision++;
  return s;
}

export function deleteHistoryBatch(state, batchId) {
  const s = clone(state);
  if (Array.isArray(s.history)) {
    s.history = s.history.filter((b) => b.id !== batchId);
  }
  s.revision++;
  return s;
}

export function clearHistory(state) {
  const s = clone(state);
  s.history = [];
  s.revision++;
  return s;
}

export function markOrphaned(state, id, orphaned = true) {
  const s = clone(state);
  if (s.annotations[id]) s.annotations[id].orphaned = orphaned;
  return s;
}

// --- queries ------------------------------------------------------------------

export function orderedEntries(state) {
  return Object.values(state.annotations).sort((a, b) => a.order - b.order);
}

// History batches, newest first (QUE-6). Each batch is a snapshot of the live set at the
// moment it was cleared.
export function historyBatches(state) {
  const h = Array.isArray(state.history) ? state.history : [];
  return [...h].sort((a, b) => b.at - a.at);
}

// Count annotation kinds across a snapshot's entries. An element with a comment and a
// remove contributes to both counts (and two toward `total`).
export function summarizeKinds(annotations) {
  const counts = { comment: 0, edit: 0, remove: 0, total: 0 };
  for (const e of Object.values(annotations || {})) {
    if (e.comment) {
      counts.comment++;
      counts.total++;
    }
    if (e.edit) {
      counts.edit++;
      counts.total++;
    }
    if (e.remove) {
      counts.remove++;
      counts.total++;
    }
  }
  return counts;
}

// Total number of live annotations across all elements (QUE-4). An element with a comment
// and a remove counts as two.
export function liveCount(state) {
  return summarizeKinds(state.annotations).total;
}
