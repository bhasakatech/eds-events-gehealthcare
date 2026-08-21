/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import eventHeroParser from './parsers/event-hero.js';
import videoTextParser from './parsers/video-text.js';
import featureCardsParser from './parsers/feature-cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gehealthcare-cleanup.js';
import sectionsTransformer from './transformers/gehealthcare-sections.js';

// PARSER REGISTRY
const parsers = {
  'event-hero': eventHeroParser,
  'video-text': videoTextParser,
  'feature-cards': featureCardsParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'product-page',
  description: 'Product detail page: product hero, overview section, innovation-theater media section, and product-partial related content section.',
  blocks: [
    { name: 'event-hero', instances: ['section.hero-section.product-hero.header-section'] },
    { name: 'video-text', instances: ['section.modality-innovation-theater'] },
    { name: 'feature-cards', instances: ['section.product-partial-section'] },
  ],
  sections: [
    { id: 'section-1', name: 'product-hero', selector: 'section.hero-section.product-hero.header-section', style: 'dark', blocks: ['event-hero'], defaultContent: [] },
    { id: 'section-2', name: 'overview', selector: 'section.overview', style: null, blocks: [], defaultContent: ['section.overview'] },
    { id: 'section-3', name: 'innovation-theater', selector: 'section.modality-innovation-theater', style: 'dark', blocks: ['video-text'], defaultContent: [] },
    { id: 'section-4', name: 'product-partial', selector: 'section.product-partial-section', style: null, blocks: ['feature-cards'], defaultContent: [] },
  ],
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

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

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

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
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
