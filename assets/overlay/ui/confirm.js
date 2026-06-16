// In-overlay confirmation dialog (UX-11). A styled replacement for the native window.confirm()
// — native dialogs are jarring and, inside a shadow root, out of place. Resolves to one of
// 'confirm' | 'cancel' | 'extra' so a caller can offer an optional third action (e.g. "Copy
// notes and Clear"). Esc / backdrop dismiss as 'cancel'. One dialog at a time.
export function createConfirm(root) {
  let open = false;

  return function confirm(
    message,
    { confirmText = 'OK', cancelText = 'Cancel', extraText = null, danger = false } = {}
  ) {
    if (open) return Promise.resolve('cancel');
    open = true;

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mk-dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'mk-dialog mk-anim';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', message);

      const msg = document.createElement('div');
      msg.className = 'mk-dialog-msg';
      msg.textContent = message;

      const buttons = document.createElement('div');
      buttons.className = 'mk-dialog-buttons';

      const cancel = document.createElement('button');
      cancel.className = 'mk-btn mk-dialog-cancel';
      cancel.textContent = cancelText;
      buttons.appendChild(cancel);

      let extra = null;
      if (extraText) {
        extra = document.createElement('button');
        extra.className = 'mk-btn mk-dialog-extra';
        extra.textContent = extraText;
        buttons.appendChild(extra);
      }

      const confirmBtn = document.createElement('button');
      confirmBtn.className = `mk-btn mk-dialog-ok${danger ? ' mk-danger' : ''}`;
      confirmBtn.textContent = confirmText;
      buttons.appendChild(confirmBtn);

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
          finish('cancel');
        }
      };

      cancel.addEventListener('click', () => finish('cancel'));
      confirmBtn.addEventListener('click', () => finish('confirm'));
      if (extra) extra.addEventListener('click', () => finish('extra'));
      // Click on the backdrop (but not the dialog) dismisses.
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish('cancel');
      });
      document.addEventListener('keydown', onKey, true);

      confirmBtn.focus();
    });
  };
}
