/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: gehealthcare (events.gehealthcare.com) site-wide cleanup.
 *
 * Removes non-authorable WordPress site chrome, cookie/consent banners, modal
 * overlays, and tracking scripts/iframes so the import contains only page-level
 * authorable content.
 *
 * All selectors verified against the captured DOM in
 * migration-work/templates/{event-page,product-page,event-stub,news-article}/cleaned.html.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie / consent banners (WordPress: cookie-div, cookie-step2; Evidon consent).
    // Verified: <div class="cookie-div">, <div class="cookie-step2 adobe-tracking-element">,
    // <div id="_evidon-background" class="evidon-background">, <div id="_evidon_banner">, .evidon-banner*
    WebImporter.DOMUtils.remove(element, [
      '.cookie-div',
      '.cookie-step2',
      '#_evidon-background',
      '#_evidon_banner',
      '[class*="evidon"]',
      '[id*="evidon"]',
    ]);

    // Modal / dialog overlays and the message wrapper — non-authorable UI chrome.
    // Verified: many <div class="overlay ..."> variants (policy-overlay, product-overlay,
    // theater-overlay, overview-overlay, contact-overlay, jiffle-overlay, login-overlay,
    // workshop-overlay, thanks-overlay, contact-iframe-overlay) and <div class="message-wrapper ...">.
    WebImporter.DOMUtils.remove(element, [
      'div.overlay',
      'div.message-wrapper',
    ]);

    // Innovation Theater filter toolbar (search-sticky-wrapper / theater-radios /
    // customdropdown option lists). This is a client-side JS filter UI whose
    // dropdown options otherwise leak into the import as long lists of plain
    // <p> tags (event names, modality names, "OnDemand"/"Upcoming"). The
    // theater-sessions block rebuilds a styled, data-driven toolbar from the
    // session cards, so the source markup must not survive into the content.
    WebImporter.DOMUtils.remove(element, [
      'div.search-sticky-wrapper',
      'div.theater-radios',
      'div.event-options',
      'div.customdropdown',
    ]);

    // Tracking / identity-sync iframes injected late by martech (Adobe demdex/dest5.html
    // "Adobe ID Syncing iFrame", Hotjar _hjSafeContext*, and placeholder about:blank /
    // javascript: iframes). Removed in beforeTransform so WebImporter's link rules never
    // convert them into stray <a href="about:blank">_hjSafeContext</a> anchors in the output.
    WebImporter.DOMUtils.remove(element, [
      'iframe[src*="demdex.net"]',
      'iframe[id^="destination_publishing_iframe"]',
      'iframe[id^="_hjSafeContext"]',
      'iframe[src="about:blank"]',
      'iframe[src^="javascript:"]',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site shell — auto-generated in EDS.
    // Verified: <header class="sticky-header"> / <header>, <footer>.
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
    ]);

    // Tracking / analytics iframes and empty utility iframes (NOT Vidyard video iframes,
    // which carry authorable video content extracted by block parsers).
    // Verified: <iframe id="universal_pixel_1p3usoo" src="...insight.adsrvr.org...">,
    // <iframe id="dynamicIframe" src="">, <iframe src="">, <iframe src="" class="overview-iframe">.
    WebImporter.DOMUtils.remove(element, [
      '#universal_pixel_1p3usoo',
      '#dynamicIframe',
      'iframe.overview-iframe',
      'iframe[src=""]',
      'iframe:not([src])',
    ]);

    // Tracking / analytics scripts and their noscript fallbacks (demdex, adobedtm, boomr,
    // hotjar, vidyard analytics, ad pixels). Scripts are never authorable content.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'noscript',
      'link',
    ]);
  }
}
