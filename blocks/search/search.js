import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

const searchParams = new URLSearchParams(window.location.search);

const LABELS = {
  placeholder: 'Search...',
  noResults: 'No results found.',
};

function findNextHeading(el) {
  let preceding = el.parentElement?.previousElementSibling || el.parentElement?.parentElement;
  let h = 'H2';
  while (preceding) {
    const lastHeading = [...preceding.querySelectorAll('h1, h2, h3, h4, h5, h6')].pop();
    if (lastHeading) {
      const level = parseInt(lastHeading.nodeName[1], 10);
      h = level < 6 ? `H${level + 1}` : 'H6';
      preceding = null;
    } else {
      preceding = preceding.previousElementSibling || preceding.parentElement;
    }
  }
  return h;
}

function highlightTextElements(terms, elements) {
  elements.forEach((element) => {
    if (!element || !element.textContent) return;
    const { textContent } = element;
    const lower = textContent.toLowerCase();
    const matches = [];
    terms.forEach((term) => {
      let offset = lower.indexOf(term);
      while (offset >= 0) {
        matches.push({ offset, term: textContent.substring(offset, offset + term.length) });
        offset = lower.indexOf(term, offset + term.length);
      }
    });
    if (!matches.length) return;

    matches.sort((a, b) => a.offset - b.offset);
    let currentIndex = 0;
    const fragment = document.createDocumentFragment();
    matches.forEach(({ offset, term }) => {
      if (offset < currentIndex) return;
      const before = textContent.substring(currentIndex, offset);
      if (before) fragment.append(document.createTextNode(before));
      const mark = document.createElement('mark');
      mark.textContent = term;
      fragment.append(mark);
      currentIndex = offset + term.length;
    });
    const after = textContent.substring(currentIndex);
    if (after) fragment.append(document.createTextNode(after));
    element.textContent = '';
    element.append(fragment);
  });
}

let dataCache;
async function fetchData(source) {
  if (dataCache) return dataCache;
  try {
    const response = await fetch(source);
    if (!response.ok) return [];
    const json = await response.json();
    dataCache = json?.data || [];
  } catch (e) {
    dataCache = [];
  }
  return dataCache;
}

function renderResult(result, searchTerms, titleTag) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = result.path;
  if (result.image) {
    const wrapper = document.createElement('div');
    wrapper.className = 'search-result-image';
    wrapper.append(createOptimizedPicture(result.image, '', false, [{ width: '375' }]));
    a.append(wrapper);
  }
  if (result.title) {
    const title = document.createElement(titleTag);
    title.className = 'search-result-title';
    title.textContent = result.title;
    highlightTextElements(searchTerms, [title]);
    a.append(title);
  }
  if (result.description) {
    const description = document.createElement('p');
    description.textContent = result.description;
    highlightTextElements(searchTerms, [description]);
    a.append(description);
  }
  li.append(a);
  return li;
}

function clearSearchResults(block) {
  block.querySelector('.search-results').textContent = '';
}

function clearSearch(block) {
  clearSearchResults(block);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    searchParams.delete('q');
    url.search = searchParams.toString();
    window.history.replaceState({}, '', url.toString());
  }
}

function filterData(searchTerms, data) {
  const inHeader = [];
  const inMeta = [];
  data.forEach((result) => {
    let minIdx = -1;
    const header = (result.header || result.title || '').toLowerCase();
    searchTerms.forEach((term) => {
      const idx = header.indexOf(term);
      if (idx >= 0 && minIdx < idx) minIdx = idx;
    });
    if (minIdx >= 0) {
      inHeader.push({ minIdx, result });
      return;
    }
    const meta = `${result.title || ''} ${result.description || ''} ${(result.path || '').split('/').pop()}`.toLowerCase();
    searchTerms.forEach((term) => {
      const idx = meta.indexOf(term);
      if (idx >= 0 && minIdx < idx) minIdx = idx;
    });
    if (minIdx >= 0) inMeta.push({ minIdx, result });
  });
  const byIdx = (a, b) => a.minIdx - b.minIdx;
  return [...inHeader.sort(byIdx), ...inMeta.sort(byIdx)].map((i) => i.result);
}

function renderResults(block, filtered, searchTerms) {
  clearSearchResults(block);
  const results = block.querySelector('.search-results');
  if (filtered.length) {
    results.classList.remove('no-results');
    filtered.forEach((r) => results.append(renderResult(r, searchTerms, results.dataset.h)));
  } else {
    results.classList.add('no-results');
    const li = document.createElement('li');
    li.textContent = LABELS.noResults;
    results.append(li);
  }
}

async function handleSearch(value, block, config) {
  searchParams.set('q', value);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.search = searchParams.toString();
    window.history.replaceState({}, '', url.toString());
  }
  if (value.length < 3) {
    clearSearch(block);
    return;
  }
  const terms = value.toLowerCase().split(/\s+/).filter(Boolean);
  const data = await fetchData(config.source);
  renderResults(block, filterData(terms, data), terms);
}

/**
 * Search: optional link to a query index (defaults to /query-index.json) and optional
 * label/placeholder text. Renders a search box with live results list.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const isIndexRef = (t) => /^(https?:\/\/|\/)\S*$/.test(t) || /\.json(\?|$)/.test(t);
  const values = [...block.querySelectorAll(':scope > div')]
    .map((row) => ({ row, text: row.textContent.trim(), href: row.querySelector('a[href]')?.href }))
    .filter(({ text, href }) => text || href);
  const indexEntry = values.find(({ text, href }) => href || isIndexRef(text));
  const indexRef = indexEntry?.href || indexEntry?.text;
  const source = indexRef
    ? new URL(indexRef, window.location.href).href
    : `${window.hlx?.codeBasePath || ''}/query-index.json`;
  const labelEntry = values.find((v) => v !== indexEntry);
  const placeholder = labelEntry?.text || LABELS.placeholder;

  block.textContent = '';

  const box = document.createElement('div');
  box.className = 'search-box';
  const icon = document.createElement('span');
  icon.className = 'icon icon-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  box.append(icon, input);

  const results = document.createElement('ul');
  results.className = 'search-results';
  results.setAttribute('aria-live', 'polite');
  results.dataset.h = findNextHeading(block);

  block.append(box, results);

  const config = { source };
  input.addEventListener('input', (e) => handleSearch(e.target.value, block, config));
  input.addEventListener('keyup', (e) => {
    if (e.code === 'Escape') {
      input.value = '';
      clearSearch(block);
    }
  });

  if (searchParams.get('q')) {
    input.value = searchParams.get('q');
    handleSearch(input.value, block, config);
  }

  decorateIcons(block);
}
