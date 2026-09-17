import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  getMetadata,
  createOptimizedPicture,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

export async function fetchPlaceholdersWithContext() {
  const placeholdersUrl = new URL('/placeholders.json', window.location.origin);

  const res = await fetch(placeholdersUrl);
  const { data } = await res.json();

  const map = {};

  data.forEach((row) => {
    const mapKey = row.Text ? `${row.Key}:${row.Text}` : row.Key;
    map[mapKey] = row;
  });

  return map;
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function setSiteIdentifier() {
  const { hostname } = window.location;
  const [, site] = hostname.match(/^.*?--(.+?)--[^.]+\.aem\./) || [];

  if (site && document.body) {
    document.body.dataset.site = site;
  }
}

setSiteIdentifier();

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
/**
 * Builds a blog-header block from page metadata for pages under /blogs.
 * Reads: title, image, author, publication-date, description.
 * @param {Element} main The container element
 */
function buildBlogHeaderBlock(main) {
  // only auto-block on blog pages (matches /blogs/... and /drafts/blogs/... for previews)
  if (!/(^|\/)blogs(\/|$)/.test(window.location.pathname)) return;

  const title = getMetadata('title') || (main.querySelector('h1')?.textContent ?? '');
  if (!title) return; // nothing to build a header from

  const image = getMetadata('image');
  const author = getMetadata('author');
  const pubDate = getMetadata('publication-date');
  const description = getMetadata('description');

  const rows = [];

  // row 1 - cover image (optional)
  if (image) {
    const picture = createOptimizedPicture(image, title, true, [{ width: '900' }]);
    rows.push([picture]);
  }

  // row 2 - title
  const h1 = document.createElement('h1');
  h1.textContent = title;
  rows.push([h1]);

  // row 3 - author + date (optional)
  if (author || pubDate) {
    const meta = document.createElement('div');
    meta.className = 'blog-header-meta';
    if (author) {
      const a = document.createElement('span');
      a.className = 'blog-header-author';
      a.textContent = author;
      meta.append(a);
    }
    if (pubDate) {
      const d = document.createElement('span');
      d.className = 'blog-header-date';
      d.textContent = pubDate;
      meta.append(d);
    }
    rows.push([meta]);
  }

  // row 4 - description (optional)
  if (description) {
    const p = document.createElement('p');
    p.textContent = description;
    rows.push([p]);
  }

  const section = document.createElement('div');
  section.append(buildBlock('blog-header', rows));
  main.prepend(section);

  // remove a duplicate authored H1 left in the body, if present
  const authoredH1 = main.querySelector('.blog-header ~ * h1, main > div:not(:first-child) h1');
  if (authoredH1 && authoredH1.textContent.trim() === title.trim()) {
    authoredH1.remove();
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildBlogHeaderBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
