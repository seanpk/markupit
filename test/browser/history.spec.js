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
  // Stub the clipboard before any page script runs so copy is observable cross-browser.
  await page.addInitScript(() => {
    window.__copied = null;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (t) => {
            window.__copied = t;
            return Promise.resolve();
          },
        },
      });
    } catch {
      /* ignore — fall back to the overlay's own copy path */
    }
  });
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
}

async function addComment(page, selector, text) {
  await page.click(selector);
  await page.evaluate((text) => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
    root.querySelector('.mk-textarea').value = text;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Save').click();
  }, text);
  await page.keyboard.press('Escape');
}

const openQueue = (page) =>
  shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-toolbar').click());

const clickReset = (page) =>
  shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-reset').click());

const dialogButton = (page, sel) =>
  shadow(page).evaluate((el, s) => el.shadowRoot.querySelector(s).click(), sel);

const entryCount = (page) =>
  shadow(page).evaluate((el) => el.shadowRoot.querySelectorAll('.mk-entry').length);

const historyCount = (page) =>
  shadow(page).evaluate((el) => el.shadowRoot.querySelectorAll('.mk-history-item').length);

const expandHistory = (page) =>
  shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-history-toggle').click());

test('[ANN-8][QUE-6][UX-11] Reset archives notes to history via a styled (non-native) confirm', async ({
  page,
}) => {
  // Fail loudly if the overlay ever falls back to a native confirm dialog.
  let nativeDialog = false;
  page.on('dialog', (d) => {
    nativeDialog = true;
    d.dismiss().catch(() => {});
  });

  await activate(page);
  await addComment(page, 'h1', 'Heading note');
  await openQueue(page);
  await clickReset(page);

  // A styled, in-shadow confirmation appears — not the browser dialog.
  const hasDialog = await shadow(page).evaluate(
    (el) => !!el.shadowRoot.querySelector('.mk-dialog-overlay')
  );
  expect(hasDialog).toBe(true);

  await dialogButton(page, '.mk-dialog-ok');

  expect(await entryCount(page)).toBe(0);
  expect(nativeDialog).toBe(false);

  // History now holds one batch.
  expect(await historyCount(page)).toBe(1);

  // ...and it survives a reload.
  await page.reload();
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  await openQueue(page);
  expect(await historyCount(page)).toBe(1);
});

test('[ANN-8][UX-11] cancelling the confirmation leaves notes untouched', async ({ page }) => {
  await activate(page);
  await addComment(page, 'h1', 'Heading note');
  await openQueue(page);
  await clickReset(page);
  await dialogButton(page, '.mk-dialog-cancel');

  expect(await entryCount(page)).toBe(1);
  expect(await historyCount(page)).toBe(0);
});

test('[QUE-7] a history entry copies its full notes brief', async ({ page }) => {
  await activate(page);
  await addComment(page, 'h1', 'Heading note');
  await openQueue(page);
  await clickReset(page);
  await dialogButton(page, '.mk-dialog-ok');

  await expandHistory(page);
  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-history-copy').click());

  const copied = await page.evaluate(() => window.__copied);
  expect(copied).toContain('# Review notes');
  expect(copied).toContain('Heading note');
});

test('[QUE-7] history entries can be deleted individually and cleared entirely', async ({
  page,
}) => {
  await activate(page);

  // Two clears → two history batches.
  await addComment(page, 'h1', 'First');
  await openQueue(page);
  await clickReset(page);
  await dialogButton(page, '.mk-dialog-ok');

  await addComment(page, 'button', 'Second');
  await clickReset(page);
  await dialogButton(page, '.mk-dialog-ok');

  await expandHistory(page);
  expect(await historyCount(page)).toBe(2);

  // Delete one — now guarded by a confirmation.
  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-history-del').click());
  await dialogButton(page, '.mk-dialog-ok');
  expect(await historyCount(page)).toBe(1);

  // Clear all (confirmed).
  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-history-clear').click());
  await dialogButton(page, '.mk-dialog-ok');
  expect(await historyCount(page)).toBe(0);

  // Section hides when empty.
  const hidden = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelector('.mk-queue-history').hidden
  );
  expect(hidden).toBe(true);
});

test('[QUE-7][EXP-1] "Copy notes and Clear" copies the brief and archives in one step', async ({
  page,
}) => {
  await activate(page);
  await addComment(page, 'h1', 'Heading note');
  await openQueue(page);
  await clickReset(page);
  // The third button on the reset dialog.
  await dialogButton(page, '.mk-dialog-extra');

  const copied = await page.evaluate(() => window.__copied);
  expect(copied).toContain('# Review notes');
  expect(copied).toContain('Heading note');
  expect(await entryCount(page)).toBe(0);
  expect(await historyCount(page)).toBe(1);
});

test('[QUE-7] deleting a history entry can be cancelled', async ({ page }) => {
  await activate(page);
  await addComment(page, 'h1', 'Heading note');
  await openQueue(page);
  await clickReset(page);
  await dialogButton(page, '.mk-dialog-ok');

  await expandHistory(page);
  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-history-del').click());
  await dialogButton(page, '.mk-dialog-cancel');
  expect(await historyCount(page)).toBe(1);
});

// Enter comment mode on the current selection and type (without saving).
async function startComment(page, text) {
  await page.evaluate((text) => {
    const root = document.querySelector('[data-markupit]').shadowRoot;
    [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Comment').click();
    root.querySelector('.mk-textarea').value = text;
  }, text);
}

test('[ANN-10] composing a comment is not dismissed by clicking elsewhere on the page', async ({
  page,
}) => {
  await activate(page);
  await page.click('h1');
  await startComment(page, 'work in progress');

  // A stray click on another page element must not swap or discard the popover.
  await page.click('button');

  const value = await shadow(page).evaluate((el) => {
    const ta = el.shadowRoot.querySelector('.mk-textarea');
    return ta ? ta.value : null;
  });
  expect(value).toBe('work in progress');
});

test('[ANN-9] the focused element stays highlighted while its popover is open', async ({ page }) => {
  await activate(page);
  await page.click('h1');

  // The placed (target) opacity — not the mid-transition computed value.
  const selectedShown = (page) =>
    shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-rect.mk-selected').style.opacity);

  expect(await selectedShown(page)).toBe('1');

  // ...and it persists once we enter comment mode.
  await startComment(page, 'note');
  expect(await selectedShown(page)).toBe('1');

  // A contrast ring keeps it legible on dark backgrounds (not just the ink border).
  const ring = await shadow(page).evaluate(
    (el) => getComputedStyle(el.shadowRoot.querySelector('.mk-rect.mk-selected')).boxShadow
  );
  expect(ring).not.toBe('none');
});

