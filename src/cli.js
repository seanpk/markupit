// CLI orchestration: parse args, resolve the source, listen, print the banner, and
// shut down cleanly on Ctrl-C. All the I/O and process-exit concerns live here; the
// pieces it calls (args, source) are pure and tested separately.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCliArgs, UsageError, HELP_TEXT } from './args.js';
import { resolveSource, describeSource } from './source.js';
import { createServer } from './server/index.js';
import { listenWithFallback } from './server/net.js';
import { ACTIVATION_PARAM } from './constants.js';

function version() {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
}

export async function main(argv) {
  let opts;
  try {
    opts = parseCliArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`${err.message}\n\n${HELP_TEXT}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  }

  if (opts.help) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return;
  }
  if (opts.version) {
    process.stdout.write(`${version()}\n`);
    return;
  }

  const source = await resolveSource(opts.source);
  const server = createServer(source);
  const port = await listenWithFallback(server, { host: opts.host, port: opts.port });

  const base = `http://${opts.host}:${port}`;
  const reviewUrl = source.kind === 'proxy' ? base : `${base}/?${ACTIVATION_PARAM}`;
  process.stdout.write(
    `\n  markupit  ·  ${describeSource(source)}\n` +
      `  open     ·  ${reviewUrl}\n` +
      `  (Ctrl-C to stop)\n\n`
  );

  if (opts.open) {
    openBrowser(reviewUrl);
  }

  installShutdown(server);
}

function installShutdown(server) {
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    process.stdout.write('\n  stopping…\n');
    server.close(() => process.exit(0));
    // Don't let lingering keep-alive sockets orphan the port (CLI-8).
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function openBrowser(url) {
  import('node:child_process')
    .then(({ spawn }) => {
      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      try {
        spawn(cmd, [url], {
          stdio: 'ignore',
          detached: true,
          shell: process.platform === 'win32',
        }).unref();
      } catch {
        /* best-effort */
      }
    })
    .catch(() => {});
}
