/*
 * Event Hero – reusable event landing hero
 * Cells: heading_* | meta_* | actions_* (+ actions_back: back control label,
 *        actions_backLink: optional back target, default history.back())
 *        | image (background image / video poster + image_video: Scene7 or MP4 URL)
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

// request CTAs (contact request, Jiffle meeting, registration landing page) are the
// source's white .grey-button; other links ("Learn more", "See what's new") are outlined
const REQUEST_CTA = /\/contact-us\/?\?.*request=|jifflenow\.com|landing1\.gehealthcare\.com/i;

// source heroes play a muted looping Scene7 / MP4 video (video.aem-video.hero-video)
const VIDEO_URL = /scene7\.com\/is\/content\/|\.(mp4|webm|mov)(\?|#|$)/i;

// image_video shares the background cell with the image: the URL is the cell's
// text (or a link), next to the <picture> poster
function videoUrlOf(cell) {
  const candidates = [
    ...[...(cell?.querySelectorAll('a[href]') || [])].map((a) => a.getAttribute('href')),
    ...[...(cell?.querySelectorAll('p') || [])].map((p) => textOf(p)),
    textOf(cell),
  ];
  return candidates.find((s) => s && VIDEO_URL.test(s) && !/\s/.test(s)) || '';
}

// actions_back: a plain-text paragraph in the actions cell (CTAs are links)
function backParaOf(cell) {
  return [...(cell?.querySelectorAll('p') || [])].find((el) => textOf(el) && !el.querySelector('a'));
}

function backLabelOf(cell) {
  return textOf(backParaOf(cell));
}

// actions_backLink: the link authored after the back label (CTAs come before it)
function backLinkOf(cell) {
  const para = backParaOf(cell);
  if (!para) return null;
  return [...cell.querySelectorAll('a[href]')]
    // eslint-disable-next-line no-bitwise
    .find((a) => para.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) || null;
}

// Source workshop / product-category heroes have a "Back" control that returns
// to the previous page (onclick history.back()); some category pages point it at
// their event page instead, and #Event=<slug> overrides it like on the source.
function buildBack(label, href) {
  const eventSlug = window.location.hash.match(/^#Event=([\w-]+)/)?.[1];
  const target = eventSlug ? `/events/${eventSlug}` : href;
  if (target) {
    const a = document.createElement('a');
    a.className = 'event-hero-back';
    a.href = target;
    a.textContent = label;
    return a;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'event-hero-back';
  button.textContent = label;
  button.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  });
  return button;
}

export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map((row) => row.firstElementChild).filter(Boolean);
  // background cell (image and/or video URL) and actions cell (CTAs and/or back label)
  // are positional (rows 4 and 3), with a content-based fallback for older content
  const videoCell = cells.find((c) => videoUrlOf(c));
  const videoUrl = videoUrlOf(videoCell);
  const backCell = cells[2] && cells[2] !== videoCell && backLabelOf(cells[2]) ? cells[2] : null;
  const backLabel = backLabelOf(backCell);
  const backLink = backLinkOf(backCell);
  const special = (c) => c === videoCell || c === backCell;

  const headingCell = cells.find((c) => c.querySelector('h1, h2, h3')) || cells[0];
  const metaCell = cells.find((c) => c !== headingCell && !special(c) && !c.querySelector('a, picture, img')) || cells[1];
  const actionsCell = cells.find((c) => c !== videoCell
    && [...c.querySelectorAll('a[href]')].some((a) => a !== backLink));
  const mediaCell = cells.find((c) => c?.querySelector('picture, img'));

  const heading = headingCell?.querySelector('h1, h2, h3');
  const titleTag = heading?.tagName?.toLowerCase() || 'h1';
  const title = textOf(heading) || textOf(headingCell);
  // Tagline paragraphs (richtext): text joined with spaces, authored line
  // breaks (<br>) kept.
  const taglineParas = [...(headingCell?.querySelectorAll('p') || [])]
    .filter((p) => textOf(p));

  const metaParts = [...(metaCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  // If meta collapsed into plain text nodes without p tags
  if (!metaParts.length && metaCell && metaCell !== headingCell) {
    const raw = textOf(metaCell);
    if (raw) metaParts.push(...raw.split('|').map((s) => s.trim()).filter(Boolean));
  }

  const links = [...(actionsCell?.querySelectorAll('a[href]') || [])].filter((a) => a !== backLink);
  const primary = links[0] || firstLink(actionsCell);
  const secondary = links[1];

  // --- Background media (video or image) ---
  const img = mediaCell?.querySelector('img');
  const mediaSrc = img?.getAttribute('src') || '';
  let mediaEl = null;
  if (videoUrl) {
    // the authored image (if any) is the poster
    const media = document.createElement('div');
    media.className = 'event-hero-media';
    const video = document.createElement('video');
    video.className = 'event-hero-video';
    video.src = videoUrl;
    if (mediaSrc && !isVidyard(mediaSrc)) video.poster = mediaSrc;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', img?.getAttribute('alt') || title);
    media.append(video);
    mediaEl = media;
  } else if (mediaSrc && isVidyard(mediaSrc)) {
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

  if (taglineParas.length) {
    const p = document.createElement('p');
    p.className = 'event-hero-tagline';
    taglineParas.forEach((para, index) => {
      if (index) p.append(' ');
      para.childNodes.forEach((node) => {
        if (node.nodeName === 'BR') p.append(document.createElement('br'));
        else p.append(node.textContent.replace(/\s+/g, ' '));
      });
    });
    p.innerHTML = p.innerHTML.trim().replace(/\s*<br>\s*/g, '<br>');
    content.append(p);
  }

  if (primary || secondary) {
    const actions = document.createElement('div');
    actions.className = 'event-hero-actions';
    if (primary) {
      const a = primary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-primary';
      if (REQUEST_CTA.test(a.href)) a.classList.add('event-hero-btn-request');
      actions.append(a);
    }
    if (secondary) {
      const a = secondary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-secondary';
      actions.append(a);
    }
    content.append(actions);
  }

  // workshop heroes (meta) show "Back" above everything; product category heroes
  // put "< Back to Event" on its own row above the CTAs
  if (backLabel) {
    const back = buildBack(backLabel, backLink?.getAttribute('href'));
    if (metaParts.length) {
      content.prepend(back);
    } else {
      back.classList.add('event-hero-back-inline');
      content.insertBefore(back, content.querySelector('.event-hero-actions'));
    }
  }

  root.append(content);

  if (mediaEl) {
    block.classList.add('has-media');
    block.replaceChildren(mediaEl, root);
  } else {
    block.replaceChildren(root);
  }
}
