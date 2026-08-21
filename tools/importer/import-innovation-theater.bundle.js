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

  // tools/importer/import-innovation-theater.js
  var import_innovation_theater_exports = {};
  __export(import_innovation_theater_exports, {
    default: () => import_innovation_theater_default
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
    const cells = [];
    const contentCell = [];
    if (headingText) {
      const h = document2.createElement("p");
      h.textContent = headingText;
      contentCell.push(hint("content_heading"), h);
    }
    if (descriptionHtml) {
      const desc = document2.createElement("div");
      desc.innerHTML = descriptionHtml;
      contentCell.push(hint("content_description"), desc);
    }
    if (videoUrl) {
      const u = document2.createElement("p");
      u.textContent = videoUrl;
      contentCell.push(hint("content_videoUrl"), u);
    }
    if (thumbImg && (thumbImg.getAttribute("src") || "").trim()) {
      const img = thumbImg.cloneNode(true);
      if (!img.getAttribute("alt")) img.setAttribute("alt", headingText);
      contentCell.push(hint("content_thumbnail"), img);
    }
    if (contentCell.length) cells.push([contentCell]);
    if (ctaLabel) {
      const ctaCell = [];
      if (ctaHref) {
        const a = document2.createElement("a");
        a.href = ctaHref;
        a.textContent = ctaLabel;
        ctaCell.push(hint("cta_link"), a);
      } else {
        const l = document2.createElement("p");
        l.textContent = ctaLabel;
        ctaCell.push(hint("cta_label"), l);
      }
      cells.push([ctaCell]);
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "video-text", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/theater-sessions.js
  function comment(document2, name) {
    return document2.createComment(` field:${name} `);
  }
  function textOf(el) {
    return (el && el.textContent ? el.textContent : "").trim();
  }
  function hasContent(el) {
    if (!el) return false;
    if (el.querySelector && el.querySelector("img, picture, a, br, span, b, strong")) return true;
    return textOf(el).length > 0;
  }
  function readCardData(card) {
    const trigger = card.querySelector("a.theater-popup-trigger, a[data]");
    const raw = trigger && trigger.getAttribute("data");
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  function relatedEventOf(data) {
    const rel = data.related_to;
    if (Array.isArray(rel) && rel.length && rel[0] && rel[0].post_title) {
      return String(rel[0].post_title).trim();
    }
    if (typeof data.featured_in_event === "string") return data.featured_in_event.trim();
    return "";
  }
  function videoUrlOf(data) {
    const candidates = [data.zoom_link, data.external_link, data.learn_more_link, data.register_link];
    const url = candidates.find((v) => typeof v === "string" && /^https?:\/\//i.test(v));
    return url ? url.trim() : "";
  }
  function pushField(cell, document2, name, value) {
    if (!value) return;
    const p = document2.createElement("p");
    p.textContent = value;
    cell.push(comment(document2, name), p);
  }
  function parse3(element, { document: document2 }) {
    const cards = Array.from(element.querySelectorAll(".home-eventtile"));
    if (!cards.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const heading = element.querySelector(":scope h1, :scope h2, :scope h3");
    const isInsideCard = heading && heading.closest(".home-eventtile");
    if (heading && !isInsideCard) {
      const headingCell = [comment(document2, "heading_title"), heading.cloneNode(true)];
      const intro = heading.nextElementSibling;
      if (intro && intro.tagName === "P" && textOf(intro)) {
        headingCell.push(comment(document2, "heading_intro"), intro.cloneNode(true));
      }
      cells.push([headingCell]);
    }
    cards.forEach((card) => {
      const img = card.querySelector("img.event-image") || card.querySelector(".image img");
      const titleEl = card.querySelector(".title");
      const descEl = card.querySelector(".description");
      const speakersEl = card.querySelector(".speakers");
      const trigger = card.querySelector("a.theater-popup-trigger, a[title]");
      const data = readCardData(card);
      const title = textOf(titleEl) || trigger && trigger.getAttribute("title") || (typeof data.title === "string" ? data.title.trim() : "") || "";
      if (!title && !img) return;
      const imageCell = [];
      if (img) {
        const imgEl = img.cloneNode(true);
        imgEl.removeAttribute("class");
        if (title) imgEl.setAttribute("alt", title);
        imageCell.push(comment(document2, "image"), imgEl);
      }
      const contentCell = [];
      if (title) {
        const titleP = document2.createElement("p");
        titleP.textContent = title;
        contentCell.push(comment(document2, "content_title"), titleP);
      }
      if (hasContent(descEl)) {
        const descWrap = document2.createElement("div");
        Array.from(descEl.childNodes).forEach((n) => descWrap.appendChild(n.cloneNode(true)));
        if (textOf(descWrap) || descWrap.querySelector("img, a")) {
          contentCell.push(comment(document2, "content_description"), descWrap);
        }
      } else if (typeof data.description === "string" && data.description.trim()) {
        const descWrap = document2.createElement("div");
        descWrap.innerHTML = data.description.trim();
        contentCell.push(comment(document2, "content_description"), descWrap);
      }
      if (hasContent(speakersEl)) {
        const spWrap = document2.createElement("div");
        Array.from(speakersEl.childNodes).forEach((n) => spWrap.appendChild(n.cloneNode(true)));
        contentCell.push(comment(document2, "content_speakers"), spWrap);
      } else if (typeof data.speakers === "string" && data.speakers.trim()) {
        const spWrap = document2.createElement("div");
        spWrap.innerHTML = data.speakers.trim();
        contentCell.push(comment(document2, "content_speakers"), spWrap);
      }
      const metaCell = [];
      const type = typeof data.type === "string" ? data.type.trim().toLowerCase() : "";
      if (type === "ondemand" || type === "upcoming") {
        pushField(metaCell, document2, "meta_type", type);
      }
      pushField(metaCell, document2, "meta_relatedEvent", relatedEventOf(data));
      pushField(metaCell, document2, "meta_length", typeof data.length === "string" ? data.length.trim() : "");
      const videoCell = [];
      pushField(videoCell, document2, "video_url", videoUrlOf(data));
      cells.push([imageCell, contentCell, metaCell, videoCell]);
    });
    if (!cells.length || cells.length === 1 && !cells[0][1]) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "theater-sessions", cells });
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
        "div.search-sticky-wrapper",
        "div.theater-radios",
        "div.event-options",
        "div.customdropdown"
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

  // tools/importer/import-innovation-theater.js
  var parsers = {
    "event-hero": parse,
    "video-text": parse2,
    "theater-sessions": parse3
  };
  var PAGE_TEMPLATE = {
    name: "innovation-theater",
    description: "Innovation Theater landing page: dark hero (title + intro), a tagline+video intro band, and a large grid of session cards (thumbnail + title + speakers).",
    blocks: [
      { name: "event-hero", instances: ["section.innovation-hero.hero-section.header-section"] },
      { name: "video-text", instances: ["section.theater-intro"] },
      { name: "theater-sessions", instances: ["section.theater-videos"] }
    ],
    sections: [
      { id: "section-1", name: "hero", selector: "section.innovation-hero.hero-section.header-section", style: "dark", blocks: ["event-hero"], defaultContent: [] },
      { id: "section-2", name: "intro", selector: "section.theater-intro", style: "dark", blocks: ["video-text"], defaultContent: [] },
      { id: "section-3", name: "sessions", selector: "section.theater-videos", style: null, blocks: ["theater-sessions"], defaultContent: [] }
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
  var import_innovation_theater_default = {
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
  return __toCommonJS(import_innovation_theater_exports);
})();
