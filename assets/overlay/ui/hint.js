// A single, gentle first-run hint (UX-8). Shown once per browser, dismissable, and never
// shown again.
const HINT_KEY = 'markupit:v1:hint-dismissed';

export function createHint(root) {
  function dismissed() {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  }

  return {
    maybeShow() {
      if (dismissed()) return;
      const el = document.createElement('div');
      el.className = 'mk-hint';
      const text = document.createElement('span');
      text.textContent = 'Click anything on the page to comment, edit, or remove it.';
      const btn = document.createElement('button');
      btn.textContent = 'Got it';
      const close = () => {
        try {
          localStorage.setItem(HINT_KEY, '1');
        } catch {
          /* ignore */
        }
        el.remove();
      };
      btn.addEventListener('click', close);
      el.append(text, btn);
      root.appendChild(el);
    },
  };
}
