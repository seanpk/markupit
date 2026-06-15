// Shared constants. The reserved prefix and activation flag are the ONLY coupling
// between the server and the overlay (see ARCHITECTURE.md).

// Path namespace for the overlay's own assets. Matched before any page file so a
// reviewed page can never shadow overlay assets (SRC-8). Wrapped in dunders to make
// an accidental collision with a real site path vanishingly unlikely.
export const RESERVED_PREFIX = '/__markupit__/';

// The overlay self-activates only when this query flag is present (ACT-2). Its presence
// also lets a marked-up session re-open by link (ACT-5).
export const ACTIVATION_PARAM = 'markupit';

// Marker attribute placed on injected markup so re-serving never doubles the overlay
// (ACT-4, idempotent injection).
export const INJECTION_MARKER = 'data-markupit-injected';

// Default port; falls back to the next free port if taken (CLI-5).
export const DEFAULT_PORT = 4870;

// Local-first: bind to loopback only unless an explicit --host is given (CLI-6).
export const DEFAULT_HOST = '127.0.0.1';
