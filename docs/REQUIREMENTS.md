# Requirements

This is the behavioral specification for `markupit`. Each requirement is written
to be **independently testable**. They are grouped by area and given stable IDs
(`CLI-1`, `OVL-3`, …) so tests and discussion can reference them precisely.

A requirement marked **(MUST)** is part of the definition of done. **(SHOULD)** is
strongly desired but may slip to a later milestone. **(MAY)** is optional.

> Note on the design bar: requirements in the **Experience & Design** section
> (`UX-*`) are first-class. "It works but feels clunky" is a failing build, not a
> passing one. See [`VISION.md`](./VISION.md).

---

## A. CLI & invocation (`CLI-*`)

- **CLI-1 (MUST)** — Runnable with no global install via `npx` (published as
  `@seanpk/markupit`; the `markupit` bin runs the same when installed globally).
- **CLI-2 (MUST)** — `<source>` accepts a **local path** (a directory of static
  files, or a single `.html` file).
- **CLI-3 (MUST)** — `<source>` accepts an **http(s) URL**, in which case the tool
  fetches and proxies that page (see Source Modes below).
- **CLI-4 (MUST)** — On start, prints the local URL to open, and which source mode
  it resolved (`local dir`, `local file`, or `proxy <url>`).
- **CLI-5 (SHOULD)** — Accepts a `--port` option; defaults to a fixed port and, if
  taken, falls back to the next free port and prints the chosen one.
- **CLI-6 (SHOULD)** — Binds to `127.0.0.1` only by default (local-first; not
  exposed on the network) unless an explicit `--host` is given.
- **CLI-7 (MAY)** — Accepts `--open` to launch the default browser automatically.
- **CLI-8 (MUST)** — Exits cleanly on Ctrl-C without leaving an orphaned port
  bound.

## B. Source modes — serving the page (`SRC-*`)

- **SRC-1 (MUST)** — **Local directory:** serves files statically with the
  directory as document root; `/` resolves to `index.html`.
- **SRC-2 (MUST)** — **Local file:** serves that single HTML file at `/`.
- **SRC-3 (MUST)** — **Proxy URL:** fetches the remote HTML server-side and serves
  it from the local origin so injected scripts run same-origin.
- **SRC-4 (MUST)** — In proxy mode, relative asset references (CSS, JS, images,
  fonts) still resolve, by rewriting them to absolute URLs against the original
  origin **or** by proxying them through the local server. Either strategy is
  acceptable; the page must render visually equivalent to the original.
- **SRC-5 (MUST)** — In proxy mode, response headers that would block injected
  scripts or framing — notably `Content-Security-Policy` and
  `X-Frame-Options` — are stripped from what's served locally.
- **SRC-6 (MUST)** — All served HTML is sent with no-store cache headers so edits
  to a local source (or a re-fetch) show up on a plain reload.
- **SRC-7 (SHOULD)** — Proxy mode degrades gracefully: a page that depends on
  authenticated API calls or aggressive anti-embedding may not fully function;
  the tool should not crash, and should surface a clear note when a fetch fails.
- **SRC-8 (MUST)** — In every mode, the overlay's own assets are served from a
  reserved path namespace that cannot collide with the reviewed page's assets.

## C. Injection & activation (`ACT-*`)

- **ACT-1 (MUST)** — The server injects the overlay into served HTML documents
  (before `</body>`) without altering the rest of the markup.
- **ACT-2 (MUST)** — The overlay is **gated**: it only activates when explicitly
  requested (e.g. a query flag on the URL). The same URL without the flag renders
  the clean, unmodified page.
- **ACT-3 (MUST)** — When inactive, the overlay adds zero visible chrome and does
  not intercept any page interaction.
- **ACT-4 (MUST)** — Injection is idempotent: re-serving or re-fetching a page
  never produces a doubled overlay.
- **ACT-5 (SHOULD)** — Activation state is reflected in the URL so a marked-up
  session can be re-opened by link.

## D. Element selection (`SEL-*`)

- **SEL-1 (MUST)** — Hovering the page highlights the element currently under the
  pointer as the selection candidate, with a clear but unobtrusive outline.
