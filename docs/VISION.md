# Vision

## The feeling we're building

Using `markupit` should feel like picking up a beautiful pen on beautiful paper.
The page you're reviewing is the work; the overlay is a thin, confident layer of
ink on top of it. Nothing about the tool should feel like "developer chrome
bolted onto a website." It should feel **designed** — calm, precise, and quietly
delightful.

This is a deliberate reaction against the tool's own ancestry. The first version
of this idea (built privately for one project) worked but was *clunky*: a
utilitarian toolbar, jarring hover states, popovers that fought the page, labels
that leaked internal jargon. It got the job done and was unpleasant to use. The
whole point of `markupit` as a fresh project is to clear that bar by a wide
margin.

**Beautiful to look at. A joy to use. Those are requirements, not nice-to-haves.**

## Design principles

1. **The page is the hero.** The overlay never competes with the content it sits
   on. Chrome is minimal, gets out of the way, and recedes when you're not using
   it. When you're reading, you should almost forget the tool is there.

2. **Direct manipulation.** You point at the actual thing and act on it. No
   "describe the element in a text box." Clicking *is* selecting; the element you
   touch is the element you mean. The connection between gesture and target is
   never ambiguous.

3. **Motion with intent.** Transitions are quick, smooth, and meaningful — a
   popover grows from the point you clicked; a deleted element collapses rather
   than vanishing; the queue slides rather than blinks. Nothing janks, nothing
   teleports. Respect `prefers-reduced-motion`.

4. **Legible at a glance.** Comment markers, edit indicators, and delete marks are
   instantly distinguishable. You can look at a marked-up page and read its state
   like a proof-read manuscript, without clicking anything.

5. **No jargon leaks.** The reviewer is a designer, a client, a founder — not
   necessarily an engineer. The UI speaks in plain language ("comment," "edit,"
   "remove," "copy notes"), never in internal terms (selectors, node types,
   adapter names). Internal identifiers exist only in the exported payload, where
   the *agent* needs them.

6. **Keyboard-fluent.** Everything reachable by mouse is reachable by key. A
   power user can move between elements, open a comment, and export without
   touching the trackpad. Shortcuts are discoverable, not secret.

7. **Local-first and private.** Your review never leaves your machine unless you
   choose to copy it out. No account, no telemetry, no network round-trip to
   annotate. Work survives a reload.

8. **Disappears completely.** When the tool is off, the page is byte-for-byte the
   original. `markupit` is something you *point at* a page, never something you
   *build into* one. There is no production footprint to remove later.

## What success looks like

- A non-technical reviewer opens the page, is given a one-sentence hint, and is
  productively marking things up within ten seconds — no instructions needed.
- A reviewer says, unprompted, that it's *nice to use*.
- The exported brief is good enough that an agent applies the whole batch
  correctly on the first pass, because every note is anchored to an unambiguous
  element and written in clear intent.
- Someone screenshots the marked-up page just because it looks good.

## Explicit non-goals

- **Not a real-time collaboration platform.** One reviewer, one machine, one
  session. No live cursors, no comment threads, no user accounts.
- **Not a design tool.** You can't draw, restyle, or move things freely. You
  annotate existing elements; you don't compose new layouts.
- **Not a permanent widget.** It is not embedded into a deployed site as a
  feedback button. It's a tool you point at a page during review.
- **Not a bug tracker.** Export is a brief, not a ticket queue with assignees and
  statuses. Integrations live downstream of the copied output, if at all.
