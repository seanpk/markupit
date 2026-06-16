import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from '../helpers/load-dom.js';
import { makeAnchor } from '../../assets/overlay/core/ids.js';
import {
  createState,
  addComment,
  setEdit,
  requestRemove,
  removeComment,
  revertEdit,
  undoRemove,
  archiveAndReset,
  deleteHistoryBatch,
  clearHistory,
  historyBatches,
  summarizeKinds,
  liveCount,
  orderedEntries,
} from '../../assets/overlay/core/model.js';

const { document } = loadFixture('static-site/index.html');
const anchorOf = (sel) => makeAnchor(document.querySelector(sel));

test('[ANN-5] a single element can carry multiple annotation kinds at once', () => {
  const a = anchorOf('h1');
  let s = createState('page');
  s = addComment(s, a, 'make it bolder');
  s = requestRemove(s, a);
  const entry = s.annotations[a.id];
  assert.ok(entry.comment, 'comment retained');
  assert.ok(entry.remove, 'remove retained');
  assert.equal(liveCount(s), 2);
});

test('[ANN-4] every action is reversible within the session', () => {
  const a = anchorOf('button');
  let s = createState('page');

  s = addComment(s, a, 'hi');
  s = setEdit(s, a, 'Start free trial', 'Start your trial');
  s = requestRemove(s, a);
  assert.equal(liveCount(s), 3);

  s = removeComment(s, a.id);
  s = revertEdit(s, a.id);
  s = undoRemove(s, a.id);
  assert.equal(liveCount(s), 0);
  assert.equal(Object.keys(s.annotations).length, 0, 'empty entry is pruned');
});

test('[ANN-2] an edit retains both the original and the requested text', () => {
  const a = anchorOf('h1');
  let s = createState('page');
  s = setEdit(s, a, 'Simple, honest pricing', 'Pricing that scales');
  assert.deepEqual(s.annotations[a.id].edit, {
    original: 'Simple, honest pricing',
    next: 'Pricing that scales',
  });
});

test('transitions are pure — the input state is not mutated', () => {
  const a = anchorOf('h1');
  const s0 = createState('page');
  const s1 = addComment(s0, a, 'x');
  assert.equal(Object.keys(s0.annotations).length, 0);
  assert.equal(Object.keys(s1.annotations).length, 1);
});

test('[QUE-6] archiveAndReset clears the live set but keeps it as a history batch', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('h1'), 'a');
  s = setEdit(s, anchorOf('button'), 'Start free trial', 'Start your trial');
  const before = s;
  s = archiveAndReset(s, { id: 'b1', at: 1000, pageTitle: 'T', pageUrl: 'U' });

  assert.equal(liveCount(s), 0, 'live set is cleared');
  assert.equal(s.history.length, 1, 'one batch archived');
  const batch = s.history[0];
  assert.equal(batch.id, 'b1');
  assert.equal(batch.at, 1000);
  assert.equal(batch.pageTitle, 'T');
  assert.equal(batch.pageUrl, 'U');
  assert.equal(summarizeKinds(batch.annotations).total, 2, 'both notes preserved in the batch');

  // purity: the input state is untouched
  assert.equal(liveCount(before), 2);
  assert.equal(before.history.length, 0);
});

test('archiveAndReset on an empty live set archives nothing', () => {
  let s = createState('page');
  s = archiveAndReset(s, { id: 'b1', at: 1000 });
  assert.equal(s.history.length, 0);
});

test('deleteHistoryBatch removes one batch; clearHistory empties all', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('h1'), 'a');
  s = archiveAndReset(s, { id: 'b1', at: 1000 });
  s = addComment(s, anchorOf('button'), 'b');
  s = archiveAndReset(s, { id: 'b2', at: 2000 });
  assert.equal(s.history.length, 2);

  s = deleteHistoryBatch(s, 'b1');
  assert.deepEqual(
    s.history.map((b) => b.id),
    ['b2']
  );

  s = clearHistory(s);
  assert.equal(s.history.length, 0);
});

test('historyBatches lists batches newest-first', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('h1'), 'a');
  s = archiveAndReset(s, { id: 'old', at: 1000 });
  s = addComment(s, anchorOf('button'), 'b');
  s = archiveAndReset(s, { id: 'new', at: 2000 });
  assert.deepEqual(
    historyBatches(s).map((b) => b.id),
    ['new', 'old']
  );
});

test('summarizeKinds counts each kind and total; liveCount matches', () => {
  let s = createState('page');
  const a = anchorOf('h1');
  s = addComment(s, a, 'hi');
  s = requestRemove(s, a);
  s = setEdit(s, anchorOf('button'), 'Start free trial', 'Start your trial');
  const c = summarizeKinds(s.annotations);
  assert.deepEqual(c, { comment: 1, edit: 1, remove: 1, total: 3 });
  assert.equal(liveCount(s), c.total);
});

test('orderedEntries returns entries by their order index', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('button'), 'second', 5);
  s = addComment(s, anchorOf('h1'), 'first', 1);
  const order = orderedEntries(s).map((e) => e.order);
  assert.deepEqual(order, [1, 5]);
});
