/*
 * "Request more info" buttons link to /contact-us?data=<modality[ - product]>&request=<type>,
 * the same URL the source site opens in its contact popup. This module opens that page's
 * contact form in a dialog instead of navigating, and puts the contact form into the source's
 * request mode: inquiry type and area of interest hidden, message pre-filled, hidden
 * productcta/product fields set. Contact form submissions go to SaleStratus, for the
 * event's tradeshow ID (?eventSS=) when the link carries one.
 */
import { loadCSS } from './aem.js';
// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../blocks/fragment/fragment.js';

const CONTACT_PAGE = /\/contact-us(?:\.html)?\/?$/;

function waitForForm(root) {
  return new Promise((resolve) => {
    const existing = root.querySelector('form');
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const form = root.querySelector('form');
      if (form) {
        observer.disconnect();
        resolve(form);
      }
    });
    observer.observe(root, { childList: true, subtree: true });
  });
}

/**
 * Sends the contact form to SaleStratus (scripts/salestratus.js) instead of the default sheet,
 * as the source does. eventSS is the event's tradeshow ID the source passes as ?eventSS=.
 */
function useSaleStratus(form, params, onSuccess) {
  if (!/\/contact-form$/.test(form.dataset.action || '')) return;
  const eventSS = params.get('eventSS');
  form.submitHandler = async (f) => {
    const { submitLead } = await import('./salestratus.js');
    await submitLead(f, eventSS || undefined);
    // like the source (showThxMsg): only the thank-you message remains once the form block
    // has shown it
    setTimeout(() => {
      f.hidden = true;
      onSuccess?.();
    });
  };
}

function hideField(el) {
  const wrapper = el?.closest('.field-wrapper');
  if (wrapper) wrapper.dataset.visible = 'false';
}

/**
 * Applies the source contact page's request mode (?request=&data=) to the contact form.
 * @param {HTMLFormElement} form The rendered contact form
 * @param {URLSearchParams} params The request parameters
 */
export function applyRequestMode(form, params) {
  const request = params.get('request');
  if (!request) return;
  const data = params.get('data');
  const {
    area, message, productcta, product,
  } = form.elements;

  form.classList.add('request-mode');
  hideField(form.querySelector('fieldset[name="radio"]'));
  if (area) {
    area.required = false;
    hideField(area);
  }
  if (productcta) productcta.value = request;
  if (data) {
    const [modality, productName] = data.split(' - ');
    if (message) message.value = `I’d like to ${request.toLowerCase()} about GE HealthCare’s ${data} Solutions.`;
    if (area && [...area.options].some((o) => o.value === modality)) area.value = modality;
    if (product && productName) product.value = productName;
  }
}

/**
 * The source contact form is email-first: the inquiry, message and email come with a
 * "Continue" button; the name / company / phone details and the marketing consent
 * (.extrainfo, .phone-wrapper) only open after it, and the button becomes "Submit".
 * (The source looks the email up in SaleStratus at that step; the details always open here.)
 */
function useEmailFirst(form) {
  const details = form.querySelector('fieldset[name="details"]');
  const button = form.querySelector('button[type="submit"]');
  if (!details || !button || form.dataset.step) return;
  const step2 = [details, form.elements.service?.closest('.field-wrapper')].filter(Boolean);
  const emailIntro = form.querySelector('.field-email-intro');
  const required = [...details.querySelectorAll('[required]')];
  const submitLabel = button.textContent;

  const setStep = (step) => {
    form.dataset.step = step;
    const open = step === '2';
    step2.forEach((el) => { el.dataset.visible = String(open); });
    if (emailIntro) emailIntro.dataset.visible = String(!open);
    required.forEach((el) => { el.required = open; });
    button.textContent = open ? submitLabel : 'Continue';
  };
  setStep('1');

  // capture: runs before the form block's submit handler
  form.addEventListener('submit', (e) => {
    if (form.dataset.step !== '1' || !form.checkValidity()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setStep('2');
    details.querySelector('input, select')?.focus();
  }, true);
}

async function fetchContactFragment(path) {
  const fragment = await loadFragment(path);
  if (fragment || !window.location.pathname.startsWith('/content/')) return fragment;
  // local preview serves imported pages under /content/
  return loadFragment(`/content${path}`);
}

let opening = false;

async function openRequestDialog(url) {
  if (opening) return;
  opening = true;
  try {
    const [fragment] = await Promise.all([
      fetchContactFragment(url.pathname.replace(/\/$/, '')),
      loadCSS(`${window.hlx.codeBasePath}/styles/contact-dialog.css`),
    ]);
    if (!fragment) {
      window.location.href = url.href;
      return;
    }
    fragment.querySelector('.metadata')?.remove();

    const dialog = document.createElement('dialog');
    dialog.className = 'contact-dialog';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'contact-dialog-close';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => dialog.close());
    const body = document.createElement('div');
    body.className = 'contact-dialog-body';
    body.append(...fragment.childNodes);
    dialog.append(close, body);

    const heading = body.querySelector('h1, h2');
    if (heading?.id) dialog.setAttribute('aria-labelledby', heading.id);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove());
    // inside <main> so the contact page's form/intro styles (scoped to main) apply; a modal
    // dialog renders in the top layer regardless of its DOM position
    (document.querySelector('main') || document.body).append(dialog);

    const form = await waitForForm(body);
    applyRequestMode(form, url.searchParams);
    useEmailFirst(form);
    // the source closes its contact popup 5 seconds after the thank-you message
    useSaleStratus(form, url.searchParams, () => setTimeout(() => dialog.close(), 5000));
    dialog.showModal();
  } finally {
    opening = false;
  }
}

// "Request a meeting" (Jiffle): the source opens the booking form in its popup
// (div.jiffle-popup: 850px white box, iframe 760px high) instead of navigating.
const JIFFLE = /(^|\.)jifflenow\.com$/;

async function openMeetingDialog(url) {
  await loadCSS(`${window.hlx.codeBasePath}/styles/contact-dialog.css`);
  const dialog = document.createElement('dialog');
  dialog.className = 'contact-dialog contact-dialog-frame';
  dialog.setAttribute('aria-label', 'Request a meeting');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'contact-dialog-close';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => dialog.close());
  const frameUrl = new URL(url.href);
  if (!frameUrl.searchParams.has('embedded')) frameUrl.searchParams.set('embedded', 'true');
  const iframe = document.createElement('iframe');
  iframe.src = frameUrl.href;
  iframe.title = 'Request a meeting';
  dialog.append(close, iframe);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

export default function initContactRequests() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(link.href, window.location.href);
    if (JIFFLE.test(url.hostname) && url.pathname.includes('/external-request/')) {
      e.preventDefault();
      openMeetingDialog(url);
      return;
    }
    if (url.origin !== window.location.origin || !CONTACT_PAGE.test(url.pathname)) return;
    if (!url.searchParams.has('request') || CONTACT_PAGE.test(window.location.pathname)) return;
    e.preventDefault();
    openRequestDialog(url);
  });

  // The contact page itself: SaleStratus submission, plus request mode when opened with
  // ?request= (link opened in a new tab, no JS dialog).
  const params = new URLSearchParams(window.location.search);
  const main = document.querySelector('main');
  if (main && CONTACT_PAGE.test(window.location.pathname)) {
    waitForForm(main).then((form) => {
      applyRequestMode(form, params);
      useEmailFirst(form);
      useSaleStratus(form, params);
    });
  }
}
