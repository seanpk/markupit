import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture, sameNode } from '../helpers/load-dom.js';
import { makeAnchor, deriveId, resolveAnchor } from '../../assets/overlay/core/ids.js';

function freshDoc() {
  return loadFixture('static-site/index.html').document;
}

test('[SEL-7] the same element yields the same id across reloads of the same page', () => {
  const a = makeAnchor(freshDoc().querySelector('#plans h2'));
  const b = makeAnchor(freshDoc().querySelector('#plans h2'));
  assert.equal(a.id, b.id);
  assert.equal(a.structuralPath, b.structuralPath);
  assert.equal(a.textHash, b.textHash);
});

test('[SEL-7] distinct elements get distinct ids', () => {
  const doc = freshDoc();
  const ids = ['h1', '#plans h2', 'button', 'figure img'].map((s) =>
    deriveId(doc.querySelector(s))
  );
  assert.equal(new Set(ids).size, ids.length);
});

test('[SEL-7] an authored id anchors directly and survives a structural move', () => {
  const doc = freshDoc();
  const hero = doc.querySelector('#hero');
  const anchor = makeAnchor(hero);
  assert.equal(anchor.id, '#hero');
  assert.equal(anchor.authorId, 'hero');

  // Move hero so its structural path changes; id resolution must still find it.
  const main = doc.querySelector('main');
  main.appendChild(hero);
  sameNode(resolveAnchor(anchor, doc), hero);
});

test('[SEL-7] exact re-anchoring on an unchanged document returns the same element', () => {
  const doc = freshDoc();
  const h1 = doc.querySelector('h1');
  const anchor = makeAnchor(h1);
  sameNode(resolveAnchor(anchor, doc), h1);
});

test('[SEL-7] re-anchoring recovers via fingerprint when structure shifts', () => {
  const doc = freshDoc();
  const h2 = doc.querySelector('#plans h2');
  const anchor = makeAnchor(h2);

  // Insert a new section before #plans so nth-of-type indices shift.
  const main = doc.querySelector('main');
  const intruder = doc.createElement('section');
  intruder.innerHTML = '<h2>Intruder</h2>';
  main.insertBefore(intruder, main.firstChild);

  const resolved = resolveAnchor(anchor, doc);
  sameNode(resolved, h2, 'fuzzy fingerprint match recovers the original heading');
});

test('[SEL-7] a removed element resolves to null (orphan, never mis-matched)', () => {
  const doc = freshDoc();
  const img = doc.querySelector('figure img');
  const anchor = makeAnchor(img);
  img.parentNode.removeChild(img);
  assert.ok(resolveAnchor(anchor, doc) === null, 'removed element resolves to null');
});
