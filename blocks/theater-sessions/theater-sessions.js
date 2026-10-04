/*
 * Theater Sessions – Innovation Theater session video library
 *
 * Source: events.gehealthcare.com/innovation-theater/ (section.theater-videos +
 * the sticky div.search-sticky-wrapper filter bar). A responsive grid of session
 * cards (thumbnail + play icon + title + optional description + optional
 * "Speaker(s):" block). Clicking a card opens a popup video player. A toolbar
 * offers an OnDemand / Upcoming toggle plus an event filter derived from each
 * card's related event.
 *
 * Content model (xwalk container + items):
 *   Parent row : heading_* (title/level/intro)
 *   Item rows  : image(+alt) | content_title + content_description | speakers |
 *                type | videoUrl | relatedEvent | length | learnMore(+text)
 *
 * The decorate function parses the authored cells defensively (by content, not
 * by fixed index) so authors can omit optional fields safely.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// Source: purple .event-icon square with a white right-pointing arrow (21x27).
const PLAY_ICON = '<svg viewBox="0 0 21 27" aria-hidden="true" focusable="false"><path d="M0 0l21 13.5L0 27z" fill="#fff"/></svg>';
// Source: popup-exit.png — navy (#0c2340) disc with a white cross.
const CLOSE_ICON = '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="22" fill="#0c2340"/><path d="M15 15l14 14M29 15L15 29" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function isItemRow(row) {
  return [...(row?.children || [])].length >= 2;
}

// Build an embeddable Vidyard URL; fall back to the raw URL for other providers.
function buildVideoSrc(url) {
  const [, vidyardId] = (url || '').match(/(?:play|share)\.vidyard\.com\/([\w-]+)/) || [];
  if (vidyardId) {
    return `https://play.vidyard.com/${vidyardId}.html?autoplay=1&disable_popouts=1&type=inline`;
  }
  return url;
}

function looksLikeType(value) {
  const v = (value || '').trim().toLowerCase();
  if (v === 'ondemand' || v === 'on demand' || v === 'on-demand') return 'ondemand';
  if (v === 'upcoming') return 'upcoming';
  return '';
}

function isUrl(value) {
  return /^https?:\/\//i.test((value || '').trim());
}

/*
 * Build a map of field-name -> { text, html } from the xwalk field-hint comments
 * (<!-- field:name -->) that precede each value in the served block DOM. Each
 * comment "owns" the sibling element nodes that follow it until the next
 * field-hint comment. This is the authoritative way to read values because the
 * parser packs several fields (meta_type, meta_relatedEvent, meta_length,
 * video_url) as separate <p>s inside a single cell — reading the cell's combined
 * text would merge them ("upcomingSCCT 2025"). Returns {} when no hints exist,
 * so callers can fall back to content-based classification.
 */
function fieldMap(row) {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_COMMENT);
  const map = {};
  const comments = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
  comments.forEach((comment) => {
    const m = /^\s*field:([\w-]+)\s*$/.exec(comment.nodeValue || '');
    if (!m) return;
    const name = m[1];
    const parts = [];
    let sib = comment.nextSibling;
    while (sib && !(sib.nodeType === 8 && /^\s*field:/.test(sib.nodeValue || ''))) {
      if (sib.nodeType === 1) parts.push(sib);
      else if (sib.nodeType === 3 && sib.textContent.trim()) {
        const span = document.createElement('span');
        span.textContent = sib.textContent;
        parts.push(span);
      }
      sib = sib.nextSibling;
    }
    const html = parts.map((el) => el.outerHTML || el.textContent).join('').trim();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    map[name] = { html, text: (tmp.textContent || '').trim() };
  });
  return map;
}

