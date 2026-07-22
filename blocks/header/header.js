import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// function closeOnEscape(e) {
//   if (e.code === "Escape") {
//     const nav = document.getElementById("nav");
//     const navSections = nav.querySelector(".nav-sections");
//     if (!navSections) return;
//     const navSectionExpanded = navSections.querySelector(
//       '[aria-expanded="true"]',
//     );
//     if (navSectionExpanded && isDesktop.matches) {
//       // eslint-disable-next-line no-use-before-define
//       toggleAllNavSections(navSections);
//       navSectionExpanded.focus();
//     } else if (!isDesktop.matches) {
//       // eslint-disable-next-line no-use-before-define
//       toggleMenu(nav, navSections);
//       nav.querySelector("button").focus();
//     }
//   }
// }

// function closeOnFocusLost(e) {
//   const nav = e.currentTarget;
//   if (!nav.contains(e.relatedTarget)) {
//     const navSections = nav.querySelector(".nav-sections");
//     if (!navSections) return;
//     const navSectionExpanded = navSections.querySelector(
//       '[aria-expanded="true"]',
//     );
//     if (navSectionExpanded && isDesktop.matches) {
//       // eslint-disable-next-line no-use-before-define
//       toggleAllNavSections(navSections, false);
//     } else if (!isDesktop.matches) {
//       // eslint-disable-next-line no-use-before-define
//       toggleMenu(nav, navSections, false);
//     }
//   }
// }

// function openOnKeydown(e) {
//   const focused = document.activeElement;
//   const isNavDrop = focused.className === 'nav-drop';
//   if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
//     const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
//     // eslint-disable-next-line no-use-before-define
//     toggleAllNavSections(focused.closest('.nav-sections'));
//     focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
//   }
// }

// function focusNavSection() {
//   document.activeElement.addEventListener("keydown", openOnKeydown);
// }

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections
    .querySelectorAll('.nav-sections .default-content-wrapper > ul > li')
    .forEach((section) => {
      section.setAttribute('aria-expanded', expanded);
    });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, forceExpanded = null) {
  const drawer = nav.querySelector('.columns-wrapper');
  const button = nav.querySelector('.nav-hamburger button');

  if (!drawer) return;

  const currentlyOpen = drawer.style.display === 'block';

  const isOpen = forceExpanded !== null ? forceExpanded : !currentlyOpen;

  drawer.style.display = isOpen ? 'block' : 'none';

  nav.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (button) {
    button.setAttribute(
      'aria-label',
      isOpen ? 'Close navigation' : 'Open navigation',
    );
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');

  if (navBrand) {
    const brandLink = navBrand.querySelector('.button');

    if (brandLink) {
      brandLink.className = '';

      const buttonContainer = brandLink.closest('.button-container');
      if (buttonContainer) {
        buttonContainer.className = '';
      }
    }
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections
      .querySelectorAll(':scope .default-content-wrapper > ul > li')
      .forEach((navSection) => {
        if (navSection.querySelector('ul')) {
          navSection.classList.add('nav-drop');
        }
        navSection.addEventListener('click', () => {
          if (isDesktop.matches) {
            const expanded = navSection.getAttribute('aria-expanded') === 'true';
            toggleAllNavSections(navSections);
            navSection.setAttribute(
              'aria-expanded',
              expanded ? 'false' : 'true',
            );
          }
        });
      });
  }

  // hamburger for mobile
  // Find authored hamburger link
  const hamburgerLink = nav.querySelector('a[title="nav-hamburger"]');

  let hamburger;

  if (hamburgerLink) {
    const iconSrc = hamburgerLink.getAttribute('href');

    hamburger = document.createElement('div');
    hamburger.className = 'nav-hamburger';

    hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation">
      ${
  iconSrc
    ? `<img src="${iconSrc}" alt="Menu">`
    : '<span class="nav-hamburger-icon"></span>'
}
    </button>
  `;

    // Replace the authored link with hamburger
    hamburgerLink.parentElement.replaceWith(hamburger);
  } else {
    hamburger = document.createElement('div');
    hamburger.className = 'nav-hamburger';

    hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>
  `;

    nav.prepend(hamburger);
  }

  const hamburgerButton = hamburger.querySelector('button');

  hamburgerButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu(nav);
  });

  nav.setAttribute('aria-expanded', 'false');

  // Hide drawer initially
  const drawer = nav.querySelector('.columns-wrapper');

  if (drawer) {
    drawer.style.display = 'none';

    // First image inside the drawer acts as Close button
    const closeImage = drawer.querySelector('img');

    if (closeImage) {
      closeImage.style.cursor = 'pointer';

      closeImage.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(nav, false);
      });
    }
  }

  // Close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleMenu(nav, false);
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    const drawerEl = nav.querySelector('.columns-wrapper');

    if (
      drawerEl
      && drawerEl.style.display === 'block'
      && !drawerEl.contains(e.target)
      && !hamburger.contains(e.target)
    ) {
      toggleMenu(nav, false);
    }
  });

  // Close on desktop resize
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      toggleMenu(nav, false);
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
