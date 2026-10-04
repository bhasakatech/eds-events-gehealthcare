/*
 * Section Nav – reusable in-page sticky anchor navigation
 *
 * Content contract (see _section-nav.json):
 *   Row 1 (parent): single cell holding the optional CTA (link or plain label)
 *   Row 2..n (items): [label | url] two-column rows
 * Legacy: single-cell rows that only contain a link are treated as items.
 */

// Block types that stand in for the source page's fixed anchor targets when the
// migrated page has no element with the matching id.
const ANCHOR_FALLBACKS = {
  overview: ['.products-solutions', '.product-list'],
  products: ['.products-solutions', '.product-list'],
  highlights: ['.carousel', '.video-text'],
  'innovation-theater': ['.theater-sessions'],
  'all-events': ['.activity-list', '.event-list'],
  resources: ['.feature-cards'],
};

function textOf(el) {
  return el?.textContent?.trim() || '';
}

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Ids are looked up inside <main> only: header/footer fragments can carry
// duplicate heading ids (e.g. the header drawer's h5#resources).
function byId(main, id) {
  return main.querySelector(`#${CSS.escape(id)}`);
}

function isTwoCellItem(row) {
  const cells = [...(row?.children || [])];
  return cells.length === 2 && !cells[0].querySelector('a, picture');
}

function isLinkItem(row) {
  const cells = [...(row?.children || [])];
  return cells.length === 1 && !!cells[0].querySelector('a[href]');
}

function splitRows(block) {
  const rows = [...block.children];
  const hasTwoCellItems = rows.some(isTwoCellItem);
  const first = rows[0];
  const firstLink = first?.querySelector('a[href]');
  // Row 1 is the parent/CTA row whenever the block follows the item model, or
  // when its single link points away from the page.
  const firstIsCta = first && first.children.length <= 1
    && (hasTwoCellItems || !firstLink || !firstLink.getAttribute('href').startsWith('#'));

  const itemRows = [];
  const ctaRows = [];
  rows.forEach((row, i) => {
    if (i === 0 && firstIsCta) ctaRows.push(row);
    else if (isTwoCellItem(row) || isLinkItem(row)) itemRows.push(row);
    else ctaRows.push(row);
  });
  return { itemRows, ctaRows };
}

function buildItem(row) {
  const cells = [...row.children];
  let label = '';
  let href = '#';
  if (cells.length >= 2) {
    label = textOf(cells[0]);
    href = cells[1].querySelector('a[href]')?.getAttribute('href') || textOf(cells[1]) || '#';
  } else {
    const link = cells[0]?.querySelector('a[href]');
    label = textOf(link) || textOf(cells[0]);
    href = link?.getAttribute('href') || '#';
  }
  if (!label) return null;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  li.append(a);
  return li;
}

function buildCta(ctaRows) {
  let link;
  let label = '';
  ctaRows.forEach((row) => {
    const a = row.querySelector('a[href]');
    if (a && !link) {
      link = a;
      label = textOf(a);
    } else if (!label) {
      label = textOf(row);
    }
  });
  if (!label) return null;

  let cta;
  if (link) {
    cta = document.createElement('a');
    cta.href = link.getAttribute('href');
    if (link.title) cta.title = link.title;
    cta.textContent = label;
  } else {
    // No destination authored – render an actionable button.
    cta = document.createElement('button');
    cta.type = 'button';
    cta.textContent = label;
  }
  cta.className = 'section-nav-cta';
  const tools = document.createElement('div');
  tools.className = 'section-nav-tools';
  tools.append(cta);
  return tools;
}

/**
 * Finds the element an in-page anchor should scroll to.
 * Order: existing id, heading text/id match, block-type fallback.
 */
