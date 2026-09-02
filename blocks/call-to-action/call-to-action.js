/*
 * Call to Action Block – GE HealthCare
 *
 * Authored fields:
 *   [0] heading      – primary CTA heading
 *   [1] description  – supporting CTA content
 *   [2] ctaLabel     – CTA link label
 *   [3] ctaLink      – CTA destination
 *
 * Renders:
 *   <h2> heading
 *   <p>  description
 *   <a>  CTA link
 */

export default function decorate(block) {
  const cells = [...(block.firstElementChild?.children || [])];

  const heading = cells[0]?.innerHTML?.trim() || '';
  const description = cells[1]?.innerHTML?.trim() || '';
  const ctaLabel = cells[2]?.textContent?.trim() || '';
  const ctaLink = cells[3]?.textContent?.trim() || '';

  if (!heading && !description && !ctaLabel) {
    block.closest('.section')?.remove();
    return;
  }

  const content = document.createElement('div');
  content.className = 'call-to-action-content';

  if (heading) {
    const title = document.createElement('h2');
    title.innerHTML = heading;
    content.append(title);
  }

  if (description) {
    const text = document.createElement('p');
    text.innerHTML = description;
    content.append(text);
  }

  if (ctaLabel && ctaLink) {
    const link = document.createElement('a');
    link.className = 'call-to-action-link';
    link.href = ctaLink;
    link.textContent = ctaLabel;
    content.append(link);
  }

  block.replaceChildren(content);
}
