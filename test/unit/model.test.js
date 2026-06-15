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
  resetAll,
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

test('resetAll clears every annotation', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('h1'), 'a');
  s = addComment(s, anchorOf('button'), 'b');
  s = resetAll(s);
  assert.equal(liveCount(s), 0);
});

test('orderedEntries returns entries by their order index', () => {
  let s = createState('page');
  s = addComment(s, anchorOf('button'), 'second', 5);
  s = addComment(s, anchorOf('h1'), 'first', 1);
  const order = orderedEntries(s).map((e) => e.order);
  assert.deepEqual(order, [1, 5]);
});
