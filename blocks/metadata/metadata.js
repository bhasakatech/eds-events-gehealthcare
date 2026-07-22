function setTitle(title) {
  if (title) {
    document.title = title;
  }
}

function setMeta(attr, key, value) {
  if (!value) return;

  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', value);
}

function setCanonical(url) {
  if (!url) return;

  let link = document.head.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div > div')];

  const metadata = {};

  rows.forEach((row) => {
    const cells = [...row.children];

    if (cells.length < 2) return;

    const key = cells[0].textContent.trim();
    const value = cells[1].textContent.trim();

    metadata[key] = value;
  });

  setTitle(metadata.title);

  setMeta('name', 'description', metadata.description);
  setMeta('name', 'robots', metadata.robots);

  setMeta('property', 'og:title', metadata.ogTitle);
  setMeta('property', 'og:description', metadata.ogDescription);
  setMeta('property', 'og:type', metadata.ogType);
  setMeta('property', 'og:image', metadata.ogImage);
  setMeta('property', 'og:site_name', metadata.ogSiteName);
  setMeta('property', 'og:locale', metadata.ogLocale);

  setMeta(
    'property',
    'og:url',
    metadata.canonical || window.location.href,
  );

  setMeta('name', 'twitter:card', metadata.twitterCard);
  setMeta('name', 'twitter:title', metadata.twitterTitle);
  setMeta(
    'name',
    'twitter:description',
    metadata.twitterDescription,
  );
  setMeta('name', 'twitter:image', metadata.twitterImage);
  setMeta('name', 'twitter:site', metadata.twitterSite);
  setMeta('name', 'twitter:creator', metadata.twitterCreator);

  setCanonical(metadata.canonical || window.location.href);

  // Hide the block after processing
  block.closest('.section')?.remove();
}
