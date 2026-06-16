// Boots a real markupit server against the static-site fixture for Playwright specs.
// Zero extra deps — uses the server factory directly.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from '../../src/server/index.js';
import { resolveSource } from '../../src/source.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export async function startServer(rel = 'static-site') {
  const source = await resolveSource(join(fixtures, rel));
  const server = createServer(source);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise((r) => server.close(r));
    },
  };
}
