/*
 * FAQ Details Block
 *
 * Parent model cells (xwalk/max-cells ≤ 4 via element grouping):
 *   [0] heading_*  – title, intro (richtext), summary (textarea)
 *   [1] details_*  – image, toggles, pickers, tags, etc. (container)
 *   [2] help_*     – CTA link (container + field collapse)
 *   classes        – style variant (block option, not a content row)
 *
 * Child rows (faq-item via filter):
 *   [0] question – text
 *   [1] answer   – richtext
 */

function getCellText(el) {
  return el?.textContent?.trim() || '';
}

function isFaqItemRow(row) {
  const cells = [...(row?.children || [])];
  return cells.length === 2 && !cells[0].querySelector('picture');
}

function createAccordionItem(questionCell, answerCell, index, { expandFirst, showNumbers }) {
  const item = document.createElement('div');
  item.className = 'faq-details-item';

  const questionId = `faq-details-q-${index}`;
  const panelId = `faq-details-a-${index}`;
  const isOpen = expandFirst && index === 0;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'faq-details-question';
  button.id = questionId;
  button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  button.setAttribute('aria-controls', panelId);

  const label = document.createElement('span');
  label.className = 'faq-details-question-label';
  const questionText = getCellText(questionCell);
  label.textContent = showNumbers ? `${index + 1}. ${questionText}` : questionText;
  button.append(label);

  const icon = document.createElement('span');
  icon.className = 'faq-details-icon';
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);

  const panel = document.createElement('div');
  panel.className = 'faq-details-answer';
  panel.id = panelId;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', questionId);
  if (!isOpen) panel.hidden = true;
  panel.innerHTML = answerCell?.innerHTML || '';

  if (isOpen) item.classList.add('is-open');

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    const allowMultiple = item.closest('.faq-details')?.classList.contains('allow-multiple');

    if (!allowMultiple && !open) {
      item.parentElement?.querySelectorAll('.faq-details-item.is-open').forEach((openItem) => {
        if (openItem === item) return;
        openItem.classList.remove('is-open');
        const btn = openItem.querySelector('.faq-details-question');
        const ans = openItem.querySelector('.faq-details-answer');
        btn?.setAttribute('aria-expanded', 'false');
        if (ans) ans.hidden = true;
      });
    }

    button.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.hidden = open;
    item.classList.toggle('is-open', !open);
  });

  item.append(button, panel);
  return item;
}

export default function decorate(block) {
  const rows = [...block.children];
  const parentRows = rows.filter((row) => !isFaqItemRow(row));
  const itemRows = rows.filter((row) => isFaqItemRow(row));

  const [headingRow, detailsRow, helpRow] = parentRows;
  const headingCell = headingRow?.firstElementChild;
  const detailsCell = detailsRow?.firstElementChild;
  const helpCell = helpRow?.firstElementChild;

  const detailsText = getCellText(detailsCell).toLowerCase();
  const expandFirst = /\btrue\b/.test(detailsText);
  const showNumbers = detailsText.includes('show-numbers');
  const allowMultiple = detailsText.includes('allow-multiple');
  if (allowMultiple) block.classList.add('allow-multiple');
  if (showNumbers) block.classList.add('show-numbers');
  if (detailsText.includes('two-column')) block.classList.add('two-column');

  const root = document.createElement('div');
  root.className = 'faq-details-inner';

  if (headingCell) {
    const header = document.createElement('div');
    header.className = 'faq-details-header';
    header.append(...headingCell.childNodes);
    root.append(header);
  }

  if (detailsCell?.querySelector('picture')) {
    const media = document.createElement('div');
    media.className = 'faq-details-media';
    const picture = detailsCell.querySelector('picture');
    if (picture) media.append(picture.cloneNode(true));
    root.append(media);
  }

  const list = document.createElement('div');
  list.className = 'faq-details-list';
  list.setAttribute('role', 'list');

  itemRows.forEach((row, index) => {
    const [questionCell, answerCell] = row.children;
    const item = createAccordionItem(questionCell, answerCell, index, {
      expandFirst,
      showNumbers,
    });
    item.setAttribute('role', 'listitem');
    list.append(item);
  });
  root.append(list);

  if (helpCell?.querySelector('a')) {
    const footer = document.createElement('div');
    footer.className = 'faq-details-help';
    const link = helpCell.querySelector('a');
    if (link) footer.append(link.cloneNode(true));
    root.append(footer);
  }

  block.replaceChildren(root);
}
