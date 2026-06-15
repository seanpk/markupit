import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture } from '../helpers/load-dom.js';
import { makeAnchor } from '../../assets/overlay/core/ids.js';
import { textSnippet } from '../../assets/overlay/core/snippet.js';
import { labelFor } from '../../assets/overlay/core/label.js';
import {
  createState,
  addComment,
  setEdit,
  requestRemove,
  revertEdit,
} from '../../assets/overlay/core/model.js';
import { toMarkdown, toJSON, exportItems } from '../../assets/overlay/core/export.js';

const { document } = loadFixture('static-site/index.html');
const anchorOf = (sel) =>
  makeAnchor(document.querySelector(sel), textSnippet(document.querySelector(sel)));

function sampleState() {
  let s = createState('page');
  // Out of document order on purpose to prove export re-sorts (EXP-4).
  s = requestRemove(s, anchorOf('figure img'), 30);
  s = setEdit(s, anchorOf('h1'), 'Simple, honest pricing', 'Pricing that scales', 10);
  s = addComment(s, anchorOf('button'), 'Make this the primary CTA.', 20);
  return s;
}

test('[QUE-2] labelFor gives a human noun + snippet, never a selector', () => {
  assert.equal(labelFor(anchorOf('h1')), 'Heading — "Simple, honest pricing"');
  assert.match(labelFor(anchorOf('button')), /^Button — /);
  assert.doesNotMatch(labelFor(anchorOf('h1')), /nth-of-type/);
});

test('[EXP-4] items are emitted in document order', () => {
  const items = exportItems(sampleState());
  const order = items.map((i) => i.anchor.tag);
  assert.deepEqual(order, ['h1', 'button', 'img']);
});

test('[EXP-3] each item carries kind, a stable anchor, and the reviewer intent', () => {
  const md = toMarkdown(sampleState(), { pageUrl: 'http://x/', pageTitle: 'Pricing' });
  // kind labels
  assert.match(md, /## 1\. Edit text — Heading/);
  assert.match(md, /## 2\. Comment — Button/);
  assert.match(md, /## 3\. Remove — Image/);
  // anchor detail (id + tag + selector + snippet)
  assert.match(md, /- anchor: `[^`]+`/);
  assert.match(md, /- tag: `h1`/);
  assert.match(md, /- selector: `[^`]*h1[^`]*`/);
  // intent
  assert.match(md, /from: "Simple, honest pricing"/);
  assert.match(md, /to:\s+"Pricing that scales"/);
  assert.match(md, /comment: Make this the primary CTA\./);
  assert.match(md, /request: remove this element\./);
});

test('[EXP-2][EXP-5] export is readable markdown with a framing header', () => {
  const md = toMarkdown(sampleState(), { pageUrl: 'http://x/', pageTitle: 'Pricing' });
  assert.match(md, /^# Review notes for "Pricing" \(http:\/\/x\/\)/);
  assert.match(md, /top-to-bottom order/);
});

test('[EXP-6] reverted actions never appear in the export', () => {
  let s = sampleState();
  s = revertEdit(s, anchorOf('h1').id);
  const md = toMarkdown(s);
  assert.doesNotMatch(md, /Edit text/);
  assert.doesNotMatch(md, /Pricing that scales/);
  // The other two remain.
  assert.match(md, /Comment — Button/);
  assert.match(md, /Remove — Image/);
});

test('[EXP-7] raw JSON export mirrors the items', () => {
  const json = JSON.parse(toJSON(sampleState(), { pageUrl: 'http://x/' }));
  assert.equal(json.items.length, 3);
  assert.equal(json.items[0].kind, 'edit');
  assert.ok(json.items[0].anchor.id);
});

test('empty state still produces a valid, readable brief', () => {
  const md = toMarkdown(createState('page'));
  assert.match(md, /No annotations yet/);
});
