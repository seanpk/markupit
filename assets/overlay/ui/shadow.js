// Creates the single shadow-DOM host that contains ALL overlay chrome. Shadow DOM gives
// us two things at once: page CSS can't reach our UI and our CSS can't leak out (UX-10),
// and page clicks land on the host element (not our internal chrome), which makes "the
// overlay is never selectable as content" almost free (SEL-5).
import { Z_BASE } from '../constants.js';
import { CSS } from './styles.js';

export function createShadow() {
  const host = document.createElement('div');
  host.setAttribute('data-markupit', '');
  // The host is a fixed, zero-size, click-through anchor; individual chrome pieces inside
  // opt back into pointer events as needed.
  host.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;z-index:${Z_BASE};`;

  const root = host.attachShadow({ mode: 'open' });

  // Adopt the stylesheet (constructable if supported, else a <style> fallback).
  if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      root.adoptedStyleSheets = [sheet];
    } catch {
      appendStyleTag(root);
    }
  } else {
    appendStyleTag(root);
  }

  document.body.appendChild(host);
  return { host, root };
}

function appendStyleTag(root) {
  const style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);
}

export function destroyShadow(host) {
  if (host && host.parentNode) host.parentNode.removeChild(host);
}
