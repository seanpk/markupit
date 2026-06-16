// Browser-side overlay constants.

export const ACTIVATION_PARAM = 'markupit';

// localStorage namespace; versioned so the persisted shape can evolve. Keyed by page
// (origin + pathname) so the activation flag in the query string never fragments storage.
export const STORAGE_PREFIX = 'markupit:v1:';

// A very high stacking context so chrome sits above page content without us having to
// understand the page's own z-index landscape.
export const Z_BASE = 2147480000;

// Attribute marking page elements the overlay has touched (edit/remove treatments), so
// they are excluded from re-selection as content (SEL-5) and can be found for cleanup.
export const EDITED_ATTR = 'data-mk-edited';
export const REMOVED_ATTR = 'data-mk-removed';

export function pageKey() {
  return STORAGE_PREFIX + location.origin + location.pathname;
}

export function isActivated() {
  try {
    return new URLSearchParams(location.search).has(ACTIVATION_PARAM);
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
