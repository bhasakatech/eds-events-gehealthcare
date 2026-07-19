import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  const fragment = await loadFragment(footerPath);

  // Replace the block content with the fragment
  block.textContent = '';
  while (fragment.firstElementChild) {
    block.append(fragment.firstElementChild);
  }

  const rows = [...block.children];

  if (rows.length < 4) {
    return;
  }

  const [
    countryRow,
    logoRow,
    infoRow,
    copyrightRow,
  ] = rows;

  // Clear the block before rebuilding
  block.textContent = '';

  const footer = document.createElement('div');
  footer.className = 'footer-content';

  /* ---------- Top ---------- */

  const top = document.createElement('div');
  top.className = 'footer-top';

  const message = document.createElement('div');
  message.className = 'footer-message';
  message.append(...countryRow.firstElementChild.childNodes);

  const contact = document.createElement('div');
  contact.className = 'footer-contact';

  const contactButton = document.querySelector('.default-content-wrapper a');

  if (contactButton) {
    contact.append(contactButton.cloneNode(true));
  }

  top.append(message, contact);

  /* ---------- Bottom ---------- */

  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  const left = document.createElement('div');
  left.className = 'footer-left';

  const logo = document.createElement('div');
  logo.className = 'footer-logo';
  logo.append(...logoRow.firstElementChild.childNodes);

  const info = document.createElement('div');
  info.className = 'footer-info';
  info.append(...infoRow.firstElementChild.childNodes);

  left.append(logo, info);

  const right = document.createElement('div');
  right.className = 'footer-right';
  right.append(...copyrightRow.firstElementChild.childNodes);

  bottom.append(left, right);

  footer.append(top, bottom);

  block.append(footer);
}
