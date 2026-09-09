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
 * Builds a single product card element using DOM APIs (no innerHTML with user data).
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

  const category = document.createElement('span');
  category.className = 'product-list-category';
  setText(category, product.category);

  const title = document.createElement('h3');
  title.className = 'product-list-title';
  setText(title, product.title);

  const desc = document.createElement('p');
  desc.className = 'product-list-desc';
  setText(desc, product.description);

  // ── meta: rating + stock ──
  const meta = document.createElement('div');
  meta.className = 'product-list-meta';

  const ratingEl = document.createElement('span');
  ratingEl.className = 'product-list-rating';
  ratingEl.setAttribute('aria-label', `Rating: ${product.rating} out of 5`);
  ratingEl.textContent = renderStars(product.rating);
  const ratingVal = document.createElement('span');
  setText(ratingVal, String(product.rating));
  ratingEl.append(ratingVal);

  const stock = document.createElement('span');
  stock.className = `product-list-stock ${product.availabilityStatus === 'In Stock' ? 'in-stock' : 'out-of-stock'}`;
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
  body.append(category, title, desc, meta, footer);
  card.append(imageWrap, body);

  return card;
}

/**
 * Loads and decorates the product-list block.
 * @param {Element} block
 */
export default async function decorate(block) {
  // replace authored content with loading state
  const loader = document.createElement('div');
  loader.className = 'product-list-loading';
  loader.append(
    document.createElement('span'),
    document.createElement('span'),
    document.createElement('span'),
  );
  block.replaceChildren(loader);

  let products = [];

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    products = data.products || [];
  } catch (err) {
    const error = document.createElement('p');
    error.className = 'product-list-error';
    setText(error, 'Failed to load products. Please try again later.');
    block.replaceChildren(error);
    // eslint-disable-next-line no-console
    console.error('product-list: fetch failed', err);
    return;
  }

  // ── build grid ────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'product-list-grid';

  products.forEach((product, index) => {
    const card = buildCard(product);
    if (index >= INITIAL_COUNT) card.classList.add('product-list-hidden');
    grid.append(card);
  });

  // ── show more / show less button ──────────────────────────
  const controls = document.createElement('div');
  controls.className = 'product-list-controls';

  if (products.length > INITIAL_COUNT) {
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
  }

  // ── assemble ──────────────────────────────────────────────
  block.replaceChildren(grid, controls);
}
