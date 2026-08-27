/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gehealthcare-cleanup.js';

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
// News/press-release stub: single post-content section, default content only (no blocks).
const PAGE_TEMPLATE = {
  name: 'news-article',
  description: 'News/press-release stub page: post-content container with the release title as a heading and a content area.',
  blocks: [],
  sections: [
    { id: 'section-1', name: 'main', selector: 'div.post-content', style: null, blocks: [], defaultContent: ['div.post-content'] },
  ],
};

// TRANSFORMER REGISTRY (single section → no sections transformer needed)
const transformers = [cleanupTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);
    // No blocks on this template — content is default content only.
    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: [],
      },
    }];
  },
};
