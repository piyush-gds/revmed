async function fetchTrialData(trialId) {
  const cacheBuster = Date.now();
  const apiUrl = `https://publish-p52710-e1559444.adobeaemcloud.com/graphql/execute.json/piyush-revmed-site/getrequirementIdData;reqId=${trialId.toUpperCase()}?q=${cacheBuster}`;

  try {
    const response = await fetch(apiUrl);
    const jsonData = await response.json();
    return jsonData?.data?.requirementsPageModelList?.items?.[0] || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch trial data:', error);
    return null;
  }
}

function extractTrialId(block) {
  const text = block.textContent.trim();
  const match = text.match(/NCT[0-9]+/i);
  return match ? match[0] : null;
}

function createElement(tag, className = '', textContent = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

const ICONS = {
  studyFocus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" fill="none" stroke="#1a9e8f" stroke-width="2.5">
    <circle cx="70" cy="95" r="20"/>
    <circle cx="38" cy="78" r="16"/>
    <circle cx="102" cy="78" r="16"/>
    <circle cx="55" cy="52" r="14"/>
    <circle cx="85" cy="52" r="14"/>
    <circle cx="28" cy="48" r="12"/>
    <circle cx="112" cy="48" r="12"/>
    <circle cx="70" cy="35" r="13"/>
    <circle cx="45" cy="25" r="10"/>
    <circle cx="95" cy="25" r="10"/>
    <circle cx="70" cy="10" r="8"/>
  </svg>`,
  eligibility: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" fill="none" stroke="#1a9e8f" stroke-width="2.5">
    <circle cx="35" cy="20" r="12"/>
    <path d="M23 40 C23 32 47 32 47 40"/>
    <line x1="23" y1="40" x2="23" y2="90"/>
    <line x1="47" y1="40" x2="47" y2="90"/>
    <circle cx="80" cy="20" r="12"/>
    <path d="M68 40 C68 32 92 32 92 40"/>
    <line x1="68" y1="40" x2="68" y2="90"/>
    <line x1="92" y1="40" x2="92" y2="90"/>
    <circle cx="80" cy="62" r="12" fill="#1a9e8f" stroke="none"/>
    <path d="M74 62 L78 67 L87 56" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="125" cy="20" r="12"/>
    <path d="M113 40 C113 32 137 32 137 40"/>
    <line x1="113" y1="40" x2="113" y2="90"/>
    <line x1="137" y1="40" x2="137" y2="90"/>
  </svg>`,
  clinicalPhase: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" fill="none" stroke="#1a9e8f" stroke-width="2">
    <circle cx="35" cy="25" r="12"/>
    <path d="M20 45 L20 90 M50 45 L50 90"/>
    <path d="M20 45 C20 35 50 35 50 45"/>
    <circle cx="85" cy="25" r="12"/>
    <path d="M70 45 L70 90 M100 45 L100 90"/>
    <path d="M70 45 C70 35 100 35 100 45"/>
    <rect x="52" y="55" width="16" height="25" rx="3" fill="#1a9e8f" stroke="none"/>
    <path d="M60 48 L60 55 M56 51 L60 48 L64 51" stroke="#1a9e8f" stroke-width="2"/>
  </svg>`,
  timelines: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#1a9e8f" stroke-width="2.5">
    <circle cx="50" cy="50" r="40"/>
    <circle cx="50" cy="50" r="3" fill="#1a9e8f"/>
    <path d="M50 50 L50 25"/>
    <path d="M50 50 L68 58"/>
  </svg>`,
};

function renderTrialContent(block, trialData, trialId) {
  block.textContent = '';

  const content = createElement('div', 'clinical-trial-content');

  // ========== HERO SECTION ==========
  const heroSection = createElement('div', 'trial-hero');
  const heroInner = createElement('div', 'trial-hero-inner');

  // Breadcrumb
  const breadcrumb = createElement('nav', 'trial-breadcrumb');
  const breadcrumbLink = createElement('a', 'trial-breadcrumb-link', trialData.clinicalTrialsLabel || 'Clinical Trials');
  breadcrumbLink.href = '/clinical-trials';
  const breadcrumbArrow = createElement('span', 'trial-breadcrumb-arrow', '›');
  breadcrumb.appendChild(breadcrumbLink);
  breadcrumb.appendChild(breadcrumbArrow);
  heroInner.appendChild(breadcrumb);

  // Headline
  const headline = createElement('h1', 'trial-headline', trialData.headline || 'Clinical Trial');
  heroInner.appendChild(headline);

  // Content row with description and badges
  const contentRow = createElement('div', 'trial-content-row');

  // Description
  if (trialData.description?.plaintext) {
    const descriptionWrapper = createElement('div', 'trial-description');
    const descriptionText = createElement('p', '', trialData.description.plaintext);
    descriptionWrapper.appendChild(descriptionText);
    contentRow.appendChild(descriptionWrapper);
  }

  // Badges
  const badges = createElement('div', 'trial-badges');
  if (trialData.phase) {
    const phaseBadge = createElement('span', 'trial-badge trial-phase', trialData.phase);
    badges.appendChild(phaseBadge);
  }
  const idBadge = createElement('span', 'trial-badge trial-id', trialData.requirementId || trialId);
  badges.appendChild(idBadge);
  contentRow.appendChild(badges);

  heroInner.appendChild(contentRow);
  heroSection.appendChild(heroInner);
  content.appendChild(heroSection);

  // ========== STUDY FOCUS & ELIGIBILITY CARDS ==========
  const cardsSection = createElement('div', 'trial-cards-section');
  const cardsSectionInner = createElement('div', 'trial-cards-section-inner');
  const cardsGrid = createElement('div', 'trial-cards-grid');

  // Study Focus Card
  if (trialData.studyFocusCard?.html) {
    const studyCard = createElement('div', 'trial-card study-focus-card');

    const studyHeader = createElement('div', 'trial-card-header');
    const studyTitle = createElement('h3', 'trial-card-title', trialData.studyFocusLabel || 'Study Focus');
    studyHeader.appendChild(studyTitle);
    studyCard.appendChild(studyHeader);

    const studyDivider = createElement('div', 'trial-card-divider');
    studyCard.appendChild(studyDivider);

    const studyContent = createElement('div', 'trial-card-content');
    studyContent.innerHTML = trialData.studyFocusCard.html;
    studyCard.appendChild(studyContent);

    const studyIcon = createElement('div', 'trial-card-icon');
    studyIcon.innerHTML = ICONS.studyFocus;
    studyCard.appendChild(studyIcon);

    cardsGrid.appendChild(studyCard);
  }

  // Eligibility Card
  if (trialData.eligibilityCard?.html) {
    const eligibilityCard = createElement('div', 'trial-card eligibility-card');

    const eligibilityHeader = createElement('div', 'trial-card-header');
    const eligibilityTitle = createElement('h3', 'trial-card-title', trialData.eligibilityLabel || 'Eligibility');
    eligibilityHeader.appendChild(eligibilityTitle);
    eligibilityCard.appendChild(eligibilityHeader);

    const eligibilityDivider = createElement('div', 'trial-card-divider');
    eligibilityCard.appendChild(eligibilityDivider);

    const eligibilityContent = createElement('div', 'trial-card-content');
    eligibilityContent.innerHTML = trialData.eligibilityCard.html;
    eligibilityCard.appendChild(eligibilityContent);

    const eligibilityFootnote = createElement('p', 'trial-card-footnote', '*This is not a complete list of eligibility criteria; for more information, please go to ClinicalTrials.gov.');
    eligibilityCard.appendChild(eligibilityFootnote);

    const eligibilityIcon = createElement('div', 'trial-card-icon');
    eligibilityIcon.innerHTML = ICONS.eligibility;
    eligibilityCard.appendChild(eligibilityIcon);

    cardsGrid.appendChild(eligibilityCard);
  }

  cardsSectionInner.appendChild(cardsGrid);
  cardsSection.appendChild(cardsSectionInner);
  content.appendChild(cardsSection);

  // ========== PHASE & TIMELINES CARDS ==========
  const infoSection = createElement('div', 'trial-info-section');
  const infoSectionInner = createElement('div', 'trial-info-section-inner');
  const infoGrid = createElement('div', 'trial-info-grid');

  // Clinical Trial Phase Card
  const phaseCard = createElement('div', 'trial-info-card phase-card');

  const phaseHeader = createElement('h3', 'trial-info-card-title', trialData.clinicalTrialPhaseLabel || 'Clinical Trial Phase');
  phaseCard.appendChild(phaseHeader);

  const phaseIconWrapper = createElement('div', 'trial-info-card-icon');
  phaseIconWrapper.innerHTML = ICONS.clinicalPhase;
  phaseCard.appendChild(phaseIconWrapper);

  const phaseFooter = createElement('div', 'trial-info-card-footer');
  const phaseLabel = createElement('span', 'trial-info-label', trialData.phaseLabel || 'Phase:');
  const phaseValue = createElement('span', 'trial-info-value', trialData.phaseValue || '');
  phaseFooter.appendChild(phaseLabel);
  phaseFooter.appendChild(phaseValue);
  phaseCard.appendChild(phaseFooter);

  infoGrid.appendChild(phaseCard);

  // Timelines Card
  const timelinesCard = createElement('div', 'trial-info-card timelines-card');

  const timelinesHeader = createElement('h3', 'trial-info-card-title', trialData.timelinesLabel || 'Timelines');
  timelinesCard.appendChild(timelinesHeader);

  const timelinesIconWrapper = createElement('div', 'trial-info-card-icon');
  timelinesIconWrapper.innerHTML = ICONS.timelines;
  timelinesCard.appendChild(timelinesIconWrapper);

  const timelinesFooter = createElement('div', 'trial-info-card-footer');
  const timelinesLabel = createElement('span', 'trial-info-label', trialData.studyDurationLabel || 'Study Duration:');
  const timelinesValue = createElement('span', 'trial-info-value', trialData.studyDurationValue || '');
  timelinesFooter.appendChild(timelinesLabel);
  timelinesFooter.appendChild(timelinesValue);
  timelinesCard.appendChild(timelinesFooter);

  infoGrid.appendChild(timelinesCard);

  infoSectionInner.appendChild(infoGrid);
  infoSection.appendChild(infoSectionInner);
  content.appendChild(infoSection);

  // ========== CONTACT SECTION ==========
  if (trialData.contactLabel?.html) {
    const contactSection = createElement('div', 'trial-contact-section');
    const contactSectionInner = createElement('div', 'trial-contact-section-inner');
    const contactContent = createElement('div', 'trial-contact-content');
    contactContent.innerHTML = trialData.contactLabel.html;
    contactSectionInner.appendChild(contactContent);
    contactSection.appendChild(contactSectionInner);
    content.appendChild(contactSection);
  }

  // ========== REFERENCE SECTION ==========
  if (trialData.referenceValue?.html) {
    const referenceSection = createElement('div', 'trial-reference-section');
    const referenceSectionInner = createElement('div', 'trial-reference-section-inner');

    const referenceTitle = createElement('h3', 'trial-reference-title', trialData.referenceLabel || 'Reference');
    referenceSectionInner.appendChild(referenceTitle);

    const referenceContent = createElement('div', 'trial-reference-content');
    referenceContent.innerHTML = trialData.referenceValue.html;
    referenceSectionInner.appendChild(referenceContent);

    referenceSection.appendChild(referenceSectionInner);
    content.appendChild(referenceSection);
  }

  block.appendChild(content);
}

function showLoading(block) {
  block.textContent = '';
  const loading = createElement('div', 'trial-loading', 'Loading clinical trial data...');
  block.appendChild(loading);
}

function showError(block, message) {
  block.textContent = '';
  const error = createElement('p', 'trial-error', message);
  block.appendChild(error);
}

export default async function decorate(block) {
  const trialId = extractTrialId(block);

  if (!trialId) {
    showError(block, 'No valid NCT ID provided. Please enter an NCT identifier (e.g., NCT12345678).');
    return;
  }

  showLoading(block);

  const trialData = await fetchTrialData(trialId);

  if (!trialData) {
    showError(block, `Unable to load clinical trial data for ${trialId}.`);
    return;
  }

  renderTrialContent(block, trialData, trialId);
}
