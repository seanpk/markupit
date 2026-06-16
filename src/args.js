// PURE argument parsing — no I/O, no process.exit, throws on misuse so it is unit
// testable (NFR-5). cli.js owns turning these into real side effects.
import { parseArgs } from 'node:util';
import { DEFAULT_PORT, DEFAULT_HOST } from './constants.js';

export class UsageError extends Error {}

/**
 * @param {string[]} argv  process.argv.slice(2)
 * @returns {{source:string, port:number, host:string, open:boolean}}
 */
export function parseCliArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        port: { type: 'string', short: 'p' },
        host: { type: 'string' },
        open: { type: 'boolean', short: 'o' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    throw new UsageError(err.message);
  }

  const { values, positionals } = parsed;

  if (values.help) return { help: true };
  if (values.version) return { version: true };

  if (positionals.length === 0) {
    throw new UsageError('Missing <source>. Pass a directory, an .html file, or a URL.');
  }
  if (positionals.length > 1) {
    throw new UsageError(`Expected a single <source>, got ${positionals.length}.`);
  }

  let port = DEFAULT_PORT;
  if (values.port !== undefined) {
    port = Number(values.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new UsageError(`Invalid --port "${values.port}". Expected 0-65535.`);
    }
  }

  return {
    source: positionals[0],
    port,
    host: values.host ?? DEFAULT_HOST,
    open: values.open ?? false,
  };
}

export const HELP_TEXT = `markupit — point it at a web page, mark it up, export a brief.

Usage:
  npx markupit <source> [options]

Source:
  <dir>        a directory of static files (/ resolves to index.html)
  <file.html>  a single HTML file
  <url>        a live http(s) page  (coming soon)

Options:
  -p, --port <n>   port to listen on (default ${DEFAULT_PORT}, falls back if taken)
      --host <h>   interface to bind (default ${DEFAULT_HOST}, loopback only)
  -o, --open       open the page in your default browser
  -h, --help       show this help
  -v, --version    show version

Then open the printed URL and start clicking.`;