function parseItem(row) {
  const cells = [...row.children];
  const item = {
    row,
    picture: null,
    imageSrc: '',
    imageAlt: '',
    title: '',
    descriptionHtml: '',
    speakersHtml: '',
    type: 'ondemand',
    videoUrl: '',
    relatedEvent: '',
    length: '',
    learnMoreHref: '',
    learnMoreLabel: 'Learn more',
  };

  // Preferred path: read exact values from the xwalk field-hint comments.
  const fields = fieldMap(row);
  if (Object.keys(fields).length) {
    if (fields.content_title) item.title = fields.content_title.text;
    if (fields.content_description) item.descriptionHtml = fields.content_description.html;
    if (fields.content_speakers) item.speakersHtml = fields.content_speakers.html;
    const t = looksLikeType(fields.meta_type?.text);
    if (t) item.type = t;
    if (fields.meta_relatedEvent) item.relatedEvent = fields.meta_relatedEvent.text;
    if (fields.meta_length) item.length = fields.meta_length.text;
    if (fields.video_url && isUrl(fields.video_url.text)) item.videoUrl = fields.video_url.text;
    if (fields.video_learnMore) {
      const a = fields.video_learnMore.html;
      const tmp = document.createElement('div');
      tmp.innerHTML = a;
      const link = tmp.querySelector('a[href]');
      if (link) { item.learnMoreHref = link.getAttribute('href') || ''; }
    }
    if (fields.video_learnMoreText?.text) {
      item.learnMoreLabel = fields.video_learnMoreText.text;
    }
  }

  // AEM-delivered markup has no field hints: read the model cells positionally
  // (image | content_* | meta_* | video_*). Within the grouped cells each field
  // value is its own element, so split by content.
  let positional = false;
  if (!Object.keys(fields).length && cells.length >= 4) {
    positional = true;
    const [, contentCell, metaCell, videoCell] = cells;
    const contentEls = [...contentCell.children];
    if (contentEls.length) {
      item.title = textOf(contentEls[0]);
      const rest = contentEls.slice(1);
      const spIdx = rest.findIndex((el) => /^speaker/i.test(textOf(el)));
      const desc = spIdx === -1 ? rest : rest.slice(0, spIdx);
      const speakers = spIdx === -1 ? [] : rest.slice(spIdx);
      item.descriptionHtml = desc.map((el) => el.outerHTML).join('').trim();
      item.speakersHtml = speakers.map((el) => el.outerHTML).join('').trim();
    }
    [...metaCell.children].map((el) => textOf(el)).filter(Boolean).forEach((v) => {
      const t = looksLikeType(v);
      if (t) item.type = t;
      else if (!item.length && /^\d+\s*(min|hr|hour|sec)/i.test(v)) item.length = v;
      else if (!item.relatedEvent) item.relatedEvent = v;
    });
    [...videoCell.children].forEach((el) => {
      const a = el.querySelector('a[href]') || (el.matches('a[href]') ? el : null);
      const href = a?.getAttribute('href') || '';
      const raw = textOf(el);
      if (!item.videoUrl && isUrl(raw) && (!a || href === raw)) {
        item.videoUrl = raw;
      } else if (a && !item.learnMoreHref) {
        item.learnMoreHref = href;
        if (textOf(a) && textOf(a) !== href) item.learnMoreLabel = textOf(a);
      } else if (raw && !isUrl(raw)) {
        item.learnMoreLabel = raw;
      }
    });
  }

  // Image cell (first cell that contains a picture/img)
  const imageCell = cells.find((c) => c.querySelector('picture, img'));
  if (imageCell) {
    const img = imageCell.querySelector('img');
    item.picture = imageCell.querySelector('picture')?.cloneNode(true) || null;
    item.imageSrc = img?.getAttribute('src') || '';
    item.imageAlt = img?.getAttribute('alt') || '';
  }

  // Title = first heading/strong/paragraph in the first non-image, text-only cell
  const contentCells = cells.filter((c) => c !== imageCell);

  // Learn-more link (any link that is not a bare video URL)
  const links = cells.flatMap((c) => [...c.querySelectorAll('a[href]')]);
  const learnLink = links.find((a) => !/vidyard\.com/i.test(a.getAttribute('href') || ''));
  if (learnLink && !positional) {
    item.learnMoreHref = learnLink.getAttribute('href') || '';
    item.learnMoreLabel = textOf(learnLink) || item.learnMoreLabel;
  }

  // Walk remaining cells and classify by content — only as a FALLBACK for
  // legacy rows that carry neither field hints nor the 4-cell model layout.
  // (With hints the field map is authoritative: re-classifying whole cells here
  // used to overwrite speakersHtml with the entire content_* cell.)
  let contentAssigned = !!item.title;
  if (!positional && !Object.keys(fields).length) {
    contentCells.forEach((cell) => {
      const raw = textOf(cell);
      if (!raw && !cell.querySelector('a[href]')) return;

      // Video URL (Vidyard etc.)
      const link = cell.querySelector('a[href]');
      const linkHref = link?.getAttribute('href') || '';
      if (!item.videoUrl && (/vidyard\.com/i.test(linkHref) || /vidyard\.com/i.test(raw) || (isUrl(raw) && /vidyard/i.test(raw)))) {
        item.videoUrl = /vidyard/i.test(linkHref) ? linkHref : raw;
        return;
      }

      // Type toggle
      const t = looksLikeType(raw);
      if (t && (raw.length < 20)) { item.type = t; return; }

      // Speakers block
      if (/speaker/i.test(raw) || cell.classList.contains('speakers')) {
        item.speakersHtml = cell.innerHTML.trim();
        return;
      }

      // Length ("3 Min." etc.)
      if (!item.length && /^\d+\s*(min|hr|hour|sec)/i.test(raw)) { item.length = raw; return; }

      // First substantial text cell = title + description.
      // The authored cell holds the title and description as sibling <p>
      // elements (or a heading followed by body copy). Split them so the
      // title stays short and the description renders as separate body copy.
      if (!contentAssigned) {
        const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) {
          item.title = textOf(heading);
          const descClone = cell.cloneNode(true);
          descClone.querySelector('h1, h2, h3, h4, h5, h6')?.remove();
          item.descriptionHtml = descClone.innerHTML.trim();
        } else {
          const paras = [...cell.querySelectorAll(':scope > p')];
          if (paras.length) {
            item.title = textOf(paras[0]);
            item.descriptionHtml = paras.slice(1).map((p) => p.outerHTML).join('').trim();
          } else {
            item.title = raw.split('\n')[0].trim();
          }
        }
        contentAssigned = true;
        return;
      }

      // Otherwise, treat a short plain string as the related event tag.
      if (!item.relatedEvent && !isUrl(raw) && raw.length < 80 && !link) {
        item.relatedEvent = raw;
      }
    });
  }

  if (!item.videoUrl && item.learnMoreHref && /vidyard\.com/i.test(item.learnMoreHref)) {
    item.videoUrl = item.learnMoreHref;
    item.learnMoreHref = '';
  }

  return item;
}

