/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: products-solutions
 * Container block: products-solutions (parent) + product-category children
 * Source: section.page-section.modality-section
 *   Server HTML carries only the section heading + descriptor paragraph; the
 *   product-category tiles are rendered client-side into .modality-wrapper
 *   (empty in server DOM), so no category rows can be extracted here.
 * Models: blocks/products-solutions/_products-solutions.json
 *   Parent fields:
 *     heading_title (text) + heading_titleType (collapsed h2/h3)
 *     actions_info/actions_infoText/actions_demo/actions_demoText (no server source)
 *     actions_disclaimer (textarea) -- reused to carry the section descriptor
 *       paragraph, which has no dedicated model field (documented compromise;
 *       ensures the intro copy is captured for authors to relocate).
 * Generated: xwalk migration
 */
export default function parse(element, { document }) {
  const hint = (name) => document.createComment(` field:${name} `);

  const container = element.querySelector('#overview, .container') || element;

  // Heading
  const headingEl = container.querySelector('h1, h2, h3, .h2, [class*="title"]');
  const headingText = headingEl?.textContent?.trim() || '';
  let titleTag = 'h2';
  if (headingEl && /^h[23]$/i.test(headingEl.tagName)) titleTag = headingEl.tagName.toLowerCase();

  // Descriptor paragraph (section intro). Exclude the heading element itself.
  const descEl = [...container.querySelectorAll('p')]
    .find((p) => p.textContent.trim());
  const descHtml = descEl ? descEl.innerHTML.trim() : '';

  // Attempt category tiles if any were server-rendered (usually none).
  const tiles = [...element.querySelectorAll('.modality-wrapper .product-tile, .modality-wrapper .modality-tile')];

  // Empty guard
  if (!headingText && !descHtml && !tiles.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Parent row 1: heading group
  if (headingText) {
    const h = document.createElement(titleTag);
    h.textContent = headingText;
    cells.push([[hint('heading_title'), h]]);
  }

  // Parent row 2: descriptor carried in disclaimer field (no dedicated intro field)
  if (descHtml) {
    const d = document.createElement('div');
    d.innerHTML = descHtml;
    cells.push([[hint('actions_disclaimer'), d]]);
  }

  // Category rows (only if server-rendered): image | content_* | cta | (assets omitted)
  tiles.forEach((tile) => {
    const img = tile.querySelector('img');
    const titleEl = tile.querySelector('.title, h3, h4');
    const catTitle = titleEl?.textContent?.trim() || '';
    const descTileEl = tile.querySelector('.description');
    const link = tile.querySelector('a[href]');

    const imageCell = [];
    if (img && (img.getAttribute('src') || '').trim()) {
      const im = img.cloneNode(true);
      if (!im.getAttribute('alt')) im.setAttribute('alt', catTitle);
      imageCell.push(hint('image'), im);
    }

    const contentCell = [];
    if (catTitle) {
      const t = document.createElement('p');
      t.textContent = catTitle;
      contentCell.push(hint('content_title'), t);
    }
    if (descTileEl && descTileEl.textContent.trim()) {
      const dd = document.createElement('div');
      dd.innerHTML = descTileEl.innerHTML.trim();
      contentCell.push(hint('content_description'), dd);
    }

    const ctaCell = [];
    if (link) {
      const a = link.cloneNode(true);
      ctaCell.push(hint('cta'), a);
    }

    // assets column left empty (no server-side asset data)
    cells.push([imageCell, contentCell, ctaCell, ['']]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'products-solutions', cells });
  element.replaceWith(block);
}
