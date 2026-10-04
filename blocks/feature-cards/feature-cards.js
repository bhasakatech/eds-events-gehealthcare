/*
 * Feature Cards – resource card grid (Resources, Highlights, News)
 * Parent row: heading_* (single cell)
 * Item row:   image | content_title + content_description | cta
 *
 * Source design (events.gehealthcare.com resources-section):
 *  - card title sits ABOVE the image
 *  - the image is bordered and is itself the link to the asset
 *  - a purple square badge sits in the bottom-right corner of the image
 *    (PDF glyph for .pdf assets, diagonal arrow for other links)
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const PDF_ICON = '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false"><g fill="#fff"><path d="M77.97 74.44c-.56-.82-1.29-1.47-2.19-1.95-.9-.48-2.02-.72-3.36-.72h-3.77v17.63h3.77c1.34 0 2.46-.24 3.36-.72.9-.48 1.63-1.13 2.19-1.95.56-.82.96-1.76 1.21-2.83.25-1.07.37-2.17.37-3.32 0-1.15-.12-2.26-.37-3.32-.25-1.06-.65-2-1.21-2.82z"/><path d="M52.3 73.21c-.4-.41-.92-.74-1.56-.98-.64-.25-1.44-.37-2.4-.37h-2.87v9.1h2.87c.96 0 1.76-.12 2.4-.37.64-.25 1.16-.57 1.56-.98.4-.41.68-.89.84-1.44.16-.55.25-1.13.25-1.76 0-.63-.08-1.22-.25-1.76-.16-.55-.44-1.03-.84-1.44z"/><path d="M107.62 55.69H38.34c-3.31 0-6 2.69-6 6v36.94c0 3.31 2.69 6 6 6h69.28c3.31 0 6-2.69 6-6V61.69c0-3.32-2.68-6-6-6zM59.21 80.08c-.44 1.16-1.13 2.17-2.07 3.01-.94.85-2.17 1.51-3.67 1.99-1.5.48-3.32.72-5.45.72h-2.54v7.46c0 .6-.3.9-.9.9h-4.43c-.6 0-.9-.3-.9-.9V67.92c0-.6.3-.9.9-.9h7.87c2.19 0 4.03.24 5.53.72 1.5.48 2.73 1.13 3.67 1.97.94.83 1.62 1.82 2.03 2.95.41 1.13.62 2.36.62 3.67 0 1.34-.22 2.59-.66 3.75zM85.29 85.65c-.49 1.63-1.27 3.07-2.34 4.33-1.07 1.26-2.43 2.27-4.1 3.03-1.67.77-3.68 1.15-6.03 1.15h-9.51c-.6 0-.9-.3-.9-.9V67.92c0-.6.3-.9.9-.9h9.51c2.4 0 4.45.38 6.13 1.15 1.68.77 3.05 1.78 4.1 3.05 1.05 1.27 1.81 2.72 2.28 4.35.46 1.63.7 3.3.7 5.02 0 1.72-.24 3.41-.73 5.03zM106.52 70.96c0 .6-.3.9-.9.9H95.25v6.77h8.77c.6 0 .9.3.9.9v3.03c0 .6-.3.9-.9.9h-8.77v9.8c0 .6-.3.9-.9.9h-4.43c-.6 0-.9-.3-.9-.9V67.92c0-.6.3-.9.9-.9h15.7c.6 0 .9.3.9.9v3.04z"/><path d="M158.91 140.94v-34.97c0-2.76-2.24-5-5-5h-26.56c-2.76 0-5 2.24-5 5v34.97H108.6l31.9 34.56 31.9-34.56h-13.49z"/><path d="M66.62 41.28h65.28c7.17 0 13 5.83 13 13v40.47h8V54.28c0-11.58-9.42-21-21-21H66.62c-10.03 0-18.43 7.08-20.5 16.5h8.32c1.84-5.95 6.6-9.5 12.18-9.5zM115.56 157.31H66.62c-7.17 0-13-5.83-13-13v-33.06h-8v33.06c0 11.58 9.42 21 21 21h56.32l-7.4-8z"/></g></svg>';

// source event-icon.png: curved "share" arrow (links)
const ARROW_ICON = '<svg viewBox="3 3.5 18 18" aria-hidden="true" focusable="false"><path fill="#fff" d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/></svg>';

// source arrow-right-1.png: white play triangle (unlinked "overview video" tiles)
const PLAY_ICON = '<svg viewBox="0 0 21 27" aria-hidden="true" focusable="false"><path fill="#fff" d="M0 0l21 13.5L0 27z"/></svg>';

// source arrow-right.png: purple circle with a white chevron (text/news rows)
const ROW_ARROW_ICON = '<svg viewBox="0 0 448 448" aria-hidden="true" focusable="false"><circle cx="224" cy="224" r="220" fill="#6022a6"/><path d="M190 125l99 99-99 99" fill="none" stroke="#fff" stroke-width="14"/></svg>';

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
  const cta = ctaCell?.querySelector('a[href]');
  // content_* cell: content_title (first element) + content_description (rest)
  const titleEl = contentCell?.querySelector('h1, h2, h3, h4, strong, p');
  const title = textOf(titleEl) || textOf(contentCell);
  const clone = contentCell?.cloneNode(true);
  const cloneTitle = clone?.querySelector('h1, h2, h3, h4, strong, p');
  if (cloneTitle && textOf(cloneTitle) === title) cloneTitle.remove();
  const descriptionHtml = textOf(clone) ? clone.innerHTML.trim() : '';

  return {
    row,
    title,
    descriptionHtml,
    picture: imageCell?.querySelector('picture')?.cloneNode(true) || null,
    imageSrc: imageCell?.querySelector('img')?.src || '',
    imageAlt: imageCell?.querySelector('img')?.alt || '',
    href: cta?.href || '',
  };
}

// downloadable assets (pdf, images, office docs) get the PDF badge, like the
// source's .event-icon.larger-icon; other links get the arrow badge
function isFile(href) {
  return /\.(pdf|jpe?g|png|gif|webp|docx?|pptx?|xlsx?|zip)(\?|#|$)/i.test(href || '');
}

// product detail pages: the block sits in a plain (unstyled) section, like the
// source .product-partial-section
const SECTION_STYLES = ['light', 'light-grey', 'highlight', 'grey', 'dark'];
function inPlainSection(block) {
  const section = block.closest('.section');
  return !!section && !SECTION_STYLES.some((s) => section.classList.contains(s));
}

function isVideo(href) {
  return /scene7\.com\/is\/content\/|play\.vidyard\.com\/|\.mp4(\?|#|$)/i.test(href || '');
}

/**
 * Badge per the source tiles: "overview video" tiles (unlinked, or linked to the
 * video on product pages) show play; on product pages every other linked tile
 * shows the download badge; elsewhere files get the download badge and other
 * links the share arrow.
 */
