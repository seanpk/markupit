import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSource } from '../../src/source.js';
import { startMarkupit, fixturePath } from '../helpers/start-server.js';
import { INJECTION_MARKER, RESERVED_PREFIX } from '../../src/constants.js';

const countTags = (html) => html.split(INJECTION_MARKER).length - 1;

async function dirServer() {
  return startMarkupit(await resolveSource(fixturePath('static-site')));
}

test('[ACT-1] served HTML carries exactly one injected overlay script', async () => {
  const srv = await dirServer();
  try {
    const body = await (await fetch(`${srv.origin}/`)).text();
    assert.equal(countTags(body), 1);
    assert.match(body, new RegExp(`src="${RESERVED_PREFIX}main\\.js"`));
  } finally {
    await srv.close();
  }
});

test('[ACT-4] re-serving the same page never accumulates overlays', async () => {
  const srv = await dirServer();
  try {
    const a = await (await fetch(`${srv.origin}/`)).text();
    const b = await (await fetch(`${srv.origin}/`)).text();
    assert.equal(countTags(a), 1);
    assert.equal(countTags(b), 1);
  } finally {
    await srv.close();
  }
});

test('[ACT-1] non-HTML responses are not modified', async () => {
  const srv = await dirServer();
  try {
    const css = await (await fetch(`${srv.origin}/styles.css`)).text();
    assert.equal(countTags(css), 0);
  } finally {
    await srv.close();
  }
});

test('[ACT-5] activation lives in the URL, not the served bytes (same path, same HTML)', async () => {
  // The server injects identically regardless of the activation flag; the overlay
  // self-gates on ?markupit. So the two responses are byte-identical.
  const srv = await dirServer();
  try {
    const plain = await (await fetch(`${srv.origin}/`)).text();
    const active = await (await fetch(`${srv.origin}/?markupit`)).text();
    assert.equal(plain, active);
    assert.equal(countTags(active), 1);
  } finally {
    await srv.close();
  }
});
