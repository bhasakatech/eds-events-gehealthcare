/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: theater-sessions
 * Base block: theater-sessions (xwalk container + repeated theater-session items)
 * Source: events.gehealthcare.com/innovation-theater/ (section.theater-videos)
 * Generated for xwalk project — emits field-hint comments per blocks/theater-sessions/_theater-sessions.json
 *
 * Source card structure (live page — the scraper's cleaned.html strips the data
 * attribute, but the importer runs this parser against the live DOM where it is
 * present):
 *   .col-lg-4.events-wrapper > .home-eventtile
 *     a.theater-popup-trigger[title][data='{...json...}']
 *       > .image > img.event-image (thumbnail) + .event-icon (play icon)
 *     .title        -> content_title
 *     .description  -> content_description (may be empty)
 *     .speakers     -> content_speakers   (optional; begins with "Speaker(s):")
 *
 * The trigger's data='{...}' JSON carries the richer fields the visible DOM omits:
 *   related_to[].post_title -> meta_relatedEvent (the OnDemand/Upcoming event tag
 *                              that drives the block's event-filter dropdown)
 *   type ('ondemand'|'upcoming') -> meta_type (drives the OnDemand/Upcoming toggle)
 *   length                  -> meta_length
 *   zoom_link/external_link/learn_more_link -> video_url (opens the popup player)
 *   description/speakers     -> fallbacks when the visible .description/.speakers
 *                              cells are empty (client-rendered).
 *
 * Cell layout per item row (matches the block's documented cells + model order):
 *   1) image            -> <!-- field:image --> <img alt=imageAlt>
 *   2) content          -> <!-- field:content_title -->title <!-- field:content_description -->desc
 *   3) content_speakers -> <!-- field:content_speakers -->speakers (empty when absent)
 *   4) meta+video       -> <!-- field:meta_type -->.. relatedEvent .. length .. video_url
 */

function comment(document, name) {
  return document.createComment(` field:${name} `);
}

function textOf(el) {
  return (el && el.textContent ? el.textContent : '').trim();
}

function hasContent(el) {
  if (!el) return false;
  if (el.querySelector && el.querySelector('img, picture, a, br, span, b, strong')) return true;
  return textOf(el).length > 0;
}

