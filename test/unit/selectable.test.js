import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixture, inlineIsVisible, sameNode } from '../helpers/load-dom.js';
import { isSelectable, candidateAt, widen } from '../../assets/overlay/core/selectable.js';

const { document } = loadFixture('static-site/index.html');
const opts = { isVisible: inlineIsVisible };
const q = (sel) => document.querySelector(sel);

test('[SEL-3] any visible content element is targetable, not a fixed whitelist', () => {
  for (const sel of [
    'h1',
    'p',
    'button',
    'img',
    'li',
    'figure',
    'nav',
    'header',
    'footer',
    'section',
  ]) {
    assert.equal(isSelectable(q(sel), opts), true, `${sel} should be selectable`);
  }
});

test('[SEL-6] non-content nodes are excluded', () => {
  assert.equal(isSelectable(q('script'), opts), false);
  assert.equal(isSelectable(q('style'), opts), false);
  assert.equal(isSelectable(q('template'), opts), false);
  assert.equal(isSelectable(q('title'), opts), false);
});

test('[SEL-6] hidden (display:none) elements are excluded', () => {
  const hidden = q('div[style*="display"]');
  assert.ok(hidden, 'fixture has a display:none div');
  assert.equal(isSelectable(hidden, opts), false);
});

test('[SEL-5] overlay chrome (data-mk-chrome) is never selectable', () => {
  const el = q('button');
  el.setAttribute('data-mk-chrome', '');
  assert.equal(isSelectable(el, opts), false);
  el.removeAttribute('data-mk-chrome');
});

test('[SEL-2] candidateAt resolves a text node up to its content element', () => {
  const h1 = q('h1');
  const textNode = h1.firstChild; // the text "Simple, honest pricing"
  sameNode(candidateAt(textNode), h1);
});

test('[SEL-4] widen moves to parent and back down to a child', () => {
  const h1 = q('h1');
  const parent = widen(h1, 'parent', opts);
  assert.equal(parent.tagName.toLowerCase(), 'section');
  const child = widen(parent, 'child', opts);
  assert.ok(child, 'a selectable child exists');
});
