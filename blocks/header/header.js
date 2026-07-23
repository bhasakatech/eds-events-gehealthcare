import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

function toggleMenu(nav, forceExpanded = null) {
  const drawer = nav.querySelector('.columns-wrapper');
  const button = nav.querySelector('.hamburger-menu');
  if (!drawer) return;

  const currentlyOpen = drawer.style.display === 'block';
  const isOpen = forceExpanded !== null ? forceExpanded : !currentlyOpen;

  drawer.style.display = isOpen ? 'block' : 'none';
  nav.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (button) {
    button.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  }
}

function buildHamburger(nav) {
  const hamburgerLink = nav.querySelector('a[title="nav-hamburger"]');
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';

  if (hamburgerLink) {
    hamburger.innerHTML = `
      <div
        class="hamburger-menu adobe-tracking-element"
        data-analytics-link-name="Menu"
        data-analytics-link-type="Primary navigation"
        data-analytics-link-title="Header"
        role="button"
        tabindex="0"
        aria-label="Open navigation"
      >
        <div></div>
        <div></div>
        <div></div>
      </div>
    `;
    hamburgerLink.parentElement.replaceWith(hamburger);
    return hamburger;
  }

  hamburger.innerHTML = `
    <div
      class="hamburger-menu"
      role="button"
      tabindex="0"
      aria-label="Open navigation"
    >
      <div></div>
      <div></div>
      <div></div>
    </div>
  `;
  nav.append(hamburger);
  return hamburger;
}

export default async function decorate(block) {
  // Load nav fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  // Create nav
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) {
    nav.append(fragment.firstElementChild);
  }

  // Add section classes
  const sections = ['brand', 'sections', 'tools'];
  sections.forEach((name, index) => {
    const section = nav.children[index];
    if (section) section.classList.add(`nav-${name}`);
  });

  // Move announcement and main navigation
  const navBrand = nav.querySelector('.nav-brand');
  const navSections = nav.querySelector('.nav-sections');
  if (navBrand && navSections) {
    navBrand.classList.add('top-announcement');
    const wrapper = navSections.querySelector('.default-content-wrapper');
    if (wrapper) wrapper.classList.add('main-header');
  }

  // Mark dropdown sections
  if (navSections) {
    navSections.querySelectorAll('.default-content-wrapper > ul > li').forEach((item) => {
      if (item.querySelector('ul')) {
        item.classList.add('nav-drop');
      }

      item.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = item.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          item.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // Hamburger
  const hamburger = buildHamburger(nav);
  const hamburgerButton = hamburger.querySelector('.hamburger-menu');
  if (hamburgerButton) {
    hamburgerButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu(nav);
    });

    hamburgerButton.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMenu(nav);
      }
    });
  }

  nav.setAttribute('aria-expanded', 'false');

  // Drawer
  const drawer = nav.querySelector('.columns-wrapper');
  if (drawer) {
    drawer.style.display = 'none';
    const closeImage = drawer.querySelector('img');
    if (closeImage) {
      closeImage.style.cursor = 'pointer';
      closeImage.addEventListener('click', (event) => {
        event.preventDefault();
        toggleMenu(nav, false);
      });
    }
  }

  // Close on ESC
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggleMenu(nav, false);
  });

  // Close on click outside drawer
  document.addEventListener('click', (event) => {
    const drawerEl = nav.querySelector('.columns-wrapper');
    if (
      drawerEl
      && drawerEl.style.display === 'block'
      && !drawerEl.contains(event.target)
      && !hamburger.contains(event.target)
    ) {
      toggleMenu(nav, false);
    }
  });

  // Close on resize to desktop
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) toggleMenu(nav, false);
  });

  // Sticky header
  const header = document.querySelector('.header-wrapper');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('sticky-header', window.scrollY > 0);
    });
  }

  // Append
  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
