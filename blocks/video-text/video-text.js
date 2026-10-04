/**
 * video-text block
 *
 * Content model: fields collapsed by shared prefix into two rows (content_*
 * and cta_*). Imported previews carry `<!-- field:name -->` hints; AEM
 * delivery does not, so the structure is also read positionally:
 *   field:content_heading      -> one <p> with the heading text
 *   field:content_description  -> one or more <p> (intro, dates, note...)
 *   field:content_videoUrl     -> one <p> with a Vidyard/YouTube/Vimeo/MP4 URL
 *                                 (legacy content: a bare YouTube id)
 *   field:content_thumbnail    -> optional poster <picture>/<img>
 *   field:cta_link / cta_label -> the CTA (linked or plain-label)
 *
 * Renders a full-width heading, then a body row with the media (video,
 * poster or nothing) and the description + CTA. The look (purple product
 * band vs black Innovation Theater intro) is driven by CSS from the section
 * context; `video-left` / `video-right` render the legacy split panel.
 */

const URL_RE = /^https?:\/\/\S+$/i;
// Bare YouTube id (legacy authored content), e.g. "1O-g30osvA8".
const YT_ID_RE = /^[\w-]{11}$/;

/**
 * @param {string} value
 * @returns {boolean} true when the text looks like a video URL or a bare id
 */
function isVideoRef(value) {
  if (URL_RE.test(value)) return true;
  return YT_ID_RE.test(value) && /\d/.test(value) && /[a-z]/i.test(value);
}

/**
 * Splits the authored cell into named field groups using the field: comments.
 * @param {Element} cell
 * @returns {Object<string, Node[]>}
 */
function groupByFieldComments(cell) {
  const groups = {};
  let current = null;
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      const [, field] = node.textContent.trim().match(/^field:(\w+)/) || [];
      if (field) {
        current = field;
        groups[current] = groups[current] || [];
        return;
      }
    }
    if (current && !(node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) {
      groups[current].push(node);
    }
  });
  return groups;
}

/**
 * Reads the field groups from the structure AEM delivers for the model (no
 * field-hint comments): the content cell holds heading <p>, description
 * richtext, video URL <p> and thumbnail <picture>; a following cell holds the
 * CTA. The content cell is the first cell with element children, so legacy
 * markup with leading plain-text or empty rows still resolves.
 * @param {Element[]} cells
 * @returns {Object<string, Node[]>}
 */
function groupByStructure(cells) {
  const groups = {};
  const contentIndex = cells.findIndex((cell) => cell.children.length);
  if (contentIndex < 0) return groups;
  const contentCell = cells[contentIndex];
  const els = [...contentCell.children];
  const thumb = els.find((el) => el.matches('picture, img') || el.querySelector('picture, img'));
  const urlEl = [...els].reverse()
    .find((el) => el !== thumb && !el.querySelector('a') && isVideoRef(el.textContent.trim()));
  // A trailing paragraph holding only a link is the CTA (legacy content).
  const last = els[els.length - 1];
  const inlineCta = last && last !== thumb && last !== urlEl && els.length > 1
    && last.querySelector('a[href]') && last.textContent.trim() === last.querySelector('a').textContent.trim()
    ? last : null;
  const textEls = els.filter((el) => ![thumb, urlEl, inlineCta].includes(el));
  if (textEls.length) groups.content_heading = [textEls.shift()];
  if (textEls.length) groups.content_description = textEls;
  if (urlEl) groups.content_videoUrl = [urlEl];
  if (thumb) groups.content_thumbnail = [thumb];
  if (inlineCta) groups.cta_link = [inlineCta];
  cells.slice(contentIndex + 1).forEach((cell) => {
    const link = cell.querySelector('a[href]');
    if (link && !groups.cta_link) groups.cta_link = [link];
    const label = [...cell.children].find((el) => !el.querySelector('a') && el.textContent.trim());
    if (label && !groups.cta_label) groups.cta_label = [label];
  });
  return groups;
}

/**
 * Resolves the authored video reference to an embed descriptor.
 * @param {string} ref URL or bare YouTube id
 * @returns {{type: 'iframe'|'video', src: string}}
 */
function resolveVideo(ref) {
  const [, vidyardId] = ref.match(/(?:play|share)\.vidyard\.com\/(?:watch\/)?([\w-]+)/) || [];
  if (vidyardId) {
    return {
      type: 'iframe',
      src: `https://play.vidyard.com/${vidyardId}.html?autoplay=1&loop=1&muted=1&disable_popouts=1&type=inline`,
    };
  }
  const [, ytId] = ref.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
    || (YT_ID_RE.test(ref) ? [ref, ref] : []);
  if (ytId) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&rel=0`,
    };
  }
  const [, vimeoId] = ref.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [];
  if (vimeoId) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1` };
  }
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(ref)) return { type: 'video', src: ref };
  return { type: 'iframe', src: ref };
}

