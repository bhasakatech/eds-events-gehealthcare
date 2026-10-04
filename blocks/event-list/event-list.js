const INDEX_URL = '/events/query-index.json';

const FILTER_ICON = '<svg class="event-list-filter-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M0 0h16L10 7.5V16l-4-2.5V7.5z" fill="currentColor"/></svg>';

const SORT_COLUMNS = [
  { key: 'title', label: 'Event name' },
  { key: 'eventMode', label: 'Event type' },
  { key: 'startDate', label: 'Dates' },
  { key: 'country', label: 'Country' },
];

async function fetchEvents() {
  const response = await fetch(INDEX_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const { data } = await response.json();
  return data;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parses an index date value: ISO / YYYY-MM-DD strings, unix timestamps
 * (seconds or ms) and spreadsheet serial dates.
 * @param {string|number} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num < 100000) return new Date(Math.round((num - 25569) * 86400 * 1000)); // serial
    return new Date(num < 1e11 ? num * 1000 : num);
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  if (!start) return '';

  const end = parseDate(endDate);
  if (!end) return formatDate(start);

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * An event is past once its end date (or start date) is before today (UTC).
 */
function isPast(event) {
  const end = parseDate(event.endDate) || parseDate(event.startDate);
  if (!end) return false;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return end.getTime() < todayUtc;
}

function sortValue(event, key) {
  if (key === 'startDate') return parseDate(event.startDate)?.getTime() ?? Infinity;
  return (event[key] || '').toString().toLowerCase();
}

function sortEvents(events, { key, dir }) {
  const factor = dir === 'desc' ? -1 : 1;
  return [...events].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

function renderRow(event) {
  // description is always rendered (empty when missing) so rows keep the source height
  const description = `<span class="event-list-description">${escapeHtml(event.description)}</span>`;
  return `
    <a class="event-list-row" href="${escapeHtml(event.path)}">
      <div class="event-list-title"><span class="event-list-name">${escapeHtml(event.title)}</span>${description}</div>
      <div class="event-list-type">${escapeHtml(capitalize(event.eventMode)) || '-'}</div>
      <div class="event-list-date">${escapeHtml(formatDateRange(event.startDate, event.endDate))}</div>
      <div class="event-list-country">${escapeHtml(event.country) || '-'}</div>
    </a>
  `;
}

/**
 * Renders upcoming events first, then a "Past events" divider followed by past events.
 */
function renderEvents(events, tableBody, sort, pastLabel) {
  const sorted = sortEvents(events, sort);
  const upcoming = sorted.filter((event) => !isPast(event));
  const past = sorted.filter((event) => isPast(event));

  let html = upcoming.map(renderRow).join('');
  if (past.length) {
    html += `<div class="event-list-divider"><span>${escapeHtml(pastLabel)}</span></div>`;
    html += past.map(renderRow).join('');
  }
  tableBody.innerHTML = html;
}

function populateFilters(events, topicSelect, countrySelect) {
  // Topics
  const topics = [
    ...new Set(
      events
        .flatMap((event) => (event.topic || '')
          .split(',')
          .map((topic) => topic.trim()))
        .filter(Boolean),
    ),
  ].sort();

  topicSelect.innerHTML = '<option value="">All Topics</option>';

  topics.forEach((topic) => {
    topicSelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`,
    );
  });

  // Countries
  const countries = [
    ...new Set(
      events
        .map((event) => event.country)
        .filter(Boolean),
    ),
  ].sort();

  countrySelect.innerHTML = '<option value="">All Countries</option>';

  countries.forEach((country) => {
    countrySelect.insertAdjacentHTML(
      'beforeend',
      `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`,
    );
  });
}

function filterEvents(events, topic, country, search) {
  let filtered = [...events];

  if (topic) {
    filtered = filtered.filter((event) => (event.topic || '')
      .split(',')
      .map((t) => t.trim())
      .includes(topic));
  }

  if (country) {
    filtered = filtered.filter((event) => event.country === country);
  }

  if (search) {
    const value = search.toLowerCase();

    filtered = filtered.filter((event) => (event.title || '').toLowerCase().includes(value));
  }

  return filtered;
}

export default async function decorate(block) {
  // key-value block: one [key | value] row per model field (title | topicPlaceholder |
  // countryPlaceholder | searchPlaceholder | clearButtonLabel). Look values up by
  // key, falling back to position; single-cell rows are read as the value.
  const rows = [...block.children];
  const norm = (t) => (t || '').toLowerCase().replace(/[^a-z]/g, '');
  const byKey = {};
  rows.forEach((row) => {
    if (row.children.length >= 2) {
      byKey[norm(row.firstElementChild.textContent)] = row.lastElementChild.textContent.trim();
    }
  });
  const value = (i, key) => {
    if (key in byKey) return byKey[key];
    return (rows[i]?.lastElementChild || rows[i])?.textContent.trim() || '';
  };

  const heading = value(0, 'title') || 'All Events';
  const topicPlaceholder = value(1, 'topicplaceholder') || 'Filter by topic';
  const countryPlaceholder = value(2, 'countryplaceholder') || 'Filter by country';
  const searchPlaceholder = value(3, 'searchplaceholder') || 'Search for events';
  const clearLabel = value(4, 'clearbuttonlabel') || 'Clear All';
  // optional keys (not in the model yet): fall back to source labels
  const pastLabel = byKey.pasteventslabel || 'Past events';
  const filterLabel = byKey.filterbuttonlabel || 'Filter';

  const filtersId = `event-list-filters-${Math.random().toString(36).slice(2, 8)}`;

  block.innerHTML = `
    <div class="event-list-wrapper">

      <div class="event-list-toolbar">

        <h2 class="event-list-heading">${escapeHtml(heading)}</h2>

        <button type="button" class="event-list-filter-toggle" aria-expanded="false" aria-controls="${filtersId}-topic ${filtersId}-country">
          ${escapeHtml(filterLabel)}${FILTER_ICON}
        </button>

        <select id="${filtersId}-topic" class="event-list-filter topic-filter" aria-label="${escapeHtml(topicPlaceholder)}"></select>

        <select id="${filtersId}-country" class="event-list-filter country-filter" aria-label="${escapeHtml(countryPlaceholder)}"></select>

        <input
          type="search"
          class="event-list-search"
          placeholder="${escapeHtml(searchPlaceholder)}"
          aria-label="${escapeHtml(searchPlaceholder)}"
        />

        <button type="button" class="event-list-clear-btn">${escapeHtml(clearLabel)}</button>

      </div>

      <div class="event-list-table">

        <div class="event-list-table-header">
          ${SORT_COLUMNS.map(({ key, label }) => `
          <div>
            <button type="button" class="event-list-sort" data-sort="${key}">
              ${label}<span class="event-list-sort-icon" aria-hidden="true"></span>
            </button>
          </div>`).join('')}
        </div>

        <div class="event-list-table-body"></div>

      </div>

    </div>
  `;

  // A missing / unpublished query index must not break the block.
  let events = [];
  try {
    events = await fetchEvents();
  } catch (e) {
    events = [];
  }
  // drop the index's own folder page (e.g. /events) and untitled rows
  events = (events || []).filter((event) => event.title && !/^\/events\/?$/.test(event.path || ''));
  // the source calendar only lists scheduled events: once event pages carry dates, leave out
  // undated pages (archived events, test pages) instead of showing "-" rows
  if (events.some((event) => parseDate(event.startDate))) {
    events = events.filter((event) => parseDate(event.startDate));
  }

  const tableBody = block.querySelector('.event-list-table-body');
  const toolbar = block.querySelector('.event-list-toolbar');
  const filterToggle = block.querySelector('.event-list-filter-toggle');
  const topicSelect = block.querySelector('.topic-filter');
  const countrySelect = block.querySelector('.country-filter');
  const searchInput = block.querySelector('.event-list-search');
  const clearButton = block.querySelector('.event-list-clear-btn');
  const sortButtons = [...block.querySelectorAll('.event-list-sort')];

  const sort = { key: 'startDate', dir: 'asc' };

  populateFilters(events, topicSelect, countrySelect);

  // Set placeholder options
  topicSelect.options[0].text = topicPlaceholder;
  countrySelect.options[0].text = countryPlaceholder;

  function update() {
    const filtered = filterEvents(
      events,
      topicSelect.value,
      countrySelect.value,
      searchInput.value.trim(),
    );
    renderEvents(filtered, tableBody, sort, pastLabel);
  }

  update();

  topicSelect.addEventListener('change', update);

  countrySelect.addEventListener('change', update);

  searchInput.addEventListener('input', update);

  clearButton.addEventListener('click', () => {
    topicSelect.selectedIndex = 0;
    countrySelect.selectedIndex = 0;
    searchInput.value = '';

    update();
  });

  // mobile: filters are collapsed behind the "Filter" toggle
  filterToggle.addEventListener('click', () => {
    const open = toolbar.classList.toggle('filters-open');
    filterToggle.setAttribute('aria-expanded', open);
  });

  // column sorting: first click ascending, second click descending
  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { sort: key } = button.dataset;
      sort.dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
      sort.key = key;
      sortButtons.forEach((b) => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.classList.toggle('desc', active && sort.dir === 'desc');
        b.setAttribute('aria-pressed', active);
      });
      update();
    });
  });
}
