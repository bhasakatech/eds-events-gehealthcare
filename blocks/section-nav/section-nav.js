/*
 * Section Nav – reusable in-page sticky anchor navigation
 */

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function isItemRow(row) {
  const cells = [...(row?.children || [])];
  if (cells.length === 2 && !cells[0].querySelector('a, picture')) return true;
  if (cells.length === 1 && cells[0].querySelector('a[href^="#"], a[href]')) return true;
  return false;
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const otherRows = rows.filter((row) => !isItemRow(row));

  // The CTA row is a non-item row carrying a link or a plain text label.
  let ctaLink;
  let ctaLabel = '';
  otherRows.forEach((row) => {
    const link = row.querySelector('a[href]');
    if (link) {
      ctaLink = link;
      ctaLabel = textOf(link);
    } else if (!ctaLabel) {
      ctaLabel = textOf(row);
    }
  });

  const nav = document.createElement('nav');
  nav.className = 'section-nav-bar';
  nav.setAttribute('aria-label', 'Page sections');

  const list = document.createElement('ul');
  list.className = 'section-nav-list';

  itemRows.forEach((row) => {
    const cells = [...row.children];
    let label = '';
    let href = '#';
    if (cells.length >= 2) {
      label = textOf(cells[0]);
      href = textOf(cells[1]) || '#';
    } else {
      const a = cells[0]?.querySelector('a[href]');
      label = textOf(a) || textOf(cells[0]);
      href = a?.getAttribute('href') || '#';
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    li.append(a);
    list.append(li);
  });

  nav.append(list);

  if (ctaLabel) {
    const tools = document.createElement('div');
    tools.className = 'section-nav-tools';
    let ctaEl;
    if (ctaLink) {
      ctaEl = ctaLink.cloneNode(true);
    } else {
      // No destination authored – render an actionable button.
      ctaEl = document.createElement('button');
      ctaEl.type = 'button';
      ctaEl.textContent = ctaLabel;
    }
    ctaEl.className = 'section-nav-cta';
    tools.append(ctaEl);
    nav.append(tools);
  }

  block.replaceChildren(nav);

  // Highlight the in-page anchor for the section currently in view.
  const anchors = [...list.querySelectorAll('a[href^="#"]')];
  if (!anchors.length) return;

  const sections = anchors
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setActive = () => {
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= 120) current = section;
    });
    anchors.forEach((a) => {
      const match = current && a.getAttribute('href') === `#${current.id}`;
      a.classList.toggle('is-active', !!match);
    });
  };

  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
}
