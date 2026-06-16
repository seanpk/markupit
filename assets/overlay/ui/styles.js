// The overlay design system, as a single stylesheet string adopted into the shadow root.
// Kept here so the whole visual language lives in one place and is style-isolated from the
// page (UX-10). Tokens echo the markupit logo: ink / slate / muted, with one accent per
// action so the marked-up page reads like a proof-read manuscript (UX-3).
//
// Note: 0.1 uses a system font stack rather than a bundled DM Sans woff2 (avoids shipping
// a binary and keeps the overlay fully offline). Bundling the brand font is a follow-up (#6).

export const CSS = `
:host {
  /* tokens */
  --mk-ink: #1b2a3b;
  --mk-slate: #3d4f60;
  --mk-muted: #7b8fa0;
  --mk-surface: #ffffff;
  --mk-surface-2: #f4f7fa;
  --mk-border: #e1e8ef;
  --mk-comment: #e0a93b;
  --mk-edit: #2f6df0;
  --mk-remove: #d64545;
  --mk-shadow: 0 6px 24px -6px rgba(27, 42, 59, 0.28), 0 2px 6px -2px rgba(27, 42, 59, 0.18);
  --mk-radius: 12px;
  --mk-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --mk-dur: 140ms;
  --mk-ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  all: initial;
  /* The host lives in the light DOM, so a hostile page rule such as a universal selector
     with font-family/color !important matches it and would otherwise inherit into the
     shadow tree. Mark the inherited resets !important so :host (higher specificity) wins
     even against the page's !important (UX-10). */
  font-family: var(--mk-font) !important;
  color: var(--mk-ink) !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  letter-spacing: normal !important;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }

@media (prefers-reduced-motion: reduce) {
  :host { --mk-dur: 0ms; }
  .mk-anim { animation: none !important; }
}

/* --- highlight layer (hover + selection rectangles) --- */
.mk-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.mk-rect {
  position: fixed;
  pointer-events: none;
  border-radius: 4px;
  transition: top var(--mk-dur) var(--mk-ease), left var(--mk-dur) var(--mk-ease),
    width var(--mk-dur) var(--mk-ease), height var(--mk-dur) var(--mk-ease), opacity var(--mk-dur);
}
.mk-rect.mk-hover {
  border: 1.5px solid var(--mk-slate);
  background: rgba(61, 79, 96, 0.06);
}
.mk-rect.mk-selected {
  border: 2px solid var(--mk-ink);
  background: rgba(27, 42, 59, 0.06);
  /* A white outer ring keeps the focus outline legible on dark page backgrounds,
     where the ink border alone would disappear. */
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 2px 10px -2px rgba(27, 42, 59, 0.35);
}

/* on-page annotation dots */
.mk-dot {
  position: fixed;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
  border: 2px solid var(--mk-surface);
  box-shadow: 0 1px 4px rgba(27, 42, 59, 0.3);
  transform: translate(-50%, -50%);
  z-index: 2;
}
.mk-dot.mk-k-comment { background: var(--mk-comment); }
.mk-dot.mk-k-edit { background: var(--mk-edit); }
.mk-dot.mk-k-remove { background: var(--mk-remove); }

/* --- popover --- */
.mk-popover {
  position: fixed;
  z-index: 5;
  min-width: 240px;
  max-width: 320px;
  background: var(--mk-surface);
  border: 1px solid var(--mk-border);
  border-radius: var(--mk-radius);
  box-shadow: var(--mk-shadow);
  padding: 12px;
  transform-origin: var(--mk-origin, top left);
}
.mk-popover.mk-anim { animation: mk-grow var(--mk-dur) var(--mk-ease); }
@keyframes mk-grow {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
.mk-label {
  font-size: 12px;
  color: var(--mk-muted);
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mk-actions { display: flex; gap: 6px; }
.mk-btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--mk-border);
  background: var(--mk-surface);
  color: var(--mk-ink);
  border-radius: 8px;
  padding: 6px 10px;
  transition: background var(--mk-dur), border-color var(--mk-dur), color var(--mk-dur);
}
.mk-btn:hover { background: var(--mk-surface-2); }
.mk-btn:focus-visible { outline: 2px solid var(--mk-edit); outline-offset: 1px; }
.mk-btn.mk-on-comment { color: var(--mk-comment); border-color: var(--mk-comment); }
.mk-btn.mk-on-edit { color: var(--mk-edit); border-color: var(--mk-edit); }
.mk-btn.mk-on-remove { color: var(--mk-remove); border-color: var(--mk-remove); }
.mk-textarea {
  font: inherit;
  font-size: 14px;
  width: 100%;
  min-height: 72px;
  resize: vertical;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--mk-border);
  border-radius: 8px;
  color: var(--mk-ink);
}
.mk-textarea:focus-visible { outline: 2px solid var(--mk-edit); outline-offset: 0; }
.mk-row { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.mk-hint-key { color: var(--mk-muted); font-size: 11px; }

/* --- toolbar pill --- */
.mk-toolbar {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mk-ink);
  color: var(--mk-surface);
  border-radius: 999px;
  padding: 8px 14px;
  box-shadow: var(--mk-shadow);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
}
.mk-toolbar .mk-count {
  background: var(--mk-surface);
  color: var(--mk-ink);
  border-radius: 999px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* --- queue panel --- */
.mk-queue {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 340px;
  max-width: 88vw;
  z-index: 7;
  background: var(--mk-surface);
  border-left: 1px solid var(--mk-border);
  box-shadow: var(--mk-shadow);
  transform: translateX(100%);
  transition: transform var(--mk-dur) var(--mk-ease);
  display: flex;
  flex-direction: column;
}
.mk-queue.mk-open { transform: translateX(0); }
.mk-queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--mk-border);
}
.mk-queue-title { font-weight: 700; font-size: 15px; }
.mk-queue-list { overflow-y: auto; flex: 1; padding: 6px; }
.mk-entry {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.mk-entry:hover { background: var(--mk-surface-2); border-color: var(--mk-border); }
.mk-entry-label { font-size: 13px; font-weight: 600; color: var(--mk-ink); }
.mk-entry-kinds { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
.mk-chip {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--mk-surface);
}
.mk-chip.mk-k-comment { background: var(--mk-comment); }
.mk-chip.mk-k-edit { background: var(--mk-edit); }
.mk-chip.mk-k-remove { background: var(--mk-remove); }
.mk-entry-orphan { font-size: 11px; color: var(--mk-remove); margin-top: 4px; }
.mk-queue-foot { padding: 12px 16px; border-top: 1px solid var(--mk-border); display: flex; gap: 8px; }
.mk-queue-empty { padding: 24px 16px; color: var(--mk-muted); font-size: 13px; text-align: center; }

/* --- toast --- */
.mk-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%) translateY(8px);
  z-index: 9;
  background: var(--mk-ink);
  color: var(--mk-surface);
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition: opacity var(--mk-dur), transform var(--mk-dur) var(--mk-ease);
  pointer-events: none;
}
.mk-toast.mk-show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* --- first-run hint --- */
.mk-hint {
  position: fixed;
  left: 50%;
  bottom: 72px;
  transform: translateX(-50%);
  z-index: 8;
  background: var(--mk-surface);
  border: 1px solid var(--mk-border);
  border-radius: 999px;
  box-shadow: var(--mk-shadow);
  padding: 10px 16px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.mk-hint button {
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: none;
  color: var(--mk-edit);
  cursor: pointer;
}

/* --- review-note history (in the queue panel) --- */
.mk-queue-history { border-top: 1px solid var(--mk-border); }
.mk-history-toggle {
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: var(--mk-muted);
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  padding: 10px 16px;
}
.mk-history-toggle:hover { color: var(--mk-ink); }
.mk-history-toggle:focus-visible { outline: 2px solid var(--mk-edit); outline-offset: -2px; }
.mk-history-list { max-height: 40vh; overflow-y: auto; padding: 0 12px 8px; }
.mk-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--mk-border);
}
.mk-history-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mk-history-time { font-size: 12px; font-weight: 600; color: var(--mk-ink); }
.mk-history-summary { font-size: 11px; color: var(--mk-muted); }
.mk-history-actions { display: flex; gap: 6px; flex-shrink: 0; }
.mk-history-copy { font-size: 12px; padding: 4px 8px; }
.mk-history-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  color: var(--mk-muted);
}
.mk-history-del svg { display: block; width: 15px; height: 15px; }
.mk-history-del:hover { color: var(--mk-remove); border-color: var(--mk-remove); }
.mk-history-clear {
  margin-top: 8px;
  width: 100%;
  color: var(--mk-remove);
  border-color: var(--mk-border);
}

/* --- confirmation dialog (styled replacement for window.confirm) --- */
.mk-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(27, 42, 59, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.mk-dialog {
  background: var(--mk-surface);
  border: 1px solid var(--mk-border);
  border-radius: var(--mk-radius);
  box-shadow: var(--mk-shadow);
  padding: 20px;
  max-width: 360px;
  width: 100%;
}
.mk-dialog.mk-anim { animation: mk-grow var(--mk-dur) var(--mk-ease); }
.mk-dialog-msg { font-size: 14px; font-weight: 600; color: var(--mk-ink); white-space: pre-line; }
.mk-dialog-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.mk-btn.mk-danger {
  background: var(--mk-remove);
  border-color: var(--mk-remove);
  color: var(--mk-surface);
}
.mk-btn.mk-danger:hover { background: #c23b3b; border-color: #c23b3b; }
`;
