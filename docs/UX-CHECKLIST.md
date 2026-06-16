# UX checklist

Automated tests cover behavior; they can't judge whether the overlay *feels* right.
This checklist captures the subjective `UX-*` qualities from
[`VISION.md`](./VISION.md) and [`REQUIREMENTS.md`](./REQUIREMENTS.md) that a human
should tick before each release. Each line traces to a requirement ID.

Run `npx @seanpk/markupit ./test/fixtures/static-site`, open the printed `?markupit` URL, and
walk through:

## Looks designed, not debug

- [ ] **[UX-1]** The overlay looks like a considered product — type, spacing, colour,
      and contrast feel intentional, not like a debug panel.
- [ ] **[UX-2]** Chrome is minimal and recedes when idle; it never obscures content and
      doesn't clash with the page's own fixed/sticky navigation.
- [ ] The marked-up page is something you'd happily screenshot.

## Legible at a glance

- [ ] **[UX-3]** Hover, selection, comment, edit, and remove are each instantly
      distinguishable. You can read the page's review state without clicking.

## Motion

- [ ] **[UX-4]** The popover grows from the click point; the queue slides; removal
      collapses. Nothing janks, teleports, or flashes unstyled on load.
- [ ] **[UX-5]** With OS "reduce motion" on, transitions drop to instant — no animation,
      still fully usable.

## Language

- [ ] **[UX-6]** No internal jargon anywhere in the UI — no "selector", "node",
      "anchor", or class names. Plain words only ("comment", "edit", "remove",
      "copy notes"). IDs appear only in the exported brief.

## Keyboard & onboarding

- [ ] **[UX-7]** You can move between elements, open a comment, confirm, and export
      without the mouse. Shortcuts feel discoverable, not secret.
- [ ] **[UX-8]** A first-time reviewer gets one gentle hint, can dismiss it, and never
      sees it again.
- [ ] A non-technical reviewer is productively marking up within ten seconds, unprompted.

## Cross-browser

- [ ] **[UX-9]** Looks and works correctly in current Chrome, Firefox, and Safari, and
      down to tablet width.
