// markupit overlay entry point.
//
// Placeholder during the v0.1 build — the real overlay (selection, annotation,
// queue, export) is implemented in later milestones. It is served from the reserved
// namespace and self-activates only when the activation flag is present in the URL.
const ACTIVATION_PARAM = 'markupit';

function isActivated() {
  try {
    return new URLSearchParams(location.search).has(ACTIVATION_PARAM);
  } catch {
    return false;
  }
}

if (isActivated()) {
  // Overlay boot happens here in a later milestone.
}
