import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { fetchPlaceholdersWithContext } from '../../scripts/scripts.js';

/*
 * Header
 * Source: events.gehealthcare.com <header>
 *   row 0  grey regional disclaimer strip (27px desktop)
 *   row 1  logo + inline links (>= 900px) | Contact CTA + hamburger (85px)
 *   aside  right-side black drawer opened by the hamburger
 * When the page is scrolled the header collapses into a compact 64px bar
 * (no disclaimer, no inline links). The visible header height is published as
 * --nav-height so sticky blocks (section-nav, toolbars) sit flush beneath it;
 * the in-flow reservation uses --header-height so nothing shifts on collapse.
 */

const isDesktop = window.matchMedia('(min-width: 900px)');
const LOGO_FALLBACK = `${window.hlx?.codeBasePath || ''}/icons/ge-healthcare-logo.svg`;
const HAMBURGER_TITLE = 'nav-hamburger';

function isBrokenSrc(img) {
  const src = img.getAttribute('src') || '';
  return !src || src.startsWith('about:');
}

/**
 * Ensures the logo renders even if the authored asset reference is broken.
 * @param {HTMLImageElement} img
 */
function ensureLogo(img) {
  img.loading = 'eager';
  img.removeAttribute('width');
  img.removeAttribute('height');
  const useFallback = () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = 'true';
    img.closest('picture')?.querySelectorAll('source').forEach((s) => s.remove());
    img.src = LOGO_FALLBACK;
  };
  if (isBrokenSrc(img)) useFallback();
  else img.addEventListener('error', useFallback, { once: true });
}

function isHamburgerLink(a) {
  return a.title === HAMBURGER_TITLE || a.getAttribute('title') === HAMBURGER_TITLE;
}

/**
 * Splits the authored main nav section into logo, links, CTA, hamburger label.
 * @param {Element} section
 */
function parseMainSection(section) {
  const result = {
    logo: null, links: [], cta: null, menuLabel: '', drawerSources: [],
  };
  const wrapper = section.querySelector(':scope > .default-content-wrapper') || section;
  [...wrapper.children].forEach((el) => {
    const a = el.querySelector('a');
    const pic = el.querySelector('picture, img');
    if (a && isHamburgerLink(a)) {
      result.menuLabel = a.textContent.trim();
      el.remove();
    } else if (pic && !result.logo && (!a || !a.textContent.trim())) {
      result.logo = el;
    } else if (a) {
      result.links.push(el);
    }
  });
  // anything that is not default content (e.g. a columns block) feeds the drawer
  [...section.children].forEach((el) => {
    if (el !== wrapper) result.drawerSources.push(el);
  });

  // CTA: an emphasised link, otherwise the last link of the row
  const emphasised = result.links.find((p) => p.querySelector('strong a, em a, a strong, a em'));
  if (emphasised) result.cta = emphasised;
  else if (result.links.length > 1) result.cta = result.links.at(-1);
  if (result.cta) result.links = result.links.filter((p) => p !== result.cta);
  return result;
}

function buildBrand(logoEl) {
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (!logoEl) return brand;
  const img = logoEl.querySelector('img');
  if (img) ensureLogo(img);
  let link = logoEl.querySelector('a');
  if (!link) {
    link = document.createElement('a');
    link.href = '/';
    link.append(...logoEl.childNodes);
    logoEl.append(link);
  }
  if (img && !img.alt) link.setAttribute('aria-label', 'Home');
  link.classList.add('nav-logo');
  brand.append(logoEl);
  return brand;
}

function buildLinks(linkEls) {
  const list = document.createElement('ul');
  list.className = 'nav-links';
  linkEls.forEach((el) => {
    const a = el.querySelector('a');
    if (!a) return;
    const li = document.createElement('li');
    li.append(a);
    list.append(li);
  });
  return list;
}

function collectDrawerItems(sources) {
  const closeIcon = sources.map((s) => s.querySelector('picture, img')).find(Boolean);
  const links = sources.flatMap((s) => [...s.querySelectorAll('a')]);
  return { closeIcon, links };
}

