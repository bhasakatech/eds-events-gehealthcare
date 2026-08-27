/*
 * Event Hero – reusable event landing hero
 * Cells: heading_* | meta_* | actions_* | image (background video/image)
 *
 * Source layout (events.gehealthcare.com): full-width purple band with a
 * background video occupying the right half on desktop (stacked on top on
 * mobile) and a text panel (title, event meta line, CTA) on the left.
 */

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function firstLink(el) {
  return el?.querySelector('a[href]');
}

// Vidyard share/player URLs render as an embeddable iframe, not an <img>.
function isVidyard(src) {
  return /(?:play|share)\.vidyard\.com|vidyard\.com\/(?:watch|share)/i.test(src);
}

export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map((row) => row.firstElementChild).filter(Boolean);

  const headingCell = cells.find((c) => c.querySelector('h1, h2, h3')) || cells[0];
  const metaCell = cells.find((c) => c !== headingCell && !c.querySelector('a, picture, img')) || cells[1];
  const actionsCell = cells.find((c) => c?.querySelector('a[href]'));
  const mediaCell = cells.find((c) => c?.querySelector('picture, img'));

  const heading = headingCell?.querySelector('h1, h2, h3');
  const titleTag = heading?.tagName?.toLowerCase() || 'h1';
  const title = textOf(heading) || textOf(headingCell);
  const taglineParts = [...(headingCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  const tagline = taglineParts.join(' ');

  const metaParts = [...(metaCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  // If meta collapsed into plain text nodes without p tags
  if (!metaParts.length && metaCell && metaCell !== headingCell) {
    const raw = textOf(metaCell);
    if (raw) metaParts.push(...raw.split('|').map((s) => s.trim()).filter(Boolean));
  }

  const links = [...(actionsCell?.querySelectorAll('a[href]') || [])];
  const primary = links[0] || firstLink(actionsCell);
  const secondary = links[1];

  // --- Background media (video or image) ---
  const img = mediaCell?.querySelector('img');
  const mediaSrc = img?.getAttribute('src') || '';
  let mediaEl = null;
  if (mediaSrc && isVidyard(mediaSrc)) {
    const media = document.createElement('div');
    media.className = 'event-hero-media';
    const iframe = document.createElement('iframe');
    iframe.className = 'event-hero-video';
    iframe.src = mediaSrc;
    iframe.title = img.getAttribute('alt') || title;
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('frameborder', '0');
    media.append(iframe);
    mediaEl = media;
  } else if (mediaSrc) {
    const media = document.createElement('div');
    media.className = 'event-hero-media';
    const image = document.createElement('img');
    image.src = mediaSrc;
    image.alt = img.getAttribute('alt') || '';
    image.loading = 'eager';
    image.decoding = 'async';
    media.append(image);
    mediaEl = media;
  }

  const root = document.createElement('div');
  root.className = 'event-hero-inner';

  const content = document.createElement('div');
  content.className = 'event-hero-content';

  const titleEl = document.createElement(titleTag);
  titleEl.className = 'event-hero-title';
  titleEl.textContent = title;
  content.append(titleEl);

  if (metaParts.length) {
    const meta = document.createElement('div');
    meta.className = 'event-hero-meta';
    metaParts.forEach((part, index) => {
      if (index) {
        const sep = document.createElement('span');
        sep.className = 'event-hero-meta-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '|';
        meta.append(sep);
      }
      const span = document.createElement('span');
      span.className = 'event-hero-meta-item';
      span.textContent = part;
      meta.append(span);
    });
    content.append(meta);
  }

  if (tagline) {
    const p = document.createElement('p');
    p.className = 'event-hero-tagline';
    p.textContent = tagline;
    content.append(p);
  }

  if (primary || secondary) {
    const actions = document.createElement('div');
    actions.className = 'event-hero-actions';
    if (primary) {
      const a = primary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-primary';
      actions.append(a);
    }
    if (secondary) {
      const a = secondary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-secondary';
      actions.append(a);
    }
    content.append(actions);
  }

  root.append(content);

  if (mediaEl) {
    block.classList.add('has-media');
    block.replaceChildren(mediaEl, root);
  } else {
    block.replaceChildren(root);
  }
}
