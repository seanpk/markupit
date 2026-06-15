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

test('[ANN-7][EXP-1] annotations persist across reload and export to the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await activate(page);

  // Add a comment to the heading.
  await page.click('h1');
  await shadow(page).evaluate((el) => {
    [...el.shadowRoot.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
  });
  await shadow(page).evaluate((el) => {
    el.shadowRoot.querySelector('.mk-textarea').value = 'Persisted note';
    [...el.shadowRoot.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Save').click();
  });

  // Let the debounced persistence flush before reloading.
  await page.waitForTimeout(250);
  // Reload — the annotation should be re-anchored and its dot restored (ANN-7).
  await page.reload();
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  await page.waitForTimeout(100);
  const dotsAfter = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelectorAll('.mk-dot').length
  );
  expect(dotsAfter).toBe(1);

  // Open the queue and export (EXP-1).
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