function buildDrawer(sources, label) {
  const { closeIcon, links } = collectDrawerItems(sources);
  const drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  drawer.id = 'nav-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', label || 'Menu');
  drawer.setAttribute('aria-hidden', 'true');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-drawer-close';
  close.setAttribute('aria-label', 'Close navigation');
  if (closeIcon) {
    const img = closeIcon.tagName === 'IMG' ? closeIcon : closeIcon.querySelector('img');
    if (img && !isBrokenSrc(img)) {
      img.alt = '';
      close.classList.add('has-icon');
      img.addEventListener('error', () => close.classList.remove('has-icon'), { once: true });
      close.append(closeIcon);
    }
  }
  drawer.append(close);

  const list = document.createElement('ul');
  list.className = 'nav-drawer-links';
  links.forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    // in-page links (source "Resources" -> #resources) only show where the target exists,
    // like the source's .menu-res item on event pages
    const hash = a.getAttribute('href') || '';
    if (hash.length > 1 && hash.startsWith('#') && !document.getElementById(decodeURIComponent(hash.slice(1)))) {
      li.hidden = true;
    }
    list.append(li);
  });
  drawer.append(list);
  sources.forEach((s) => s.remove());
  return drawer;
}

function buildHamburger(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-hamburger';
  button.setAttribute('aria-controls', 'nav-drawer');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', label || 'Menu');
  button.innerHTML = '<span></span><span></span><span></span>';
  return button;
}

/**
 * Applies an authored placeholder text to the CTA (project convention:
 * a link titled "contact-us" takes its label from placeholders.json).
 */
async function applyPlaceholders(nav) {
  const cta = nav.querySelector('a[title="contact-us"]');
  if (!cta) return;
  try {
    const placeholders = await fetchPlaceholdersWithContext();
    const entry = Object.values(placeholders).find((row) => row.Key === 'contact-us');
    if (entry?.Text) cta.textContent = entry.Text;
  } catch (e) {
    // placeholders are optional
  }
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  block.textContent = '';
  const sections = [...fragment.children];
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');

  // row 0: disclaimer strip (first section with text and no links/images)
  let disclaimer = null;
  if (sections.length > 1 && !sections[0].querySelector('a, img, picture')) {
    disclaimer = sections.shift();
    disclaimer.classList.add('nav-disclaimer');
    nav.append(disclaimer);
  }

  // row 1: main bar
  const mainSection = sections.shift();
  const parsed = mainSection ? parseMainSection(mainSection) : {
    logo: null, links: [], cta: null, menuLabel: '', drawerSources: [],
  };
  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  const inner = document.createElement('div');
  inner.className = 'nav-bar-inner';
  inner.append(buildBrand(parsed.logo));

  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  navSections.append(buildLinks(parsed.links));
  inner.append(navSections);

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (parsed.cta) {
    const a = parsed.cta.querySelector('a');
    a.classList.add('nav-cta');
    tools.append(a);
  }

  // drawer: blocks inside the main section plus any remaining sections
  const drawerSources = [...parsed.drawerSources, ...sections];
  let drawer = null;
  let hamburger = null;
  if (drawerSources.length) {
    drawer = buildDrawer(drawerSources, parsed.menuLabel);
    hamburger = buildHamburger(parsed.menuLabel);
    tools.append(hamburger);
  }
  inner.append(tools);
  bar.append(inner);
  nav.append(bar);
  if (drawer) nav.append(drawer);
  mainSection?.remove();

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // drawer behaviour
  if (drawer && hamburger) {
    const closeBtn = drawer.querySelector('.nav-drawer-close');
    const setOpen = (open, focus = true) => {
      nav.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) drawer.removeAttribute('inert');
      else drawer.setAttribute('inert', '');
      if (focus) (open ? closeBtn : hamburger).focus({ preventScroll: true });
    };
    drawer.setAttribute('inert', '');
    hamburger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    closeBtn.addEventListener('click', () => setOpen(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false);
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !drawer.contains(e.target)
        && !hamburger.contains(e.target)) setOpen(false, false);
    });
    // in-page anchors (e.g. "Resources" -> #resources) scroll on the current page
    drawer.querySelectorAll('a[href*="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const { hash } = new URL(a.href, window.location);
        const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) return;
        e.preventDefault();
        setOpen(false, false);
        target.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', hash);
      });
    });
  }

  // compact-on-scroll + height tokens
  const root = document.documentElement;
  const publishHeights = () => {
    const h = navWrapper.offsetHeight;
    if (!h) return;
    root.style.setProperty('--nav-height', `${h}px`);
    if (!nav.classList.contains('is-compact')) root.style.setProperty('--header-height', `${h}px`);
  };
  const onScroll = () => {
    const compact = window.scrollY > 0;
    if (compact !== nav.classList.contains('is-compact')) {
      nav.classList.toggle('is-compact', compact);
      publishHeights();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  new ResizeObserver(publishHeights).observe(navWrapper);
  isDesktop.addEventListener('change', publishHeights);
  onScroll();
  publishHeights();

  applyPlaceholders(nav);
}