- **SEL-2 (MUST)** — Clicking an element selects it as the target of the next
  action. The selected element is the literal DOM element under the cursor — the
  mapping from gesture to target is unambiguous.
- **SEL-3 (MUST)** — Any visible element can be targeted — headings, paragraphs,
  images, buttons, list items, sections, header, footer, nav. The tool is **not**
  limited to a fixed set of container types.
- **SEL-4 (SHOULD)** — The reviewer can widen/narrow the selection to the parent
  or child of the current candidate (e.g. via modifier + scroll, or bracket
  keys), to grab a whole card instead of just the text inside it.
- **SEL-5 (MUST)** — The overlay's own chrome (toolbar, popovers, markers) is
  never itself selectable as page content.
- **SEL-6 (MUST)** — Non-content nodes (`<script>`, `<style>`, `<template>`,
  hidden/`display:none` elements) are excluded from selection.
- **SEL-7 (MUST)** — Each targeted element is given a **stable identifier** used in
  export and persistence, derived so that the same element gets the same id across
  reloads of the same page.

## E. Annotation actions (`ANN-*`)

- **ANN-1 (MUST)** — **Comment:** attach freeform text to the selected element.
- **ANN-2 (MUST)** — **Edit text:** change the element's text content in place;
  both the original and the new text are retained (the original for the agent's
  context, the new as the requested change).
- **ANN-3 (MUST)** — **Remove:** mark an element for deletion. The element is
  visibly de-emphasized (e.g. struck/collapsed) but the action is recorded as a
  *request*, not a destructive edit of the source.
- **ANN-4 (MUST)** — Every action is reversible within the session: a comment can
  be edited or deleted, an inline edit reverted, a removal undone.
- **ANN-5 (MUST)** — A single element may carry more than one kind of annotation
  (e.g. a comment *and* a remove request) without losing either.
- **ANN-6 (SHOULD)** — The comment input opens anchored to the clicked point and
  is immediately focused, so the flow is click → type → confirm with no extra
  targeting.
- **ANN-7 (MUST)** — Annotations persist across a page reload within the same
  browser (local persistence), keyed to the page, so a reload mid-review loses
  nothing.
- **ANN-8 (SHOULD)** — A "reset" action clears all live annotations for the
  current page after confirmation. The clear is non-destructive — the notes are
  retained as history (see QUE-6), not discarded. The confirmation also offers a
  one-step "copy notes and clear".
- **ANN-9 (SHOULD)** — The element being annotated stays visibly highlighted while
  its popover is open, legibly on any page background.
- **ANN-10 (SHOULD)** — While composing a comment or edit, interacting with the
  page does not dismiss the popover or discard the in-progress text.

## F. The queue & overview (`QUE-*`)

- **QUE-1 (MUST)** — A running list of all annotations in the current session is
  viewable, grouped or ordered so the reviewer can see everything they've marked.
- **QUE-2 (MUST)** — Each queue entry identifies its element in human terms (a
  short label drawn from the element's own text/role), not by raw selector.
- **QUE-3 (SHOULD)** — Selecting a queue entry scrolls to and highlights its
  element on the page.
- **QUE-4 (SHOULD)** — A live count of annotations is visible at all times.
- **QUE-5 (MAY)** — Per-element comment-count badges appear on the page itself.
- **QUE-6 (SHOULD)** — Clearing the page's notes retains them as timestamped
  history (one entry per clear) rather than discarding them; history persists
  across reloads.
- **QUE-7 (SHOULD)** — A history entry can be copied out as its full notes brief,
  and history entries can be removed individually or cleared all at once.

## G. Export (`EXP-*`)

- **EXP-1 (MUST)** — A single action copies the entire session to the clipboard as
  **structured text**, ready to paste into an AI coding agent.
- **EXP-2 (MUST)** — The export is human-readable plain text/markdown — not opaque
  JSON the reviewer can't sanity-check before pasting.
- **EXP-3 (MUST)** — For each annotation the export includes: the action kind
  (comment / edit / remove), a **stable anchor** to the element (id plus enough
  context — tag, a text snippet, and/or selector — for an agent to locate it
  unambiguously in source), and the reviewer's intent (comment text, or
  old→new text, or the removal request).
