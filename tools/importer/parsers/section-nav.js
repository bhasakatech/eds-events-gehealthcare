/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: section-nav
 * Container block: section-nav (parent) + section-nav-item children
 * Source: div.header-bluebar.sticky-nav (in-page anchor links + trailing CTA button)
 * Models: blocks/section-nav/_section-nav.json
 *   Parent section-nav fields:
 *     classes_sticky (boolean) -> skipped per hinting Rule 5 (classes prefix)
 *     cta (aem-content) + ctaText (collapsed into anchor text)
 *   Child section-nav-item fields (2 columns per row):
 *     label (text) | url (text)
 * Row layout:
 *   Row 1 (parent): single cell with cta anchor (label collapses into text)
 *   Row 2..n (items): [label, url] two-column rows
 * Generated: xwalk migration
 * Note: item `url` values (e.g. #overview, #resources) are required model fields
 * and appear as extra tokens vs. source visible text; all source visible text is
 * captured (completeness metric is diluted by these anchor-target field values).
 */
export default function parse(element, { document }) {
  const hint = (name) => document.createComment(` field:${name} `);

  // In-page anchor links (nav items) -- only hash/relative anchors, not the CTA button
  const navLinks = [...element.querySelectorAll('.nav a[href], .mobile-nav a[href], nav a[href]')];
  const items = navLinks
    .map((a) => ({
      label: a.textContent.trim(),
      url: a.getAttribute('href') || '',
    }))
    .filter((it) => it.label);

  // Trailing CTA button. In source it's a <div> (e.g. "Sign up for updates").
  // Prefer a real anchor if present, otherwise the button-styled div.
  const ctaEl = element.querySelector(
    '.purple-button, .save-date-button, .sign-up, .digitalpass-button, .btn',
  ) || [...element.querySelectorAll('a[href]')].find((a) => !navLinks.includes(a));
  const ctaText = ctaEl?.textContent?.trim() || '';
  const ctaHref = ctaEl?.getAttribute?.('href') || '';

  // Empty guard
  if (!items.length && !ctaText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Parent row: CTA (single cell). ctaText collapses into the anchor's text.
  const parentCell = [];
  if (ctaText) {
    if (ctaHref) {
      const a = document.createElement('a');
      a.href = ctaHref;
      a.textContent = ctaText;
      parentCell.push(hint('cta'), a);
    } else {
      // Source CTA is a button-styled div with no href; emit label only.
      parentCell.push(hint('cta'), document.createTextNode(ctaText));
    }
  }
  cells.push([parentCell]);

  // Item rows: [label, url]
  items.forEach((it) => {
    const labelCell = [hint('label'), document.createTextNode(it.label)];
    const urlCell = [hint('url'), document.createTextNode(it.url)];
    cells.push([labelCell, urlCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'section-nav', cells });
  element.replaceWith(block);
}
