import { test, expect } from '@playwright/test';
import { startServer } from './_server.js';

let server;
test.beforeAll(async () => {
  server = await startServer();
});
test.afterAll(async () => {
  await server.close();
});

test('[ACT-3] without the activation flag the page shows zero overlay chrome', async ({ page }) => {
  await page.goto(`${server.origin}/`);
  // The injected script is present but dormant; no shadow host is created.
  const host = await page.locator('[data-markupit]').count();
  expect(host).toBe(0);
});

test('[NFR-2] activating the overlay produces no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  // Give lazy imports a beat to settle.
  await page.waitForTimeout(150);

  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('[ACT-2] the overlay activates and mounts its shadow host with the flag', async ({ page }) => {
  await page.goto(`${server.origin}/?markupit`);
  const host = page.locator('[data-markupit]');
  await expect(host).toHaveCount(1);
  // Chrome lives in a shadow root, not the light DOM.
  const hasShadow = await host.evaluate((el) => !!el.shadowRoot);
  expect(hasShadow).toBe(true);
  // The idle toolbar pill is present inside the shadow root.
  const pill = await host.evaluate((el) => !!el.shadowRoot.querySelector('.mk-toolbar'));
  expect(pill).toBe(true);
});

test('[NFR-4] the page’s own script still runs when the overlay is active', async ({ page }) => {
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });
  const ready = await page.evaluate(() => window.__acmeReady);
  expect(ready).toBe(true);
});
