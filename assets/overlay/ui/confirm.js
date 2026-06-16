// In-overlay confirmation dialog (UX). A styled replacement for the native window.confirm()
// — native dialogs are jarring and, inside a shadow root, out of place. Returns a Promise
// that resolves true (confirmed) or false (cancelled / dismissed). One dialog at a time.
export function createConfirm(root) {
  let open = false;

  return function confirm(message, { okText = 'OK', cancelText = 'Cancel', danger = false } = {}) {
    if (open) return Promise.resolve(false);
    open = true;

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mk-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'mk-dialog mk-anim';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const msg = document.createElement('div');
      msg.className = 'mk-dialog-msg';
      msg.textContent = message;
      dialog.setAttribute('aria-label', message);

      const buttons = document.createElement('div');
      buttons.className = 'mk-dialog-buttons';

      const cancel = document.createElement('button');
      cancel.className = 'mk-btn mk-dialog-cancel';
      cancel.textContent = cancelText;

      const ok = document.createElement('button');
      ok.className = `mk-btn mk-dialog-ok${danger ? ' mk-danger' : ''}`;
      ok.textContent = okText;

      buttons.append(cancel, ok);
      dialog.append(msg, buttons);
      overlay.appendChild(dialog);
      root.appendChild(overlay);

      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        open = false;
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(result);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      };

      cancel.addEventListener('click', () => finish(false));
      ok.addEventListener('click', () => finish(true));
      // Click on the backdrop (but not the dialog) dismisses.
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish(false);
      });
      document.addEventListener('keydown', onKey, true);

      ok.focus();
    });
  };
}
