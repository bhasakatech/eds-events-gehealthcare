import config from '../../scripts/config.js';

export default async function decorate(block) {
  const aemHost = config.host;

  const xfPath = block.querySelector(':scope > div:nth-child(1) a')?.textContent.trim();

  if (!xfPath) {
    console.error('Experience Fragment path not found.');
    return;
  }

  const url = xfPath.endsWith('/master')
    ? `${aemHost}${xfPath}.plain.html`
    : `${aemHost}${xfPath}/master.plain.html`;

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load Experience Fragment (${response.status})`);
    }

    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts and stylesheets
    doc.querySelectorAll('script, link').forEach((el) => el.remove());

    // Convert relative image URLs to absolute URLs
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) {
        img.src = `${aemHost}${src}`;
      }
    });

    // Convert relative links to absolute URLs
    doc.querySelectorAll('a').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/')) {
        anchor.href = `${aemHost}${href}`;
      }
    });

    const content = doc.body ? doc.body.innerHTML : html;

    const itemId = `urn:aemconnection:${xfPath}/master`;

    block.innerHTML = `
      <div
        class="experience-fragment-content"
        data-aue-resource="${itemId}"
        data-aue-type="reference"
        data-aue-label="Experience Fragment">
        ${content}
      </div>
    `;
  } catch (e) {
    console.error('Failed to load Experience Fragment', e);
  }
}
