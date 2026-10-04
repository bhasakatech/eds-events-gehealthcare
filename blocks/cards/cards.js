import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Moves the children (and UE instrumentation) of an authored cell into a new
 * element with the given class.
 * @param {Element} cell authored cell
 * @param {string} className class of the new element
 * @returns {HTMLDivElement}
 */
function moveCell(cell, className) {
  const div = document.createElement('div');
  div.className = className;
  moveInstrumentation(cell, div);
  div.append(...cell.childNodes);
  return div;
}

/**
 * Maps an event row to its fields.
 * Card model (blocks/cards/_cards.json), 4 cells:
 *   category | title | event-info | tile_* (icon picture + background text + link)
 * Legacy 6-cell rows (category | title | info | icon | background | link) are
 * still accepted.
 * @param {Element[]} cols row cells
 * @returns {object|null} event fields, or null if the row is not an event tile
 */
function readEventRow(cols) {
  if (cols.length >= 6) {
    const [category, title, info, icon, background, link] = cols;
    return {
      category, title, info, icon, link, background: background.textContent.trim(),
    };
  }
  if (cols.length >= 4) {
    const [category, title, info, tile] = cols;
    const background = tile.children.length
      ? [...tile.children]
        .filter((el) => !el.matches('a, picture, img') && !el.querySelector('a, picture, img'))
        .map((el) => el.textContent.trim())
        .find(Boolean) || ''
      : tile.textContent.trim();
    return {
      category, title, info, icon: tile, link: tile, background, tile,
    };
  }
  return null;
}

/**
 * Builds a featured-event tile (source .home-eventtile).
 * @param {Element} row authored row
 * @param {object} fields from readEventRow
 * @returns {HTMLLIElement|null}
 */
function buildEventCard(row, fields) {
  const {
    category, title, info, icon, link, background, tile,
  } = fields;
  if (![category, title, info].some((cell) => cell.textContent.trim())) return null;

  const li = document.createElement('li');
  li.className = 'event-card';
  moveInstrumentation(row, li);

  const bg = background.toLowerCase().replace(/\s+/g, '-');
  if (bg) li.classList.add(`bg-${bg}`);

  const authoredLink = link.querySelector('a');
  const content = document.createElement(authoredLink ? 'a' : 'div');
  content.className = 'event-content';
  if (authoredLink) {
    content.href = authoredLink.href;
    if (authoredLink.target) content.target = authoredLink.target;
  }
  if (tile) moveInstrumentation(tile, content);

  const footer = document.createElement('div');
  footer.className = 'event-footer';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'event-icon';
  const img = icon.querySelector('img');
  if (img) {
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '80' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    iconDiv.append(picture);
  }

  footer.append(moveCell(info, 'event-info'), iconDiv);
  content.append(moveCell(title, 'event-title'), footer);
  li.append(moveCell(category, 'event-category'), content);
  return li;
}

/**
 * Builds a standard EDS boilerplate card (image + body).
 * @param {Element} row authored row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);
  while (row.firstElementChild) li.append(row.firstElementChild);
  [...li.children].forEach((div) => {
    if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
    else div.className = 'cards-card-body';
  });
  li.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const fields = readEventRow([...row.children]);
    const li = fields ? buildEventCard(row, fields) : buildCard(row);
    if (li) ul.append(li);
  });

  if (ul.querySelector(':scope > .event-card')) ul.classList.add('event-cards');
  block.replaceChildren(ul);
}
