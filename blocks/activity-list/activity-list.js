/*
 * Activity List – onsite activities / workshop sessions with detail popup
 * Parent row: heading_* (title, intro)
 * Item rows:  image | content_* (title, description) | meta_* (datetime, location) | detail
 *
 * Two renderings, chosen from the content itself:
 * - list (default): Title / Date and time / Location table with a sortable date
 *   column. A row whose detail cell holds a link navigates to it; any other row
 *   opens the activity popup (image, "Save the date", description).
 * - sessions: used when the block has no heading and no item has a location or
 *   link (workshop session schedules), or when authored with the `sessions`
 *   class. Renders a 3-up card grid ("View details") with a session popup that
 *   can browse the other sessions.
 * - media: used when items carry an image (or authored with the `media` class).
 *   Renders 3-up image cards with "Save the date"; the card opens the popup.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const SPEAKER_LABEL_RE = /^speakers?(\s*\(s\))?\s*:?$/i;

const ARROW_SVG = '<svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true" focusable="false"><circle cx="15" cy="15" r="15"/><path d="M12.6 8.2 19.8 15l-7.2 6.8" fill="none" stroke-width="1.4"/></svg>';
const SORT_SVG = '<svg viewBox="0 0 13 8" width="13" height="8" aria-hidden="true" focusable="false"><path d="M1 1l5.5 5.5L12 1" fill="none" stroke-width="2"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 25 25" width="25" height="25" aria-hidden="true" focusable="false"><circle cx="12.5" cy="12.5" r="12.5"/><path d="M8.8 8.8l7.4 7.4m0-7.4-7.4 7.4" fill="none" stroke-width="2.2"/></svg>';
const PREV_SVG = '<svg viewBox="0 0 25 25" width="25" height="25" aria-hidden="true" focusable="false"><circle cx="12.5" cy="12.5" r="11.75"/><path d="M14 8.5l-4 4 4 4" fill="none" stroke-width="2"/></svg>';
const NEXT_SVG = '<svg viewBox="0 0 25 25" width="25" height="25" aria-hidden="true" focusable="false"><circle cx="12.5" cy="12.5" r="11.75"/><path d="M11 8.5l4 4-4 4" fill="none" stroke-width="2"/></svg>';

function textOf(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ---------- date parsing (for sorting and add-to-calendar) ---------- */

function pageYear() {
  const source = `${textOf(document.querySelector('main h1'))} ${document.title}`;
  const match = source.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function parsePart(part) {
  const p = part.toLowerCase();
  let day;
  let month;
  let year;
  let m = p.match(new RegExp(`(\\d{1,2})\\s+${MONTH_RE}(?:,?\\s+(\\d{4}))?`));
  if (m) {
    day = Number(m[1]);
    month = MONTHS.indexOf(m[2]);
    year = m[3] ? Number(m[3]) : null;
  } else {
    m = p.match(new RegExp(`${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`));
    if (m) {
      month = MONTHS.indexOf(m[1]);
      day = Number(m[2]);
      year = m[3] ? Number(m[3]) : null;
    }
  }
  const rest = m ? p.replace(m[0], ' ') : p;
  let time = null;
  const t12 = rest.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\b\.?/);
  const t24 = rest.match(/\b(\d{1,2}):(\d{2})\b/);
  if (t12) {
    let hours = Number(t12[1]) % 12;
    if (t12[3] === 'p') hours += 12;
    time = { hours, minutes: Number(t12[2] || 0) };
  } else if (t24) {
    time = { hours: Number(t24[1]), minutes: Number(t24[2]) };
  }
  return {
    day, month, year, time,
  };
}

function parseDateRange(text, fallbackYear) {
  if (!text) return null;
  const [first, second = ''] = text.split(/\s+[-–]\s+/);
  const start = parsePart(first);
  if (start.day === undefined || start.month < 0) return null;
  const end = parsePart(second);
  const year = start.year || end.year || fallbackYear;
  const endDay = end.day ?? start.day;
  const endMonth = end.day !== undefined && end.month >= 0 ? end.month : start.month;
  const endYear = end.year || year;
  if (!start.time) {
    return {
      allDay: true,
      hasYear: !!year,
      start: new Date(year || 2000, start.month, start.day),
      end: new Date(endYear || 2000, endMonth, endDay + 1),
    };
  }
  const startDate = new Date(
    year || 2000,
    start.month,
    start.day,
    start.time.hours,
    start.time.minutes,
  );
  const endDate = end.time
    ? new Date(endYear || 2000, endMonth, endDay, end.time.hours, end.time.minutes)
    : new Date(startDate.getTime() + 60 * 60 * 1000);
  return {
    allDay: false, hasYear: !!year, start: startDate, end: endDate,
  };
}

