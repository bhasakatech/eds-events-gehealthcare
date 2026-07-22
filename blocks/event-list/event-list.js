async function fetchEvents() {
  const response = await fetch('/events/query-index.json');

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const { data } = await response.json();
  return data;
}
fetchEvents();
