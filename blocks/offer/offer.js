import config from '../../scripts/config.js';

export default async function decorate(block) {
  const aemPublish = config.publish;
  const persistedQuery = '/graphql/execute.json/eds-events-gehealthcare/OfferByPath';

  const offerPath = block.querySelector(':scope > div:nth-child(1) a')?.textContent.trim();

  if (!offerPath) {
    console.error('Offer Path not found.');
    return;
  }

  let variation = 'main';
  const variationElement = block.querySelector(':scope > div:nth-child(2) p');

  if (variationElement) {
    variation = variationElement.textContent.trim();
  }

  const url = `${aemPublish}${persistedQuery};path=${offerPath};variation=${variation}`;

  let offer;

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    const json = await response.json();

    offer = json?.data?.offerByPath?.item;
  } catch (e) {
    console.error('Failed to load Offer Content Fragment', e);
    return;
  }

  if (!offer) {
    console.warn('No Offer returned from GraphQL.');
    return;
  }

  const itemId = `urn:aemconnection:${offerPath}/jcr:content/data/master`;

  block.innerHTML = `
    <div class="offer-content"
      data-aue-resource="${itemId}"
      data-aue-type="reference"
      data-aue-label="Offer Content Fragment">

      <div class="offer-left">

        <h2
          class="offer-heading"
          data-aue-prop="headline"
          data-aue-label="Headline"
          data-aue-type="text">
          ${offer.headline || ''}
        </h2>

        <p
          class="offer-description"
          data-aue-prop="description"
          data-aue-label="Description"
          data-aue-type="richtext">
          ${offer.description?.plaintext || ''}
        </p>

      </div>

      ${offer.callToAction
    ? `
      <div class="offer-right">
        <a
          href="${offer.ctaUrl || '#'}"
          class="button primary"
          data-aue-prop="callToAction"
          data-aue-label="Call To Action"
          data-aue-type="text">
          ${offer.callToAction}
        </a>
      </div>
      `
    : ''
}

    </div>
  `;
}
