/*
 * Asset Picker Block
 *
 * Demonstrates the Configurable Asset Picker (Custom Content Advisor) extension
 * for Universal Editor. The image field uses custom-asset-namespace:custom-asset
 * which triggers the filtered DM asset picker instead of the default reference picker.
 *
 * Authored fields:
 *   image        – DM OpenAPI delivery URL (stored as <a> or resolved to <img> by EDS)
 *   imageAlt     – alt text for the image
 *   caption      – optional caption shown below the image
 *   title        – optional heading above the image
 *   description  – optional body text below the caption
 *
 * EDS publishes the custom-asset field value as:
 *   - an <img> tag when the delivery URL resolves to an image (most common)
 *   - an <a> tag wrapping the DM URL when EDS cannot auto-detect the MIME type
 *
 * This decorate() handles both cases gracefully.
 */

/**
 * Extract the trimmed text content of an element, or empty string if missing.
 * @param {Element|null|undefined} el
 * @returns {string}
 */
function textOf(el) {
  return el?.textContent?.trim() || '';
}

/**
 * Detect whether a URL points to a DM OpenAPI delivery asset.
 * @param {string} src
 * @returns {boolean}
 */
function isDMUrl(src) {
  return /\/adobe\/dynamicmedia\/deliver\//i.test(src)
    || /adobeaemcloud\.com\/adobe\//i.test(src);
}

/**
 * Build an <img> from either:
 *   - an existing <img> already resolved by EDS (standard path)
 *   - an <a> whose href is the DM delivery URL (fallback when MIME type unknown)
 *
 * @param {Element} mediaCell - the block cell containing the asset markup
 * @param {string} altText    - fallback alt text from the imageAlt field
 * @returns {HTMLImageElement|null}
 */
function buildImage(mediaCell, altText) {
  if (!mediaCell) return null;

  // Case 1: EDS already resolved the asset to an <img> — most common path
  const existingImg = mediaCell.querySelector('img');
  if (existingImg) {
    const img = document.createElement('img');
    img.src = existingImg.src;
    img.alt = existingImg.alt || altText;
    img.width = existingImg.width || undefined;
    img.height = existingImg.height || undefined;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  // Case 2: EDS rendered a raw <a> (DM URL stored without MIME type field)
  const anchor = mediaCell.querySelector('a[href]');
  if (anchor && isDMUrl(anchor.href)) {
    const img = document.createElement('img');
    img.src = anchor.href;
    img.alt = altText || textOf(anchor);
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  return null;
}

/**
 * Loads and decorates the Asset Picker block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // ── 1. Extract authored cell values ──────────────────────────────────────
  const rows = [...block.children];

  // Map cells by authored field name using data-aue-prop attribute (UE) or
  // fall back to positional order for plain HTML rendering.
  const getCellByProp = (prop) => block.querySelector(`[data-aue-prop="${prop}"]`)
    ?.closest('div');

  // Positional fallback: rows[0]=image+alt, rows[1]=caption+title+description
  const imageCell = getCellByProp('image') || rows[0]?.firstElementChild;
  const altCell = getCellByProp('imageAlt') || rows[0]?.children[1];
  const titleCell = getCellByProp('title') || rows[1]?.firstElementChild;
  const captionCell = getCellByProp('caption') || rows[1]?.children[1];
  const descCell = getCellByProp('description') || rows[1]?.children[2];

  const altText = textOf(altCell);
  const titleText = textOf(titleCell);
  const captionText = textOf(captionCell);
  const descText = textOf(descCell);

  // ── 2. Build the image element ────────────────────────────────────────────
  const img = buildImage(imageCell, altText);

  // ── 3. Assemble new DOM ───────────────────────────────────────────────────
  const figure = document.createElement('figure');
  figure.className = 'asset-picker-figure';

  if (img) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'asset-picker-image';
    imgWrap.append(img);
    figure.append(imgWrap);
  }

  const body = document.createElement('div');
  body.className = 'asset-picker-body';

  if (titleText) {
    const h3 = document.createElement('h3');
    h3.className = 'asset-picker-title';
    h3.textContent = titleText;
    body.append(h3);
  }

  if (captionText || descText) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'asset-picker-caption';

    if (captionText) {
      const p = document.createElement('p');
      p.className = 'asset-picker-caption-text';
      p.textContent = captionText;
      figcaption.append(p);
    }

    if (descText) {
      const p = document.createElement('p');
      p.className = 'asset-picker-description';
      p.textContent = descText;
      figcaption.append(p);
    }

    body.append(figcaption);
  }

  if (body.children.length) {
    figure.append(body);
  }

  // ── 4. Replace block content ──────────────────────────────────────────────
  block.replaceChildren(figure);

  // Mark block so CSS can target "has image" state
  if (img) {
    block.classList.add('has-image');
  }
}