/* ---------- add to calendar (.ics) ---------- */

function pad(n) {
  return String(n).padStart(2, '0');
}

function icsDate(date, allDay) {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return allDay ? day : `${day}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function icsEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');
}

function downloadIcs(item) {
  const { range } = item;
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const value = range.allDay ? ';VALUE=DATE' : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GE HealthCare Events//Activity List//EN',
    'BEGIN:VEVENT',
    `UID:${now.getTime()}-${Math.random().toString(36).slice(2)}@events.gehealthcare.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART${value}:${icsDate(range.start, range.allDay)}`,
    `DTEND${value}:${icsDate(range.end, range.allDay)}`,
    `SUMMARY:${icsEscape(item.title)}`,
  ];
  if (item.location) lines.push(`LOCATION:${icsEscape(item.location)}`);
  if (item.plainText) lines.push(`DESCRIPTION:${icsEscape(item.plainText.slice(0, 1500))}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event'}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- content parsing ---------- */

function isItemRow(row) {
  return [...(row?.children || [])].length >= 2;
}

function splitSpeakers(container) {
  const nodes = [...container.children];
  const index = nodes.findIndex((node) => SPEAKER_LABEL_RE.test(textOf(node)));
  if (index < 0) return { label: '', html: '' };
  const label = textOf(nodes[index]);
  const html = nodes.slice(index + 1).map((node) => node.outerHTML).join('');
  nodes.slice(index).forEach((node) => node.remove());
  return { label, html };
}

function parseItem(row, fallbackYear) {
  const [imageCell, contentCell, metaCell, detailCell] = [...row.children];

  const titleEl = contentCell?.querySelector('h1, h2, h3, h4, strong, p');
  const title = textOf(titleEl);
  const clone = contentCell?.cloneNode(true) || document.createElement('div');
  // Remove only the title element itself (same first match as titleEl), so bold
  // text inside the description (e.g. a "Speaker(s):" label) is preserved.
  const cloneTitle = clone.querySelector('h1, h2, h3, h4, strong, p');
  if (cloneTitle && textOf(cloneTitle) === title) cloneTitle.remove();
  const description = clone.innerHTML.trim();
  const plainText = [...clone.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6')]
    .map((node) => textOf(node)).filter(Boolean).join('\n') || textOf(clone);
  const speakers = splitSpeakers(clone);
  const body = clone.innerHTML.trim();

  const metaParts = [...(metaCell?.querySelectorAll('p') || [])]
    .map((p) => textOf(p))
    .filter(Boolean);
  if (!metaParts.length && metaCell) {
    const raw = textOf(metaCell);
    if (raw) metaParts.push(...raw.split('|').map((s) => s.trim()).filter(Boolean));
  }

  // detail cell: a lone link => row navigates there; anything else => popup body
  let link = null;
  let detailHtml = '';
  if (detailCell && textOf(detailCell)) {
    const anchors = detailCell.querySelectorAll('a[href]');
    if (anchors.length === 1 && textOf(anchors[0]) === textOf(detailCell)) {
      link = { href: anchors[0].href, text: textOf(anchors[0]) };
    } else {
      detailHtml = detailCell.innerHTML.trim();
    }
  }

  const img = imageCell?.querySelector('img');
  const datetime = metaParts[0] || '';
  return {
    row,
    title,
    description,
    body,
    plainText,
    speakers,
    datetime,
    location: metaParts[1] || '',
    range: parseDateRange(datetime, fallbackYear),
    link,
    detailHtml,
    image: img ? { src: img.src, alt: img.alt || title } : null,
  };
}

/* ---------- popup ---------- */

function iconButton(className, label, svg) {
  const button = el('button', className, svg);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  return button;
}

function calendarButton(item, label, className) {
  if (!item.range?.hasYear) return null;
  const button = el('button', className);
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => downloadIcs(item));
  return button;
}

let dialogCount = 0;

function renderActivityPopup(panel, item, close) {
  const head = el('div', 'activity-list-dialog-head');
  const intro = el('div', 'activity-list-dialog-intro');
  const meta = el('p', 'activity-list-dialog-meta');
  meta.textContent = [item.datetime, item.location].filter(Boolean).join(' | ');
  const title = el('h2', 'activity-list-dialog-title');
  title.id = panel.dataset.titleId;
  title.textContent = item.title;
  intro.append(meta, title);
  head.append(intro, close);

  const content = el('div', 'activity-list-dialog-content');
  if (item.image) {
    const media = el('div', 'activity-list-dialog-media');
    media.append(createOptimizedPicture(item.image.src, item.image.alt, false, [{ width: '900' }]));
    content.append(media);
  } else {
    content.classList.add('no-media');
  }
  const side = el('div', 'activity-list-dialog-side');
  const save = calendarButton(item, 'Save the date', 'activity-list-dialog-calendar');
  if (save) side.append(save);
  side.append(el('div', 'activity-list-dialog-body', item.detailHtml || item.description));
  content.append(side);

  panel.replaceChildren(head, content);
}

function renderSessionPopup(panel, item, close, browse) {
  const head = el('div', 'activity-list-dialog-head');
  const meta = el('p', 'activity-list-dialog-meta');
  meta.textContent = [item.datetime, item.location].filter(Boolean).join(' | ');
  const controls = el('div', 'activity-list-dialog-controls');
  if (browse) {
    controls.append(el('span', 'activity-list-dialog-browse', 'Browse Additional Activities'), ...browse);
  }
  controls.append(close);
  head.append(meta, controls);

  const band = el('div', 'activity-list-dialog-band');
  const title = el('h2', 'activity-list-dialog-title');
  title.id = panel.dataset.titleId;
  title.textContent = item.title;
  band.append(title);
  const add = calendarButton(item, 'Add to calendar', 'activity-list-dialog-calendar');
  if (add) band.append(add);

  const content = el('div', 'activity-list-dialog-content');
  content.append(el('div', 'activity-list-dialog-body', item.detailHtml || item.body));
  if (item.speakers.html) {
    const speakers = el('div', 'activity-list-dialog-speakers');
    const label = el('p', 'activity-list-speakers-label');
    label.append(el('strong', '', item.speakers.label));
    speakers.append(label, el('div', 'activity-list-speakers-list', item.speakers.html));
    content.append(speakers);
  }

  panel.replaceChildren(head, band, content);
}

function createDialog(items, sessions) {
  const dialog = el('dialog', 'activity-list-dialog');
  dialogCount += 1;
  const titleId = `activity-list-dialog-title-${dialogCount}`;
  dialog.setAttribute('aria-labelledby', titleId);
  const panel = el('div', 'activity-list-dialog-panel');
  panel.dataset.titleId = titleId;
  dialog.append(panel);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  let current = 0;
  const open = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    const close = iconButton('activity-list-dialog-close', 'Close', CLOSE_SVG);
    close.addEventListener('click', () => dialog.close());
    if (sessions) {
      let browse = null;
      if (items.length > 1) {
        const prev = iconButton('activity-list-dialog-prev', 'Previous activity', PREV_SVG);
        const next = iconButton('activity-list-dialog-next', 'Next activity', NEXT_SVG);
        prev.addEventListener('click', () => open(current - 1));
        next.addEventListener('click', () => open(current + 1));
        browse = [prev, next];
      }
      renderSessionPopup(panel, item, close, browse);
    } else {
      renderActivityPopup(panel, item, close);
    }
    if (!dialog.open) dialog.showModal();
    panel.scrollTop = 0;
  };

  return { dialog, open };
}

