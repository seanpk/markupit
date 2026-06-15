# Contributing to markupit

markupit is built clean-room from a specification, test-first, with a deliberately
high design bar. A few constraints are non-negotiable because they're the whole point
of the project — please read these before opening a PR.

## The method

1. **Test-first, traced to requirements.** New behavior starts as a failing test whose
   title carries the requirement ID it satisfies, e.g.
   `test('[SEL-7] same element gets same id across reloads', …)`. The IDs live in
   [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md).
2. **Every MUST has an assertion.** `npm run test:ids` greps the spec for `(MUST)`
   requirements and fails if any lacks an `[ID]`-tagged assertion. CI gates on it. If a
   MUST genuinely can't be auto-tested yet, record an exemption with a reason in
   `scripts/coverage-ids.mjs` — don't leave it silently uncovered.

## Hard constraints

- **Zero runtime dependencies (`NFR-1`).** `dependencies` in `package.json` must stay
  empty — Node built-ins only (`node:http`, `node:fs`, global `fetch`, …). CI asserts
  this. Dev dependencies are fine but need a reason.
- **Clean-room (`NFR-6`).** No code copied from the prior private implementation or any
  third party without a compatible, recorded license.
- **The page disappears when off.** When the overlay isn't activated the page must be
  byte-for-byte the original — no chrome, no intercepted events.
- **The UX bar is part of "done."** "It works but feels clunky" is a failing build. See
  [`docs/VISION.md`](./docs/VISION.md) and walk [`docs/UX-CHECKLIST.md`](./docs/UX-CHECKLIST.md)
  before calling a UI change finished.

## Layout

```
src/            Node CLI + dev server (args, source resolution, serving, injection)
assets/overlay/ the browser overlay
  core/         PURE logic — no document/window; unit-tested under node:test + linkedom
  dom/ ui/      DOM-bound adapters and rendering (shadow DOM)
test/unit/      pure-logic tests (linkedom)
test/server/    server integration tests (real createServer + fetch)
test/browser/   Playwright specs
```

Keep `core/` pure: no `document`, `window`, events, or layout reads. Anything needing
the DOM is injected as a callback (e.g. `isVisible`). This is what lets the heart of the
overlay run in a DOM simulator.

## Running things

```bash
npm run lint
npm test               # unit + server + id-gate
npm run test:browser   # Playwright; run `npx playwright install` once first
npm run format         # check; format:fix to apply
```

## A sharp edge to know about

In `node:test`, **never pass a DOM node to `assert.equal`/`deepEqual`**. On a failing
assertion the runner deep-inspects both operands, and a linkedom element's circular
graph serializes to a >100MB string — enough to OOM the process and, unsandboxed, take
your terminal down with it. Compare node identity with the `sameNode()` helper in
`test/helpers/load-dom.js` (it asserts `a === b`, so only a boolean is ever inspected).
