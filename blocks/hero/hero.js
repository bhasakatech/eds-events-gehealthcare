/*
 * Hero – full-width hero band
 *
 * Model (blocks/hero/_hero.json), one row per field group as delivered by AEM:
 *   [0] media   (reference: <picture>, or a link to a video/image asset)
 *   [1] text    (richtext: heading, copy, CTAs)
 *   [2] caption (text: optional overlay caption on the media)
 *
 * Rows are identified by content as well as position so the block degrades
 * gracefully when authors leave fields empty or older content omits rows.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;
const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function buildMedia(cell) {
  if (!cell) return null;
  const picture = cell.querySelector('picture');
  const link = cell.querySelector('a[href]');
  const img = cell.querySelector('img');
  if (!picture && !img && !link) return null;

  const media = document.createElement('div');
  media.className = 'hero-media';

  if (picture || img) {
    const source = img?.getAttribute('src') || '';
    const optimized = createOptimizedPicture(source, img?.getAttribute('alt') || '', true, [{ width: '2000' }]);
    if (img) moveInstrumentation(img, optimized.querySelector('img'));
    media.append(optimized);
    return media;
  }

  const href = link.getAttribute('href') || '';
  if (VIDEO_RE.test(href)) {
    const video = document.createElement('video');
    video.src = href;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-label', textOf(link) === href ? 'Background video' : textOf(link));
    media.append(video);
  } else if (IMAGE_RE.test(href)) {
    media.append(createOptimizedPicture(href, '', true, [{ width: '2000' }]));
  } else {
    return null;
  }
  return media;
}

export default function decorate(block) {
  block.classList.add('hero-layout');
  const rows = [...block.children];
  const cells = rows.map((row) => row.firstElementChild).filter(Boolean);

  // Positional (model order) with content-based fallback.
  let [mediaCell, textCell, captionCell] = cells;
  const hasMedia = (c) => !!c?.querySelector('picture, img, a[href]');
  const hasHeading = (c) => !!c?.querySelector('h1, h2, h3, h4, h5, h6');
  if (cells.length < 3 || (hasHeading(mediaCell) && !hasHeading(textCell))) {
    textCell = cells.find((c) => hasHeading(c)) || cells.find((c) => textOf(c) && !hasMedia(c));
    mediaCell = cells.find((c) => c !== textCell && hasMedia(c));
    captionCell = cells.find((c) => c !== textCell && c !== mediaCell && textOf(c));
  }

  const media = buildMedia(mediaCell);

  const content = document.createElement('div');
  content.className = 'hero-content';
  if (textCell) {
    // Unwrap headings that richtext storage wrapped in <p> (<p><h1>..</h1></p>).
    textCell.querySelectorAll('p > h1, p > h2, p > h3').forEach((h) => {
      const p = h.parentElement;
      if (p.children.length === 1 && !textOf(p).replace(textOf(h), '').trim()) p.replaceWith(h);
    });
    [...textCell.querySelectorAll('p')].forEach((p) => {
      if (!textOf(p) && !p.querySelector('picture, img')) p.remove();
    });
    content.append(...textCell.childNodes);
  }

  const caption = textOf(captionCell);
  if (media && caption) {
    const cap = document.createElement('p');
    cap.className = 'hero-caption';
    cap.textContent = caption;
    media.append(cap);
  }

  block.replaceChildren(...[content, media].filter(Boolean));
  if (!media) block.classList.add('no-media');
}
