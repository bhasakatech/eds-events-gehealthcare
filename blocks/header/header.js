/*
 * Header Block – GE HealthCare
 *
 * _header.json model — exactly 4 cells (xwalk/max-cells limit):
 *
 * Header model fields (parent row, 3 cells used + nav items via filter):
 *   [0] logo          – reference  → logo image
 *   [1] ctaButton     – aem-content → <a> link (label + URL from authored link)
 *   [2] hamburgerIcon – reference  → custom hamburger icon image (optional)
 *
 * header-nav-item child rows (composite multifield, unlimited):
 *   [0] navTitle – text → nav link label
 *   [1] navUrl   – text → nav link URL
 *
 * DOM output:
 * <div class="header block">
 *   <div class="nav-wrapper">
 *     <nav id="nav">
 *       <div class="nav-brand">      logo
 *       <div class="nav-sections">   <ul> nav links </ul>
 *       <div class="nav-tools">      CTA button
 *       <div class="nav-hamburger">  mobile toggle
 *     </nav>
 *   </div>
 * </div>
 */

const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (nav && !isDesktop.matches) {
    // eslint-disable-next-line no-use-before-define
    toggleMenu(nav, false);
    nav.querySelector('.nav-hamburger button')?.focus();
  }
}

function toggleMenu(nav, forceOpen = null) {
  const open = forceOpen !== null ? forceOpen : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';

  const btn = nav.querySelector('.nav-hamburger button');
  if (btn) {
    btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (open) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // ── Parent row: 3 cells matching model field order ────────────────────
  const parentCells = [...(rows[0]?.children || [])];

  // [0] logo – reference field renders as <picture><img></picture>
  const logoImg = parentCells[0]?.querySelector('img');
  const logoAlt = logoImg?.alt || 'GE HealthCare';

  // [1] ctaButton – aem-content field renders as <a href="...">Label</a>
  const ctaLink = parentCells[1]?.querySelector('a');
  const ctaLabel = ctaLink?.textContent?.trim() || '';
  const ctaHref = ctaLink?.href || '#';

  // [2] hamburgerIcon – reference field renders as <picture><img></picture>
  const hamburgerImg = parentCells[2]?.querySelector('img');

  // ── Nav Item child rows (rows 1..N) ───────────────────────────────────
  // Each child row: [0] navLabel, [1] navUrl
  const navItems = rows.slice(1).map((row) => {
    const cells = [...row.children];
    return {
      title: cells[0]?.textContent?.trim() || '',
      href: cells[1]?.textContent?.trim() || '#',
    };
  }).filter((item) => item.title);

  // ── Build <nav> ────────────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  // ── Logo ───────────────────────────────────────────────────────────────
  const brandDiv = document.createElement('div');
  brandDiv.className = 'nav-brand';

  const logoAnchor = document.createElement('a');
  logoAnchor.href = '/';
  logoAnchor.setAttribute('aria-label', logoAlt);
  if (logoImg) {
    logoImg.removeAttribute('loading');
    logoImg.alt = logoAlt;
    logoAnchor.append(logoImg);
  }
  brandDiv.append(logoAnchor);

  // ── Nav links (composite multifield child items) ───────────────────────
  const sectionsDiv = document.createElement('div');
  sectionsDiv.className = 'nav-sections';

  if (navItems.length) {
    const ul = document.createElement('ul');
    navItems.forEach(({ title, href }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = title;
      li.append(a);
      ul.append(li);
    });
    sectionsDiv.append(ul);
  }

  // ── CTA button (aem-content link) ──────────────────────────────────────
  const toolsDiv = document.createElement('div');
  toolsDiv.className = 'nav-tools';

  if (ctaLabel) {
    const ctaBtn = document.createElement('a');
    ctaBtn.className = 'nav-cta-btn';
    ctaBtn.href = ctaHref;
    ctaBtn.textContent = ctaLabel;
    toolsDiv.append(ctaBtn);
  }

  // ── Hamburger ──────────────────────────────────────────────────────────
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-controls', 'nav');
  menuBtn.setAttribute('aria-label', 'Open navigation');
  menuBtn.setAttribute('aria-expanded', 'false');

  if (hamburgerImg) {
    // Author provided a custom hamburger icon
    hamburgerImg.removeAttribute('loading');
    hamburgerImg.alt = '';
    hamburgerImg.setAttribute('aria-hidden', 'true');
    menuBtn.append(hamburgerImg);
  } else {
    // Default 3-line CSS hamburger
    menuBtn.innerHTML = `
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>`;
  }

  menuBtn.addEventListener('click', () => toggleMenu(nav));
  hamburger.append(menuBtn);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (nav.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target)) {
      toggleMenu(nav, false);
    }
  });

  // Collapse when resizing to desktop
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) toggleMenu(nav, false);
  });

  // ── Assemble ───────────────────────────────────────────────────────────
  nav.append(brandDiv, sectionsDiv, toolsDiv, hamburger);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  block.replaceChildren(navWrapper);
}
