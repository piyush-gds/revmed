// ========== CONSTANTS ==========
const API_BASE_URL = 'https://publish-p52710-e1559444.adobeaemcloud.com/graphql/execute.json/piyush-revmed-site';
const NCT_ID_PATTERN = /NCT[0-9]+/i;

// ========== API ==========
async function fetchTrialDataByReqId(trialId) {
  const apiUrl = `${API_BASE_URL}/getrequirementIdData;reqId=${trialId.toUpperCase()}?q=${Date.now()}`;

  try {
    const response = await fetch(apiUrl);
    const { data } = await response.json();
    return data?.clinicalTrialsDetailsModelList?.items?.[0] ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch trial data by reqId:', error);
    return null;
  }
}

async function fetchTrialDataByPath(fragmentPath) {
  const apiUrl = `${API_BASE_URL}/getRequirementByPathData;path=${fragmentPath}?q=${Date.now()}`;

  try {
    const response = await fetch(apiUrl);
    const { data } = await response.json();
    return data?.clinicalTrialsDetailsModelList?.items?.[0] ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch trial data by path:', error);
    return null;
  }
}

// ========== UTILITIES ==========
const extractTrialId = (block) => {
  // Only look at the first row (first child div) for the NCT ID
  const firstRow = block.querySelector(':scope > div:first-child');
  if (!firstRow) return null;

  const text = firstRow.textContent.trim();
  if (!text) return null;

  const match = text.match(NCT_ID_PATTERN);
  return match?.[0] ?? null;
};

const extractFragmentPath = (block) => {
  const anchor = block.querySelector('a[href*="/content/dam/"]');
  if (!anchor) return null;

  const fullPath = anchor.getAttribute('href');
  // Remove the trailing suffix like "-fragment0", "-fragment1", etc.
  const basePath = fullPath.replace(/-fragment\d*$/, '');
  return basePath || null;
};

const createElement = (tag, className = '', textContent = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
};

const createIcon = (src, alt) => {
  const wrapper = createElement('div', 'trial-card-icon');
  const img = createElement('img');
  img.src = src || '';
  img.alt = alt || 'Icon';
  wrapper.appendChild(img);
  return wrapper;
};

const createSection = (className, innerClassName) => {
  const section = createElement('div', className);
  const inner = createElement('div', innerClassName);
  section.appendChild(inner);
  return { section, inner };
};

const appendChildren = (parent, ...children) => {
  children.forEach((child) => child && parent.appendChild(child));
};

// ========== COMPONENT BUILDERS ==========
function buildHeroSection(trialData, labels) {
  const { section: heroSection, inner: heroInner } = createSection('trial-hero', 'trial-hero-inner');

  // Breadcrumb
  const breadcrumb = createElement('nav', 'trial-breadcrumb');
  const breadcrumbLink = createElement('a', 'trial-breadcrumb-link', labels?.clinicalTrialsLabel);
  breadcrumbLink.href = '/clinical-trials';
  appendChildren(breadcrumb, breadcrumbLink, createElement('span', 'trial-breadcrumb-arrow', '›'));
  heroInner.appendChild(breadcrumb);

  // Headline
  heroInner.appendChild(createElement('h1', 'trial-headline', trialData.headline));

  // Content row
  const contentRow = createElement('div', 'trial-content-row');

  if (trialData.description?.plaintext) {
    const descWrapper = createElement('div', 'trial-description');
    descWrapper.appendChild(createElement('p', '', trialData.description.plaintext));
    contentRow.appendChild(descWrapper);
  }

  // Badges
  const badges = createElement('div', 'trial-badges');
  if (trialData.phase) {
    badges.appendChild(createElement('span', 'trial-badge trial-phase', trialData.phase));
  }
  badges.appendChild(createElement('span', 'trial-badge trial-id', trialData.requirementId));
  contentRow.appendChild(badges);

  heroInner.appendChild(contentRow);
  return heroSection;
}

function buildTrialCard({ cardClass, title, htmlContent, iconSrc, iconAlt }) {
  const card = createElement('div', `trial-card ${cardClass}`);

  // Header
  const header = createElement('div', 'trial-card-header');
  header.appendChild(createElement('h3', 'trial-card-title', title));
  card.appendChild(header);

  // Divider
  card.appendChild(createElement('div', 'trial-card-divider'));

  // Content
  const content = createElement('div', 'trial-card-content');
  content.innerHTML = htmlContent;
  card.appendChild(content);

  // Icon
  card.appendChild(createIcon(iconSrc, iconAlt));

  return card;
}

