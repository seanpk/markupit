// Programmatic entry point. The server factory is the main reusable surface; tests and
// embedders import it directly rather than spawning the CLI.
export { createServer } from './server/index.js';
export { resolveSource, describeSource, isUrlSource } from './source.js';
export { parseCliArgs } from './args.js';
export { main } from './cli.js';
