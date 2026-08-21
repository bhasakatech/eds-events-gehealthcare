/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: feature-cards
 * Container block: feature-cards (parent) + feature-card children
 * Source: section.resources-section (resource/feature card grid)
 *   Card forms handled:
 *     - Resources: .home-eventtile > .resource-title + <a href> wrapping image + .description
 *     - Product tiles: .product-tile > .title + <a href> + .description
 * Models: blocks/feature-cards/_feature-cards.json
 *   Parent fields:
 *     classes (select) -> skipped per hinting Rule 5
 *     heading_title (text) + heading_titleType (collapsed) ; heading_intro (textarea)
 *   Child feature-card fields (3 columns: image | content | cta):
 *     image (+imageAlt collapsed)
 *     content_title (text) + content_description (richtext)  [grouped => one cell]
 *     cta (aem-content) + ctaText (collapsed into anchor text)
 * Generated: xwalk migration
 * Note: resource cards wrap an image-only anchor, so the card title doubles as the
 * CTA label. Long asset URLs (cta hrefs) and that label are required fields that
 * appear as extra tokens vs. the source's visible text; all source visible text
 * (heading + card titles + links) is captured.
 */
export default function parse(element, { document }) {
  const hint = (name) => document.createComment(` field:${name} `);

  // --- Parent heading ------------------------------------------------------
  const headingEl = element.querySelector('.resources-title, .section-title, h1, h2, h3, .h2');
  const headingText = headingEl?.textContent?.trim() || '';
  let titleTag = 'h2';
  if (headingEl && /^h[23]$/i.test(headingEl.tagName)) titleTag = headingEl.tagName.toLowerCase();

  // --- Cards ---------------------------------------------------------------
  const cardEls = [...element.querySelectorAll('.home-eventtile, .product-tile, .resource-tile')];

  const cards = cardEls.map((tile) => {
    const titleEl = tile.querySelector('.resource-title, .title, h3, h4');
    const title = titleEl?.textContent?.trim() || '';
    // main image: prefer content image, skip icon overlays
    const img = tile.querySelector('img.event-image, .image > img, .image img, img');
    const descEl = tile.querySelector('.description');
    const descHtml = descEl && descEl.textContent.trim() ? descEl.innerHTML.trim() : '';
    const link = tile.querySelector('a[href]');
    return { title, img, descHtml, link };
  }).filter((c) => c.title || c.img || c.link);

  // Empty guard
  if (!headingText && !cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Parent heading row (single cell)
  if (headingText) {
    const h = document.createElement(titleTag);
    h.textContent = headingText;
    cells.push([[hint('heading_title'), h]]);
  }

  // Card rows: image | content(title+description) | cta
  cards.forEach((card) => {
    const imageCell = [];
    if (card.img && (card.img.getAttribute('src') || '').trim()) {
      const im = card.img.cloneNode(true);
      if (!im.getAttribute('alt')) im.setAttribute('alt', card.title);
      imageCell.push(hint('image'), im);
    }

    const contentCell = [];
    if (card.title) {
      const t = document.createElement('p');
      t.textContent = card.title;
      contentCell.push(hint('content_title'), t);
    }
    if (card.descHtml) {
      const d = document.createElement('div');
      d.innerHTML = card.descHtml;
      contentCell.push(hint('content_description'), d);
    }

    const ctaCell = [];
    if (card.link) {
      const href = card.link.getAttribute('href') || '';
      // link often wraps only an image; use card title (or title attr) as label
      const label = card.link.textContent.trim()
        || card.link.getAttribute('title')
        || card.title
        || 'Learn more';
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      ctaCell.push(hint('cta'), a);
    }

    cells.push([imageCell, contentCell, ctaCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'feature-cards', cells });
  element.replaceWith(block);
}
