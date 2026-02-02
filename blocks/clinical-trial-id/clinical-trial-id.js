/**
 * Fetches clinical trial content fragment data via GraphQL
 * @param {string} trialId - The NCT trial identifier
 * @returns {Promise<Object|null>} The content fragment data
 */
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

/**
 * Extracts the NCT trial ID from the block content
 * @param {HTMLElement} block - The block element
 * @returns {string|null} The NCT trial ID
 */
function extractTrialId(block) {
  const text = block.textContent.trim();
  const match = text.match(/NCT[0-9]+/i);
  return match ? match[0] : null;
}

/**
 * Renders the trial data into the block
 * @param {HTMLElement} block - The block element
 * @param {Object} trialData - The content fragment data
 * @param {string} trialId - The NCT trial ID
 */
function renderTrialContent(block, trialData, trialId) {
  block.innerHTML = `
    <div class="clinical-trial-content">
      <div class="trial-header">
        <h2 class="trial-headline">${trialData.headline || 'Clinical Trial'}</h2>
        <div class="trial-badges">
          <span class="trial-badge trial-phase">${trialData.phase || ''}</span>
          <span class="trial-badge trial-id">${trialData.requirementId || trialId}</span>
        </div>
      </div>
      
      <div class="trial-description">
        <p>${trialData.description?.plaintext || ''}</p>
      </div>
      
      ${trialData.studyFocusCard?.html ? `
        <div class="trial-card study-focus-card">
          <h3>Study Focus</h3>
          <div class="card-content">${trialData.studyFocusCard.html}</div>
        </div>
      ` : ''}
      
      ${trialData.eligibilityCard?.html ? `
        <div class="trial-card eligibility-card">
          <h3>Eligibility</h3>
          <div class="card-content">${trialData.eligibilityCard.html}</div>
        </div>
      ` : ''}
      
      ${trialData._path ? `
        <div class="trial-meta">
          <small>Source: ${trialData._path}</small>
        </div>
      ` : ''}
    </div>
  `;
}

export default async function decorate(block) {
  const trialId = extractTrialId(block);

  if (!trialId) {
    block.innerHTML = '<p class="trial-error">No valid NCT ID provided. Please enter an NCT identifier (e.g., NCT12345678).</p>';
    return;
  }

  // Show loading state
  block.innerHTML = '<div class="trial-loading">Loading clinical trial data...</div>';

  const trialData = await fetchTrialData(trialId);

  if (!trialData) {
    block.innerHTML = `<p class="trial-error">Unable to load clinical trial data for ${trialId}.</p>`;
    return;
  }

  renderTrialContent(block, trialData, trialId);
}
