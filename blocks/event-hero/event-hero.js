/*
 * Event Hero – reusable event landing hero
 * Cells: heading_* | meta_* | actions_* | image(+Alt)
 */

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function firstLink(el) {
  return el?.querySelector('a[href]');
}

export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.map((row) => row.firstElementChild).filter(Boolean);

  const headingCell = cells.find((c) => c.querySelector('h1, h2, h3')) || cells[0];
  const metaCell = cells.find((c) => c !== headingCell && !c.querySelector('a, picture, img')) || cells[1];
  const actionsCell = cells.find((c) => c?.querySelector('a[href]'));
  const mediaCell = cells.find((c) => c?.querySelector('picture, img'));

  const heading = headingCell?.querySelector('h1, h2, h3');
  const titleTag = heading?.tagName?.toLowerCase() || 'h1';
  const title = textOf(heading) || textOf(headingCell);
  const taglineParts = [...(headingCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  const tagline = taglineParts.join(' ');

  const metaParts = [...(metaCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  // If meta collapsed into plain text nodes without p tags
  if (!metaParts.length && metaCell && metaCell !== headingCell) {
    const raw = textOf(metaCell);
    if (raw) metaParts.push(...raw.split('|').map((s) => s.trim()).filter(Boolean));
  }

  const links = [...(actionsCell?.querySelectorAll('a[href]') || [])];
  const primary = links[0] || firstLink(actionsCell);
  const secondary = links[1];

  const root = document.createElement('div');
  root.className = 'event-hero-inner';

  if (mediaCell?.querySelector('img')) {
    const img = mediaCell.querySelector('img');
    root.style.backgroundImage = `url("${img.src}")`;
    root.classList.add('has-media');
  }

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

  if (tagline) {
    const p = document.createElement('p');
    p.className = 'event-hero-tagline';
    p.textContent = tagline;
    content.append(p);
  }

  if (primary || secondary) {
    const actions = document.createElement('div');
    actions.className = 'event-hero-actions';
    if (primary) {
      const a = primary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-primary';
      actions.append(a);
    }
    if (secondary) {
      const a = secondary.cloneNode(true);
      a.className = 'event-hero-btn event-hero-btn-secondary';
      actions.append(a);
    }
    content.append(actions);
  }

  root.append(content);
  block.replaceChildren(root);
}
