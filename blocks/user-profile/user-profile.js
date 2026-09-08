/**
 * Decorates the user-profile block.
 * The block content is already structured by the json2html mustache template,
 * so decoration is minimal — just signal that the block is ready.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Content is pre-structured via the mustache template in templates/user.html.
  // No DOM transformation needed; CSS handles all layout and styling.
  block.setAttribute('aria-label', 'User profile');
}
