/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: video-text
 * Container block: video-text (parent) + video-text-item child
 * Source: div.theater-intro (Innovation Theater: heading + video + copy + CTA)
 * Models: blocks/video-text/_video-text.json
 * Note: this is a project-custom container block (not the generic library "Video"
 * block). Structure follows blocks/video-text/_video-text.json + the decorate
 * contract (heading/description/videoUrl/thumbnail/CTA stacked in one item cell).
 *   Parent video-text field: videoTextClasses (multiselect layout) -> skipped (classes-style, no source value)
 *   Child video-text-item fields (all stacked in a single cell, per decorate's
 *   `block > div > div` sequential-children contract):
 *     videoTextHeading      (text)
 *     videoTextDescription  (richtext)
 *     videoTextVideoUrl     (text)
 *     videoTextThumbnail    (reference, optional)
 *     videoTextCtaLink      (aem-content, optional)
 *     videoTextCtaLabel     (text, optional)
 * Generated: xwalk migration
 */
export default function parse(element, { document }) {
  const hint = (name) => document.createComment(` field:${name} `);

  // Heading
  const headingEl = element.querySelector('.h2, h1, h2, h3, [class*="title"]');
  const headingText = headingEl?.textContent?.trim() || '';

  // Video: iframe src (Vidyard/YouTube embed URL)
  const iframe = element.querySelector('iframe[src]');
  const videoUrl = iframe?.getAttribute('src')?.trim() || '';

  // Optional poster/thumbnail image
  const thumbImg = element.querySelector('.theater-video-wrapper img, .home-eventtile img, img');

  // Description (richtext) -- prefer a dedicated description container,
  // otherwise gather body paragraphs excluding the heading.
  const descContainer = element.querySelector(
    '.theater-description, .subtext, [class*="description"]',
  );
  let descriptionHtml = '';
  if (descContainer) {
    descriptionHtml = descContainer.innerHTML.trim();
  } else {
    const ps = [...element.querySelectorAll('p')]
      .filter((p) => p.textContent.trim())
      .map((p) => p.outerHTML);
    descriptionHtml = ps.join('');
  }

  // CTA: real anchor preferred, else button-styled div (e.g. "Save the date")
  const ctaAnchor = element.querySelector('a[href]');
  const ctaButton = element.querySelector(
    '.grey-button, .save-date-button, .secondary-button, .btn, [class*="button"]',
  );
  let ctaLabel = '';
  let ctaHref = '';
  if (ctaAnchor) {
    ctaLabel = ctaAnchor.textContent.trim();
    ctaHref = ctaAnchor.getAttribute('href') || '';
  } else if (ctaButton && ctaButton.textContent.trim()) {
    ctaLabel = ctaButton.textContent.trim();
  }

  // Empty guard
  if (!headingText && !videoUrl && !descriptionHtml) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single item cell holding all item fields in the model's field order.
  const itemCell = [];

  if (headingText) {
    const h = document.createElement('p');
    h.textContent = headingText;
    itemCell.push(hint('videoTextHeading'), h);
  }

  if (descriptionHtml) {
    const desc = document.createElement('div');
    desc.innerHTML = descriptionHtml;
    itemCell.push(hint('videoTextDescription'), desc);
  }

  if (videoUrl) {
    itemCell.push(hint('videoTextVideoUrl'), document.createTextNode(videoUrl));
  }

  if (thumbImg && (thumbImg.getAttribute('src') || '').trim()) {
    const img = thumbImg.cloneNode(true);
    if (!img.getAttribute('alt')) img.setAttribute('alt', headingText);
    itemCell.push(hint('videoTextThumbnail'), img);
  }

  if (ctaLabel) {
    if (ctaHref) {
      const a = document.createElement('a');
      a.href = ctaHref;
      a.textContent = ctaLabel;
      itemCell.push(hint('videoTextCtaLink'), a);
    } else {
      itemCell.push(hint('videoTextCtaLabel'), document.createTextNode(ctaLabel));
    }
  }

  const cells = [[itemCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'video-text', cells });
  element.replaceWith(block);
}
