export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map((r) => r.firstElementChild).filter(Boolean);
  const headingCell = cells.find((c) => c.querySelector('h1, h2, h3, h4')) || cells[0];
  const bodyCell = cells.find((c) => c !== headingCell) || cells[1];

  const root = document.createElement('div');
  root.className = 'content-band-inner';

  if (headingCell) {
    const header = document.createElement('div');
    header.className = 'content-band-header';
    header.append(...headingCell.childNodes);
    // remove empty headings
    header.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
      if (!h.textContent.trim()) h.remove();
    });
    if (header.textContent.trim() || header.querySelector('h1, h2, h3, h4')) {
      root.append(header);
    }
  }

  if (bodyCell) {
    const body = document.createElement('div');
    body.className = 'content-band-body';
    body.append(...bodyCell.childNodes);
    root.append(body);
  }

  block.replaceChildren(root);
}
