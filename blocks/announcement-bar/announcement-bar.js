/*
 * Announcement Bar Block – GE HealthCare
 *
 * Single authored field (parent row, one cell):
 *   [0] announcement – banner text (text field)
 *
 * Renders the grey top bar:
 *   "Not all products and services may be available in your country or region."
 */

export default function decorate(block) {
  const cells = [...(block.firstElementChild?.children || [])];
  const text = cells[0]?.innerHTML?.trim() || '';

  if (!text) {
    block.closest('.section')?.remove();
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'announcement-bar-inner';
  bar.innerHTML = `<p>${text}</p>`;

  block.replaceChildren(bar);
}