function slugify(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildCard(item, openPopup) {
  const li = document.createElement('li');
  li.className = 'theater-sessions-card';
  li.dataset.type = item.type;
  if (item.relatedEvent) li.dataset.event = slugify(item.relatedEvent);
  moveInstrumentation(item.row, li);

  const hasVideo = !!item.videoUrl;
  const trigger = document.createElement(hasVideo ? 'button' : 'div');
  trigger.className = 'theater-sessions-media';
  if (hasVideo) {
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', `Play video: ${item.title}`);
    trigger.addEventListener('click', () => openPopup(item));
  }

  if (item.picture) {
    trigger.append(item.picture);
  } else if (item.imageSrc) {
    trigger.append(createOptimizedPicture(item.imageSrc, item.imageAlt || item.title, false, [{ width: '750' }]));
  }
  if (hasVideo) {
    const icon = document.createElement('span');
    icon.className = 'theater-sessions-play';
    icon.innerHTML = PLAY_ICON;
    trigger.append(icon);
  }

  const title = document.createElement('p');
  title.className = 'theater-sessions-card-title';
  title.textContent = item.title;

  li.append(trigger, title);

  if (item.descriptionHtml) {
    const desc = document.createElement('div');
    desc.className = 'theater-sessions-card-desc';
    desc.innerHTML = item.descriptionHtml;
    li.append(desc);
  }

  if (item.speakersHtml) {
    const speakers = document.createElement('div');
    speakers.className = 'theater-sessions-card-speakers';
    speakers.innerHTML = item.speakersHtml;
    li.append(speakers);
  }

  return li;
}

let dialogCount = 0;

function buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'theater-sessions-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialogCount += 1;
  const titleId = `theater-sessions-dialog-title-${dialogCount}`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `
    <div class="theater-sessions-dialog-panel">
      <div class="theater-sessions-dialog-head">
        <h3 class="theater-sessions-dialog-title" id="${titleId}"></h3>
        <button type="button" class="theater-sessions-close" aria-label="Close">${CLOSE_ICON}</button>
      </div>
      <div class="theater-sessions-dialog-body">
        <div class="theater-sessions-dialog-media"></div>
        <div class="theater-sessions-dialog-info"></div>
      </div>
    </div>
  `;
  return dialog;
}

