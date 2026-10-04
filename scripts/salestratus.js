/*
 * SaleStratus lead submission for the contact form, reproducing the source site's cookie-free
 * path (main.js sendDataNoCookie): one full lead record built from the form fields, posted to
 * lead.php for the event's tradeshow ID and then for the master Events Center ID.
 */

const LEAD_URL = 'https://sparkblue.salestratus.com/lead.php';
/** Master "Events Center" tradeshow ID (source: every lead is also sent here) */
const MASTER_TRADESHOW_ID = '/0LJp3i9eSUUHdmLI2A1qA==';
/** Tradeshow ID the source contact page uses when no ?eventSS= is given */
export const DEFAULT_TRADESHOW_ID = 'MxE3o6COzdoLCCb4Ho1Mhg==';

let countryCodes;
async function getCountryCode(country) {
  if (!country) return '';
  if (!countryCodes) {
    try {
      const resp = await fetch(`${window.hlx.codeBasePath}/scripts/salestratus-countries.json`);
      countryCodes = resp.ok ? await resp.json() : {};
    } catch (e) {
      countryCodes = {};
    }
  }
  return countryCodes[country] || '';
}

/** Opt-in date as the source formats it: Europe/Paris "YYYY-MM-DD HH:mm:ss" */
function optInDate(date = new Date()) {
  const local = date.toLocaleString('en-GB', { timeZone: 'Europe/Paris', hour12: false }).replace(',', '');
  const [day, time] = local.split(' ');
  return `${day.split('/').reverse().join('-')} ${time}`;
}

const value = (form, name) => (form.elements[name]?.value || '').trim();

/**
 * Builds the lead record the source sends (field names and fixed values as in main.js).
 * @param {HTMLFormElement} form The contact form
 * @returns {Promise<Object>} SaleStratus "data" object
 */
export async function buildLead(form) {
  const message = value(form, 'message');
  const area = value(form, 'area');
  const product = value(form, 'product').replace(/[™©®℠]/g, '');
  const productCta = value(form, 'productcta');
  const optedIn = !!form.elements.service?.checked;
  return {
    Email: value(form, 'email'),
    Salutation: '',
    'First Name': value(form, 'name'),
    'Last Name': value(form, 'surname'),
    Job: value(form, 'job'),
    Company: value(form, 'company'),
    Phone: value(form, 'phone'),
    Validation: '',
    Mobile: '',
    Fax: '',
    Address: '',
    Address1: '',
    Address2: '',
    Address3: '',
    City: '',
    ZipCode: value(form, 'postal-code'),
    State: '',
    Country: value(form, 'country'),
    CountryCode: await getCountryCode(value(form, 'country')),
    Web: '',
    matomo_id: '',
    'Content Performance': '',
    'Clinical Speciality': '',
    'Contact Us Query': message,
    'Contact Us Modality': area,
    'Request Product Price': message,
    'Request Product Info Comment': message,
    'Request Product Info Comment - History': message,
    'Product availability acknowledged': 'YES',
    Identification: '',
    'Sign up': '',
    'Request Product Info': product,
    'Request Product Info - History': product,
    'Request Product History': product,
    'Request Modality Info - History': area,
    'Request Modality History': area,
    'Request Modality Info': area,
    'Modality only': area,
    'GE Privacy Policy': 'I AGREE',
    'Listing Type': 'NPI',
    Badge_comments: '',
    'Opt-in': optedIn ? 'TRUE' : 'FALSE',
    'Opt-in Source': optedIn ? 'Master - Events Center' : '',
    'Opt-in date': optedIn ? optInDate() : '',
    'Contact us': message,
    'Contact CTA': '',
    'Onsite Activity Registered': '',
    'Onsite Activity History': '',
    'Product CTA': productCta,
    'Product CTA - History': productCta,
    'Innovation Theatre': '',
    'Innovation Theatre History': '',
    Interests: '',
    UTM: '',
    'Campaign Name': '',
    'Campaign Content': '',
    'Campaign Source': '',
    quick_note: '',
  };
}

/** Same body jQuery.ajax({ data }) produces: urlencoded, nested keys as data[Key] */
export function encodeLead(tradeshowId, data) {
  const params = new URLSearchParams({ tradeshow_id: tradeshowId, act: 'external_submit' });
  Object.entries(data).forEach(([key, val]) => params.append(`data[${key}]`, val));
  return params;
}

async function post(body) {
  const resp = await fetch(LEAD_URL, { method: 'POST', body });
  if (!resp.ok) throw new Error(`SaleStratus ${resp.status}`);
  return resp;
}

/**
 * Sends the contact form as a SaleStratus lead (event tradeshow, then master Events Center).
 * Resolves when at least one post succeeds, so a visitor's request is not lost.
 * @param {HTMLFormElement} form The contact form
 * @param {string} [tradeshowId] Event tradeshow ID (?eventSS=), defaults like the source
 */
export async function submitLead(form, tradeshowId = DEFAULT_TRADESHOW_ID) {
  const data = await buildLead(form);
  const ids = [...new Set([tradeshowId || DEFAULT_TRADESHOW_ID, MASTER_TRADESHOW_ID])];
  const results = await Promise.allSettled(ids.map((id) => post(encodeLead(id, data))));
  if (!results.some((r) => r.status === 'fulfilled')) {
    throw results.find((r) => r.status === 'rejected').reason;
  }
}
