/*
 * Products & Solutions Block – GE HealthCare Events
 *
 * Matches the ESC "Our products and solutions" pattern:
 * grid of category tiles → click opens a detail popup with asset carousel + CTAs.
 *
 * Parent rows (grouped):
 *   [0] heading_*  – section title
 *   [1] actions_*  – request info / demo links + disclaimer
 *
 * Child rows (product-category):
 *   [0] image (+ imageAlt)
 *   [1] content_*  – title, description, hide flags
 *   [2] cta (+ ctaText) – learn more / see more innovations
 *   [3] assets (multi) – optional list of product assets
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function firstHeading(cell) {
  return cell?.querySelector('h1, h2, h3, h4, h5, h6');
}

function firstLink(cell) {
  return cell?.querySelector('a[href]');
}

function isCategoryRow(row) {
  const cells = [...(row?.children || [])];
  return cells.length >= 2 && !!cells[0]?.querySelector('picture, img');
}

function parseAssets(assetsCell) {
  if (!assetsCell) return [];

  const items = [...assetsCell.querySelectorAll(':scope > ul > li, :scope > ol > li, :scope > div')];
  const source = items.length ? items : [assetsCell];

  return source.map((item) => {
    const picture = item.querySelector('picture');
    const img = item.querySelector('img');
    const titleEl = item.querySelector('h1, h2, h3, h4, h5, h6, strong, b');
    const links = [...item.querySelectorAll('a[href]')];
    const fileLink = links.find((a) => /\.pdf($|\?)/i.test(a.href) || /file|download|brochure/i.test(a.textContent))
      || links[0];
    const paragraphs = [...item.querySelectorAll('p')]
      .map((p) => p.innerHTML.trim())
      .filter(Boolean);

    let title = textOf(titleEl);
    if (!title && paragraphs.length) {
      // first short plain paragraph often is the title when no heading exists
      const [firstParagraph] = paragraphs;
      const tmp = document.createElement('div');
      tmp.innerHTML = firstParagraph;
      if (!tmp.querySelector('a') && textOf(tmp).length < 80) {
        title = textOf(tmp);
        paragraphs.shift();
      }
    }

    const disclaimer = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : '';
    const descriptionHtml = paragraphs.length > 1
      ? paragraphs.slice(0, -1).join('')
      : (paragraphs[0] || '');

    return {
      title,
      description: descriptionHtml,
      disclaimer,
      imageSrc: img?.src || '',
      imageAlt: img?.alt || title,
      picture: picture?.cloneNode(true) || null,
      fileHref: fileLink?.href || '',
    };
  }).filter((asset) => asset.title || asset.imageSrc || asset.description);
}

function parseCategory(row) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const contentCell = cells[1];
  const ctaCell = cells[2];
  const assetsCell = cells[3];

  const img = imageCell?.querySelector('img');
  const titleEl = contentCell?.querySelector('h1, h2, h3, h4, h5, h6, p, strong');
  const title = textOf(titleEl) || textOf(contentCell?.childNodes?.[0]);

  // description = richtext content excluding the title node
  const contentClone = contentCell?.cloneNode(true);
  contentClone?.querySelector('h1, h2, h3, h4, h5, h6')?.remove();
  if (titleEl?.tagName === 'P' || titleEl?.tagName === 'STRONG') {
    const firstP = contentClone?.querySelector('p');
    if (firstP && textOf(firstP) === title) firstP.remove();
  }
  const description = contentClone?.innerHTML?.trim() || '';
  // Boolean fields render as plain "true"/"false" text nodes in the grouped cell.
  const boolTokens = [...(contentCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p).toLowerCase())
    .filter((t) => t === 'true' || t === 'false');
  const hideInfo = boolTokens[0] === 'true';
  const hideDemo = boolTokens[1] === 'true';

  const cta = firstLink(ctaCell);
  let assets = parseAssets(assetsCell);

  // Fallback: if no authored assets, use the tile image + category description
  if (!assets.length && (img || description)) {
    assets = [{
      title,
      description,
      disclaimer: '',
      imageSrc: img?.src || '',
      imageAlt: img?.alt || title,
      picture: imageCell?.querySelector('picture')?.cloneNode(true) || null,
      fileHref: '',
    }];
  }

  return {
    row,
    title,
    description,
    hideInfo,
    hideDemo,
    imageSrc: img?.src || '',
    imageAlt: img?.alt || title,
    picture: imageCell?.querySelector('picture')?.cloneNode(true) || null,
    learnMoreHref: cta?.href || '',
    learnMoreLabel: textOf(cta) || 'See more innovations',
    assets,
  };
}

function parseParentConfig(rows) {
  const config = {
    title: 'Our products and solutions',
    titleTag: 'h2',
    descriptionHtml: '',
    infoHref: '',
    infoLabel: 'Request more info',
    demoHref: '',
    demoLabel: 'Request a demo',
    disclaimer: 'Not all products and services may be available in your country or region.',
  };

  const descriptionParts = [];

  rows.forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    const heading = firstHeading(cell);
    if (heading) {
      config.title = textOf(heading);
      config.titleTag = heading.tagName.toLowerCase();
      return;
    }
    const links = [...cell.querySelectorAll('a[href]')];
    if (links[0]) {
      config.infoHref = links[0].href;
      config.infoLabel = textOf(links[0]) || config.infoLabel;
    }
    if (links[1]) {
      config.demoHref = links[1].href;
      config.demoLabel = textOf(links[1]) || config.demoLabel;
    }
    const paragraphEls = [...cell.querySelectorAll('p')]
      .filter((p) => textOf(p) && !links.some((a) => textOf(a) === textOf(p)));
    if (paragraphEls.length) {
      config.disclaimer = textOf(paragraphEls[paragraphEls.length - 1]);
      // If this row has no links/buttons, treat its paragraphs as the section descriptor.
      if (!links.length) {
        paragraphEls.forEach((p) => descriptionParts.push(`<p>${p.innerHTML.trim()}</p>`));
      }
    }
  });

  config.descriptionHtml = descriptionParts.join('');
  return config;
}

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

function createTile(category, index, openPopup) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'products-solutions-tile';
  button.setAttribute('aria-haspopup', 'dialog');
  button.dataset.index = String(index);

  if (category.picture) {
    const media = document.createElement('div');
    media.className = 'products-solutions-tile-media';
    media.append(category.picture);
    button.append(media);
  } else if (category.imageSrc) {
    const media = document.createElement('div');
    media.className = 'products-solutions-tile-media';
    media.append(createOptimizedPicture(category.imageSrc, category.imageAlt, false, [{ width: '750' }]));
    button.append(media);
  }

  const title = document.createElement('span');
  title.className = 'products-solutions-tile-title';
  title.textContent = category.title;
  button.append(title);

  button.addEventListener('click', () => openPopup(index));
  return button;
}

function createDialog(config) {
  const dialog = document.createElement('dialog');
  dialog.className = 'products-solutions-dialog';
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `
    <div class="products-solutions-dialog-panel">
      <div class="products-solutions-dialog-top">
        <div class="products-solutions-dialog-heading">
          <h3 class="products-solutions-dialog-title"></h3>
          <div class="products-solutions-dialog-desc"></div>
        </div>
        <div class="products-solutions-dialog-tools">
          <span class="products-solutions-browse">Browse additional products</span>
          <button type="button" class="products-solutions-nav products-solutions-prev" aria-label="Previous product">
            <span aria-hidden="true"></span>
          </button>
          <button type="button" class="products-solutions-nav products-solutions-next" aria-label="Next product">
            <span aria-hidden="true"></span>
          </button>
          <button type="button" class="products-solutions-close" aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <div class="products-solutions-dialog-body">
        <div class="products-solutions-dialog-media">
          <a class="products-solutions-asset-link" href="#" target="_blank" rel="noopener">
            <div class="products-solutions-asset-stage"></div>
            <span class="products-solutions-pdf-badge" hidden>PDF</span>
          </a>
          <div class="products-solutions-thumbs" role="tablist" aria-label="Product assets"></div>
        </div>
        <div class="products-solutions-dialog-copy">
          <div class="products-solutions-actions"></div>
          <h4 class="products-solutions-asset-title"></h4>
          <div class="products-solutions-asset-description"></div>
          <button type="button" class="products-solutions-disclaimer-toggle" hidden>
            Disclaimer [<span>-</span>]
          </button>
          <div class="products-solutions-asset-disclaimer" hidden></div>
        </div>
      </div>
      <div class="products-solutions-dialog-footer">
        <p class="products-solutions-disclaimer-bar"></p>
      </div>
    </div>
  `;

  dialog.querySelector('.products-solutions-disclaimer-bar').textContent = config.disclaimer;
  return dialog;
}

function renderActions(container, category, config) {
  container.replaceChildren();

  if (config.infoHref && !category.hideInfo) {
    const a = document.createElement('a');
    a.className = 'products-solutions-btn';
    a.href = config.infoHref;
    a.textContent = config.infoLabel;
    container.append(a);
  }
  if (config.demoHref && !category.hideDemo) {
    const a = document.createElement('a');
    a.className = 'products-solutions-btn';
    a.href = config.demoHref;
    a.textContent = config.demoLabel;
    container.append(a);
  }
  if (category.learnMoreHref) {
    const a = document.createElement('a');
    a.className = 'products-solutions-btn products-solutions-btn-secondary';
    a.href = category.learnMoreHref;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = category.learnMoreLabel;
    container.append(a);
  }
}

function updateAssetView(dialog, category, assetIndex) {
  const asset = category.assets[assetIndex] || category.assets[0];
  if (!asset) return;

  const stage = dialog.querySelector('.products-solutions-asset-stage');
  const link = dialog.querySelector('.products-solutions-asset-link');
  const badge = dialog.querySelector('.products-solutions-pdf-badge');
  const title = dialog.querySelector('.products-solutions-asset-title');
  const description = dialog.querySelector('.products-solutions-asset-description');
  const disclaimerToggle = dialog.querySelector('.products-solutions-disclaimer-toggle');
  const disclaimer = dialog.querySelector('.products-solutions-asset-disclaimer');

  stage.replaceChildren();
  if (asset.picture) {
    stage.append(asset.picture.cloneNode(true));
  } else if (asset.imageSrc) {
    stage.append(createOptimizedPicture(asset.imageSrc, asset.imageAlt || asset.title, false, [{ width: '1200' }]));
  }

  if (asset.fileHref) {
    link.href = asset.fileHref;
    link.removeAttribute('aria-disabled');
    badge.hidden = !/\.pdf($|\?)/i.test(asset.fileHref);
  } else {
    link.href = '#';
    link.setAttribute('aria-disabled', 'true');
    badge.hidden = true;
  }

  title.textContent = asset.title || category.title;
  description.innerHTML = asset.description || category.description || '';

  if (asset.disclaimer) {
    disclaimerToggle.hidden = false;
    disclaimer.hidden = false;
    disclaimer.innerHTML = asset.disclaimer;
    disclaimerToggle.querySelector('span').textContent = '-';
  } else {
    disclaimerToggle.hidden = true;
    disclaimer.hidden = true;
    disclaimer.textContent = '';
  }

  dialog.querySelectorAll('.products-solutions-thumb').forEach((thumb, i) => {
    const selected = i === assetIndex;
    thumb.classList.toggle('is-active', selected);
    thumb.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function populateDialog(dialog, categories, index, config, state) {
  const category = categories[index];
  if (!category) return;
  state.currentIndex = index;
  state.assetIndex = 0;

  dialog.querySelector('.products-solutions-dialog-title').textContent = category.title;
  dialog.querySelector('.products-solutions-dialog-desc').innerHTML = category.description || '';
  renderActions(dialog.querySelector('.products-solutions-actions'), category, config);

  const thumbs = dialog.querySelector('.products-solutions-thumbs');
  thumbs.replaceChildren();
  category.assets.forEach((asset, assetIndex) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'products-solutions-thumb';
    thumb.setAttribute('role', 'tab');
    thumb.setAttribute('aria-label', asset.title || `Asset ${assetIndex + 1}`);
    if (asset.picture) {
      thumb.append(asset.picture.cloneNode(true));
    } else if (asset.imageSrc) {
      thumb.append(createOptimizedPicture(asset.imageSrc, asset.imageAlt || asset.title, false, [{ width: '200' }]));
    }
    const label = document.createElement('span');
    label.textContent = asset.title || `Asset ${assetIndex + 1}`;
    thumb.append(label);
    thumb.addEventListener('click', () => {
      state.assetIndex = assetIndex;
      updateAssetView(dialog, category, assetIndex);
    });
    thumbs.append(thumb);
  });

  updateAssetView(dialog, category, 0);
  dialog.querySelector('.products-solutions-browse').hidden = categories.length < 2;
  dialog.querySelector('.products-solutions-prev').hidden = categories.length < 2;
  dialog.querySelector('.products-solutions-next').hidden = categories.length < 2;
}

export default function decorate(block) {
  const rows = [...block.children];
  const categoryRows = rows.filter((row) => isCategoryRow(row));
  const parentRows = rows.filter((row) => !isCategoryRow(row));
  const config = parseParentConfig(parentRows);
  const categories = categoryRows.map((row) => parseCategory(row));

  const root = document.createElement('div');
  root.className = 'products-solutions-inner';

  const header = document.createElement('div');
  header.className = 'products-solutions-header';
  const title = document.createElement(config.titleTag);
  title.textContent = config.title;
  header.append(title);
  if (config.descriptionHtml) {
    const desc = document.createElement('div');
    desc.className = 'products-solutions-descriptor';
    desc.innerHTML = config.descriptionHtml;
    header.append(desc);
  }
  root.append(header);

  // No product categories authored (tiles are data-driven on the source):
  // render heading + descriptor only and skip the interactive grid/dialog.
  if (!categories.length) {
    block.replaceChildren(root);
    optimizePictures(block);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'products-solutions-grid';

  const dialog = createDialog(config);
  const state = { currentIndex: 0, assetIndex: 0 };

  const openPopup = (index) => {
    populateDialog(dialog, categories, index, config, state);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.products-solutions-close')?.focus();
  };

  categories.forEach((category, index) => {
    const tile = createTile(category, index, openPopup);
    moveInstrumentation(category.row, tile);
    grid.append(tile);
  });
  root.append(grid);
  root.append(dialog);

  dialog.querySelector('.products-solutions-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.products-solutions-prev').addEventListener('click', () => {
    const next = (state.currentIndex - 1 + categories.length) % categories.length;
    populateDialog(dialog, categories, next, config, state);
  });
  dialog.querySelector('.products-solutions-next').addEventListener('click', () => {
    const next = (state.currentIndex + 1) % categories.length;
    populateDialog(dialog, categories, next, config, state);
  });
  dialog.querySelector('.products-solutions-disclaimer-toggle').addEventListener('click', (e) => {
    const panel = dialog.querySelector('.products-solutions-asset-disclaimer');
    const marker = e.currentTarget.querySelector('span');
    const open = !panel.hidden;
    panel.hidden = open;
    marker.textContent = open ? '+' : '-';
  });
  dialog.querySelector('.products-solutions-asset-link').addEventListener('click', (e) => {
    if (e.currentTarget.getAttribute('aria-disabled') === 'true') e.preventDefault();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  block.replaceChildren(root);
  optimizePictures(block);
}
