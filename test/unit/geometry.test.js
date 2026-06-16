import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampBox } from '../../assets/overlay/dom/geometry.js';

// clampBox reads the global viewport size; stub it for a deterministic 1000x800 viewport.
globalThis.innerWidth = 1000;
globalThis.innerHeight = 800;

test('[ANN-11] clampBox leaves an in-bounds box untouched', () => {
  assert.deepEqual(clampBox(100, 120, { width: 240, height: 160 }), { left: 100, top: 120 });
});

test('[ANN-11] clampBox pulls a box back inside the right/bottom edges', () => {
  // 1000 - 240 - 8 = 752 ; 800 - 160 - 8 = 632
  assert.deepEqual(clampBox(5000, 5000, { width: 240, height: 160 }), { left: 752, top: 632 });
});

test('[ANN-11] clampBox respects the top/left margin', () => {
  assert.deepEqual(clampBox(-50, -50, { width: 240, height: 160 }), { left: 8, top: 8 });
});

test('[ANN-11] clampBox pins an oversize box to the margin rather than going negative', () => {
  // A box wider/taller than the viewport: maxLeft/maxTop floor at the margin (8).
  assert.deepEqual(clampBox(500, 500, { width: 2000, height: 2000 }), { left: 8, top: 8 });
});
