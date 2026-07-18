export default function decorate(block) {
  block.classList.add('split-hero');

  const rows = [...block.children];

  if (rows.length !== 1) return;

  const cols = [...rows[0].children];

  if (cols.length !== 3) return;

  const [left, media, overlay] = cols;

  const leftWrapper = document.createElement('div');
  leftWrapper.className = 'split-hero-left';
  leftWrapper.append(...left.childNodes);

  const rightWrapper = document.createElement('div');
  rightWrapper.className = 'split-hero-right';
  rightWrapper.append(...media.childNodes);

  const overlayWrapper = document.createElement('div');
  overlayWrapper.className = 'split-hero-overlay';
  overlayWrapper.append(...overlay.childNodes);

  rightWrapper.append(overlayWrapper);

  block.replaceChildren(leftWrapper, rightWrapper);
}
