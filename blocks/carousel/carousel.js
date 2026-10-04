import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

let carouselId = 0;

const CARET_PREV = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M21,30a1,1,0,0,1-.71-.29l-13-13a1,1,0,0,1,0-1.42l13-13a1,1,0,1,1,1.42,1.42L9.41,16l12.3,12.29a1,1,0,0,1,0,1.42A1,1,0,0,1,21,30Z"/></svg>';
const CARET_NEXT = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M11,30a1,1,0,0,1-.71-.29,1,1,0,0,1,0-1.42L22.59,16,10.29,3.71a1,1,0,0,1,1.42-1.42l13,13a1,1,0,0,1,0,1.42l-13,13A1,1,0,0,1,11,30Z"/></svg>';

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;

  block.querySelectorAll('.carousel-slide').forEach((slide, idx) => {
    const active = idx === slideIndex;
    slide.setAttribute('aria-hidden', !active);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (active && !el.classList.contains('carousel-slide-image-link')) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });

  block.querySelectorAll('.carousel-slide-indicator').forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx === slideIndex) {
      indicator.classList.add('active');
      button.setAttribute('aria-current', 'true');
    } else {
      indicator.classList.remove('active');
      button.removeAttribute('aria-current');
    }
  });
}

function showSlide(block, slideIndex = 0, behavior = 'smooth') {
  const slides = block.querySelectorAll('.carousel-slide');
  if (!slides.length) return;
  let realIndex = slideIndex;
  if (slideIndex < 0) realIndex = slides.length - 1;
  if (slideIndex >= slides.length) realIndex = 0;
  const activeSlide = slides[realIndex];
  // .carousel-slides is position: relative, so offsetLeft is track-relative
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior,
  });
  updateActiveSlide(block, realIndex);
}

function bindEvents(block) {
  block.querySelectorAll('.carousel-slide-indicator button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const indicator = e.currentTarget.closest('.carousel-slide-indicator');
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });

  const prev = block.querySelector('.slide-prev');
  const next = block.querySelector('.slide-next');
  if (!prev || !next) return;

  prev.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || '0', 10) - 1);
  });
  next.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide || '0', 10) + 1);
  });

  const slidesWrapper = block.querySelector('.carousel-slides');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { root: slidesWrapper, threshold: 0.6 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => observer.observe(slide));
}

/**
 * When the caption cell carries a link, the whole slide acts as that link
 * (source: <a href><img><caption></a>). The image is wrapped in a mirror link
 * (kept out of the tab order) and the caption link loses EDS button styling.
 * A plain paragraph that only repeats the link text is dropped.
 */
function decorateSlideLink(slide) {
  const content = slide.querySelector('.carousel-slide-content');
  const link = content?.querySelector('a[href]');
  if (!link) return;

  link.classList.remove('button', 'primary', 'secondary', 'accent');
  link.classList.add('carousel-slide-link');
  const container = link.closest('.button-container');
  if (container) container.classList.remove('button-container');

  const linkText = link.textContent.trim();
  content.querySelectorAll(':scope > p').forEach((p) => {
    if (!p.contains(link) && !p.querySelector('a, picture, img') && p.textContent.trim() === linkText) {
      p.remove();
    }
  });

  const picture = slide.querySelector('.carousel-slide-image picture');
  if (picture && !picture.closest('a')) {
    const imageLink = document.createElement('a');
    imageLink.href = link.href;
    if (link.target) imageLink.target = link.target;
    imageLink.classList.add('carousel-slide-image-link');
    imageLink.tabIndex = -1;
    imageLink.setAttribute('aria-hidden', 'true');
    picture.replaceWith(imageLink);
    imageLink.append(picture);
  }
}

function createSlide(row, slideIndex, id) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.id = `carousel-${id}-slide-${slideIndex}`;
  slide.classList.add('carousel-slide');

  const cells = [...row.querySelectorAll(':scope > div')];
  cells.forEach((cell) => {
    const hasMedia = cell.querySelector('picture, img, video, iframe');
    const hasText = cell.textContent.trim() !== '';
    if (hasMedia && !slide.querySelector('.carousel-slide-image')) {
      cell.classList.add('carousel-slide-image');
    } else if (hasText) {
      cell.classList.add('carousel-slide-content');
    } else if (!hasMedia) {
      cell.remove();
      return;
    } else {
      cell.classList.add('carousel-slide-image');
    }
    slide.append(cell);
  });

  slide.querySelectorAll('.carousel-slide-image picture > img').forEach((img) => {
    const picture = img.closest('picture');
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    picture.replaceWith(optimized);
  });

  decorateSlideLink(slide);

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);

  return slide;
}

function createIndicator(slide, idx, total) {
  const indicator = document.createElement('li');
  indicator.classList.add('carousel-slide-indicator');
  indicator.dataset.targetSlide = idx;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', `Show slide ${idx + 1} of ${total}`);
  button.setAttribute('aria-controls', slide.id);

  const img = slide.querySelector('.carousel-slide-image img');
  if (img) {
    button.append(createOptimizedPicture(img.src, '', false, [{ width: '200' }]));
  } else {
    indicator.classList.add('carousel-slide-indicator-dot');
  }
  indicator.append(button);
  return indicator;
}

/**
 * Carousel: one row per slide; cell 1 = image (or video link), cell 2 = optional caption/text.
 * Renders a centred scroll-snap slide track, prev/next arrows (2+ slides)
 * and a thumbnail strip (one thumbnail per slide, also for a single slide).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  carouselId += 1;
  const id = carouselId;
  block.id = `carousel-${id}`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.querySelectorAll(':scope > div')];
  const isSingleSlide = rows.length < 2;

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  if (!isSingleSlide) {
    const nav = document.createElement('div');
    nav.classList.add('carousel-navigation-buttons');
    nav.innerHTML = `
      <button type="button" class="slide-prev" aria-label="Previous slide">${CARET_PREV}</button>
      <button type="button" class="slide-next" aria-label="Next slide">${CARET_NEXT}</button>
    `;
    container.append(nav);
  } else {
    block.classList.add('carousel-single');
  }

  const slides = rows.map((row, idx) => {
    const slide = createSlide(row, idx, id);
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);
    row.remove();
    return slide;
  });

  container.append(slidesWrapper);
  block.prepend(container);

  const hasThumbnails = slides.some((slide) => slide.querySelector('.carousel-slide-image img'));
  if (!isSingleSlide || hasThumbnails) {
    const indicatorsNav = document.createElement('nav');
    indicatorsNav.setAttribute('aria-label', 'Carousel slide controls');
    const indicators = document.createElement('ol');
    indicators.classList.add('carousel-slide-indicators');
    slides.forEach((slide, idx) => indicators.append(createIndicator(slide, idx, slides.length)));
    indicatorsNav.append(indicators);
    block.append(indicatorsNav);
  }

  if (slides.length) {
    updateActiveSlide(block, 0);
    bindEvents(block);
  }
}