/**
 * @param {{type: string, src: string}} video
 * @param {string} title
 * @returns {Element} the player element
 */
function createPlayer(video, title) {
  if (video.type === 'video') {
    const el = document.createElement('video');
    el.src = video.src;
    el.muted = true;
    el.loop = true;
    el.autoplay = true;
    el.playsInline = true;
    el.controls = true;
    el.preload = 'metadata';
    el.setAttribute('aria-label', title);
    return el;
  }
  const iframe = document.createElement('iframe');
  iframe.src = video.src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  return iframe;
}

/**
 * Builds the media column: a player, a click-to-play poster (video + poster),
 * or a static poster image (poster only).
 * @param {string} videoRef
 * @param {Element|undefined} thumb
 * @param {string} title
 * @returns {Element|null}
 */
function buildMedia(videoRef, thumb, title) {
  const picture = thumb?.matches?.('picture, img') ? thumb : thumb?.querySelector?.('picture, img');
  if (!videoRef && !picture) return null;

  const media = document.createElement('div');
  media.className = 'video-text-media';

  if (!videoRef) {
    media.append(picture);
    return media;
  }

  const video = resolveVideo(videoRef);
  if (!picture) {
    media.append(createPlayer(video, title));
    return media;
  }

  const poster = document.createElement('button');
  poster.type = 'button';
  poster.className = 'video-text-poster';
  poster.setAttribute('aria-label', `Play video: ${title}`);
  poster.append(picture);
  const icon = document.createElement('span');
  icon.className = 'video-text-play';
  icon.setAttribute('aria-hidden', 'true');
  poster.append(icon);
  poster.addEventListener('click', () => {
    const player = createPlayer(video, title);
    if (player.tagName === 'IFRAME') player.removeAttribute('loading');
    poster.replaceWith(player);
    player.focus();
  }, { once: true });
  media.append(poster);
  return media;
}

export default function decorate(block) {
  // One field group per row (block > div > div). Local previews of imported
  // content still carry the field-hint comments; AEM-delivered markup does not,
  // so fall back to reading the model structure positionally.
  const cells = [...block.querySelectorAll(':scope > div > div')];
  if (!cells.length) return;

  let groups = {};
  cells.forEach((cell) => {
    const cellGroups = groupByFieldComments(cell);
    Object.entries(cellGroups).forEach(([field, nodes]) => {
      groups[field] = (groups[field] || []).concat(nodes);
    });
  });
  if (!Object.keys(groups).length) groups = groupByStructure(cells);

  const headingText = (groups.content_heading?.[0]?.textContent || '').trim();
  const descriptionNodes = groups.content_description || [];
  const videoRef = (groups.content_videoUrl?.[0]?.textContent || '').trim();
  const thumb = (groups.content_thumbnail || []).find((n) => n.nodeType === Node.ELEMENT_NODE);
  const ctaLink = groups.cta_link?.[0]?.querySelector?.('a[href]') || groups.cta_link?.[0];
  const ctaHref = ctaLink?.getAttribute?.('href') || '';
  const ctaLabel = (groups.cta_label?.[0]?.textContent
    || groups.cta_link?.[0]?.textContent || '').trim();
  const split = block.classList.contains('video-left') || block.classList.contains('video-right');

  // Intro look (source section.theater-intro): the band that introduces the
  // Innovation Theater listing, i.e. directly followed by a theater-sessions
  // section, or explicitly authored with the "dark" option.
  const nextSection = block.closest('.section')?.nextElementSibling;
  if (!split && (block.classList.contains('dark') || nextSection?.querySelector('.theater-sessions'))) {
    block.classList.add('intro');
  }

  block.textContent = '';

  /* Heading (full-width, top; inside the text panel for split variants) */
  let heading = null;
  if (headingText) {
    heading = document.createElement('div');
    heading.className = 'video-text-heading';
    const h2 = document.createElement('h2');
    h2.textContent = headingText;
    heading.append(h2);
  }

  /* Body row: media + content */
  const body = document.createElement('div');
  body.className = 'video-text-body';

  const media = buildMedia(videoRef, thumb, headingText || 'Video');
  if (media) body.append(media);
  else block.classList.add('no-media');

  /* Content: description + CTA */
  const content = document.createElement('div');
  content.className = 'video-text-content';
  if (split && heading) content.append(heading);

  if (descriptionNodes.length) {
    const description = document.createElement('div');
    description.className = 'video-text-description';
    descriptionNodes.forEach((node) => description.append(node));
    content.append(description);
  }

  if (ctaLabel) {
    let cta;
    if (ctaHref && ctaHref !== '#') {
      cta = document.createElement('a');
      cta.href = ctaHref;
    } else {
      cta = document.createElement('button');
      cta.type = 'button';
    }
    cta.className = 'video-text-cta';
    cta.textContent = ctaLabel;
    content.append(cta);
  }

  if (content.children.length) body.append(content);
  if (heading && !split) block.append(heading);
  block.append(body);
}
