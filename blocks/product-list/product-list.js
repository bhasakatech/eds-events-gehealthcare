const API_URL = 'https://dummyjson.com/products?limit=0';
const INITIAL_COUNT = 20;

/**
 * Renders a star rating string (e.g. 4.2 → "★★★★☆")
 * @param {number} rating
 * @returns {string}
 */
function renderStars(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/**
 * Safely sets text content on an element.
 * @param {Element} el
 * @param {string} text
 */
function setText(el, text) {
  // eslint-disable-next-line no-param-reassign
  el.textContent = text;
}

/**
 * Reads the authored title and heading level from the block's DOM rows.
 * EDS renders model fields as rows: first cell = key, second cell = value.
 * Falls back to "All Products" / h2 if not authored.
 * @param {Element} block
 * @returns {{ title: string, tag: string }}
 */
function parseConfig(block) {
  let title = 'All Products';
  let tag = 'h2';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent?.trim().toLowerCase();
    const val = cells[1]?.textContent?.trim();
    if (key === 'heading_title' && val) title = val;
    if (key === 'heading_titletype' && val) tag = val;

    // Also handle when the block row contains a heading element directly
    const heading = row.querySelector('h1,h2,h3,h4,h5,h6');
    if (heading && !key) {
      title = heading.textContent.trim();
      tag = heading.tagName.toLowerCase();
    }
  });

  return { title, tag };
}

/**
 * Builds a single product card element using DOM APIs.
 * @param {object} product
 * @returns {HTMLElement}
 */
function buildCard(product) {
  const card = document.createElement('div');
  card.className = 'product-list-card';

  // ── image area ──
  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-list-card-image';

  if (product.discountPercentage) {
    const badge = document.createElement('span');
    badge.className = 'product-list-badge';
    setText(badge, `-${Math.round(product.discountPercentage)}%`);
    imageWrap.append(badge);
  }

  const img = document.createElement('img');
  img.src = product.thumbnail;
  img.alt = product.title;
  img.loading = 'lazy';
  img.width = 300;
  img.height = 200;
  imageWrap.append(img);

  // ── card body ──
  const body = document.createElement('div');
  body.className = 'product-list-card-body';

  const categoryEl = document.createElement('span');
  categoryEl.className = 'product-list-category';
  setText(categoryEl, product.category);

  const titleEl = document.createElement('h3');
  titleEl.className = 'product-list-title';
  setText(titleEl, product.title);

  const desc = document.createElement('p');
  desc.className = 'product-list-desc';
  setText(desc, product.description);

  // ── meta: rating + stock ──
  const meta = document.createElement('div');
  meta.className = 'product-list-meta';

  const ratingEl = document.createElement('span');
  ratingEl.className = 'product-list-rating';
  ratingEl.setAttribute('aria-label', `Rating: ${product.rating} out of 5`);
  setText(ratingEl, renderStars(product.rating));
  const ratingVal = document.createElement('span');
  setText(ratingVal, String(product.rating));
  ratingEl.append(ratingVal);

  const stock = document.createElement('span');
  const inStock = product.availabilityStatus === 'In Stock';
  stock.className = `product-list-stock ${inStock ? 'in-stock' : 'out-of-stock'}`;
  setText(stock, product.availabilityStatus);

  meta.append(ratingEl, stock);

  // ── footer: price + link ──
  const footer = document.createElement('div');
  footer.className = 'product-list-footer';

  const price = document.createElement('span');
  price.className = 'product-list-price';
  setText(price, `$${product.price.toFixed(2)}`);

  const link = document.createElement('a');
  link.className = 'product-list-btn';
  link.href = `/products/${product.id}`;
  link.setAttribute('aria-label', `View ${product.title}`);
  setText(link, 'View Details');

  footer.append(price, link);
  body.append(categoryEl, titleEl, desc, meta, footer);
  card.append(imageWrap, body);

  return card;
}

/**
 * Loads and decorates the product-list block.
 * @param {Element} block
 */
export default async function decorate(block) {
  // ── 1. Read authored config BEFORE replacing DOM ──────────
  const { title, tag } = parseConfig(block);

  // ── 2. Show loading state ─────────────────────────────────
  const loader = document.createElement('div');
  loader.className = 'product-list-loading';
  loader.append(
    document.createElement('span'),
    document.createElement('span'),
    document.createElement('span'),
  );
  block.replaceChildren(loader);

  // ── 3. Fetch products ─────────────────────────────────────
  let products = [];

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    products = data.products || [];
  } catch (err) {
    const errorEl = document.createElement('p');
    errorEl.className = 'product-list-error';
    setText(errorEl, 'Failed to load products. Please try again later.');
    block.replaceChildren(errorEl);
    // eslint-disable-next-line no-console
    console.error('product-list: fetch failed', err);
    return;
  }

  // ── 4. Build inner wrapper (mirrors products-solutions pattern) ──
  const inner = document.createElement('div');
  inner.className = 'product-list-inner';

  // Section header with authored title
  const header = document.createElement('div');
  header.className = 'product-list-header';
  const heading = document.createElement(tag);
  setText(heading, title);
  header.append(heading);
  inner.append(header);

  // ── 5. Build grid ─────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'product-list-grid';

  products.forEach((product, index) => {
    const card = buildCard(product);
    if (index >= INITIAL_COUNT) card.classList.add('product-list-hidden');
    grid.append(card);
  });
  inner.append(grid);

  // ── 6. Show more / show less button ──────────────────────
  if (products.length > INITIAL_COUNT) {
    const controls = document.createElement('div');
    controls.className = 'product-list-controls';

    const btn = document.createElement('button');
    btn.className = 'product-list-toggle button primary';
    btn.setAttribute('aria-expanded', 'false');
    setText(btn, `Show More (${products.length - INITIAL_COUNT} more)`);

    let expanded = false;

    btn.addEventListener('click', () => {
      expanded = !expanded;
      grid.querySelectorAll('.product-list-card').forEach((card, index) => {
        if (index >= INITIAL_COUNT) card.classList.toggle('product-list-hidden', !expanded);
      });

      if (expanded) {
        setText(btn, 'Show Less');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        setText(btn, `Show More (${products.length - INITIAL_COUNT} more)`);
        btn.setAttribute('aria-expanded', 'false');
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    controls.append(btn);
    inner.append(controls);
  }

  // ── 7. Assemble ───────────────────────────────────────────
  block.replaceChildren(inner);
}
