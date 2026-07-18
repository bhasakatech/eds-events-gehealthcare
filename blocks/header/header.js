import { getMetadata } from '../../scripts/aem.js';

/*
 * GE HealthCare Header Block
 *
 * Expected /nav document row order:
 *   Row 0 – Logo image
 *   Row 1 – Nav links as a bullet list
 *   Row 2 – CTA link ("Contact us")
 *   Row 3 – Announcement banner text  (optional)
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

export default async function decorate(block) {
  // ── 1. Resolve nav path ────────────────────────────────────────────────
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  // ── 2. Fetch raw nav HTML (no decorateMain — keeps structure clean) ────
  const resp = await fetch(`${navPath.replace(/(\.plain)?\.html$/, '')}.plain.html`);
  if (!resp.ok) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = await resp.text();

  // Each top-level <div> in the plain HTML is one authored row
  const rows = [...tmp.querySelectorAll(':scope > div')];

  // ── 3. Announcement banner (row 3) ────────────────────────────────────
  const defaultBanner = 'Not all products and services may be available in your country or region.';
  const bannerText = rows[3]?.textContent.trim() || defaultBanner;
  const banner = document.createElement('div');
  banner.className = 'nav-banner';
  banner.innerHTML = `<p>${bannerText}</p>`;

  // ── 4. <nav> ──────────────────────────────────────────────────────────
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  // ── 4a. Brand / Logo (row 0) ──────────────────────────────────────────
  const brandDiv = document.createElement('div');
  brandDiv.className = 'nav-brand';
  const img = rows[0]?.querySelector('img');
  if (img) {
    img.removeAttribute('loading');
    const logoLink = document.createElement('a');
    logoLink.href = '/';
    logoLink.setAttribute('aria-label', 'GE HealthCare – go to homepage');
    logoLink.append(img);
    brandDiv.append(logoLink);
  }

  // ── 4b. Nav sections / links (row 1) ──────────────────────────────────
  const sectionsDiv = document.createElement('div');
  sectionsDiv.className = 'nav-sections';
  const ul = rows[1]?.querySelector('ul');
  if (ul) {
    ul.querySelectorAll('li').forEach((li) => {
      if (!li.querySelector('ul')) return;
      li.classList.add('nav-drop');
      li.setAttribute('aria-expanded', 'false');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', () => {
        if (!isDesktop.matches) return;
        const exp = li.getAttribute('aria-expanded') === 'true';
        ul.querySelectorAll('.nav-drop').forEach((d) => d.setAttribute('aria-expanded', 'false'));
        li.setAttribute('aria-expanded', exp ? 'false' : 'true');
      });
      li.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); li.click(); }
      });
    });
    sectionsDiv.append(ul);
  }

  // ── 4c. Tools / CTA (row 2) ───────────────────────────────────────────
  const toolsDiv = document.createElement('div');
  toolsDiv.className = 'nav-tools';
  const ctaLink = rows[2]?.querySelector('a');
  if (ctaLink) {
    ctaLink.className = 'nav-cta-btn';
    toolsDiv.append(ctaLink);
  }

  // ── 4d. Hamburger ─────────────────────────────────────────────────────
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation" aria-expanded="false">
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.querySelector('button').addEventListener('click', () => toggleMenu(nav));

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (nav.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target)) {
      toggleMenu(nav, false);
    }
  });

  // Collapse mobile menu when resizing to desktop
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) toggleMenu(nav, false);
  });

  // ── 5. Assemble ───────────────────────────────────────────────────────
  nav.append(brandDiv, sectionsDiv, toolsDiv, hamburger);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  block.textContent = '';
  block.append(banner, navWrapper);
}
