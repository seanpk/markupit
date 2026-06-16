// Layout math + a single rAF-batched tracker that keeps fixed-position chrome pinned to
// page elements as the page scrolls or resizes. Centralizing this avoids per-component
// scroll listeners thrashing layout.
import { prefersReducedMotion } from '../constants.js';

export function rectOf(el) {
  return el.getBoundingClientRect();
}

export function isInViewport(el) {
  const r = rectOf(el);
  return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
}

/**
 * Choose a viewport-clamped position for a popover of the given size near an anchor point,
 * flipping above/left when it would overflow.
 */
export function placePopover(point, size, margin = 8) {
  let left = point.x;
  let top = point.y + 12;
  if (left + size.width + margin > innerWidth) left = innerWidth - size.width - margin;
  if (left < margin) left = margin;
  if (top + size.height + margin > innerHeight) {
    top = point.y - size.height - 12; // flip above
  }
  if (top < margin) top = margin;
  return { left, top };
}

/**
 * Clamp a box of `size` so it sits fully inside the viewport with a `margin` gutter. Unlike
 * placePopover this applies no offset/flip — it's for a position the user chose (a drag), kept
 * on-screen. Degrades gracefully when the box is larger than the viewport (pins to the margin
 * rather than going negative).
 */
export function clampBox(left, top, size, margin = 8) {
  const maxLeft = Math.max(margin, innerWidth - size.width - margin);
  const maxTop = Math.max(margin, innerHeight - size.height - margin);
  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top: Math.min(Math.max(top, margin), maxTop),
  };
}

export function scrollIntoViewCentered(el) {
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  });
}

// A shared tracker: subscribers are invoked on every scroll/resize, rAF-batched so all
// reads happen together and we never schedule more than one frame at a time.
export function createTracker() {
  const subs = new Set();
  let scheduled = false;

  function flush() {
    scheduled = false;
    for (const fn of subs) fn();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  }

  addEventListener('scroll', schedule, true);
  addEventListener('resize', schedule);

  return {
    add(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    tick: schedule,
    destroy() {
      removeEventListener('scroll', schedule, true);
      removeEventListener('resize', schedule);
      subs.clear();
    },
  };
}
