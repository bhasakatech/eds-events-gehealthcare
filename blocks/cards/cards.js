import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cols = [...row.children];

    if (cols.length < 6) {
      return;
    }

    const [
      category,
      title,
      info,
      icon,
      background,
      link,
    ] = cols;

    const li = document.createElement('li');
    li.className = 'event-card';

    const bg = background.textContent.trim().toLowerCase().replace(/\s+/g, '-');

    if (bg) {
      li.classList.add(`bg-${bg}`);
    }

    /* ---------- Category ---------- */

    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'event-category';
    categoryDiv.innerHTML = category.innerHTML;

    /* ---------- Link ---------- */

    const authoredLink = link.querySelector('a');

    const content = document.createElement(authoredLink ? 'a' : 'div');
    content.className = 'event-content';

    if (authoredLink) {
      content.href = authoredLink.href;
      content.title = authoredLink.title;
    }

    /* ---------- Title ---------- */

    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    titleDiv.innerHTML = title.innerHTML;

    /* ---------- Footer ---------- */

    const footer = document.createElement('div');
    footer.className = 'event-footer';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'event-info';
    infoDiv.innerHTML = info.innerHTML;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'event-icon';

    const img = icon.querySelector('img');

    if (img) {
      const picture = createOptimizedPicture(
        img.src,
        img.alt,
        false,
        [{ width: '80' }],
      );

      iconDiv.append(picture);
    }

    footer.append(infoDiv, iconDiv);

    content.append(titleDiv, footer);

    li.append(categoryDiv, content);

    ul.append(li);
  });

  block.replaceChildren(ul);
}
