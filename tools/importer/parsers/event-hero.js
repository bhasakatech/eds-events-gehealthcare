/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: event-hero
 * Base block: event-hero (simple block, single column)
 * Source: section.hero-section.header-section (event page hero + product-hero variant)
 * Model: blocks/event-hero/_event-hero.json
 * Field groups (each => one single-column row):
 *   heading_* : heading_title (h1/h2 tag = heading_titleType), heading_tagline
 *   meta_*    : meta_date | meta_booth | meta_location
 *   actions_* : actions_primary (+primaryText collapsed), actions_secondary (+secondaryText collapsed)
 *   image     : image (+imageAlt collapsed)
 * Generated: xwalk migration
 */
export default function parse(element, { document }) {
  const hint = (name) => document.createComment(` field:${name} `);

  // --- Title ---------------------------------------------------------------
  const titleEl = element.querySelector('.h1.title, .title.h1, h1, h2, .hero-title, .title');
  const titleText = titleEl?.textContent?.trim() || '';
  let titleTag = 'h1';
  if (titleEl && /^h[12]$/i.test(titleEl.tagName)) titleTag = titleEl.tagName.toLowerCase();
  else if (titleEl?.classList?.contains('h2')) titleTag = 'h2';

  // --- Event meta (date | booth | location) --------------------------------
  // Event-page form: p.event-time / p.event-topic / p.event-location
  // Product-hero form: .subtext containing "|" separators
  const metaParts = [];
  const metaDate = element.querySelector('.event-time')?.textContent?.trim();
  const metaBooth = element.querySelector('.event-topic')?.textContent?.trim();
  const metaLoc = element.querySelector('.event-location')?.textContent?.trim();
  if (metaDate || metaBooth || metaLoc) {
    metaParts.push(metaDate || '', metaBooth || '', metaLoc || '');
  }

  // --- Tagline / subtext (exclude meta + separator-only text) --------------
  const taglineParts = [];
  const subtextEls = [...element.querySelectorAll(
    '.event-desc, .subtext, .subtitle, [class*="subtext"]',
  )];
  subtextEls.forEach((el) => {
    const t = el.textContent.trim();
    if (!t) return;
    if (!metaParts.length && t.includes('|')) {
      // legacy single-line meta: "Date | Booth | Location"
      metaParts.push(...t.split('|').map((s) => s.trim()).filter(Boolean));
    } else if (t !== '|') {
      taglineParts.push(t);
    }
  });

  // --- CTAs (real links first, then button-like divs) ----------------------
  const anchors = [...element.querySelectorAll('a[href]')];
  const buttonDivs = [...element.querySelectorAll(
    '.secondary-button, .primary-button, .contact-button, .req-info, .btn, [class*="button"]',
  )].filter((el) => el.tagName !== 'A' && !el.querySelector('a[href]') && el.textContent.trim());
  const ctaCandidates = [...anchors, ...buttonDivs];

  const toAnchor = (el) => {
    const a = document.createElement('a');
    a.href = el.getAttribute?.('href') || '#';
    a.textContent = el.textContent.trim();
    return a;
  };

  // --- Background image (only if it has a real src) ------------------------
  const bgImg = element.querySelector(
    'img.vidyard-player-container, img[class*="background"], img[class*="bg"], picture img, img',
  );
  const hasBg = bgImg && (bgImg.getAttribute('src') || '').trim();

  // --- Empty guard ---------------------------------------------------------
  if (!titleText && !taglineParts.length && !ctaCandidates.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 1: heading group
  const headingCell = [];
  if (titleText) {
    const h = document.createElement(titleTag);
    h.textContent = titleText;
    headingCell.push(hint('heading_title'), h);
  }
  if (taglineParts.length) {
    const p = document.createElement('p');
    p.textContent = taglineParts.join(' ');
    headingCell.push(hint('heading_tagline'), p);
  }
  if (headingCell.length) cells.push([headingCell]);

  // Row 2: meta group (date | booth | location)
  if (metaParts.length) {
    const metaCell = [];
    const [date, booth, location] = metaParts;
    if (date) metaCell.push(hint('meta_date'), document.createTextNode(date));
    if (booth) metaCell.push(hint('meta_booth'), document.createTextNode(booth));
    if (location) metaCell.push(hint('meta_location'), document.createTextNode(location));
    if (metaCell.length) cells.push([metaCell]);
  }

  // Row 3: actions group (primary + secondary CTA; label collapses into anchor text)
  const [primary, secondary] = ctaCandidates;
  if (primary || secondary) {
    const actionsCell = [];
    if (primary) actionsCell.push(hint('actions_primary'), toAnchor(primary));
    if (secondary) actionsCell.push(hint('actions_secondary'), toAnchor(secondary));
    cells.push([actionsCell]);
  }

  // Row 4: background image
  if (hasBg) {
    const img = bgImg.cloneNode(true);
    if (!img.getAttribute('alt')) img.setAttribute('alt', titleText);
    cells.push([[hint('image'), img]]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'event-hero', cells });
  element.replaceWith(block);
}
