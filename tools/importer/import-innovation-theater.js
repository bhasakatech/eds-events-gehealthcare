/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import eventHeroParser from './parsers/event-hero.js';
import videoTextParser from './parsers/video-text.js';
import theaterSessionsParser from './parsers/theater-sessions.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/gehealthcare-cleanup.js';
import sectionsTransformer from './transformers/gehealthcare-sections.js';

// PARSER REGISTRY
const parsers = {
  'event-hero': eventHeroParser,
  'video-text': videoTextParser,
  'theater-sessions': theaterSessionsParser,
};

// PAGE TEMPLATE CONFIGURATION (embedded from page-templates.json)
const PAGE_TEMPLATE = {
  name: 'innovation-theater',
  description: 'Innovation Theater landing page: dark hero (title + intro), a tagline+video intro band, and a large grid of session cards (thumbnail + title + speakers).',
  blocks: [
    { name: 'event-hero', instances: ['section.innovation-hero.hero-section.header-section'] },
    { name: 'video-text', instances: ['section.theater-intro'] },
    { name: 'theater-sessions', instances: ['section.theater-videos'] },
  ],
  sections: [
    { id: 'section-1', name: 'hero', selector: 'section.innovation-hero.hero-section.header-section', style: 'dark', blocks: ['event-hero'], defaultContent: [] },
    { id: 'section-2', name: 'intro', selector: 'section.theater-intro', style: 'dark', blocks: ['video-text'], defaultContent: [] },
    { id: 'section-3', name: 'sessions', selector: 'section.theater-videos', style: null, blocks: ['theater-sessions'], defaultContent: [] },
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