/*
 * Library mode: on the source the sticky filter bar (.search-sticky-wrapper)
 * sits directly under the hero, ABOVE the black intro (section.theater-intro).
 * When the section right before this block's section is that intro (a
 * video-text section), the toolbar is moved into a full-width band inserted
 * before the intro section. The band is a direct child of <main> so it can
 * stay sticky for the whole page. Returns false (toolbar stays in the block)
 * when there is no such intro.
 */
function hoistToolbar(block, toolbar) {
  const section = block.closest('.section');
  const intro = section?.previousElementSibling;
  if (!intro?.matches('.section') || !intro.querySelector('.video-text')) return false;

  // Re-decoration (Universal Editor): drop the band of the previous run.
  const old = intro.previousElementSibling;
  if (old?.matches('.theater-sessions-band')) old.remove();

  const band = document.createElement('div');
  // `theater-sessions` keeps the toolbar's block-scoped styles applying.
  band.className = 'theater-sessions theater-sessions-band';
  band.append(toolbar);
  intro.before(band);
  return true;
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const parentRows = rows.filter((row) => !isItemRow(row));

  const items = itemRows.map((row) => parseItem(row)).filter((it) => it.title || it.imageSrc);

  const root = document.createElement('div');
  root.className = 'theater-sessions-inner';

  // Header (title + intro) from the first parent row.
  // A titled block is an embedded "Innovation Theater" teaser (source:
  // section.modality-innovation-theater on event / product-category pages —
  // all cards, no filter bar). An untitled block is the full session library
  // (source: /innovation-theater/ section.theater-videos + sticky filter bar).
  const headingCell = parentRows[0]?.firstElementChild;
  const hasHeader = !!(headingCell && textOf(headingCell));
  if (hasHeader) {
    const header = document.createElement('div');
    header.className = 'theater-sessions-header';
    header.append(...headingCell.childNodes);
    root.append(header);
  }

  // Toolbar: event filter + OnDemand / Upcoming toggle (library mode only).
  const showToolbar = !hasHeader && items.length > 0;
  const events = [...new Set(items.map((it) => it.relatedEvent).filter(Boolean))].sort();

  const toolbar = document.createElement('div');
  toolbar.className = 'theater-sessions-toolbar';

  // Source starts with neither OnDemand nor Upcoming selected (all cards shown).
  const state = { type: '', event: '' };

  const applyFilter = (grid) => {
    grid.querySelectorAll('.theater-sessions-card').forEach((card) => {
      const typeOk = !state.type || card.dataset.type === state.type;
      const eventOk = !state.event || card.dataset.event === state.event;
      card.hidden = !(typeOk && eventOk);
    });
  };

  const grid = document.createElement('ul');
  grid.className = 'theater-sessions-grid';
  const dialog = buildDialog();
  const mediaHost = dialog.querySelector('.theater-sessions-dialog-media');
  const dialogTitle = dialog.querySelector('.theater-sessions-dialog-title');
  const dialogInfo = dialog.querySelector('.theater-sessions-dialog-info');

  const openPopup = (item) => {
    dialogTitle.textContent = item.title;
    dialogInfo.replaceChildren();
    if (item.descriptionHtml) {
      const desc = document.createElement('div');
      desc.className = 'theater-sessions-dialog-desc';
      desc.innerHTML = item.descriptionHtml;
      dialogInfo.append(desc);
    }
    if (item.speakersHtml) {
      const speakers = document.createElement('div');
      speakers.className = 'theater-sessions-dialog-speakers';
      speakers.innerHTML = item.speakersHtml;
      dialogInfo.append(speakers);
    }
    if (item.learnMoreHref) {
      const learn = document.createElement('a');
      learn.className = 'theater-sessions-dialog-learn';
      learn.href = item.learnMoreHref;
      learn.textContent = item.learnMoreLabel;
      dialogInfo.append(learn);
    }
    mediaHost.replaceChildren();
    const iframe = document.createElement('iframe');
    iframe.src = buildVideoSrc(item.videoUrl);
    iframe.title = item.title || 'Session video';
    iframe.loading = 'lazy';
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    mediaHost.append(iframe);
    if (typeof dialog.showModal === 'function') dialog.showModal();
  };

  items.forEach((item) => grid.append(buildCard(item, openPopup)));

  // Left group: event filter dropdown; Right group: OnDemand/Upcoming toggle +
  // Clear filters. Mirrors the source search-sticky-wrapper layout.
  const filters = document.createElement('div');
  filters.className = 'theater-sessions-filters';
  const controls = document.createElement('div');
  controls.className = 'theater-sessions-controls';

  let select;
  let toggle;

  // Event filter dropdown (left)
  if (showToolbar && events.length) {
    select = document.createElement('select');
    select.className = 'theater-sessions-event-filter';
    select.setAttribute('aria-label', 'Filter by event');
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'Filter by event';
    select.append(all);
    events.forEach((ev) => {
      const opt = document.createElement('option');
      opt.value = slugify(ev);
      opt.textContent = ev;
      select.append(opt);
    });
    select.addEventListener('change', () => {
      state.event = select.value;
      applyFilter(grid);
    });
    filters.append(select);
  }

  // OnDemand / Upcoming toggle (right)
  if (showToolbar) {
    toggle = document.createElement('div');
    toggle.className = 'theater-sessions-toggle';
    toggle.setAttribute('role', 'tablist');
    [['ondemand', 'OnDemand'], ['upcoming', 'Upcoming']].forEach(([value, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theater-sessions-toggle-btn';
      btn.dataset.value = value;
      btn.setAttribute('role', 'tab');
      btn.textContent = label;
      btn.setAttribute('aria-selected', value === state.type ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state.type = value;
        toggle.querySelectorAll('.theater-sessions-toggle-btn').forEach((b) => {
          b.setAttribute('aria-selected', b.dataset.value === value ? 'true' : 'false');
        });
        applyFilter(grid);
      });
      toggle.append(btn);
    });
    controls.append(toggle);
  }

  // Clear filter(s) button (right) — resets dropdown + toggle to defaults.
  if (select || toggle) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'theater-sessions-clear';
    clear.textContent = 'Clear filter(s)';
    clear.addEventListener('click', () => {
      state.type = '';
      state.event = '';
      if (select) select.value = '';
      if (toggle) {
        toggle.querySelectorAll('.theater-sessions-toggle-btn').forEach((b) => {
          b.setAttribute('aria-selected', 'false');
        });
      }
      applyFilter(grid);
    });
    controls.append(clear);
  }

  if (filters.childElementCount) toolbar.append(filters);
  if (controls.childElementCount) toolbar.append(controls);
  if (toolbar.childElementCount) {
    if (hoistToolbar(block, toolbar)) root.classList.add('is-hoisted');
    else root.append(toolbar);
  }
  root.append(grid);
  root.append(dialog);

  const closePopup = () => {
    if (dialog.open) dialog.close();
    mediaHost.replaceChildren();
  };
  dialog.querySelector('.theater-sessions-close').addEventListener('click', closePopup);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closePopup(); });
  dialog.addEventListener('close', () => mediaHost.replaceChildren());

  block.replaceChildren(root);

  // Optimize any remaining raw images.
  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture')?.replaceWith(optimized);
  });

  applyFilter(grid);
}