- **EXP-4 (MUST)** — The export preserves document order so the agent reads the
  changes top-to-bottom as they appear on the page.
- **EXP-5 (SHOULD)** — The export opens with a brief instruction header framing it
  for the agent ("The following are review notes on <page>. Apply each…").
- **EXP-6 (SHOULD)** — Export reflects only un-reverted, current state — undone
  actions never appear.
- **EXP-7 (MAY)** — Offer a raw JSON export in addition, for programmatic use.

## H. Experience & design (`UX-*`) — first-class

- **UX-1 (MUST)** — The overlay is visually polished: considered type, spacing,
  color, and contrast. It looks like a designed product, not a debug panel.
- **UX-2 (MUST)** — Chrome is minimal and recedes when idle; it never obscures the
  content being reviewed, and never clashes with the page's own fixed/sticky
  navigation.
- **UX-3 (MUST)** — Hover, selection, comment, edit, and remove each have a
  **distinct, legible** visual treatment; a marked-up page is readable at a glance
  like a proof-read manuscript.
- **UX-4 (MUST)** — Transitions are smooth and purposeful (popover grows from the
  click point; removal collapses; queue slides). No jank, no teleporting, no
  flash of unstyled chrome on load.
- **UX-5 (MUST)** — Honors `prefers-reduced-motion`: animations reduce to
  instant, accessible state changes.
- **UX-6 (MUST)** — No internal jargon surfaces in the UI (no "selector," "node,"
  "adapter," internal class names). Internal ids live only in the export.
- **UX-7 (SHOULD)** — Fully keyboard-operable: move between candidates, open a
  comment, confirm, and export without the mouse. Shortcuts are discoverable.
- **UX-8 (SHOULD)** — A first-time reviewer gets a single, gentle hint on how to
  start, dismissable and not shown again.
- **UX-9 (SHOULD)** — Works and looks correct across current Chrome, Firefox, and
  Safari, and is responsive down to a tablet width.
- **UX-10 (MUST)** — The overlay's styles are isolated so they neither leak into
  the reviewed page nor get overridden by it (e.g. style encapsulation).
- **UX-11 (SHOULD)** — Confirmations and prompts use styled in-overlay UI, never
  native browser dialogs (`window.confirm`/`alert`/`prompt`).

## I. Quality & non-functional (`NFR-*`)

- **NFR-1 (MUST)** — Distributed as an npm package; the dev server runs on Node
  with no non-JS runtime dependency. (No Python, no native build step required to
  use it.)
- **NFR-2 (MUST)** — Activating the overlay introduces no console errors on a
  clean page.
- **NFR-3 (SHOULD)** — Overlay payload is lightweight (target: well under a few
  hundred KB) so injection doesn't noticeably slow page load.
- **NFR-4 (MUST)** — The reviewed page's own behavior is not broken by the overlay
  when active (links, scripts, and forms still function unless intentionally
  intercepted).
- **NFR-5 (SHOULD)** — Core logic (id derivation, selection filtering, export
  formatting) is unit-testable without a real browser; server behavior
  (routing, injection, header handling, proxy rewriting) is integration-testable
  headlessly. See [`ARCHITECTURE.md`](./ARCHITECTURE.md#testing).
- **NFR-6 (MUST)** — Clean-room: built from this specification, not derived from or
  copied out of any existing implementation. No third-party code carried in
  without a compatible, recorded license.

---

## Test-mapping guidance

When this spec becomes a test suite, aim for at least one assertion per **MUST**.
Natural test seams:

- **Server/CLI** (`CLI-*`, `SRC-*`, `ACT-*`) → headless integration tests: start
  the server against a fixture dir and a mock remote, assert on served bytes,
  headers, injection, idempotency, and proxy rewriting.
- **Pure logic** (`SEL-6/7`, `EXP-3/4/6`) → unit tests in a DOM simulator: feed a
  known document, assert which nodes are selectable, what ids they get, and the
  exact exported text for a known set of annotations.
- **Experience** (`UX-*`) → a mix of headless browser checks (no console errors,
  styles encapsulated, reduced-motion respected, chrome absent when inactive) and
  a short human review checklist for the things automation can't judge ("does it
  feel good?").
