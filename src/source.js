// Source resolution: classify the <source> argument into one of three modes (CLI-2,
// CLI-3). Done once at startup. Filesystem access is real here, so the pure scheme
// check is split out for unit testing.
import { stat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';

/** True if the raw source is an http(s) URL (proxy mode, CLI-3). PURE. */
export function isUrlSource(raw) {
  return /^https?:\/\//i.test(raw);
}

/**
 * @returns {Promise<
 *   | {kind:'proxy', url:string}
 *   | {kind:'dir', root:string}
 *   | {kind:'file', root:string, file:string}
 * >}
 */
export async function resolveSource(raw) {
  if (isUrlSource(raw)) {
    return { kind: 'proxy', url: raw };
  }

  const abs = resolve(raw);
  let info;
  try {
    info = await stat(abs);
  } catch {
    throw new Error(`Source not found: ${raw}`);
  }

  if (info.isDirectory()) {
    return { kind: 'dir', root: abs };
  }
  if (info.isFile()) {
    // Serve the single file at "/", but root the server at its directory so the page's
    // sibling relative assets (css, images) still resolve.
    return { kind: 'file', root: dirname(abs), file: basename(abs) };
  }
  throw new Error(`Source is neither a file nor a directory: ${raw}`);
}

/** Human label for the startup banner (CLI-4). PURE. */
export function describeSource(source) {
  switch (source.kind) {
    case 'dir':
      return `local dir (${source.root})`;
    case 'file':
      return `local file (${source.file})`;
    case 'proxy':
      return `proxy <${source.url}>`;
    default:
      return 'unknown';
  }
}
