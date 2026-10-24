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
  // Stand-in for a page like Reveal.js that listens for keys on `document`.
  await page.evaluate(() => {
    window.__keys = [];
    document.addEventListener('keydown', (e) => window.__keys.push(e.key));
  });
}

const keys = (page) => page.evaluate(() => window.__keys);
const popoverOpen = (page) =>
  shadow(page).evaluate((el) => !!el.shadowRoot.querySelector('.mk-popover'));

async function openCommentBox(page) {
  await page.click('h1');
  await shadow(page).evaluate((el) => {
    [...el.shadowRoot.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
  });
  await expect(shadow(page).locator('.mk-textarea')).toBeVisible();
}

test('[UX-12] typing in the comment box does not reach page key listeners', async ({ page }) => {
  await activate(page);
  await openCommentBox(page);
  await page.keyboard.type('vnf');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  expect(await keys(page)).toEqual([]);
  // The characters still landed in the field.
  const value = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelector('.mk-textarea').value
  );
  expect(value).toBe('vnf ');
});

test('[UX-12] keys outside the overlay editor still reach the page', async ({ page }) => {
  await activate(page);
  await openCommentBox(page);
  await page.keyboard.press('Escape'); // back to actions (handled by the overlay)
  await page.keyboard.press('Escape'); // closes popover
  expect(await popoverOpen(page)).toBe(false);
  await page.evaluate(() => (window.__keys.length = 0));
  await page.keyboard.press('x');
  expect(await keys(page)).toEqual(['x']);
});

test('[UX-13] Esc with a popover open closes it and is not seen by the page', async ({ page }) => {
  await activate(page);
  await page.click('h1');
  expect(await popoverOpen(page)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await popoverOpen(page)).toBe(false);
  expect(await keys(page)).toEqual([]);
});

test('[UX-13] Esc with nothing open reaches the page', async ({ page }) => {
  await activate(page);
  await page.keyboard.press('Escape');
  expect(await keys(page)).toEqual(['Escape']);
});

test('[UX-13] ? opens the queue without reaching the page', async ({ page }) => {
  await activate(page);
  await page.keyboard.press('?');
  const open = await shadow(page).evaluate((el) =>
    el.shadowRoot.querySelector('.mk-queue').classList.contains('mk-open')
  );
  expect(open).toBe(true);
  expect(await keys(page)).toEqual([]);
  // Esc now closes the queue and is consumed.
  await page.keyboard.press('Escape');
  const stillOpen = await shadow(page).evaluate((el) =>
    el.shadowRoot.querySelector('.mk-queue').classList.contains('mk-open')
  );
  expect(stillOpen).toBe(false);
  expect(await keys(page)).toEqual([]);
});
