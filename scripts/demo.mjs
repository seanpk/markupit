// Demo generator (NOT a test — excluded from the Playwright testDir). Drives the overlay
// through a short scripted review against the static-site fixture and records:
//   - docs/media/demo.webm   — the click-to-watch demo linked from the README
//   - docs/media/*.png       — stills embedded inline in the README
// Run with `npm run demo`. Re-running overwrites the files in place, so the README never
// needs editing. Uses only Playwright's Node-side APIs (locators/boundingBox/mouse) so the
// file lints under Node; the on-screen cursor is injected as a plain script string.
import { chromium } from '@playwright/test';
import { startServer } from '../test/browser/_server.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = join(ROOT, 'docs', 'media');
const VIEWPORT = { width: 1000, height: 680 };

// A soft pointer dot so the recording shows where the cursor is (Playwright renders none).
// Sits above the overlay's very high stacking context. Injected as source, never executed
// in Node, so it needs no lint globals.
const CURSOR_JS = `
  (() => {
    const dot = document.createElement('div');
    dot.id = '__demo_cursor';
    const s = dot.style;
    s.position = 'fixed'; s.left = '0'; s.top = '0'; s.width = '18px'; s.height = '18px';
    s.borderRadius = '50%'; s.border = '2px solid rgba(20,30,45,.6)';
    s.background = 'rgba(255,255,255,.45)'; s.transform = 'translate(-50%,-50%)';
    s.zIndex = '2147483647'; s.pointerEvents = 'none';
    s.transition = 'width .08s, height .08s, background .08s';
    s.boxShadow = '0 1px 5px rgba(0,0,0,.35)';
    const attach = () => (document.body ? document.body.appendChild(dot) : requestAnimationFrame(attach));
    attach();
    addEventListener('mousemove', (e) => { s.left = e.clientX + 'px'; s.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { s.width = '12px'; s.height = '12px'; s.background = 'rgba(47,109,240,.55)'; }, true);
    addEventListener('mouseup', () => { s.width = '18px'; s.height = '18px'; s.background = 'rgba(255,255,255,.45)'; }, true);
  })();
`;

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: MEDIA, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.addInitScript({ content: CURSOR_JS });
  await page.goto(`${server.origin}/?markupit`);
  await page.waitForSelector('[data-markupit]', { state: 'attached' });

  const pause = (ms) => page.waitForTimeout(ms);
  const type = (t) => page.keyboard.type(t, { delay: 35 });
  const centerOf = async (locator) => {
    const b = await locator.boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const click = async (locator) => {
    const c = await centerOf(locator);
    await page.mouse.move(c.x, c.y, { steps: 28 });
    await pause(200);
    await page.mouse.click(c.x, c.y);
  };
  const btn = (text) => page.locator('.mk-btn', { hasText: text }).first();
  const cursor = page.locator('#__demo_cursor');
  const shot = async (name) => {
    await cursor.evaluate((el) => (el.style.display = 'none')).catch(() => {});
    await page.screenshot({ path: join(MEDIA, name) });
    await cursor.evaluate((el) => (el.style.display = '')).catch(() => {});
  };
  const dragPopoverBy = async (dx, dy) => {
    const c = await centerOf(page.locator('.mk-pop-head'));
    await page.mouse.move(c.x, c.y, { steps: 18 });
    await page.mouse.down();
    await page.mouse.move(c.x + dx, c.y + dy, { steps: 30 });
    await page.mouse.up();
  };

  // Let the first-run hint show, then dismiss it for a clean stage.
  await pause(900);
  const hint = page.locator('.mk-hint button');
  if (await hint.count()) await click(hint);
  await pause(300);

  // 1) Select the headline — the anchored action popover appears.
  await click(page.locator('h1'));
  await pause(500);
  await shot('select.png');

  // 2) Leave a comment.
  await click(btn('Comment'));
  await pause(250);
  await type('Make this headline bigger and more confident');
  await pause(500);
  await shot('comment.png');
  await click(btn('Save'));
  await pause(400);
  await page.keyboard.press('Escape');
  await pause(300);

  // 3) Rewrite the promo line in place.
  await click(page.locator('p.promo'));
  await pause(300);
  await click(btn('Edit'));
  await pause(250);
  await page.keyboard.press('ControlOrMeta+A');
  await type('Pick a plan. Cancel anytime. No surprises.');
  await pause(450);
  await click(btn('Save'));
  await pause(400);
  await page.keyboard.press('Escape');
  await pause(300);

  // 4) Mark the CTA for removal.
  await click(page.locator('button', { hasText: 'Start free trial' }));
  await pause(300);
  await click(btn('Remove'));
  await pause(500);
  await page.keyboard.press('Escape');
  await pause(300);

  // 5) Show the draggable popover: open one, drag it aside, then write.
  await click(page.locator('figcaption'));
  await pause(300);
  await click(btn('Comment'));
  await pause(250);
  await dragPopoverBy(120, -190);
  await pause(300);
  await type('Lovely caption — keep it');
  await pause(450);
  await click(btn('Save'));
  await pause(400);
  await page.keyboard.press('Escape');
  await pause(300);

  // 6) Open the review queue.
  await click(page.locator('.mk-toolbar'));
  await pause(750);
  await shot('queue.png');

  // 7) Copy the structured brief to the clipboard.
  await click(btn('Copy notes'));
  await pause(1000);
  await pause(500);

  const video = page.video();
  await context.close();
  if (video) {
    await video.saveAs(join(MEDIA, 'demo.webm'));
    await video.delete();
  }
  await browser.close();
  await server.close();
  console.log('Wrote docs/media/demo.webm + select.png, comment.png, queue.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
