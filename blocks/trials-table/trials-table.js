import { fetchGraphQL } from '../../scripts/graphql.js';

// Persisted query path for trials table data
const QUERY_PATH = '/getTrialsTableData';

// Fallback direct endpoint (used if config.json is unavailable)
const FALLBACK_ENDPOINT = 'https://publish-p178131-e1882764.adobeaemcloud.com/graphql/execute.json/revmed-aem-core/getTrialsTableData';

/**
 * Fetch the trials table data from AEM GraphQL.
 * Falls back to a direct endpoint call if fetchGraphQL returns null.
 * @returns {Promise<Array>} Array of trial items
 */
async function fetchTrialsData() {
  try {
    const result = await fetchGraphQL(QUERY_PATH);
    const items = result?.data?.tableNctDataList?.items;
    if (items && items.length) return items;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('trials-table: fetchGraphQL failed, trying fallback', err);
  }

  // Fallback: direct fetch
  try {
    const resp = await fetch(`${FALLBACK_ENDPOINT}?q=${Date.now()}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    return json?.data?.tableNctDataList?.items ?? [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('trials-table: fallback fetch failed', err);
    return [];
  }
}

/**
 * Build the NCT link pointing to clinicaltrials.gov.
 * @param {string} nctId
 * @returns {HTMLAnchorElement}
 */
function createNctLink(nctId) {
  const link = document.createElement('a');
  link.href = `https://clinicaltrials.gov/study/${nctId}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = nctId;
  link.className = 'trials-table-nct-link';
  return link;
}

/**
 * Build the status badge element.
 * @param {string} status
 * @returns {HTMLSpanElement}
 */
function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = 'trials-table-status-badge';
  badge.textContent = status;
  return badge;
}

/**
 * Build a single table row from a trial item.
 * @param {Object} item - GraphQL trial item
 * @returns {HTMLTableRowElement}
 */
function buildRow(item) {
  const row = document.createElement('tr');

  // Type of Cancer
  const tdTumour = document.createElement('td');
  tdTumour.className = 'trials-table-cell trials-table-cell--tumour';
  tdTumour.innerHTML = `<strong>${item.tumour || ''}</strong>`;
  row.appendChild(tdTumour);

  // Trial Description
  const tdDesc = document.createElement('td');
  tdDesc.className = 'trials-table-cell trials-table-cell--description';
  if (item.trialDescription?.html) {
    tdDesc.innerHTML = item.trialDescription.html;
  }
  row.appendChild(tdDesc);

  // Select Eligibility Criteria
  const tdCriteria = document.createElement('td');
  tdCriteria.className = 'trials-table-cell trials-table-cell--criteria';
  if (item.selectEligibilityCriteria?.html) {
    tdCriteria.innerHTML = item.selectEligibilityCriteria.html;
  }
  row.appendChild(tdCriteria);

  // Status
  const tdStatus = document.createElement('td');
  tdStatus.className = 'trials-table-cell trials-table-cell--status';
  tdStatus.appendChild(createStatusBadge(item.status || ''));
  row.appendChild(tdStatus);

  // For More Information (NCT link)
  const tdNct = document.createElement('td');
  tdNct.className = 'trials-table-cell trials-table-cell--nct';
  if (item.nctId) {
    tdNct.appendChild(createNctLink(item.nctId));
  }
  row.appendChild(tdNct);

  return row;
}

/**
 * Build the full table header row.
 * @returns {HTMLTableSectionElement}
 */
function buildTableHead() {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');

  const headers = [
    { text: 'Type of Cancer', className: 'trials-table-th--tumour' },
    { text: 'Trial Description', className: 'trials-table-th--description' },
    {
      text: 'Select Eligibility Criteria',
      className: 'trials-table-th--criteria',
      superscript: 'a',
    },
    {
      text: 'Status',
      className: 'trials-table-th--status',
      subtitle: 'Recruitment status may vary by trial site',
      superscript: 'b',
    },
    { text: 'For More Information', className: 'trials-table-th--nct' },
  ];

  headers.forEach(({ text, className, subtitle, superscript }) => {
    const th = document.createElement('th');
    th.className = `trials-table-th ${className}`;
    th.scope = 'col';

    const span = document.createElement('span');
    span.textContent = text;
    if (superscript) {
      const sup = document.createElement('sup');
      sup.textContent = superscript;
      span.appendChild(sup);
    }
    th.appendChild(span);

    if (subtitle) {
      const sub = document.createElement('div');
      sub.className = 'trials-table-th-subtitle';
      sub.innerHTML = `${subtitle}<sup>${superscript || ''}</sup>`;
      th.appendChild(sub);
    }

    row.appendChild(th);
  });

  thead.appendChild(row);
  return thead;
}

/**
 * Main block decoration function — called automatically by EDS.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  // Clear authored placeholder content
  block.textContent = '';

  // Loading state
  const loader = document.createElement('div');
  loader.className = 'trials-table-loader';
  loader.textContent = 'Loading clinical trials…';
  block.appendChild(loader);

  // Fetch data
  const items = await fetchTrialsData();

  // Remove loader
  loader.remove();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'trials-table-empty';
    empty.textContent = 'No clinical trial data available at this time.';
    block.appendChild(empty);
    return;
  }

  // Build table
  const wrapper = document.createElement('div');
  wrapper.className = 'trials-table-wrapper';

  const table = document.createElement('table');
  table.className = 'trials-table-grid';

  table.appendChild(buildTableHead());

  const tbody = document.createElement('tbody');
  items.forEach((item) => {
    tbody.appendChild(buildRow(item));
  });
  table.appendChild(tbody);

  wrapper.appendChild(table);
  block.appendChild(wrapper);
}
