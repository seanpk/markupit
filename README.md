<p align="center">
  <img src="https://raw.githubusercontent.com/seanpk/markupit/master/assets/logo/logo-stacked.svg" alt="markupit" width="180" />
</p>

# markupit

**Point it at any web page. Click anything. Say what you mean. Get back a clean, structured brief you can hand to an AI or a developer.**

`markupit` is a lightweight, local-first review overlay for web pages. You run it
against a local folder of HTML or a single file, open the page in your browser, and
the page becomes *markable*: click any element to leave a comment, edit text in
place, or mark something for removal. When you're done, you export the whole
session as a structured prompt — ready to paste into Claude (or any coding agent)
to apply the changes.

It compresses the slowest part of the design-feedback loop —
*screenshot → describe → locate → explain* — down to *click → type → copy → paste*.

```bash
# review a local build
npx @seanpk/markupit ./dist

# review a single file
npx @seanpk/markupit ./index.html
```

Then open the printed `localhost` URL and start marking up.

---

## Why this exists

Reviewing a web page today is clumsy. You take a screenshot, draw a red box,
write "make this bigger," and then the person fixing it has to reverse-engineer
*which element* you meant. Every round trip leaks information.

`markupit` is the small, sharp tool in the gap: no account, no extension, no
build-step integration. A single command, any page, structured output designed to
be **handed to an AI agent**.

---

## Usage

```
npx @seanpk/markupit <source> [options]
```

> Installed globally (`npm i -g @seanpk/markupit`), the command is just `markupit`.

**Source**

| Source | What it does |
|--------|--------------|
| `<dir>` | Serves a directory of static files; `/` resolves to `index.html`. |
| `<file.html>` | Serves a single HTML file at `/`. |
| `<url>` | A live `http(s)` page. **Coming soon** — see [roadmap](#roadmap). |

**Options**

| Option | Default | Description |
|--------|---------|-------------|
| `-p, --port <n>` | `4870` | Port to listen on; falls back to the next free port if taken. |
| `--host <h>` | `127.0.0.1` | Interface to bind. Loopback only by default. |
| `-o, --open` | off | Open the page in your default browser. |
| `-h, --help` | | Show help. |
| `-v, --version` | | Show version. |

The tool prints a URL with `?markupit` appended — that flag activates the overlay.
The same page **without** the flag is byte-for-byte the original.

## Marking up

- **Hover** any element to highlight it; **click** to select it.
- A small popover offers **Comment**, **Edit**, and **Remove**.
- Keyboard: `c` comment, `e` edit, `r` remove, `[` / `]` widen/narrow the
  selection, `Esc` to dismiss, `⌘/Ctrl+Shift+C` to export.
- The pill in the corner shows a live count and opens the **queue** — every note
  in one place. **Copy notes** puts a clean markdown brief on your clipboard.

Your review lives only in your browser (localStorage) and survives a reload.
Nothing leaves your machine until you copy it out.

## How it works

markupit is two cooperating halves that meet at the served HTML:

- A tiny **Node dev server** sources and serves the page, and injects a dormant
  overlay script before `</body>`. It knows nothing about your annotations.
- A vanilla-JS **overlay** runs in the page inside a Shadow DOM (so its styles
  neither leak into nor are overridden by the page). It self-activates only when
  the `?markupit` flag is present.

No framework, **zero runtime dependencies**, pure ESM, no build step to use it.

## Roadmap

Tracked as [issues](https://github.com/seanpk/markupit/issues) — see each for detail:

- **Proxy URL mode** — review a live `http(s)` page server-side ([#2](https://github.com/seanpk/markupit/issues/2)).
- **Draggable popover** — move the comment/edit box aside while composing ([#3](https://github.com/seanpk/markupit/issues/3)).
- **Annotate interactive content** — reach elements that appear only after a page interaction ([#4](https://github.com/seanpk/markupit/issues/4)).
- **Multi-page reviews** — collect annotations across pages into one brief ([#5](https://github.com/seanpk/markupit/issues/5)).

## Development

```bash
npm install
npm test                 # unit + server + requirement-coverage gate
npm run test:browser     # Playwright (run `npx playwright install` first)
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the test-first workflow and the
project's hard constraints. The specification lives in [`docs/`](./docs):
[`VISION.md`](./docs/VISION.md), [`REQUIREMENTS.md`](./docs/REQUIREMENTS.md),
[`ARCHITECTURE.md`](./docs/ARCHITECTURE.md), and the build plan in
[`docs/PLAN-0.1.md`](./docs/PLAN-0.1.md).

## License

[MIT](./LICENSE) © Sean Kennedy
