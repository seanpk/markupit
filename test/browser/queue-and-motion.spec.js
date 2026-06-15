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

// Add an annotation of a given kind to the currently-clicked element.
async function annotate(page, selector, kind, text) {
  await page.click(selector);
  await page.evaluate(
    ({ kind, text }) => {
      const root = document.querySelector('[data-markupit]').shadowRoot;
      const label = kind === 'remove' ? 'Remove' : kind === 'edit' ? 'Edit' : 'Comment';
      [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === label).click();
      if (kind !== 'remove') {
        root.querySelector('.mk-textarea').value = text;
        [...root.querySelectorAll('.mk-btn')].find((b) => b.textContent === 'Save').click();
      }
    },
    { kind, text }
  );
  // Dismiss the popover so it can't overlap the next target element.
  await page.keyboard.press('Escape');
}

test('[QUE-1] the queue lists every annotation in the session', async ({ page }) => {
  await activate(page);
  await annotate(page, 'h1', 'comment', 'Heading note');
  await annotate(page, 'button', 'comment', 'CTA note');

  await shadow(page).evaluate((el) => el.shadowRoot.querySelector('.mk-toolbar').click());
  const entries = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelectorAll('.mk-entry').length
  );
  expect(entries).toBe(2);

  // Each entry shows a human label, not a selector (QUE-2).
  const firstLabel = await shadow(page).evaluate(
    (el) => el.shadowRoot.querySelector('.mk-entry-label').textContent
  );
  expect(firstLabel).toContain('Heading');
  expect(firstLabel).not.toContain('nth-of-type');
});

test('[UX-3] comment, edit, and remove each get a distinct visual treatment', async ({ page }) => {
  await activate(page);
  await annotate(page, 'h1', 'comment', 'c');
  await annotate(page, 'p.promo', 'edit', 'New promo text');
  await annotate(page, 'button', 'remove');

  const colors = await shadow(page).evaluate((el) => {
    const root = el.shadowRoot;
    const dotColor = (k) => {
      const d = root.querySelector(`.mk-dot.mk-k-${k}`);
      return d ? getComputedStyle(d).backgroundColor : null;
    };
    return { comment: dotColor('comment'), edit: dotColor('edit'), remove: dotColor('remove') };
  });
  // All three present and mutually distinct.
  expect(colors.comment).toBeTruthy();
  expect(colors.edit).toBeTruthy();
  expect(colors.remove).toBeTruthy();
  expect(new Set([colors.comment, colors.edit, colors.remove]).size).toBe(3);

  // The removed element carries a line-through (target the page button by its mark).
  const removeDeco = await page
    .locator('button[data-mk-removed]')
    .evaluate((el) => el.style.textDecoration);
  expect(removeDeco).toContain('line-through');
});

test('[UX-4] motion is present by default (popover animates, queue transitions)', async ({
  page,
}) => {
  await activate(page);
  await page.click('h1');
  const anim = await shadow(page).evaluate((el) => {
    const pop = el.shadowRoot.querySelector('.mk-popover');
    const cs = getComputedStyle(pop);
    return { name: cs.animationName, dur: cs.animationDuration };
  });
  expect(anim.name).toBe('mk-grow');
  expect(anim.dur).not.toBe('0s');

  const queueDur = await shadow(page).evaluate(
    (el) => getComputedStyle(el.shadowRoot.querySelector('.mk-queue')).transitionDuration
  );
  expect(queueDur).not.toBe('0s');
});
