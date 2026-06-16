import { test, expect } from '@playwright/test';
import { startServer } from './_server.js';

let server;
test.beforeAll(async () => {
  server = await startServer();
});
test.afterAll(async () => {
  await server.close();
});

// Helper: the shadow root of the overlay host.
const shadow = (page) => page.locator('[data-markupit]');

async function activate(page) {
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
}

test('[SEL-1] hovering an element draws a selection highlight', async ({ page }) => {
  await activate(page);
  await page.hover('h1');
  // Read the inline opacity (set synchronously); computed style would be mid-transition.
  const opacity = await shadow(page).evaluate((el) => {
    const r = el.shadowRoot.querySelector('.mk-rect.mk-hover');
    return r ? r.style.opacity : '0';
  });
  expect(opacity).toBe('1');
});

test('[SEL-2] clicking an element opens the anchored action popover', async ({ page }) => {
  await activate(page);
  await page.click('h1');
  const open = await shadow(page).evaluate((el) => !!el.shadowRoot.querySelector('.mk-popover'));
  expect(open).toBe(true);
});

test('[ANN-1] a comment can be added and shows on the element’s dot', async ({ page }) => {
  await activate(page);
  await page.click('h1');
  const root = shadow(page);
  // Click "Comment", type, save.
  await root.evaluate((el) => {
    const btn = [...el.shadowRoot.querySelectorAll('.mk-btn')].find(
      (b) => b.textContent === 'Comment'
    );
    btn.click();
  });
  await root.evaluate((el) => {
    el.shadowRoot.querySelector('.mk-textarea').value = 'Make this bolder';
  });
  await root.evaluate((el) => {
    const save = [...el.shadowRoot.querySelectorAll('.mk-btn')].find(
      (b) => b.textContent === 'Save'
    );
    save.click();
  });
  const dots = await root.evaluate(
    (el) => el.shadowRoot.querySelectorAll('.mk-dot.mk-k-comment').length
  );
  expect(dots).toBe(1);
});

test('[ANN-3] removing an element applies a visible treatment without deleting it', async ({
  page,
}) => {
  await activate(page);
  await page.click('button');
  await shadow(page).evaluate((el) => {
    const btn = [...el.shadowRoot.querySelectorAll('.mk-btn')].find(
      (b) => b.textContent === 'Remove'
    );
    btn.click();
  });
  // The page element still exists, but carries the removal treatment.
  const removed = await page.locator('button[data-mk-removed]').count();
  expect(removed).toBe(1);
  const stillThere = await page.locator('button').count();
  expect(stillThere).toBeGreaterThan(0);
});

async function addComment(page, selector, text) {
  await page.click(selector);
  await page.evaluate((value) => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
    root.querySelector('.mk-textarea').value = value;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Save').click();
  }, text);
}

test('[ANN-7] annotations persist across a reload and are re-anchored', async ({ page }) => {
  await activate(page);
  await addComment(page, 'h1', 'Persisted note');

  // Let the debounced persistence flush before reloading.
  await page.waitForTimeout(250);
  await page.reload();
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  await page.waitForTimeout(100);
  const dotsAfter = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelectorAll('.mk-dot').length
  );
  expect(dotsAfter).toBe(1);
});

// Playwright only supports the clipboard-read/write permission names in Chromium.
test('[EXP-1] copy notes puts a markdown brief on the clipboard', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await activate(page);
  await addComment(page, 'h1', 'Persisted note');

  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-toolbar').click());
  await shadow(page).evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('.mk-btn')]
      .find((b) => b.textContent === 'Copy notes')
      .click()
  );
  await page.waitForTimeout(100);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('Review notes');
  expect(clip).toContain('Persisted note');
});
