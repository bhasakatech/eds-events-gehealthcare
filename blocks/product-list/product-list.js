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
 * Builds a single product card element.
 * @param {object} product
 * @returns {HTMLElement}
 */
function buildCard(product) {
  const card = document.createElement('div');
  card.className = 'product-list-card';

  const discountBadge = product.discountPercentage
    ? `<span class="product-list-badge">-${Math.round(product.discountPercentage)}%</span>`
    : '';

  const availability = product.availabilityStatus === 'In Stock'
    ? '<span class="product-list-stock in-stock">In Stock</span>'
    : `<span class="product-list-stock out-of-stock">${product.availabilityStatus}</span>`;

  card.innerHTML = `
    <div class="product-list-card-image">
      ${discountBadge}
      <img src="${product.thumbnail}" alt="${product.title}" loading="lazy" width="300" height="200">
    </div>
    <div class="product-list-card-body">
      <span class="product-list-category">${product.category}</span>
      <h3 class="product-list-title">${product.title}</h3>
      <p class="product-list-desc">${product.description}</p>
      <div class="product-list-meta">
        <span class="product-list-rating" aria-label="Rating: ${product.rating} out of 5">
          ${renderStars(product.rating)}
          <span>${product.rating}</span>
        </span>
        ${availability}
      </div>
      <div class="product-list-footer">
        <span class="product-list-price">$${product.price.toFixed(2)}</span>
        <a class="product-list-btn" href="/products/${product.id}" aria-label="View ${product.title}">View Details</a>
      </div>
    </div>
  `;

  return card;
}

/**
 * Loads and decorates the product-list block.
 * @param {Element} block
 */
export default async function decorate(block) {
  // replace authored content with loading state
  block.innerHTML = '<div class="product-list-loading"><span></span><span></span><span></span></div>';

  let products = [];

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    products = data.products || [];
  } catch (err) {
    block.innerHTML = `<p class="product-list-error">Failed to load products. Please try again later.</p>`;
    // eslint-disable-next-line no-console
    console.error('product-list: fetch failed', err);
    return;
  }

  // ── build grid ──────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'product-list-grid';

  products.forEach((product, index) => {
    const card = buildCard(product);
    if (index >= INITIAL_COUNT) card.classList.add('product-list-hidden');
    grid.append(card);
  });

  // ── show more / show less button ─────────────────────────
  const controls = document.createElement('div');
  controls.className = 'product-list-controls';

  const btn = document.createElement('button');
  btn.className = 'product-list-toggle button primary';
  btn.textContent = `Show More (${products.length - INITIAL_COUNT} more)`;
  btn.setAttribute('aria-expanded', 'false');

  let expanded = false;

  btn.addEventListener('click', () => {
    expanded = !expanded;
    grid.querySelectorAll('.product-list-hidden').forEach((card) => {
      card.classList.toggle('product-list-hidden', !expanded);
    });

    if (expanded) {
      btn.textContent = 'Show Less';
      btn.setAttribute('aria-expanded', 'true');
    } else {
      btn.textContent = `Show More (${products.length - INITIAL_COUNT} more)`;
      btn.setAttribute('aria-expanded', 'false');
      // scroll back to top of block smoothly
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // only show button if there are more than the initial count
  if (products.length > INITIAL_COUNT) controls.append(btn);

  // ── assemble ─────────────────────────────────────────────
  block.innerHTML = '';
  block.append(grid, controls);
}
