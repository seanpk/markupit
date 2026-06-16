import { test, expect } from '@playwright/test';
import { startServer } from './_server.js';

let server;
test.beforeAll(async () => {
  server = await startServer();
});
test.afterAll(async () => {
  await server.close();
});

const shadow = (page) => page.locator('[data-markupit]');

async function activate(page) {
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
}

// Open the actions popover on a page element and let its grow animation settle.
async function openPopover(page, selector) {
  await page.click(selector);
  await page.waitForTimeout(220);
}

// The popover's layout position (set via style; unaffected by the transform animation).
const popoverPos = (page) =>
  shadow(page).evaluate((el) => {
    const p = el.shadowRoot.querySelector('.mk-popover');
    return { left: parseFloat(p.style.left), top: parseFloat(p.style.top) };
  });

const headerRect = (page) =>
  shadow(page).evaluate((el) => {
    const r = el.shadowRoot.querySelector('.mk-pop-head').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

async function dragHeaderBy(page, dx, dy) {
  const h = await headerRect(page);
  const sx = h.x + h.w / 2;
  const sy = h.y + h.h / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx, sy + dy, { steps: 12 });
  await page.mouse.up();
}

const isOpen = (page) =>
  shadow(page).evaluate((el) => !!el.shadowRoot.querySelector('.mk-popover'));

test('[ANN-11] dragging the title bar moves the popover', async ({ page }) => {
  await activate(page);
  await openPopover(page, 'h1');

  const before = await popoverPos(page);
  await dragHeaderBy(page, 200, 120);
  const after = await popoverPos(page);

  expect(after.left).toBeCloseTo(before.left + 200, 0);
  expect(after.top).toBeCloseTo(before.top + 120, 0);
  expect(await isOpen(page)).toBe(true);
});

test('[ANN-11] composing text survives a drag', async ({ page }) => {
  await activate(page);
  await openPopover(page, 'h1');

  // Enter comment mode and type without saving.
  await page.evaluate(() => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
    root.querySelector('.mk-textarea').value = 'work in progress';
  });

  const before = await popoverPos(page);
  await dragHeaderBy(page, 180, 140);

  const value = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelector('.mk-textarea')?.value
  );
  const after = await popoverPos(page);

  expect(value).toBe('work in progress');
  expect(after.left).toBeCloseTo(before.left + 180, 0);
  expect(await isOpen(page)).toBe(true);
});

test('[ANN-11] the dragged position persists across a re-render', async ({ page }) => {
  await activate(page);
  await openPopover(page, 'h1');

  // Compose + drag, then save — saving re-opens the popover (a re-render path).
  await page.evaluate(() => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
    root.querySelector('.mk-textarea').value = 'note';
  });
  await dragHeaderBy(page, 160, 130);
  const dragged = await popoverPos(page);

  await page.evaluate(() => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Save').click();
  });
  await page.waitForTimeout(50);
  const afterRender = await popoverPos(page);

  expect(afterRender.left).toBeCloseTo(dragged.left, 0);
  expect(afterRender.top).toBeCloseTo(dragged.top, 0);
});

test('[ANN-11] selecting a different element re-anchors the popover', async ({ page }) => {
  await activate(page);
  await openPopover(page, 'h1');
  await dragHeaderBy(page, 250, 200);
  const dragged = await popoverPos(page);

  // A fresh selection should drop the dragged position and re-anchor.
  await openPopover(page, 'button');
  const reanchored = await popoverPos(page);

  const moved =
    Math.abs(reanchored.left - dragged.left) > 20 || Math.abs(reanchored.top - dragged.top) > 20;
  expect(moved).toBe(true);
});

test('[ANN-11] a drag past the edge stays within the viewport', async ({ page }) => {
  await activate(page);
  await openPopover(page, 'h1');
  await dragHeaderBy(page, 5000, 5000);

  const r = await shadow(page).evaluate((el) => {
    const box = el.shadowRoot.querySelector('.mk-popover').getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
  });
  const vp = page.viewportSize();
  const m = 8;
  expect(r.left).toBeGreaterThanOrEqual(m - 1);
  expect(r.top).toBeGreaterThanOrEqual(m - 1);
  expect(r.right).toBeLessThanOrEqual(vp.width - m + 1);
  expect(r.bottom).toBeLessThanOrEqual(vp.height - m + 1);
});
