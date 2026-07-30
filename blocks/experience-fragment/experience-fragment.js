import config from '../../scripts/config.js';

export default async function decorate(block) {
  const aemHost = config.host;

  const xfPath = block.querySelector(':scope > div:nth-child(1) a')?.textContent.trim();

  if (!xfPath) {
    return;
  }

  const urls = xfPath.endsWith('/master')
    ? [`${aemHost}${xfPath}.plain.html`]
    : [
        `${aemHost}${xfPath}.plain.html`,
        `${aemHost}${xfPath}/master.plain.html`,
      ];

  const responses = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          return null;
        }

        return {
          url,
          html: await response.text(),
        };
      } catch {
        return null;
      }
    }),
  );

  const result = responses.find(Boolean);

  if (!result) {
    return;
  }

  const itemId = `urn:aemconnection:${xfPath}`;

  block.innerHTML = `
    <div
      class="experience-fragment-content"
      data-aue-resource="${itemId}"
      data-aue-type="reference"
      data-aue-label="Experience Fragment">
      ${result.html}
    </div>
  `;
}