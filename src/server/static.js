// Static file serving from disk for the two local modes, with a path-traversal guard.
import { readFile } from 'node:fs/promises';
import { normalize, resolve, sep } from 'node:path';
import { contentTypeFor, isHtmlPath } from './mime.js';

/**
 * Resolve a request URL path to an absolute file path inside `root`, or null if it
 * would escape the root (path traversal). PURE (path math only).
 */
export function safeJoin(root, urlPath) {
  // Strip query/hash, decode, drop the leading slash, normalize away ../ segments.
  let pathname = urlPath.split('?')[0].split('#')[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null; // malformed percent-encoding
  }
  const rel = normalize(pathname)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const abs = resolve(root, rel);
  // Must stay within root (allow the root itself).
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  return abs;
}

/**
 * Serve a file from disk.
 * @returns {Promise<{status:number, contentType:string, body:Buffer, isHtml:boolean}>}
 */
export async function serveFile(absPath) {
  const body = await readFile(absPath); // throws on missing -> caller maps to 404
  return {
    status: 200,
    contentType: contentTypeFor(absPath),
    body,
    isHtml: isHtmlPath(absPath),
  };
}
