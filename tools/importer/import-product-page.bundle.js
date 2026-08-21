/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-product-page.js
  var import_product_page_exports = {};
  __export(import_product_page_exports, {
    default: () => import_product_page_default
  });

  // tools/importer/parsers/event-hero.js
  function parse(element, { document: document2 }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const hint = (name) => document2.createComment(` field:${name} `);
    const titleEl = element.querySelector(".h1.title, .title.h1, h1, h2, .hero-title, .title");
    const titleText = ((_a = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _a.trim()) || "";
    let titleTag = "h1";
    if (titleEl && /^h[12]$/i.test(titleEl.tagName)) titleTag = titleEl.tagName.toLowerCase();
    else if ((_b = titleEl == null ? void 0 : titleEl.classList) == null ? void 0 : _b.contains("h2")) titleTag = "h2";
    const metaParts = [];
    const metaDate = (_d = (_c = element.querySelector(".event-time")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim();
    const metaBooth = (_f = (_e = element.querySelector(".event-topic")) == null ? void 0 : _e.textContent) == null ? void 0 : _f.trim();
    const metaLoc = (_h = (_g = element.querySelector(".event-location")) == null ? void 0 : _g.textContent) == null ? void 0 : _h.trim();
    if (metaDate || metaBooth || metaLoc) {
      metaParts.push(metaDate || "", metaBooth || "", metaLoc || "");
    }
    const taglineParts = [];
    const subtextEls = [...element.querySelectorAll(
      '.event-desc, .subtext, .subtitle, [class*="subtext"]'
    )];
    subtextEls.forEach((el) => {
      const t = el.textContent.trim();
      if (!t) return;
      if (!metaParts.length && t.includes("|")) {
        metaParts.push(...t.split("|").map((s) => s.trim()).filter(Boolean));
      } else if (t !== "|") {
        taglineParts.push(t);
      }
    });
    const anchors = [...element.querySelectorAll("a[href]")];
    const buttonDivs = [...element.querySelectorAll(
      '.secondary-button, .primary-button, .contact-button, .req-info, .btn, [class*="button"]'
    )].filter((el) => el.tagName !== "A" && !el.querySelector("a[href]") && el.textContent.trim());
    const ctaCandidates = [...anchors, ...buttonDivs];
    const toAnchor = (el) => {
      var _a2;
      const a = document2.createElement("a");
      a.href = ((_a2 = el.getAttribute) == null ? void 0 : _a2.call(el, "href")) || "#";
      a.textContent = el.textContent.trim();
      return a;
    };
    const bgImg = element.querySelector(
      'img.vidyard-player-container, img[class*="background"], img[class*="bg"], picture img, img'
    );
    const hasBg = bgImg && (bgImg.getAttribute("src") || "").trim();
    if (!titleText && !taglineParts.length && !ctaCandidates.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const headingCell = [];
    if (titleText) {
      const h = document2.createElement(titleTag);
      h.textContent = titleText;
      headingCell.push(hint("heading_title"), h);
    }
    if (taglineParts.length) {
      const p = document2.createElement("p");
      p.textContent = taglineParts.join(" ");
      headingCell.push(hint("heading_tagline"), p);
    }
    if (headingCell.length) cells.push([headingCell]);
    if (metaParts.length) {
      const metaCell = [];
      const [date, booth, location] = metaParts;
      if (date) metaCell.push(hint("meta_date"), document2.createTextNode(date));
      if (booth) metaCell.push(hint("meta_booth"), document2.createTextNode(booth));
      if (location) metaCell.push(hint("meta_location"), document2.createTextNode(location));
      if (metaCell.length) cells.push([metaCell]);
    }
    const [primary, secondary] = ctaCandidates;
    if (primary || secondary) {
      const actionsCell = [];
      if (primary) actionsCell.push(hint("actions_primary"), toAnchor(primary));
      if (secondary) actionsCell.push(hint("actions_secondary"), toAnchor(secondary));
      cells.push([actionsCell]);
    }
    if (hasBg) {
      const img = bgImg.cloneNode(true);
      if (!img.getAttribute("alt")) img.setAttribute("alt", titleText);
      cells.push([[hint("image"), img]]);
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "event-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/video-text.js
  function parse2(element, { document: document2 }) {
    var _a, _b;
    const hint = (name) => document2.createComment(` field:${name} `);
    const headingEl = element.querySelector('.h2, h1, h2, h3, [class*="title"]');
    const headingText = ((_a = headingEl == null ? void 0 : headingEl.textContent) == null ? void 0 : _a.trim()) || "";
    const iframe = element.querySelector("iframe[src]");
    const videoUrl = ((_b = iframe == null ? void 0 : iframe.getAttribute("src")) == null ? void 0 : _b.trim()) || "";
    const thumbImg = element.querySelector(".theater-video-wrapper img, .home-eventtile img, img");
    const descContainer = element.querySelector(
      '.theater-description, .subtext, [class*="description"]'
    );
    let descriptionHtml = "";
    if (descContainer) {
      descriptionHtml = descContainer.innerHTML.trim();
    } else {
      const ps = [...element.querySelectorAll("p")].filter((p) => p.textContent.trim()).map((p) => p.outerHTML);
      descriptionHtml = ps.join("");
    }
    const ctaAnchor = element.querySelector("a[href]");
    const ctaButton = element.querySelector(
      '.grey-button, .save-date-button, .secondary-button, .btn, [class*="button"]'
    );
    let ctaLabel = "";
    let ctaHref = "";
    if (ctaAnchor) {
      ctaLabel = ctaAnchor.textContent.trim();
      ctaHref = ctaAnchor.getAttribute("href") || "";
    } else if (ctaButton && ctaButton.textContent.trim()) {
      ctaLabel = ctaButton.textContent.trim();
    }
    if (!headingText && !videoUrl && !descriptionHtml) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const itemCell = [];
    if (headingText) {
      const h = document2.createElement("p");
      h.textContent = headingText;
      itemCell.push(hint("videoTextHeading"), h);
    }
    if (descriptionHtml) {
      const desc = document2.createElement("div");
      desc.innerHTML = descriptionHtml;
      itemCell.push(hint("videoTextDescription"), desc);
    }
    if (videoUrl) {
      itemCell.push(hint("videoTextVideoUrl"), document2.createTextNode(videoUrl));
    }
    if (thumbImg && (thumbImg.getAttribute("src") || "").trim()) {
      const img = thumbImg.cloneNode(true);
      if (!img.getAttribute("alt")) img.setAttribute("alt", headingText);
      itemCell.push(hint("videoTextThumbnail"), img);
    }
    if (ctaLabel) {
      if (ctaHref) {
        const a = document2.createElement("a");
        a.href = ctaHref;
        a.textContent = ctaLabel;
        itemCell.push(hint("videoTextCtaLink"), a);
      } else {
        itemCell.push(hint("videoTextCtaLabel"), document2.createTextNode(ctaLabel));
      }
    }
    const cells = [[itemCell]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "video-text", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/feature-cards.js
  function parse3(element, { document: document2 }) {
    var _a;
    const hint = (name) => document2.createComment(` field:${name} `);
    const headingEl = element.querySelector(".resources-title, .section-title, h1, h2, h3, .h2");
    const headingText = ((_a = headingEl == null ? void 0 : headingEl.textContent) == null ? void 0 : _a.trim()) || "";
    let titleTag = "h2";
    if (headingEl && /^h[23]$/i.test(headingEl.tagName)) titleTag = headingEl.tagName.toLowerCase();
    const cardEls = [...element.querySelectorAll(".home-eventtile, .product-tile, .resource-tile")];
    const cards = cardEls.map((tile) => {
      var _a2;
      const titleEl = tile.querySelector(".resource-title, .title, h3, h4");
      const title = ((_a2 = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _a2.trim()) || "";
      const img = tile.querySelector("img.event-image, .image > img, .image img, img");
      const descEl = tile.querySelector(".description");
      const descHtml = descEl && descEl.textContent.trim() ? descEl.innerHTML.trim() : "";
      const link = tile.querySelector("a[href]");
      return { title, img, descHtml, link };
    }).filter((c) => c.title || c.img || c.link);
    if (!headingText && !cards.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (headingText) {
      const h = document2.createElement(titleTag);
      h.textContent = headingText;
      cells.push([[hint("heading_title"), h]]);
    }
    cards.forEach((card) => {
      const imageCell = [];
      if (card.img && (card.img.getAttribute("src") || "").trim()) {
        const im = card.img.cloneNode(true);
        if (!im.getAttribute("alt")) im.setAttribute("alt", card.title);
        imageCell.push(hint("image"), im);
      }
      const contentCell = [];
      if (card.title) {
        const t = document2.createElement("p");
        t.textContent = card.title;
        contentCell.push(hint("content_title"), t);
      }
      if (card.descHtml) {
        const d = document2.createElement("div");
        d.innerHTML = card.descHtml;
        contentCell.push(hint("content_description"), d);
      }
      const ctaCell = [];
      if (card.link) {
        const href = card.link.getAttribute("href") || "";
        const label = card.link.textContent.trim() || card.link.getAttribute("title") || card.title || "Learn more";
        const a = document2.createElement("a");
        a.href = href;
        a.textContent = label;
        ctaCell.push(hint("cta"), a);
      }
      cells.push([imageCell, contentCell, ctaCell]);
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "feature-cards", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/gehealthcare-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".cookie-div",
        ".cookie-step2",
        "#_evidon-background",
        "#_evidon_banner",
        '[class*="evidon"]',
        '[id*="evidon"]'
      ]);
      WebImporter.DOMUtils.remove(element, [
        "div.overlay",
        "div.message-wrapper"
      ]);
      WebImporter.DOMUtils.remove(element, [
        'iframe[src*="demdex.net"]',
        'iframe[id^="destination_publishing_iframe"]',
        'iframe[id^="_hjSafeContext"]',
        'iframe[src="about:blank"]',
        'iframe[src^="javascript:"]'
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "#universal_pixel_1p3usoo",
        "#dynamicIframe",
        "iframe.overview-iframe",
        'iframe[src=""]',
        "iframe:not([src])"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "script",
        "noscript",
        "link"
      ]);
    }
  }

  // tools/importer/transformers/gehealthcare-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = element.querySelector(section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || element.querySelector(section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-product-page.js
  var parsers = {
    "event-hero": parse,
    "video-text": parse2,
    "feature-cards": parse3
  };
  var PAGE_TEMPLATE = {
    name: "product-page",
    description: "Product detail page: product hero, overview section, innovation-theater media section, and product-partial related content section.",
    blocks: [
      { name: "event-hero", instances: ["section.hero-section.product-hero.header-section"] },
      { name: "video-text", instances: ["section.modality-innovation-theater"] },
      { name: "feature-cards", instances: ["section.product-partial-section"] }
    ],
    sections: [
      { id: "section-1", name: "product-hero", selector: "section.hero-section.product-hero.header-section", style: "dark", blocks: ["event-hero"], defaultContent: [] },
      { id: "section-2", name: "overview", selector: "section.overview", style: null, blocks: [], defaultContent: ["section.overview"] },
      { id: "section-3", name: "innovation-theater", selector: "section.modality-innovation-theater", style: "dark", blocks: ["video-text"], defaultContent: [] },
      { id: "section-4", name: "product-partial", selector: "section.product-partial-section", style: null, blocks: ["feature-cards"], defaultContent: [] }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
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
  var import_product_page_default = {
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_product_page_exports);
})();
