// The minimal idle chrome: a small pill in the corner showing the live annotation count
// (QUE-4). Clicking it opens the queue. It recedes visually so the page stays the hero
// (UX-2) — one small pill, nothing more, until you reach for it.
export function createToolbar(root, onOpen) {
  const pill = document.createElement('div');
  pill.className = 'mk-toolbar';
  pill.setAttribute('role', 'button');
  pill.tabIndex = 0;
  pill.innerHTML = `<span>markupit</span><span class="mk-count">0</span>`;
  const count = pill.querySelector('.mk-count');

  pill.addEventListener('click', onOpen);
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  });
  root.appendChild(pill);

  return {
    render(n) {
      count.textContent = String(n);
    },
  };
}
