export default async function decorate(block) {
  console.log('========== OFFER BLOCK START ==========');

  const aemPublish = 'https://author-p139816-e1765605.adobeaemcloud.com';
  const persistedQuery = '/graphql/execute.json/eds-events-gehealthcare/OfferByPath';

  console.log('Current Origin:', window.location.origin);

  const offerPath = block.querySelector(':scope > div:nth-child(1) a')?.textContent.trim();

  console.log('Offer Path:', offerPath);

  if (!offerPath) {
    console.error('Offer Path not found.');
    return;
  }

  let variation = 'main';
  const variationElement = block.querySelector(':scope > div:nth-child(2) p');

  if (variationElement) {
    variation = variationElement.textContent.trim();
  }

  console.log('Variation:', variation);

  const url = `${aemPublish}${persistedQuery};path=${offerPath};variation=${variation}`;

  console.log('GraphQL URL:', url);

  let offer;

  try {
    console.log('Fetching Content Fragment...');

    const response = await fetch(url, {
      credentials: 'include',
    });

    console.log('Response Status:', response.status);
    console.log('Response Redirected:', response.redirected);
    console.log('Response URL:', response.url);

    const json = await response.json();

    console.log('GraphQL Response:', json);

    offer = json?.data?.offerByPath?.item;

    console.log('Offer Object:', offer);
  } catch (e) {
    console.error('Failed to load Offer Content Fragment', e);
    return;
  }

  if (!offer) {
    console.warn('No Offer returned from GraphQL.');
    return;
  }

  const itemId = `urn:aemconnection:${offerPath}/jcr:content/data/master`;

  console.log('AUE Resource:', itemId);
  console.log('Rendering Offer Block...');

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

      ${
  offer.callToAction
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

  console.log('Offer block rendered successfully.');
  console.log('========== OFFER BLOCK END ==========');
}
