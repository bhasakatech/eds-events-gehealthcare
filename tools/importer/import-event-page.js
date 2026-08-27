/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import eventHeroParser from './parsers/event-hero.js';
import sectionNavParser from './parsers/section-nav.js';
import videoTextParser from './parsers/video-text.js';
import productsSolutionsParser from './parsers/products-solutions.js';
import featureCardsParser from './parsers/feature-cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gehealthcare-cleanup.js';
import sectionsTransformer from './transformers/gehealthcare-sections.js';

// PARSER REGISTRY
const parsers = {
  'event-hero': eventHeroParser,
  'section-nav': sectionNavParser,
  'video-text': videoTextParser,
  'products-solutions': productsSolutionsParser,
  'feature-cards': featureCardsParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'event-page',
  description: 'Rich event landing page: hero with video and event meta, sticky sub-nav, welcome band, product-category grids (modality section), whats-new video carousel, resources cards, and news list.',
  blocks: [
    { name: 'event-hero', instances: ['section.hero-section.header-section'] },
    { name: 'section-nav', instances: ['div.header-bluebar.sticky-nav'] },
    { name: 'video-text', instances: ['div.theater-intro'] },
    { name: 'products-solutions', instances: ['section.page-section.modality-section'] },
    { name: 'feature-cards', instances: ['section.resources-section'] },
  ],
  sections: [
    { id: 'section-1', name: 'hero', selector: 'section.hero-section.header-section', style: 'dark', blocks: ['event-hero'], defaultContent: [] },
    { id: 'section-2', name: 'sticky-nav', selector: 'div.header-bluebar.sticky-nav', style: 'grey', blocks: ['section-nav'], defaultContent: [] },
    { id: 'section-3', name: 'welcome', selector: 'div.theater-intro', style: 'dark', blocks: ['video-text'], defaultContent: [] },
    { id: 'section-4', name: 'plan-your-visit', selector: 'section.event-extra-text', style: null, blocks: [], defaultContent: ['section.event-extra-text'] },
    { id: 'section-5', name: 'modality', selector: 'section.page-section.modality-section', style: 'light-grey', blocks: ['products-solutions'], defaultContent: [] },
    { id: 'section-6', name: 'resources', selector: 'section.resources-section', style: null, blocks: ['feature-cards'], defaultContent: [] },
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
