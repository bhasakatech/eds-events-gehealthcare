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

  const sections = [...block.children];

  if (sections.length < 2) {
    return;
  }

  const [topSection, bottomSection] = sections;

  const topContent = topSection.querySelector('.default-content-wrapper');
  const bottomContent = bottomSection.querySelector('.default-content-wrapper');
  const linksWrapper = bottomSection.querySelector('.columns-wrapper');

  if (!topContent || !bottomContent) {
    return;
  }

  const topRows = [...topContent.children];
  const bottomRows = [...bottomContent.children];

  // Clear the block before rebuilding
  block.textContent = '';

  const footer = document.createElement('div');
  footer.className = 'footer-content';

  /* ---------- Top ---------- */

  const top = document.createElement('div');
  top.className = 'footer-top';

  const message = document.createElement('div');
  message.className = 'footer-message';

  if (topRows[0]) {
    message.append(...topRows[0].childNodes);
  }

  const contact = document.createElement('div');
  contact.className = 'footer-contact';

  if (topRows[1]) {
    contact.append(...topRows[1].childNodes);
  }

  top.append(message, contact);

  /* ---------- Bottom ---------- */

  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  const left = document.createElement('div');
  left.className = 'footer-left';

  const logo = document.createElement('div');
  logo.className = 'footer-logo';

  if (bottomRows[0]) {
    logo.append(...bottomRows[0].childNodes);
  }

  const info = document.createElement('div');
  info.className = 'footer-info';

  if (bottomRows[1]) {
    info.append(bottomRows[1]);
  }

  if (bottomRows[2]) {
    info.append(bottomRows[2]);
  }

  left.append(logo, info);

  const right = document.createElement('div');
  right.className = 'footer-right';

  if (linksWrapper) {
    right.append(linksWrapper);
  }

  bottom.append(left, right);

  footer.append(top, bottom);

  block.append(footer);
}
