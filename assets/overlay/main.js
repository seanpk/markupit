// markupit overlay entry point. Injected (dormant) into every served page; it boots the
// annotation UI only when the activation flag is present in the URL (ACT-2). Without it,
// the overlay adds zero chrome and never touches the page (ACT-3).
import { isActivated } from './constants.js';

function start() {
  // Lazy-import the app so an inactive page pays almost nothing for the injected script.
  import('./app.js')
    .then(({ boot }) => boot())
    .catch((err) => {
      // Never break the host page (NFR-4); fail quietly.
      if (typeof console !== 'undefined') console.warn('[markupit] failed to start:', err);
    });
}

if (isActivated()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
