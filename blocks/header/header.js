/*
 * Header Block – GE HealthCare
 *
 * DOM structure from Universal Editor (same row/cell pattern as Cards):
 *
 * <div class="header block">
 *   <!-- Row 0: parent block fields (7 columns) -->
 *   <div>
 *     <div>announcement text</div>
 *     <div><picture>logo</picture></div>
 *     <div>logoAlt</div>
 *     <div>logoLink url</div>
 *     <div>CTA label</div>
 *     <div>CTA url</div>
 *     <div><picture>hamburger icon</picture></div>  (optional)
 *   </div>
 *   <!-- Row 1..N: Nav Item child items (2 columns each) -->
 *   <div>
 *     <div>Nav Title</div>
 *     <div>Nav URL</div>
 *   </div>
 *   ...
 * </div>
 *
 * Authored fields (parent row, in order):
 *   [0] announcement  – banner text
 *   [1] logo          – logo image (reference)
 *   [2] logoAlt       – logo alt text
 *   [3] logoLink      – logo href
 *   [4] ctaLabel      – CTA button label
 *   [5] ctaLink       – CTA button URL
 *   [6] hamburgerIcon – hamburger icon image (optional reference)
 *
 * Nav Item rows (each child after the first row):
 *   [0] navTitle  – link label
 *   [1] navLink   – link URL
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

  // ── Parent row: block-level fields ────────────────────────────────────
  const parentCells = [...(rows[0]?.children || [])];
  const announcement = parentCells[0]?.innerHTML?.trim() || '';
  const logoImg = parentCells[1]?.querySelector('img');
  const logoAlt = parentCells[2]?.textContent?.trim() || 'GE HealthCare';
  const logoHref = parentCells[3]?.textContent?.trim() || '/';
  const ctaLabel = parentCells[4]?.textContent?.trim() || '';
  const ctaHref = parentCells[5]?.textContent?.trim() || '#';
  const hamburgerIconImg = parentCells[6]?.querySelector('img');

  // ── Nav Item rows: child items (rows 1..N) ────────────────────────────
  const navItems = rows.slice(1).map((row) => {
    const cells = [...row.children];
    return {
      title: cells[0]?.textContent?.trim() || '',
      href: cells[1]?.textContent?.trim() || '#',
    };
  }).filter((item) => item.title);

  // ── 1. Announcement Banner ─────────────────────────────────────────────
  const banner = document.createElement('div');
  banner.className = 'nav-banner';
  if (announcement) {
    banner.innerHTML = `<p>${announcement}</p>`;
  } else {
    banner.hidden = true;
  }

  // ── 2. Build <nav> ─────────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  // ── 2a. Brand / Logo ──────────────────────────────────────────────────
  const brandDiv = document.createElement('div');
  brandDiv.className = 'nav-brand';

  const logoLink = document.createElement('a');
  logoLink.href = logoHref;
  logoLink.setAttribute('aria-label', logoAlt);
  if (logoImg) {
    logoImg.removeAttribute('loading');
    logoImg.alt = logoAlt;
    logoLink.append(logoImg);
  }
  brandDiv.append(logoLink);

  // ── 2b. Nav Links ─────────────────────────────────────────────────────
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

  // ── 2c. CTA Button ────────────────────────────────────────────────────
  const toolsDiv = document.createElement('div');
  toolsDiv.className = 'nav-tools';

  if (ctaLabel) {
    const ctaBtn = document.createElement('a');
    ctaBtn.className = 'nav-cta-btn';
    ctaBtn.href = ctaHref;
    ctaBtn.textContent = ctaLabel;
    toolsDiv.append(ctaBtn);
  }

  // ── 2d. Hamburger ─────────────────────────────────────────────────────
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-controls', 'nav');
  btn.setAttribute('aria-label', 'Open navigation');
  btn.setAttribute('aria-expanded', 'false');

  if (hamburgerIconImg) {
    hamburgerIconImg.removeAttribute('loading');
    hamburgerIconImg.alt = '';
    hamburgerIconImg.setAttribute('aria-hidden', 'true');
    btn.append(hamburgerIconImg);
  } else {
    btn.innerHTML = `
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>`;
  }

  btn.addEventListener('click', () => toggleMenu(nav));
  hamburger.append(btn);

  document.addEventListener('click', (e) => {
    if (nav.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target)) {
      toggleMenu(nav, false);
    }
  });

  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) toggleMenu(nav, false);
  });

  // ── 3. Assemble ────────────────────────────────────────────────────────
  nav.append(brandDiv, sectionsDiv, toolsDiv, hamburger);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  block.replaceChildren(banner, navWrapper);
}
