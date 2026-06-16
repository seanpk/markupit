# markupit 0.1 — Build Plan

The 0.1 release is a clean-room implementation of the specification in
[`VISION.md`](./VISION.md), [`REQUIREMENTS.md`](./REQUIREMENTS.md), and
[`ARCHITECTURE.md`](./ARCHITECTURE.md). It delivers all MUST requirements for the
two **local** source modes plus the complete annotation overlay, test suite, and CI.

**Scope for 0.1**

- ✅ Local directory mode and single-file mode (`SRC-1`, `SRC-2`)
- ✅ Idempotent injection + activation gating (`ACT-*`)
- ✅ Full overlay: selection, stable IDs, comment / edit / remove, queue, export (`SEL-*`, `ANN-*`, `QUE-*`, `EXP-*`)
- ✅ Design-first shadow-DOM UI honoring the `UX-*` bar
- ✅ Test-first suite (`node:test` + Playwright) with per-MUST coverage gating
- ✅ Published to npm as `markupit` (starting at `0.1.x`)
- ⏳ **Deferred:** Proxy URL mode (`SRC-3,4,5,7`) ships in a follow-up release

## Principles carried from the spec

- **Zero runtime dependencies** — Node built-ins only (`node:http`, `node:fs`,
  `node:path`, `node:url`, `node:util`, global `fetch`). Dev dependencies allowed.
- **Pure ESM**, Node `>=20.10`. No bundler — the overlay ships as raw ESM modules
  served from the reserved namespace.
- **Two independent halves.** The server knows nothing about annotations; the overlay
  knows nothing about how the page was sourced. The only coupling is the reserved asset
  path (`/__markupit__/`) and the activation flag (`?markupit`).
- **Clean-room** (`NFR-6`) — built from the specification, no code copied from the prior
  private implementation or third parties without a recorded compatible license.
- **Design as a first-class surface** — the UI is treated as designed from the first
  commit, not bolted onto working logic.

## Layout

```
bin/markupit.js                 # shebang entry -> src/cli.js
src/
  cli.js                        # arg parse -> resolve -> listen -> banner -> signals
  args.js                       # PURE parseArgs(argv) -> {source,port,host,open}
  source.js                     # resolveSource(raw) -> {kind:'dir'|'file'|'proxy',...}
  server/index.js               # createServer(config) -> http.Server (router)
  server/static.js              # serveStatic(root,urlPath) + traversal guard
  server/inject.js              # PURE injectOverlay(html,{assetBase,active}) -> html
  server/proxy.js               # deferred: stub returning a clear "not yet" page
  server/mime.js                # extToMime() built-in table
  server/net.js                 # listen() with EADDRINUSE port fallback
  constants.js                  # RESERVED_PREFIX, ACTIVATION_PARAM, marker, defaults
  index.js                      # programmatic entry (re-exports createServer)
assets/overlay/                 # served verbatim from /__markupit__/overlay/
  main.js  app.js               # DOM: entry, gating, orchestration
  core/                         # PURE: ids, selectable, model, export, label, snippet
  dom/                          # DOM: selection, persistence, anchor, geometry
  ui/                           # DOM: shadow, styles, highlight, popover, queue,
                                #      markers, toast, hint, toolbar
  font/                         # bundled DM Sans (not Google-fetched)
test/  unit/ server/ browser/ fixtures/ helpers/
scripts/coverage-ids.mjs        # MUST-coverage gate
.github/workflows/ci.yml
```

## Key design decisions (and why they're hard to reverse)

| Decision | Why it matters | Choice |
|---|---|---|
| Stable ID / anchor scheme (`SEL-7`) | Persisted notes and past exports are keyed to it | Composite anchor: authored-id → structural `nth-of-type` path → FNV-1a text hash, with fuzzy re-anchoring; orphans flagged, never dropped |
| Persisted state shape + storage key | It's real in-progress review data | Versioned key `markupit:v1:<origin+pathname>`; the anchor object doubles as persistence + export payload |
| Style isolation (`UX-10`, `SEL-5`) | Foundational to every UI module | Shadow DOM (also gives selection-exclusion of our own chrome nearly free) |
| Pure / DOM split | The whole unit-test strategy rests on it | `core/` has no `document`/`window`/event refs; visibility & layout injected as callbacks |
| npm publish | A published version number can't be reused | Start at `0.1.x`; publish only when the UX bar is met |

