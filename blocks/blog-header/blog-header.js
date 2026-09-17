/**
 * Blog Header block.
 * Expected structure (produced by auto-blocking in scripts.js):
 *   row 1: [ picture ]        - cover image
 *   row 2: [ h1 title ]       - blog title
 *   row 3: [ meta ]           - author + publication date
 *   row 4: [ description ]    - optional subtitle/summary
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row, i) => {
    const cell = row.firstElementChild;
    if (!cell) return;

    if (i === 0 && cell.querySelector('picture, img')) {
      row.className = 'blog-header-image';
      cell.className = '';
    } else if (cell.querySelector('h1, h2')) {
      row.className = 'blog-header-title';
      cell.className = '';
    } else if (cell.classList.contains('blog-header-meta')) {
      row.className = 'blog-header-meta-row';
    } else {
      row.className = 'blog-header-description';
      cell.className = '';
    }
  });
}
