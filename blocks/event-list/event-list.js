async function fetchEvents() {
  const response = await fetch('/events/query-index.json');

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const { data } = await response.json();
  return data;
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return '';

  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (!end) {
    return start.toLocaleDateString('en-US', options);
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function renderEvents(events, tableBody) {
  tableBody.innerHTML = events.map((event) => `
    <a class="event-list-row" href="${event.path}">
      <div class="event-list-title">${event.title || ''}</div>
      <div class="event-list-type">
  ${event.eventMode
    ? event.eventMode.charAt(0).toUpperCase() + event.eventMode.slice(1).toLowerCase()
    : '-'}
</div>
      <div class="event-list-date">${formatDateRange(event.startDate, event.endDate)}</div>
      <div class="event-list-country">${event.country || '-'}</div>
    </a>
  `).join('');
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
      `<option value="${topic}">${topic}</option>`,
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
      `<option value="${country}">${country}</option>`,
    );
  });
}

function applyFilters(events, tableBody, topic, country, search) {
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

  renderEvents(filtered, tableBody);
}

export default async function decorate(block) {
  const rows = [...block.children];

  const heading = rows[0]?.textContent.trim() || 'All Events';
  const topicPlaceholder = rows[1]?.textContent.trim() || 'Filter by topic';
  const countryPlaceholder = rows[2]?.textContent.trim() || 'Filter by country';
  const searchPlaceholder = rows[3]?.textContent.trim() || 'Search for events';
  const clearLabel = rows[4]?.textContent.trim() || 'Clear All';

  block.innerHTML = `
    <div class="event-list-wrapper">

      <div class="event-list-toolbar">

        <h2 class="event-list-heading">${heading}</h2>

        <select class="event-list-filter topic-filter"></select>

        <select class="event-list-filter country-filter"></select>

        <input
          type="search"
          class="event-list-search"
          placeholder="${searchPlaceholder}"
        />

        <button class="event-list-clear-btn">${clearLabel}</button>

      </div>

      <div class="event-list-table">

        <div class="event-list-table-header">
          <div>Event Name</div>
          <div>Event Type</div>
          <div>Dates</div>
          <div>Country</div>
        </div>

        <div class="event-list-table-body"></div>

      </div>

    </div>
  `;

  const events = await fetchEvents();

  const tableBody = block.querySelector('.event-list-table-body');
  const topicSelect = block.querySelector('.topic-filter');
  const countrySelect = block.querySelector('.country-filter');
  const searchInput = block.querySelector('.event-list-search');
  const clearButton = block.querySelector('.event-list-clear-btn');

  populateFilters(events, topicSelect, countrySelect);

  // Set placeholder options
  topicSelect.options[0].text = topicPlaceholder;
  countrySelect.options[0].text = countryPlaceholder;

  renderEvents(events, tableBody);

  function update() {
    applyFilters(
      events,
      tableBody,
      topicSelect.value,
      countrySelect.value,
      searchInput.value.trim(),
    );
  }

  topicSelect.addEventListener('change', update);

  countrySelect.addEventListener('change', update);

  searchInput.addEventListener('input', update);

  clearButton.addEventListener('click', () => {
    topicSelect.selectedIndex = 0;
    countrySelect.selectedIndex = 0;
    searchInput.value = '';

    renderEvents(events, tableBody);
  });
}
