# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project is pre-1.0: minor/patch bumps only, and anything may change between
releases (see [Semantic Versioning](https://semver.org/spec/v2.0.0.html) §4).

## [Unreleased]

## [0.1.1] - 2026-06-16

### Added

- **Draggable annotation popover.** Drag the comment/edit box by its title bar
  (look for the ⋮⋮ grip) to read the surrounding page while composing. It stays
  fixed on screen as you scroll, clamps to the viewport, keeps its position
  across re-renders, and never loses in-progress text. ([#3])

### Changed

- Releases now publish from CI on a published GitHub Release via npm Trusted
  Publishing (OIDC), with build provenance and no long-lived token. ([#11])

## [0.1.0] - 2026-06-16

Initial release of `@seanpk/markupit` — a local-first CLI that serves a local
site or file and injects a shadow-DOM review overlay.

### Added

- Serve a local directory or `.html` file and review it with `?markupit`.
- Click any element to **comment**, **edit** its text, or **mark it for
  removal** — each reversible, with multiple annotations per element.
- **Review queue** listing every annotation with click-to-locate, plus a live
  count.
- One-click **Markdown export** of a structured review brief, ready to hand to
  an AI agent or developer.
- **Review-note history**: clearing archives the notes (timestamped) instead of
  discarding them; copy or delete entries individually, or clear all.
- **Styled in-overlay confirmations** — no native browser dialogs.
- Annotations **persist across reloads** (localStorage) and re-anchor to their
  elements.
- **Zero runtime dependencies** and full shadow-DOM style isolation.

[Unreleased]: https://github.com/seanpk/markupit/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/seanpk/markupit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/seanpk/markupit/releases/tag/v0.1.0
[#3]: https://github.com/seanpk/markupit/issues/3
[#11]: https://github.com/seanpk/markupit/pull/11