// Parse the trigger's data='{...}' attribute. It is HTML-entity-encoded JSON;
// the DOM already decodes entities when we read getAttribute, so JSON.parse works
// directly. Returns {} on any malformed/missing data so the parser degrades to
// the visible-DOM values.
function readCardData(card) {
  const trigger = card.querySelector('a.theater-popup-trigger, a[data]');
  const raw = trigger && trigger.getAttribute('data');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Pick the best related event name from the data JSON.
function relatedEventOf(data) {
  const rel = data.related_to;
  if (Array.isArray(rel) && rel.length && rel[0] && rel[0].post_title) {
    return String(rel[0].post_title).trim();
  }
  if (typeof data.featured_in_event === 'string') return data.featured_in_event.trim();
  return '';
}

// Pick a playable video/destination URL from the data JSON.
function videoUrlOf(data) {
  const candidates = [data.zoom_link, data.external_link, data.learn_more_link, data.register_link];
  const url = candidates.find((v) => typeof v === 'string' && /^https?:\/\//i.test(v));
  return url ? url.trim() : '';
}

function pushField(cell, document, name, value) {
  if (!value) return;
  const p = document.createElement('p');
  p.textContent = value;
  cell.push(comment(document, name), p);
}

export default function parse(element, { document }) {
  const cards = Array.from(element.querySelectorAll('.home-eventtile'));

  // Empty-block guard: nothing to build.
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Optional container heading row (kept as a single-cell parent row so decorate
  // treats it as the header, not an item). Only emit when a real section heading
  // exists outside the cards.
  const heading = element.querySelector(':scope h1, :scope h2, :scope h3');
  const isInsideCard = heading && heading.closest('.home-eventtile');
  if (heading && !isInsideCard) {
    const headingCell = [comment(document, 'heading_title'), heading.cloneNode(true)];
    const intro = heading.nextElementSibling;
    if (intro && intro.tagName === 'P' && textOf(intro)) {
      headingCell.push(comment(document, 'heading_intro'), intro.cloneNode(true));
    }
    cells.push([headingCell]);
  }

  cards.forEach((card) => {
    const img = card.querySelector('img.event-image') || card.querySelector('.image img');
    const titleEl = card.querySelector('.title');
    const descEl = card.querySelector('.description');
    const speakersEl = card.querySelector('.speakers');
    const trigger = card.querySelector('a.theater-popup-trigger, a[title]');
    const data = readCardData(card);

    const title = textOf(titleEl) || (trigger && trigger.getAttribute('title'))
      || (typeof data.title === 'string' ? data.title.trim() : '') || '';

    // Skip malformed cards with neither a title nor an image.
    if (!title && !img) return;

    // --- Cell 1: image (imageAlt collapses into the <img alt> attribute) ---
    const imageCell = [];
    if (img) {
      const imgEl = img.cloneNode(true);
      imgEl.removeAttribute('class');
      if (title) imgEl.setAttribute('alt', title);
      imageCell.push(comment(document, 'image'), imgEl);
    }

    // --- Cell 2: content_* group (title + description + speakers) ---
    // ALL fields sharing the "content_" prefix must live in ONE cell so md2jcr
    // aligns the group to the model's content_* columns. Splitting the prefix
    // across cells breaks column alignment ("every field must align").
    const contentCell = [];
    if (title) {
      const titleP = document.createElement('p');
      titleP.textContent = title;
      contentCell.push(comment(document, 'content_title'), titleP);
    }
    if (hasContent(descEl)) {
      const descWrap = document.createElement('div');
      Array.from(descEl.childNodes).forEach((n) => descWrap.appendChild(n.cloneNode(true)));
      if (textOf(descWrap) || descWrap.querySelector('img, a')) {
        contentCell.push(comment(document, 'content_description'), descWrap);
      }
    } else if (typeof data.description === 'string' && data.description.trim()) {
      // Client-rendered card: description only in the data JSON.
      const descWrap = document.createElement('div');
      descWrap.innerHTML = data.description.trim();
      contentCell.push(comment(document, 'content_description'), descWrap);
    }
    if (hasContent(speakersEl)) {
      const spWrap = document.createElement('div');
      Array.from(speakersEl.childNodes).forEach((n) => spWrap.appendChild(n.cloneNode(true)));
      contentCell.push(comment(document, 'content_speakers'), spWrap);
    } else if (typeof data.speakers === 'string' && data.speakers.trim()) {
      const spWrap = document.createElement('div');
      spWrap.innerHTML = data.speakers.trim();
      contentCell.push(comment(document, 'content_speakers'), spWrap);
    }

    // --- Cell 3: meta_* group (type | relatedEvent | length) ---
    const metaCell = [];
    const type = (typeof data.type === 'string' ? data.type.trim().toLowerCase() : '');
    if (type === 'ondemand' || type === 'upcoming') {
      pushField(metaCell, document, 'meta_type', type);
    }
    pushField(metaCell, document, 'meta_relatedEvent', relatedEventOf(data));
    pushField(metaCell, document, 'meta_length', typeof data.length === 'string' ? data.length.trim() : '');

    // --- Cell 4: video_* group (url) ---
    const videoCell = [];
    pushField(videoCell, document, 'video_url', videoUrlOf(data));

    cells.push([imageCell, contentCell, metaCell, videoCell]);
  });

  // If every card was skipped, unwrap gracefully.
  if (!cells.length || (cells.length === 1 && !cells[0][1])) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'theater-sessions', cells });
  element.replaceWith(block);
}