/* ---------- renderers ---------- */

function renderListRow(item, onOpen) {
  const li = el('li', 'activity-list-row');
  moveInstrumentation(item.row, li);

  const main = el('div', 'activity-list-main');
  const title = el('h3', 'activity-list-title');
  title.textContent = item.title;
  main.append(title);
  if (item.description) main.append(el('div', 'activity-list-desc', item.description));

  const datetime = el('div', 'activity-list-datetime');
  datetime.textContent = item.datetime;
  const location = el('div', 'activity-list-location');
  location.textContent = item.location;

  const action = el('div', 'activity-list-action');
  let trigger;
  if (item.link) {
    trigger = el('a', 'activity-list-arrow', ARROW_SVG);
    trigger.href = item.link.href;
    if (new URL(item.link.href, window.location.href).origin !== window.location.origin) {
      trigger.target = '_blank';
      trigger.rel = 'noopener';
    }
    trigger.setAttribute('aria-label', `${item.link.text || 'Learn more'}: ${item.title}`);
  } else {
    trigger = iconButton('activity-list-arrow', `View details: ${item.title}`, ARROW_SVG);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener('click', onOpen);
  }
  action.append(trigger);

  li.append(main, datetime, location, action);
  li.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    trigger.click();
  });
  return li;
}

function renderSessionCard(item, onOpen) {
  const li = el('li', 'activity-list-card');
  moveInstrumentation(item.row, li);
  const inner = el('div', 'activity-list-card-inner');

  const title = el('h3', 'activity-list-card-title');
  title.textContent = item.title;
  inner.append(title);
  if (item.datetime) {
    const datetime = el('p', 'activity-list-datetime');
    datetime.textContent = item.datetime;
    inner.append(datetime);
  }
  if (item.speakers.html) {
    const speakers = el('div', 'activity-list-speakers');
    const label = el('p', 'activity-list-speakers-label');
    label.append(el('strong', '', item.speakers.label));
    speakers.append(label, el('div', 'activity-list-speakers-list', item.speakers.html));
    inner.append(speakers);
  }
  const details = el('button', 'activity-list-details');
  details.type = 'button';
  details.textContent = 'View details';
  details.setAttribute('aria-haspopup', 'dialog');
  details.setAttribute('aria-label', `View details: ${item.title}`);
  details.addEventListener('click', onOpen);
  inner.append(details);

  li.append(inner);
  return li;
}

