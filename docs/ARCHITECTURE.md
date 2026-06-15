# Architecture

This describes the intended shape of `markupit` — enough structure to build
against, without prescribing implementation detail the builder should own. It is
a target, not a contract; deviate where a better design emerges, but keep the
boundaries that make the requirements testable.

## Two halves

`markupit` is two cooperating parts that meet at the served HTML:

```
        ┌──────────────────────────────────────────────────────────┐
        │  CLI / dev server  (Node)                                  │
        │                                                            │
  npx → │  • resolves <source> → local dir | local file | proxy url  │
        │  • serves the page from a local origin                     │
        │  • strips blocking headers (proxy mode)                    │
        │  • injects the overlay before </body>                      │
        │  • serves overlay assets from a reserved path              │
        └───────────────────────────┬────────────────────────────────┘
                                     │  HTML + injected <script>
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Overlay  (browser, vanilla JS)                            │
        │                                                            │
        │  • gates on the activation flag                            │
        │  • selection: hover highlight, click-to-target, filtering  │
        │  • actions: comment / inline-edit / remove                 │
        │  • stable id derivation per element                        │
        │  • local persistence (survives reload)                     │
        │  • queue + overview UI                                     │
        │  • structured export to clipboard                          │
        │  • all chrome visually isolated from the page              │
        └──────────────────────────────────────────────────────────┘
```

The server knows nothing about annotations; the overlay knows nothing about how
the page was sourced. The only coupling is the reserved asset path and the
activation flag.

## The server

A small Node HTTP server. Responsibilities, in order of a request:

1. **Resolve the source once at startup** into one of three modes (`local dir`,
   `local file`, `proxy <url>`) and report it.
2. **Serve assets.** Local modes: from disk. Proxy mode: rewrite relative URLs to
   the origin (or proxy them through); strip `Content-Security-Policy` and
   `X-Frame-Options`.
3. **Intercept HTML responses** and inject the overlay's `<script>`/asset tags
   before `</body>`, idempotently.
4. **Set no-store headers** so reloads always reflect current state.
5. **Reserve a namespace** (e.g. a path prefix unlikely to collide) for the
   overlay's own JS/CSS/icons, served regardless of source mode.

This is a clean reimplementation of the "inject at serve time" idea — the prior
private version did this in ~100 lines of Python; here it is Node so the whole
tool ships as one npm package with no second runtime (`NFR-1`). Porting it is
trivial; nothing about the inject logic benefits from being Python.

## The overlay

Vanilla browser JS, no framework dependency, delivered as the injected payload.
Suggested internal seams (so logic is testable without a browser, `NFR-5`):

- **selection** — what's targetable (`SEL-3/5/6`), hover/click candidate
  resolution, parent/child widening.
- **ids** — deriving a stable identifier per element (`SEL-7`), reused by both
  persistence and export.
- **state** — the in-memory model of annotations + a local-storage persistence
  layer keyed to the page (`ANN-7`).
- **actions** — comment, inline edit, remove, and their inverses (`ANN-1..5`).
- **export** — turning state into the structured brief (`EXP-*`); this is pure
  (state in, text out) and should be unit-tested against fixtures.
- **ui** — the chrome: hover/marker rendering, the anchored comment popover, the
  queue/overview, toasts. Style-isolated (`UX-10`), e.g. via Shadow DOM or a
  rigorously namespaced, reset stylesheet.

Keep the **pure** parts (selection filtering, id derivation, export formatting)
free of direct DOM-event and rendering concerns so they can run in a DOM
simulator under `node:test`.

> **Design debt to avoid:** the ancestor of this tool grew its UI organically and
> ended up clunky — utilitarian toolbar, leaky internal labels, popovers fighting
> the page. Treat the UI layer as a designed surface from the first commit, not an
> afterthought bolted onto working logic. See [`VISION.md`](./VISION.md).

## Packaging

- A single npm package exposing a `markupit` bin (`CLI-1`).
- Pure ESM, modern Node LTS target.
- Overlay assets shipped inside the package and served by the bundled server.
- No required non-JS runtime, no native addons, no mandatory build step to *use*
  it (a build step to *produce* the overlay bundle is fine).

## Testing

| Layer | How | Covers |
|-------|-----|--------|
| Pure logic | `node:test` + a DOM simulator (e.g. jsdom or linkedom) | `SEL-6/7`, `EXP-3/4/6`, id stability |
| Server | `node:test` driving the real server against a fixture dir and a **mock remote** | `CLI-*`, `SRC-*`, `ACT-*` (routing, injection, idempotency, header stripping, proxy rewrite) |
| Browser/UX | headless browser (e.g. Playwright) | `NFR-2` (no console errors), `UX-3/4/5/10` (distinct treatments, motion, reduced-motion, style isolation), `ACT-3` (no chrome when inactive) |
| Feel | short human checklist | the `UX-*` qualities automation can't judge |

Tests should reference requirement IDs so coverage against
[`REQUIREMENTS.md`](./REQUIREMENTS.md) is auditable. Target: at least one
assertion per **MUST**.

## Build-from-spec note

This repo intentionally ships **no implementation** — only specification — so the
build can be done clean-room from these documents (`NFR-6`). The intended path:
turn `REQUIREMENTS.md` into a test suite first, then implement the server and
overlay until the suite passes and the `UX-*` bar is met by inspection.
