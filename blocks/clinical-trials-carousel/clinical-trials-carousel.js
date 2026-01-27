import { fetchPlaceholders } from '../../scripts/aem.js';

/**
 * Parse trial data from block rows (authored in Universal Editor)
 * Each row represents one clinical trial with columns:
 * [title, description, status, phase, medicalConditions]
 * @param {HTMLElement} block - The block element
 * @returns {Array} - Array of trial objects
 */
function parseTrialsFromBlock(block) {
  const rows = block.querySelectorAll(':scope > div');
  const trials = [];

  rows.forEach((row) => {
    const columns = row.querySelectorAll(':scope > div');
    if (columns.length >= 1) {
      trials.push({
        id: columns[0]?.textContent?.trim().toLowerCase().replace(/\s+/g, '-') || `trial-${trials.length}`,
        title: columns[0]?.textContent?.trim() || '',
        description: columns[1]?.innerHTML?.trim() || columns[1]?.textContent?.trim() || '',
        status: columns[2]?.textContent?.trim() || '',
        phase: columns[3]?.textContent?.trim() || '',
        medicalConditions: columns[4]?.textContent?.trim() || '',
      });
    }
  });

  return trials;
}

/**
 * Updates the active slide state
 * @param {HTMLElement} slide - The slide element
 */
function updateActiveSlide(slide) {
  const block = slide.closest('.clinical-trials-carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');
  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

/**
 * Shows a specific slide
 * @param {HTMLElement} block - The carousel block
 * @param {number} slideIndex - Index of slide to show
 */
function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

/**
 * Binds event listeners to carousel controls
 * @param {HTMLElement} block - The carousel block
 */
function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });

  block.querySelector('.slide-next')?.addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 },
  );

  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

/**
 * Creates a trial card element
 * @param {Object} trial - Trial data object
 * @param {number} index - Slide index
 * @param {number} carouselId - Carousel ID
 * @param {Object} placeholders - Localized placeholders
 * @returns {HTMLElement} - The slide element
 */
function createTrialCard(trial, index, carouselId, placeholders) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = index;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${index}`);
  slide.classList.add('carousel-slide');
  slide.setAttribute('aria-hidden', index !== 0);

  slide.innerHTML = `
    <div class="trial-card">
      <div class="trial-card-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <h3 class="trial-card-title">${trial.title}</h3>
      <p class="trial-card-description">${trial.description}</p>
      <div class="trial-card-divider"></div>
      <div class="trial-card-details">
        <div class="trial-detail">
          <span class="trial-detail-label">${placeholders.status || 'STATUS'}</span>
          <span class="trial-detail-value">${trial.status}</span>
        </div>
        <div class="trial-detail">
          <span class="trial-detail-label">${placeholders.phase || 'PHASE'}</span>
          <span class="trial-detail-value">${trial.phase}</span>
        </div>
        <div class="trial-detail">
          <span class="trial-detail-label">${placeholders.medicalConditions || 'MEDICAL CONDITIONS'}</span>
          <span class="trial-detail-value">${trial.medicalConditions}</span>
        </div>
      </div>
    </div>
  `;

  return slide;
}

let carouselId = 0;

/**
 * Main decorate function for the clinical trials carousel
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `clinical-trials-carousel-${carouselId}`);

  // Parse trials from authored content in Universal Editor
  const trials = parseTrialsFromBlock(block);

  // If no trials authored, exit early
  if (trials.length === 0) {
    return;
  }

  // Clear existing content
  block.innerHTML = '';

  const isSingleSlide = trials.length < 2;
  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');
  block.dataset.activeSlide = 0;

  // Create container
  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  // Create slides wrapper
  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');

  // Create navigation buttons (outside slides for positioning)
  let slideIndicators;
  if (!isSingleSlide) {
    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;
    container.append(slideNavButtons);
  }

  // Create slides from trial data
  trials.forEach((trial, idx) => {
    const slide = createTrialCard(trial, idx, carouselId, placeholders);
    slidesWrapper.append(slide);
  });

  container.append(slidesWrapper);
  block.append(container);

  // Create slide indicators
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute(
      'aria-label',
      placeholders.carouselSlideControls || 'Carousel Slide Controls',
    );
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');

    trials.forEach((trial, idx) => {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" ${idx === 0 ? 'disabled aria-current="true"' : ''} aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${trials.length}"></button>`;
      slideIndicators.append(indicator);
    });

    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    bindEvents(block);
  }
}
