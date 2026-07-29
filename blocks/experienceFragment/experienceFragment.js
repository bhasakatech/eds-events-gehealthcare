import config from '../../scripts/config.js';

export default async function decorate(block) {
  const aemHost = config.host;

  const xfPath = block.querySelector(':scope > div:nth-child(1) a')?.textContent.trim();

  if (!xfPath) {
    console.error('Experience Fragment path not found.');
    return;
  }

  const url = `${aemHost}${xfPath}.plain.html`;

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Experience Fragment: ${response.status}`);
    }

    const html = await response.text();

    const itemId = `urn:aemconnection:${xfPath}`;

    block.innerHTML = `
      <div
        class="experience-fragment-content"
        data-aue-resource="${itemId}"
        data-aue-type="reference"
        data-aue-label="Experience Fragment">
        ${html}
      </div>
    `;
  } catch (e) {
    console.error('Failed to load Experience Fragment', e);
  }
}
