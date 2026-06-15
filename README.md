# markupit

**Point it at any web page. Click anything. Say what you mean. Get back a clean, structured brief you can hand to an AI or a developer.**

`markupit` is a lightweight, local-first review overlay for web pages. You run it
against a local folder of HTML or a live URL, open the page in your browser, and
the page becomes *markable*: click any element to leave a comment, edit text in
place, or mark something for removal. When you're done, you export the whole
session as a structured prompt — ready to paste into Claude (or any coding agent)
to apply the changes.

It compresses the slowest part of the design-feedback loop —
*screenshot → describe → locate → explain* — down to *click → type → copy → paste*.

```bash
# review a local build
npx markupit ./dist

# review a live page
npx markupit https://example.com
```

Then open the printed `localhost` URL and start marking up.

---

## Why this exists

Reviewing a web page today is clumsy. You take a screenshot, draw a red box,
write "make this bigger," and then the person fixing it has to reverse-engineer
*which element* you meant. Every round trip leaks information.

The tools that try to fix this are either heavyweight SaaS platforms (BugHerd,
Marker.io), full design suites (Figma), or browser extensions that need to be
installed in developer mode and can't be scripted. None of them produce output
designed to be **handed to an AI agent**.

`markupit` is the small, sharp tool in the gap: no account, no extension, no
build-step integration. A single command, any page, structured output.

> **Status: design phase.** This repository currently contains the specification
> — vision, requirements, and architecture — not an implementation. It is written
> to be built from scratch as a clean-room project. See [`docs/`](./docs).

---

## What's in this repo

| Document | What it covers |
|----------|----------------|
| [`docs/VISION.md`](./docs/VISION.md) | The product north star — what it feels like to use, and the bar for design quality. |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | Detailed, testable behavioral requirements. The spec a build (and its test suite) is measured against. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | How the pieces fit: the CLI/server, the two source modes, the overlay engine, packaging, and testing strategy. |

## The one-line pitch

> A red pen for the web that hands its notes to a robot.
