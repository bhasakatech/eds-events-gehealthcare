/*
 * Feature Cards – reusable card grid (Highlights, Theater, Resources, News)
 * Parent: classes + heading_*
 * Item: image | content_* | cta(+Text)
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function isItemRow(row) {
  return [...(row?.children || [])].length >= 2;
}

function parseItem(row) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const contentCell = cells[1];
  const ctaCell = cells[2];
  const img = imageCell?.querySelector('img');
  const titleEl = contentCell?.querySelector('h1, h2, h3, h4, strong, p');
  const title = textOf(titleEl);
  const clone = contentCell?.cloneNode(true);
  clone?.querySelector('h1, h2, h3, h4, strong')?.remove();
  const firstP = clone?.querySelector('p');
  if (firstP && textOf(firstP) === title) firstP.remove();
  const cta = ctaCell?.querySelector('a[href]');

  return {
    row,
    title,
    description: clone?.innerHTML?.trim() || '',
    picture: imageCell?.querySelector('picture')?.cloneNode(true) || null,
    imageSrc: img?.src || '',
    imageAlt: img?.alt || title,
    href: cta?.href || '',
    ctaLabel: textOf(cta) || 'Learn more',
  };
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const parentRows = rows.filter((row) => !isItemRow(row));
  const headingCell = parentRows[0]?.firstElementChild;
  const items = itemRows.map((row) => parseItem(row));

  const root = document.createElement('div');
  root.className = 'feature-cards-inner';

  if (headingCell) {
    const header = document.createElement('div');
    header.className = 'feature-cards-header';
    header.append(...headingCell.childNodes);
    root.append(header);
  }

  const grid = document.createElement('ul');
  grid.className = 'feature-cards-grid';

  items.forEach((item) => {
    const li = document.createElement('li');
    moveInstrumentation(item.row, li);

    const media = document.createElement('div');
    media.className = 'feature-cards-media';
    if (item.picture) media.append(item.picture);
    else if (item.imageSrc) {
      media.append(createOptimizedPicture(item.imageSrc, item.imageAlt, false, [{ width: '750' }]));
    }

    const body = document.createElement('div');
    body.className = 'feature-cards-body';
    const title = document.createElement('h3');
    title.textContent = item.title;
    body.append(title);
    if (item.description) {
      const desc = document.createElement('div');
      desc.className = 'feature-cards-desc';
      desc.innerHTML = item.description;
      body.append(desc);
    }
    if (item.href) {
      const a = document.createElement('a');
      a.className = 'feature-cards-cta';
      a.href = item.href;
      a.textContent = item.ctaLabel;
      body.append(a);
    }

    li.append(media, body);
    grid.append(li);
  });

  root.append(grid);
  block.replaceChildren(root);

  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture')?.replaceWith(optimized);
  });
}
