import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
 * Footer
 * Source: events.gehealthcare.com <footer>
 *   top     disclaimer text | CTA button (right-aligned >= 600px)
 *   bottom  logo, "more information" line, copyright | legal links column
 * Content comes from the authored footer fragment (xwalk: /footer):
 *   section 1  <p> text (disclaimer), <p><a> (CTA)
 *   section 2  <p><picture> (logo), <p> text/links, <ul> legal links
 *              (the list may sit inside a columns block)
 * List items without a link (e.g. "Cookie Preferences") become buttons that
 * open the consent manager preferences (Evidon) when it is present on the page.
 */

const LOGO_FALLBACK = `${window.hlx?.codeBasePath || ''}/icons/ge-healthcare-footer-logo.svg`;

function isBrokenSrc(img) {
  const src = img.getAttribute('src') || '';
  return !src || src.startsWith('about:');
}

/**
 * Ensures the logo renders even if the authored asset reference is broken
 * (e.g. unpublished DAM asset delivered as about:error).
 * @param {HTMLImageElement} img
 */
function ensureLogo(img) {
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

/**
 * Removes the button decoration applied by decorateButtons to fragment links.
 * @param {Element} el
 */
function resetButtonDecoration(el) {
  el.querySelectorAll('.button-container, .button-wrapper').forEach((p) => {
    p.classList.remove('button-container', 'button-wrapper');
  });
  el.querySelectorAll('a.button').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary', 'accent');
  });
}

/**
 * Opens external links in a new tab (source behaviour for all footer links).
 * @param {Element} el
 */
function decorateExternalLinks(el) {
  el.querySelectorAll('a[href]').forEach((a) => {
    let url;
    try {
      url = new URL(a.href, window.location.href);
    } catch (e) {
      return;
    }
    if (url.origin !== window.location.origin) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

/**
 * Opens the consent manager preferences dialog if the integration is loaded.
 */
function openConsentPreferences() {
  window.evidon?.notice?.showOptions?.();
}

/**
 * Turns link-less list items into accessible buttons (consent preferences).
 * @param {HTMLUListElement} list
 */
function decorateLinkList(list) {
  list.classList.add('footer-links');
  [...list.children].forEach((li) => {
    if (li.querySelector('a') || !li.textContent.trim()) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'footer-consent';
    button.append(...li.childNodes);
    button.addEventListener('click', openConsentPreferences);
    li.append(button);
  });
}

/**
 * Collects the authored content elements of a fragment section, flattening
 * default content and nested blocks (e.g. columns) into a single list.
 * @param {Element} section
 * @returns {Element[]}
 */
function getSectionItems(section) {
  const items = [];
  const wrappers = section.querySelectorAll(':scope > div');
  const containers = wrappers.length ? [...wrappers] : [section];
  containers.forEach((wrapper) => {
    if (wrapper.classList.contains('default-content-wrapper') || wrapper === section) {
      items.push(...wrapper.children);
    } else {
      // block wrapper: keep lists / paragraphs found inside the block
      items.push(...wrapper.querySelectorAll('ul, ol, p'));
    }
  });
  return items;
}

/**
 * Builds the top row: disclaimer text and CTA link.
 * @param {Element[]} items
 * @returns {HTMLElement}
 */
function buildTop(items) {
  const top = document.createElement('div');
  top.className = 'footer-top';
  const message = document.createElement('div');
  message.className = 'footer-message';
  const cta = document.createElement('div');
  cta.className = 'footer-cta';

  items.forEach((item) => {
    const links = item.querySelectorAll('a');
    const isLinkOnly = links.length === 1
      && links[0].textContent.trim() === item.textContent.trim();
    if (isLinkOnly && !cta.children.length) {
      links[0].classList.add('footer-cta-link');
      cta.append(links[0]);
    } else {
      message.append(item);
    }
  });

  top.append(message);
  if (cta.children.length) top.append(cta);
  return top;
}

/**
 * Builds the bottom row: brand column (logo + text) and legal links column.
 * @param {Element[]} items
 * @returns {HTMLElement}
 */
function buildBottom(items) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  const legal = document.createElement('div');
  legal.className = 'footer-legal';

  const textItems = [];
  items.forEach((item) => {
    const img = item.querySelector('img');
    if (img && !item.textContent.trim()) {
      ensureLogo(img);
      item.classList.add('footer-logo');
      brand.append(item);
    } else if (item.matches('ul, ol')) {
      decorateLinkList(item);
      legal.append(item);
    } else {
      textItems.push(item);
    }
  });

  textItems.forEach((item, i) => {
    // the last text paragraph is the copyright / trademark line
    item.classList.add(i === textItems.length - 1 && textItems.length > 1
      ? 'footer-copyright'
      : 'footer-info');
    brand.append(item);
  });

  bottom.append(brand);
  if (legal.children.length) bottom.append(legal);
  return bottom;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment (xwalk: footer metadata or /footer)
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  const sections = [...fragment.querySelectorAll(':scope > .section, :scope > div')];
  if (!sections.length) return;

  resetButtonDecoration(fragment);

  const [first, ...rest] = sections;
  const container = document.createElement('div');
  container.className = 'footer-container';
  container.append(buildTop(getSectionItems(first)));
  const bottomItems = rest.flatMap((section) => getSectionItems(section));
  if (bottomItems.length) container.append(buildBottom(bottomItems));

  decorateExternalLinks(container);
  block.replaceChildren(container);
}
