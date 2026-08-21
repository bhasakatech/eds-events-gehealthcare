/**
 * video-text block
 *
 * Content model: fields grouped by `<!-- field:name -->` comment markers,
 * collapsed by shared prefix into two cells (content_* and cta_*):
 *   field:content_heading      -> one <p> with the heading text
 *   field:content_description  -> one or more <p> (intro, dates, note...)
 *   field:content_videoUrl     -> one <p> with a Vidyard (or other) URL
 *   field:content_thumbnail    -> optional poster <picture>/<img>
 *   field:cta_link / cta_label -> the CTA (linked or plain-label)
 *
 * Renders a dark media-beside-text band: heading on top, then a row with
 * an embedded video on the left and the description + CTA on the right.
 */

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
 * Builds the embeddable iframe URL for a Vidyard share/player URL.
 * Falls back to the raw URL for non-Vidyard providers.
 * @param {string} url
 * @returns {string}
 */
function buildVideoSrc(url) {
  const [, vidyardId] = url.match(/play\.vidyard\.com\/([\w-]+)/) || [];
  if (vidyardId) {
    return `https://play.vidyard.com/${vidyardId}.html?autoplay=1&loop=1&muted=1&disable_popouts=1&type=inline`;
  }
  return url;
}

export default function decorate(block) {
  // The importer emits one field-group per row (block > div > div), so gather
  // the field-hint groups across every cell. Fall back to a single legacy cell.
  const cells = [...block.querySelectorAll(':scope > div > div')];
  if (!cells.length) return;

  const groups = {};
  cells.forEach((cell) => {
    const cellGroups = groupByFieldComments(cell);
    Object.entries(cellGroups).forEach(([field, nodes]) => {
      groups[field] = (groups[field] || []).concat(nodes);
    });
  });

  const headingText = (groups.content_heading?.[0]?.textContent || '').trim();
  const descriptionNodes = groups.content_description || [];
  const videoUrl = (groups.content_videoUrl?.[0]?.textContent || '').trim();
  const ctaLabel = (groups.cta_label?.[0]?.textContent
    || groups.cta_link?.[0]?.textContent || '').trim();

  block.textContent = '';

  /* Heading (full-width, top) */
  if (headingText) {
    const heading = document.createElement('div');
    heading.className = 'video-text-heading';
    const h2 = document.createElement('h2');
    h2.textContent = headingText;
    heading.append(h2);
    block.append(heading);
  }

  /* Body row: media + content */
  const body = document.createElement('div');
  body.className = 'video-text-body';

  /* Media (video) */
  if (videoUrl) {
    const media = document.createElement('div');
    media.className = 'video-text-media';
    const iframe = document.createElement('iframe');
    iframe.src = buildVideoSrc(videoUrl);
    iframe.title = headingText || 'Video';
    iframe.loading = 'lazy';
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    media.append(iframe);
    body.append(media);
  }

  /* Content: description + CTA */
  const content = document.createElement('div');
  content.className = 'video-text-content';

  if (descriptionNodes.length) {
    const description = document.createElement('div');
    description.className = 'video-text-description';
    descriptionNodes.forEach((node) => description.append(node));
    content.append(description);
  }

  if (ctaLabel) {
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'video-text-cta';
    cta.textContent = ctaLabel;
    content.append(cta);
  }

  body.append(content);
  block.append(body);
}