function renderMediaCard(item, onOpen) {
  const li = el('li', 'activity-list-card');
  moveInstrumentation(item.row, li);
  const inner = el('div', 'activity-list-card-inner');

  if (item.image) {
    const media = el('div', 'activity-list-card-media');
    media.append(createOptimizedPicture(item.image.src, item.image.alt, false, [{ width: '750' }]));
    media.addEventListener('click', onOpen);
    inner.append(media);
  }
  const title = el('h3', 'activity-list-card-title');
  const open = el('button', 'activity-list-card-open');
  open.type = 'button';
  open.setAttribute('aria-haspopup', 'dialog');
  open.textContent = item.title;
  open.addEventListener('click', onOpen);
  title.append(open);
  inner.append(title);
  if (item.description) inner.append(el('div', 'activity-list-card-desc', item.description));
  const save = calendarButton(item, 'Save the date', 'activity-list-card-calendar');
  if (save) inner.append(save);

  li.append(inner);
  return li;
}

function sortControl(list, items) {
  const button = el('button', 'activity-list-sort', `<span>Date and time</span>${SORT_SVG}`);
  button.type = 'button';
  const sortable = items.some((item) => item.range);
  if (!sortable) {
    button.disabled = true;
    return button;
  }
  // authored order is chronological (source arrow points down = ascending)
  let ascending = true;
  const update = () => {
    button.setAttribute('aria-label', `Date and time, sorted ${ascending ? 'ascending' : 'descending'}`);
    button.classList.toggle('is-descending', !ascending);
  };
  update();
  button.addEventListener('click', () => {
    ascending = !ascending;
    const sorted = [...items].sort((a, b) => {
      const ta = a.range ? a.range.start.getTime() : Infinity;
      const tb = b.range ? b.range.start.getTime() : Infinity;
      if (ta === tb) return items.indexOf(a) - items.indexOf(b);
      if (ta === Infinity) return 1;
      if (tb === Infinity) return -1;
      return ascending ? ta - tb : tb - ta;
    });
    list.append(...sorted.map((item) => item.node));
    update();
  });
  return button;
}

export default function decorate(block) {
  const rows = [...block.children];
  const itemRows = rows.filter((row) => isItemRow(row));
  const parentRows = rows.filter((row) => !isItemRow(row));
  const headingCell = parentRows[0]?.firstElementChild;
  const hasHeading = !!(headingCell && textOf(headingCell));

  const fallbackYear = pageYear();
  const items = itemRows.map((row) => parseItem(row, fallbackYear));
  const sessions = block.classList.contains('sessions')
    || (!hasHeading && items.length > 0 && items.every((item) => !item.location && !item.link));
  const media = !sessions
    && (block.classList.contains('media') || items.some((item) => item.image));
  block.classList.toggle('activity-list-sessions', sessions);
  block.classList.toggle('activity-list-media', media);

  const { dialog, open } = createDialog(items, sessions);
  const fragment = document.createDocumentFragment();

  if (hasHeading) {
    const header = el('div', 'activity-list-header');
    moveInstrumentation(parentRows[0], header);
    header.append(...headingCell.childNodes);
    fragment.append(header);
  }

  if (sessions) {
    const list = el('ul', 'activity-list-cards');
    items.forEach((item, index) => {
      item.node = renderSessionCard(item, () => open(index));
      list.append(item.node);
    });
    fragment.append(list);
  } else if (media) {
    const list = el('ul', 'activity-list-cards');
    items.forEach((item, index) => {
      item.node = renderMediaCard(item, () => open(index));
      list.append(item.node);
    });
    fragment.append(list);
  } else {
    const head = el('div', 'activity-list-head');
    const list = el('ul', 'activity-list-rows');
    items.forEach((item, index) => {
      item.node = renderListRow(item, () => open(index));
      list.append(item.node);
    });
    const titleHead = el('span', 'activity-list-head-title', 'Title');
    const dateHead = el('span', 'activity-list-head-date');
    dateHead.append(sortControl(list, items));
    const locationHead = el('span', 'activity-list-head-location', 'Location');
    head.append(titleHead, dateHead, locationHead, el('span'));
    fragment.append(head, list);
  }

  fragment.append(dialog);
  block.replaceChildren(fragment);
}
