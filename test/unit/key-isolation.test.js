import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../helpers/load-dom.js';
import { createShadow, isEditable } from '../../assets/overlay/ui/shadow.js';

// createShadow() needs a global `document`; point it at a linkedom one.
function setup() {
  const { document, window } = parse('<!doctype html><html><body><p id="page">x</p></body></html>');
  globalThis.document = document;
  globalThis.CSSStyleSheet = undefined;
  const { host, root } = createShadow();
  const ta = document.createElement('textarea');
  root.appendChild(ta);
  const btn = document.createElement('button');
  root.appendChild(btn);
  return { document, window, host, root, ta, btn };
}

// linkedom does not retarget events across a shadow boundary, so dispatch on the host and
// stub composedPath() to report where the key originally came from (what a browser does).
function keydownFrom(window, host, origin) {
  const ev = new window.Event('keydown', { bubbles: true, composed: true, cancelable: true });
  ev.composedPath = () => [origin, host];
  host.dispatchEvent(ev);
  return ev;
}

test('[UX-12] isEditable recognises textarea, input and contenteditable only', () => {
  const { document } = parse('<body></body>');
  assert.equal(isEditable(document.createElement('textarea')), true);
  assert.equal(isEditable(document.createElement('input')), true);
  // linkedom has no layout/editing model, so use a minimal stand-in for contenteditable.
  assert.equal(isEditable({ nodeType: 1, tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditable(document.createElement('div')), false);
  assert.equal(isEditable(null), false);
});

test('[UX-12] keys from a shadow textarea do not reach document listeners', () => {
  const { document, window, host, ta } = setup();
  let seen = 0;
  document.addEventListener('keydown', () => seen++);
  const ev = keydownFrom(window, host, ta);
  assert.equal(seen, 0);
  assert.equal(ev.defaultPrevented, false);
});

test('[UX-12] keys from non-editable nodes still reach document listeners', () => {
  const { document, window, host, btn } = setup();
  let seen = 0;
  document.addEventListener('keydown', () => seen++);
  keydownFrom(window, host, btn);
  assert.equal(seen, 1);
});
