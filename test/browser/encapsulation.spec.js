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

test('[UX-10] a hostile page stylesheet does not bleed into overlay chrome', async ({ page }) => {
  // hostile.html sets `* { color: red !important; font-family: Comic Sans … }`.
  await page.goto(`${server.origin}/hostile.html?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });

  const styles = await shadow(page).evaluate((el) => {
    const pill = el.shadowRoot.querySelector('.mk-toolbar');
    const cs = getComputedStyle(pill);
    return { color: cs.color, font: cs.fontFamily };
  });
  // The pill text is white on ink, in the system font — not red, not Comic Sans.
  expect(styles.color).not.toBe('rgb(255, 0, 0)');
  expect(styles.font.toLowerCase()).not.toContain('comic sans');
});

test('[UX-10] overlay styles do not leak onto the page', async ({ page }) => {
  await page.goto(`${server.origin}/hostile.html?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  // The page h1 keeps the page's own color (hostile red), proving our CSS didn't apply
  // its ink color to page content.
  const h1Color = await page.locator('h1').evaluate((el) => getComputedStyle(el).color);
  expect(h1Color).toBe('rgb(255, 0, 0)');
});

test('[SEL-5] overlay chrome is not itself selectable as page content', async ({ page }) => {
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  // Click the toolbar pill (chrome). It must open the queue, NOT create an annotation
  // popover targeting our own chrome.
  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-toolbar').click());
  const queueOpen = await shadow(page).evaluate((el) =>
    el.shadowRoot.querySelector('.mk-queue').classList.contains('mk-open')
  );
  expect(queueOpen).toBe(true);
  const popover = await shadow(page).evaluate((el) => !!el.shadowRoot.querySelector('.mk-popover'));
  expect(popover).toBe(false);
});

test('[UX-5] reduced motion collapses transition durations to zero', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  // The queue panel slides via `transition: transform var(--mk-dur)`.
  const dur = await shadow(page).evaluate((el) => {
    const q = el.shadowRoot.querySelector('.mk-queue');
    return getComputedStyle(q).transitionDuration;
  });
  // --mk-dur is overridden to 0ms under reduced motion (UX-5).
  expect(['0s', '0ms']).toContain(dur);
  await ctx.close();
});
