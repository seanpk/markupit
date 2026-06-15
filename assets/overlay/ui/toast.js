// Transient confirmations ("Copied notes", "Reset"). Plain language, no jargon (UX-6).
export function createToast(root) {
  const el = document.createElement('div');
  el.className = 'mk-toast';
  el.setAttribute('role', 'status');
  root.appendChild(el);
  let timer = null;

  return function toast(message) {
    el.textContent = message;
    el.classList.add('mk-show');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('mk-show'), 1800);
  };
}