## Activation model

The server injects a dormant overlay `<script type="module">` (plus font/style tags)
before the last `</body>` of every HTML response, idempotently (guarded by a
`data-markupit-injected` marker). The overlay self-activates only when `?markupit` is
present in the URL. Without the flag the page is byte-for-byte original: zero chrome,
no interception (`ACT-2`, `ACT-3`). Activation lives in the URL so a session re-opens by
link (`ACT-5`). The reserved `/__markupit__/` path is matched before page files so overlay
assets can never be shadowed (`SRC-8`).

## Export format

`toMarkdown(state, {pageUrl, pageTitle})` is a pure function. It emits an instruction
header framing the notes for an agent, then numbered items in document order. Each item
carries the action kind, a decomposed anchor (id, tag, CSS-style selector, text snippet),
and the reviewer's intent (comment text, old→new text, or removal request). Only
un-reverted state appears (`EXP-2,3,4,5,6`). An element with multiple annotation kinds
emits adjacent items sharing one anchor. A raw-JSON export is offered too (`EXP-7`).

## Testing

- **Runners:** `node:test` + `node:assert/strict` (unit + server); `@playwright/test`
  (browser). DOM simulator: **linkedom**. Computed-visibility checks for `SEL-6` are
  verified in the browser layer; the pure filter stays attribute/tag-based.
- **ID tracing:** every assertion title carries its requirement ID (e.g.
  `[SEL-7] same element gets same id across reloads`). `scripts/coverage-ids.mjs` fails CI
  on any MUST with no matching assertion.
- **Server tests** import the real `createServer` factory and drive it with global `fetch`
  on an ephemeral port — no HTTP-client dependency.
- **Human bar:** `docs/UX-CHECKLIST.md` enumerates the subjective `UX-*` qualities to
  inspect per release.

## Milestones (each leaves the suite green; commit messages cite requirement IDs)

1. **Scaffold** — package.json, ESLint/Prettier, CI, test harness, fixtures, `.gitignore`.
2. **Local serving** — CLI, source resolution, static serving, no-store, reserved
   namespace, MIME, port fallback, clean shutdown — `[CLI-2,4,5,6,8][SRC-1,2,6,8]`.
3. **Injection + activation** — idempotent injection, activation gating, proxy stub —
   `[ACT-1,2,3,4]`.
4. **Overlay pure core** — ids, selectable, model, export, label —
   `[SEL-6,7][EXP-2,3,4,6][ANN-4,5]`.
5. **Overlay UI** — shadow-DOM select, comment, edit, remove, queue, persistence,
   clipboard, hint, keyboard — `[SEL-1,2,3,5][ANN-1..8][QUE-*][EXP-1][UX-*]`.
6. **Browser tests** — no console errors, inactive=clean, encapsulation, distinct
   treatments, reduced-motion, persistence — `[NFR-2,4][ACT-3][UX-3,4,5,9,10]`.
7. **Docs + publish** — README rewrite, CONTRIBUTING, UX-CHECKLIST, npm publish wiring.

## Deferred to a later release

Proxy URL mode (`SRC-3,4,5,7`): server-side `fetch`, `<base href>` injection for relative
assets, stripping CSP / X-Frame-Options / COOP / COEP, dropping content-encoding/length
after body mutation, and a graceful 502 on fetch failure. The interaction to get right
then: the overlay `assetBase` must be the fully-qualified local origin
(`http://127.0.0.1:<port>/__markupit__/`) so the injected `<base>` tag doesn't redirect
overlay assets to the remote origin.
