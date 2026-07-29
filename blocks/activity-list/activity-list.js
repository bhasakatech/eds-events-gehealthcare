/*
 * Activity List – reusable onsite/workshop activities with detail popup
 * Parent: heading_*
 * Item cells: image | content_* | meta_* | detail
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function isItemRow(row) {
  return [...(row?.children || [])].length >= 2;
}

function parseItem(row) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const contentCell = cells[1];
  const metaCell = cells[2];
  const detailCell = cells[3];

  const img = imageCell?.querySelector('img');
  const titleEl = contentCell?.querySelector('h1, h2, h3, h4, strong, p');
  const title = textOf(titleEl);
  const clone = contentCell?.cloneNode(true);
  clone?.querySelector('h1, h2, h3, h4, strong')?.remove();
  if (titleEl?.tagName === 'P' && textOf(clone?.querySelector('p')) === title) {
    clone.querySelector('p')?.remove();
  }
  const description = clone?.innerHTML?.trim() || '';
  const metaParts = [...(metaCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  if (!metaParts.length && metaCell) {
    const raw = textOf(metaCell);
    if (raw) metaParts.push(...raw.split('|').map((s) => s.trim()).filter(Boolean));
  }

  return {
    row,
    title,
    description,
    datetime: metaParts[0] || '',
    location: metaParts[1] || '',
    detailHtml: detailCell?.innerHTML?.trim() || description,
    imageSrc: img?.src || '',
    imageAlt: img?.alt || title,
    picture: imageCell?.querySelector('picture')?.cloneNode(true) || null,
  };
}

function createDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'activity-list-dialog';
  dialog.innerHTML = `
    <div class="activity-list-dialog-panel">
      <button type="button" class="activity-list-close" aria-label="Close"><span aria-hidden="true">×</span></button>
      <div class="activity-list-dialog-media"></div>
      <div class="activity-list-dialog-copy">
        <h3 class="activity-list-dialog-title"></h3>
        <div class="activity-list-dialog-meta"></div>
        <div class="activity-list-dialog-body"></div>
      </div>
    </div>
  `;
  dialog.querySelector('.activity-list-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

function openItem(dialog, item) {
  const media = dialog.querySelector('.activity-list-dialog-media');
  media.replaceChildren();
  if (item.picture) media.append(item.picture.cloneNode(true));
  else if (item.imageSrc) {
    media.append(createOptimizedPicture(item.imageSrc, item.imageAlt, false, [{ width: '900' }]));
  }
  dialog.querySelector('.activity-list-dialog-title').textContent = item.title;
  const meta = dialog.querySelector('.activity-list-dialog-meta');
  meta.textContent = [item.datetime, item.location].filter(Boolean).join(' · ');
  dialog.querySelector('.activity-list-dialog-body').innerHTML = item.detailHtml || item.description;
  if (!dialog.open) dialog.showModal();
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const parentRows = rows.filter((row) => !isItemRow(row));
  const headingCell = parentRows[0]?.firstElementChild;

  const items = itemRows.map((row) => parseItem(row));
  const dialog = createDialog();

  const root = document.createElement('div');
  root.className = 'activity-list-inner';

  if (headingCell) {
    const header = document.createElement('div');
    header.className = 'activity-list-header';
    header.append(...headingCell.childNodes);
    root.append(header);
  }

  const table = document.createElement('div');
  table.className = 'activity-list-table';
  table.innerHTML = `
    <div class="activity-list-head" aria-hidden="true">
      <span>Title</span><span>Date and time</span><span>Location</span><span></span>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'activity-list-rows';

  items.forEach((item) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'activity-list-row';
    moveInstrumentation(item.row, row);

    const main = document.createElement('div');
    main.className = 'activity-list-main';
    const title = document.createElement('div');
    title.className = 'activity-list-title';
    title.textContent = item.title;
    const desc = document.createElement('div');
    desc.className = 'activity-list-desc';
    desc.innerHTML = item.description;
    main.append(title, desc);

    const datetime = document.createElement('div');
    datetime.className = 'activity-list-datetime';
    datetime.textContent = item.datetime;

    const location = document.createElement('div');
    location.className = 'activity-list-location';
    location.textContent = item.location;

    const arrow = document.createElement('span');
    arrow.className = 'activity-list-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';

    row.append(main, datetime, location, arrow);
    row.addEventListener('click', () => openItem(dialog, item));
    list.append(row);
  });

  table.append(list);
  root.append(table, dialog);
  block.replaceChildren(root);

  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture')?.replaceWith(optimized);
  });
}