function buildInfoCard({ cardClass, title, iconSrc, iconAlt, label, value }) {
  const card = createElement('div', `trial-info-card ${cardClass}`);

  card.appendChild(createElement('h3', 'trial-info-card-title', title));

  // Icon
  const iconWrapper = createElement('div', 'trial-info-card-icon');
  const img = createElement('img');
  img.src = iconSrc || '';
  img.alt = iconAlt || 'Icon';
  iconWrapper.appendChild(img);
  card.appendChild(iconWrapper);

  // Footer
  const footer = createElement('div', 'trial-info-card-footer');
  appendChildren(
    footer,
    createElement('span', 'trial-info-label', label),
    createElement('span', 'trial-info-value', value),
  );
  card.appendChild(footer);

  return card;
}

function buildCardsSection(trialData, labels) {
  const { section, inner } = createSection('trial-cards-section', 'trial-cards-section-inner');
  const grid = createElement('div', 'trial-cards-grid');

  // Study Focus Card
  if (trialData.studyFocusCard?.html) {
    grid.appendChild(buildTrialCard({
      cardClass: 'study-focus-card',
      title: labels?.studyFocusLabel,
      htmlContent: trialData.studyFocusCard.html,
      iconSrc: labels?.studyFocusIcon?._publishUrl,
      iconAlt: labels?.studyFocusLabel,
    }));
  }

  // Eligibility Card
  if (trialData.eligibilityCard?.html) {
    grid.appendChild(buildTrialCard({
      cardClass: 'eligibility-card',
      title: labels?.eligibilityLabel,
      htmlContent: trialData.eligibilityCard.html,
      iconSrc: labels?.eligibilityIcon?._publishUrl,
      iconAlt: labels?.eligibilityLabel,
    }));
  }

  inner.appendChild(grid);
  return section;
}

function buildInfoSection(trialData, labels) {
  const { section, inner } = createSection('trial-info-section', 'trial-info-section-inner');
  const grid = createElement('div', 'trial-info-grid');

  // Phase Card
  grid.appendChild(buildInfoCard({
    cardClass: 'phase-card',
    title: labels?.clinicalTrialPhaseLabel,
    iconSrc: labels?.phaseIcon?._publishUrl,
    iconAlt: labels?.phaseLabel,
    label: labels?.phaseLabel,
    value: trialData.phaseValue,
  }));

  // Timelines Card
  grid.appendChild(buildInfoCard({
    cardClass: 'timelines-card',
    title: labels?.timelinesLabel,
    iconSrc: labels?.timelinesIcon?._publishUrl,
    iconAlt: labels?.timelinesLabel,
    label: labels?.studyDurationLabel,
    value: trialData.studyDurationValue,
  }));

  inner.appendChild(grid);
  return section;
}

function buildContactSection(labels) {
  if (!labels?.contactLabel?.html) return null;

  const { section, inner } = createSection('trial-contact-section', 'trial-contact-section-inner');
  const content = createElement('div', 'trial-contact-content');
  content.innerHTML = labels.contactLabel.html;
  inner.appendChild(content);
  return section;
}

function buildReferenceSection(trialData, labels) {
  if (!trialData.referenceValue?.html) return null;

  const { section, inner } = createSection('trial-reference-section', 'trial-reference-section-inner');
  inner.appendChild(createElement('h3', 'trial-reference-title', labels?.referenceLabel));

  const content = createElement('div', 'trial-reference-content');
  content.innerHTML = trialData.referenceValue.html;
  inner.appendChild(content);

  return section;
}

// ========== MAIN RENDER ==========
function renderTrialContent(block, trialData) {
  block.textContent = '';
  const labels = trialData.labelsFragmentReference;
  const content = createElement('div', 'clinical-trial-content');

  appendChildren(
    content,
    buildHeroSection(trialData, labels),
    buildCardsSection(trialData, labels),
    buildInfoSection(trialData, labels),
    buildContactSection(labels),
    buildReferenceSection(trialData, labels),
  );

  block.appendChild(content);
}

// ========== UI STATES ==========
const showLoading = (block) => {
  block.textContent = '';
  block.appendChild(createElement('div', 'trial-loading', 'Loading clinical trial data...'));
};

const showError = (block, message) => {
  block.textContent = '';
  block.appendChild(createElement('p', 'trial-error', message));
};

// ========== ENTRY POINT ==========
export default async function decorate(block) {
  const trialId = extractTrialId(block);
  const fragmentPath = extractFragmentPath(block);

  if (!trialId && !fragmentPath) {
    showError(block, 'No valid NCT ID or fragment path provided. Please enter an NCT identifier (e.g., NCT12345678) or provide a valid content fragment path.');
    return;
  }

  showLoading(block);

  let trialData = null;

  // Try fetching by trialId first, fallback to fragmentPath
  if (trialId) {
    trialData = await fetchTrialDataByReqId(trialId);
  }

  if (!trialData && fragmentPath) {
    trialData = await fetchTrialDataByPath(fragmentPath);
  }

  if (!trialData) {
    showError(block, `Unable to load clinical trial data for ${trialId || fragmentPath}.`);
    return;
  }

  renderTrialContent(block, trialData);
}