function findTarget(id, label, main, ownSection) {
  const outside = (el) => el && !ownSection.contains(el);
  const existing = byId(main, id);
  // Ids this block placed on sections are provisional – keep looking for a
  // better (heading) target.
  if (outside(existing) && !('sectionNavAnchor' in existing.dataset)) return existing;

  const headings = [...main.querySelectorAll('h1, h2, h3, h4')].filter(outside);
  const wanted = normalize(label);
  const byText = headings.find((h) => normalize(h.textContent) === wanted)
    || headings.find((h) => {
      const text = normalize(h.textContent);
      return text.includes(' ') && wanted.startsWith(`${text} `);
    })
    || headings.find((h) => h.id && h.id.startsWith(`${id}-`));
  if (byText) return byText;

  const selectors = ANCHOR_FALLBACKS[id] || [];
  const sections = [...main.querySelectorAll(':scope > .section')]
    .filter((section) => section !== ownSection
      // eslint-disable-next-line no-bitwise
      && (ownSection.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING));
  const hit = selectors
    .map((sel) => sections.find((section) => section.querySelector(sel)))
    .find(Boolean);
  return hit || null;
}

function setupAnchors(block) {
  const main = block.closest('main') || document.querySelector('main');
  const ownSection = block.closest('.section') || block;
  const links = [...block.querySelectorAll('a[href^="#"]')]
    .filter((a) => a.getAttribute('href').length > 1);
  if (!main || !links.length) return;

  const targets = new Map();
  const offsetEls = new Set();
  let offset = 0;

  const applyOffset = (el) => {
    offsetEls.add(el);
    el.style.scrollMarginTop = `${offset}px`;
  };

  const measure = () => {
    const top = parseFloat(getComputedStyle(ownSection).top) || 0;
    offset = Math.round(top + ownSection.getBoundingClientRect().height);
    offsetEls.forEach((el) => {
      if (el.isConnected) applyOffset(el);
      else offsetEls.delete(el);
    });
  };

  const bind = () => {
    links.forEach((a) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (targets.get(id)?.isConnected) return;
      const found = findTarget(id, a.textContent, main, ownSection);
      if (!found) return;
      const holder = byId(main, id);
      if (!found.id) {
        // Move a provisional section id onto the real target.
        if (holder && holder !== found && 'sectionNavAnchor' in holder.dataset) {
          holder.removeAttribute('id');
          delete holder.dataset.sectionNavAnchor;
        }
        if (!byId(main, id)) found.id = id;
      } else if (found.id !== id && !holder) {
        // Keep authored ids intact; expose the anchor on the enclosing section
        // so deep links (and other #id links on the page) resolve too.
        const section = found.closest('main > .section');
        if (section && !section.id) {
          section.id = id;
          section.dataset.sectionNavAnchor = '';
          applyOffset(section);
        }
      }
      targets.set(id, found);
      applyOffset(found);
    });
  };

  bind();
  measure();

  if (window.ResizeObserver) new ResizeObserver(measure).observe(ownSection);

  // Blocks below may rebuild their headings once decorated – re-bind as each
  // section finishes loading, then honour a hash present on page load.
  const pendingHash = decodeURIComponent(window.location.hash.slice(1));
  const observer = new MutationObserver(() => {
    bind();
    const done = [...main.querySelectorAll(':scope > .section')]
      .every((section) => section.dataset.sectionStatus === 'loaded');
    if (done) {
      observer.disconnect();
      const target = pendingHash && targets.get(pendingHash);
      if (target && window.scrollY === 0) target.scrollIntoView();
    }
  });
  observer.observe(main, { subtree: true, attributes: true, attributeFilter: ['data-section-status'] });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  block.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    bind();
    const target = targets.get(id);
    if (!target) return;
    e.preventDefault();
    measure();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    window.history.pushState(null, '', `#${id}`);
  });
}

export default function decorate(block) {
  const { itemRows, ctaRows } = splitRows(block);

  const nav = document.createElement('nav');
  nav.className = 'section-nav-bar';
  nav.setAttribute('aria-label', 'Page sections');

  const list = document.createElement('ul');
  list.className = 'section-nav-list';
  itemRows.map(buildItem).filter(Boolean).forEach((li) => list.append(li));
  nav.append(list);

  const tools = buildCta(ctaRows);
  if (tools) nav.append(tools);

  block.replaceChildren(nav);
  setupAnchors(block);
}