function badgeFor(href, productTiles) {
  if (!href || (productTiles && isVideo(href))) return { icon: PLAY_ICON, variant: 'play' };
  if (productTiles || isFile(href)) return { icon: PDF_ICON, variant: 'file' };
  return { icon: ARROW_ICON, variant: '' };
}

/**
 * Product pages author the heading's "Request info" button (no model field) as
 * a lone paragraph right after the block; the source shows it under the
 * heading, so move it into the header.
 */
function adoptHeaderCta(block, header) {
  const next = block.closest('.feature-cards-wrapper')?.nextElementSibling;
  if (!header || !next?.matches('.default-content-wrapper') || next.children.length !== 1) return;
  const p = next.firstElementChild;
  const link = p.matches('p') && p.children.length === 1 && p.querySelector(':scope > a[href*="/contact-us?"]');
  if (!link) return;
  p.classList.add('feature-cards-cta');
  header.append(p);
  next.remove();
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const parentRows = rows.filter((row) => !isItemRow(row));
  const headingCell = parentRows[0]?.firstElementChild;
  const items = itemRows.map((row) => parseItem(row));

  const root = document.createElement('div');
  root.className = 'feature-cards-inner';
  const productTiles = inPlainSection(block);

  let header;
  if (headingCell) {
    header = document.createElement('div');
    header.className = 'feature-cards-header';
    header.append(...headingCell.childNodes);
    root.append(header);
  }

  const grid = document.createElement('ul');
  grid.className = 'feature-cards-grid';

  items.forEach((item) => {
    const li = document.createElement('li');
    moveInstrumentation(item.row, li);

    // title (above image)
    const title = document.createElement('p');
    title.className = 'feature-cards-card-title';
    title.textContent = item.title;

    const hasImage = !!(item.picture || item.imageSrc);
    li.className = `feature-cards-card ${hasImage ? 'feature-cards-card-media' : 'feature-cards-card-text'}`;

    // Text-only rows (e.g. news): the whole row is the link, with the
    // description (date) shown above the title and a round arrow on the right.
    if (!hasImage) {
      const desc = document.createElement('div');
      desc.className = 'feature-cards-card-description';
      desc.innerHTML = item.descriptionHtml;
      // avoid nested links when the description itself contains links
      const rowLink = !!item.href && !desc.querySelector('a');
      const row = document.createElement(rowLink ? 'a' : 'div');
      row.className = 'feature-cards-row';
      if (rowLink) row.href = item.href;
      else if (item.href) {
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.title;
        title.replaceChildren(a);
      }

      const body = document.createElement('div');
      body.className = 'feature-cards-row-body';
      body.append(title);
      if (item.descriptionHtml) body.append(desc);
      row.append(body);

      if (item.href) {
        const arrow = document.createElement('span');
        arrow.className = 'feature-cards-row-arrow';
        arrow.innerHTML = ROW_ARROW_ICON;
        row.append(arrow);
      }
      li.append(row);
      grid.append(li);
      return;
    }

    // media wrapper is the link
    const media = item.href ? document.createElement('a') : document.createElement('div');
    media.className = 'feature-cards-media';
    if (item.href) media.href = item.href;

    if (item.picture) media.append(item.picture);
    else if (item.imageSrc) {
      media.append(createOptimizedPicture(item.imageSrc, item.imageAlt || item.title, false, [{ width: '750' }]));
    }

    // corner badge
    const badge = document.createElement('span');
    const { icon, variant } = badgeFor(item.href, productTiles);
    badge.className = `feature-cards-badge${variant ? ` feature-cards-badge-${variant}` : ''}`;
    badge.innerHTML = icon;
    media.append(badge);

    li.append(title, media);
    if (item.descriptionHtml) {
      const desc = document.createElement('div');
      desc.className = 'feature-cards-card-description';
      desc.innerHTML = item.descriptionHtml;
      li.append(desc);
    }
    grid.append(li);
  });

  root.append(grid);
  block.replaceChildren(root);
  adoptHeaderCta(block, header);

  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture')?.replaceWith(optimized);
  });
}
