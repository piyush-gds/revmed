import { fetchGraphQL } from '../../scripts/graphql.js';

// Persisted query paths
const TRIALS_QUERY_PATH = '/getTrialsTableData';
const REGION_QUERY_PATH = '/getRegionCountryData';

// Fallback direct endpoints
const FALLBACK_TRIALS = 'https://publish-p178131-e1882764.adobeaemcloud.com/graphql/execute.json/revmed-aem-core/getTrialsTableData';
const FALLBACK_REGION = 'https://publish-p178131-e1882764.adobeaemcloud.com/graphql/execute.json/revmed-aem-core/getRegionCountryData';

/**
 * Generic fallback fetch for a given endpoint.
 */
async function fallbackFetch(endpoint) {
  const resp = await fetch(`${endpoint}?q=${Date.now()}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch the trials table data from AEM GraphQL.
 * @returns {Promise<Array>} Array of trial items
 */
async function fetchTrialsData() {
  try {
    const result = await fetchGraphQL(TRIALS_QUERY_PATH);
    const items = result?.data?.tableNctDataList?.items;
    if (items && items.length) return items;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('trials-table: fetchGraphQL failed, trying fallback', err);
  }
  try {
    const json = await fallbackFetch(FALLBACK_TRIALS);
    return json?.data?.tableNctDataList?.items ?? [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('trials-table: fallback fetch failed', err);
    return [];
  }
}

/**
 * Fetch region / country / state data from AEM GraphQL.
 * @returns {Promise<Array>} Array of region items
 */
async function fetchRegionData() {
  try {
    const result = await fetchGraphQL(REGION_QUERY_PATH);
    const items = result?.data?.mapModelList?.items;
    if (items && items.length) return items;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('trials-table: region fetchGraphQL failed, trying fallback', err);
  }
  try {
    const json = await fallbackFetch(FALLBACK_REGION);
    return json?.data?.mapModelList?.items ?? [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('trials-table: region fallback fetch failed', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse region data into a structured map:
 *   { regionName -> { countryName -> [states] } }
 */
function buildRegionMap(regionItems) {
  const map = {};
  regionItems.forEach((item) => {
    const region = item.regionName;
    if (!region) return;
    if (!map[region]) map[region] = {};
    const details = item.countryStateDetails;
    if (!details?.country) return;
    const country = details.country.name;
    if (!country) return;
    map[region][country] = details.country.states || [];
  });
  return map;
}

/**
 * Extract unique sorted values of a field from trial items.
 */
function uniqueValues(items, fieldName) {
  const set = new Set();
  items.forEach((item) => {
    const val = item[fieldName];
    if (val && typeof val === 'string') {
      set.add(val.trim());
    }
  });
  return [...set].sort();
}

/**
 * Create a single custom dropdown (pill button + flyout list).
 */
function createDropdown(id, label, options, variant) {
  const wrapper = document.createElement('div');
  wrapper.className = `trials-filter-dropdown${variant ? ` trials-filter-dropdown--${variant}` : ''}`;
  wrapper.dataset.filterId = id;

  // Trigger button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'trials-filter-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.id = `${id}-btn`;

  const btnLabel = document.createElement('span');
  btnLabel.className = 'trials-filter-btn-label';
  btnLabel.textContent = label;
  btn.appendChild(btnLabel);

  const chevron = document.createElement('span');
  chevron.className = 'trials-filter-chevron';
  chevron.innerHTML = `<svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  btn.appendChild(chevron);

  wrapper.appendChild(btn);

  // Dropdown panel
  const panel = document.createElement('ul');
  panel.className = 'trials-filter-panel';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-labelledby', `${id}-btn`);
  panel.id = `${id}-panel`;

  options.forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'trials-filter-option';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.value = opt;
    li.textContent = opt;
    panel.appendChild(li);
  });

  wrapper.appendChild(panel);

  // Store original label for reset
  wrapper.dataset.label = label;

  // Toggle open/close
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('is-open');
    // Close all other dropdowns first
    document.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      if (d !== wrapper) {
        d.classList.remove('is-open');
        d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
      }
    });
    wrapper.classList.toggle('is-open', !isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  // Option selection
  panel.addEventListener('click', (e) => {
    const li = e.target.closest('.trials-filter-option');
    if (!li) return;

    const val = li.dataset.value;
    // Deselect previous
    panel.querySelectorAll('.trials-filter-option').forEach((o) => o.setAttribute('aria-selected', 'false'));
    li.setAttribute('aria-selected', 'true');

    // Update label
    btnLabel.textContent = val;
    wrapper.dataset.value = val;
    wrapper.classList.add('has-value');

    // Close
    wrapper.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');

    // Fire custom event for filter logic
    wrapper.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  });

  return wrapper;
}

/**
 * Repopulate a custom dropdown panel with new options.
 */
function populateDropdown(wrapper, options) {
  const panel = wrapper.querySelector('.trials-filter-panel');
  panel.innerHTML = '';
  options.forEach((opt) => {
    const li = document.createElement('li');
    li.className = 'trials-filter-option';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.value = opt;
    li.textContent = opt;
    panel.appendChild(li);
  });
}

/**
 * Reset a custom dropdown to its default label.
 */
function resetDropdown(wrapper) {
  const btnLabel = wrapper.querySelector('.trials-filter-btn-label');
  btnLabel.textContent = wrapper.dataset.label;
  delete wrapper.dataset.value;
  wrapper.classList.remove('has-value');
  wrapper.querySelector('.trials-filter-panel')
    .querySelectorAll('.trials-filter-option')
    .forEach((o) => o.setAttribute('aria-selected', 'false'));
}

/**
 * Build the filter bar with all five dropdowns + Clear All + status.
 */
function buildFilterBar(regionMap, trialItems) {
  const bar = document.createElement('div');
  bar.className = 'trials-filter-bar';

  const row = document.createElement('div');
  row.className = 'trials-filter-row';

  // Region
  const regions = Object.keys(regionMap).sort();
  row.appendChild(createDropdown('filter-region', 'Region', regions));

  // Country
  const allCountries = [...new Set(
    Object.values(regionMap).flatMap((countries) => Object.keys(countries)),
  )].sort();
  row.appendChild(createDropdown('filter-country', 'Country', allCountries));

  // State (lighter variant)
  const allStates = [...new Set(
    Object.values(regionMap).flatMap((countries) => Object.values(countries).flat()),
  )].sort();
  row.appendChild(createDropdown('filter-state', 'State', allStates, 'muted'));

  // Tumor
  const tumors = uniqueValues(trialItems, 'tumour');
  row.appendChild(createDropdown('filter-tumor', 'Tumor', tumors));

  // Intervention
  const interventions = uniqueValues(trialItems, 'intervention');
  row.appendChild(createDropdown('filter-intervention', 'Intervention', interventions));

  // Clear All button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'trials-filter-clear';
  clearBtn.innerHTML = `Clear All <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

  row.appendChild(clearBtn);

  bar.appendChild(row);

  // Status text
  const status = document.createElement('div');
  status.className = 'trials-filter-status';
  status.textContent = 'Showing all trials';
  bar.appendChild(status);

  return bar;
}

/**
 * Wire up cascading filter logic for Region → Country → State
 * and row-level filtering for Tumor + Intervention.
 */
function wireFilters(filterBar, regionMap, tableBody, trialItems) {
  const regionDd = filterBar.querySelector('[data-filter-id="filter-region"]');
  const countryDd = filterBar.querySelector('[data-filter-id="filter-country"]');
  const stateDd = filterBar.querySelector('[data-filter-id="filter-state"]');
  const tumorDd = filterBar.querySelector('[data-filter-id="filter-tumor"]');
  const interventionDd = filterBar.querySelector('[data-filter-id="filter-intervention"]');
  const clearBtn = filterBar.querySelector('.trials-filter-clear');
  const statusEl = filterBar.querySelector('.trials-filter-status');

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    filterBar.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
  });

  // Prevent click inside panel from closing
  filterBar.addEventListener('click', (e) => e.stopPropagation());

  // --- Cascading geo dropdowns ---
  regionDd.addEventListener('filter-change', () => {
    const region = regionDd.dataset.value;
    if (region && regionMap[region]) {
      populateDropdown(countryDd, Object.keys(regionMap[region]).sort());
      populateDropdown(stateDd, Object.values(regionMap[region]).flat().sort());
    } else {
      populateDropdown(countryDd, [...new Set(
        Object.values(regionMap).flatMap((c) => Object.keys(c)),
      )].sort());
      populateDropdown(stateDd, [...new Set(
        Object.values(regionMap).flatMap((c) => Object.values(c).flat()),
      )].sort());
    }
    resetDropdown(countryDd);
    resetDropdown(stateDd);
    applyFilters();
  });

  countryDd.addEventListener('filter-change', () => {
    const region = regionDd.dataset.value;
    const country = countryDd.dataset.value;
    if (country) {
      const source = region
        ? { [country]: regionMap[region]?.[country] || [] }
        : Object.values(regionMap).reduce((acc, c) => {
          if (c[country]) acc[country] = c[country];
          return acc;
        }, {});
      populateDropdown(stateDd, (source[country] || []).sort());
    } else {
      const pool = region
        ? regionMap[region]
        : Object.values(regionMap).reduce((acc, c) => ({ ...acc, ...c }), {});
      populateDropdown(stateDd, [...new Set(Object.values(pool).flat())].sort());
    }
    resetDropdown(stateDd);
    applyFilters();
  });

  stateDd.addEventListener('filter-change', applyFilters);
  tumorDd.addEventListener('filter-change', applyFilters);
  interventionDd.addEventListener('filter-change', applyFilters);

  // Clear All
  clearBtn.addEventListener('click', () => {
    [regionDd, countryDd, stateDd, tumorDd, interventionDd].forEach((dd) => resetDropdown(dd));
    // Reset country / state options to full list
    populateDropdown(countryDd, [...new Set(
      Object.values(regionMap).flatMap((c) => Object.keys(c)),
    )].sort());
    populateDropdown(stateDd, [...new Set(
      Object.values(regionMap).flatMap((c) => Object.values(c).flat()),
    )].sort());
    applyFilters();
  });

  function applyFilters() {
    const tumorVal = (tumorDd.dataset.value || '').toLowerCase();
    const interventionVal = (interventionDd.dataset.value || '').toLowerCase();

    let visible = 0;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const item = trialItems[idx];
      if (!item) return;

      let show = true;
      if (tumorVal && (item.tumour || '').toLowerCase() !== tumorVal) show = false;
      if (interventionVal && (item.intervention || '').toLowerCase() !== interventionVal) show = false;

      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    // Update status text
    const hasAnyFilter = tumorVal || interventionVal
      || regionDd.dataset.value || countryDd.dataset.value || stateDd.dataset.value;
    if (hasAnyFilter) {
      statusEl.textContent = `Showing ${visible} of ${rows.length} trials`;
    } else {
      statusEl.textContent = 'Showing all trials';
    }

    // Toggle clear button visibility
    clearBtn.style.display = hasAnyFilter ? '' : 'none';
  }

  // Initial state — hide clear button
  clearBtn.style.display = 'none';
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

  // Fetch data in parallel
  const [items, regionItems] = await Promise.all([
    fetchTrialsData(),
    fetchRegionData(),
  ]);

  // Remove loader
  loader.remove();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'trials-table-empty';
    empty.textContent = 'No clinical trial data available at this time.';
    block.appendChild(empty);
    return;
  }

  // Build region map for cascading dropdowns
  const regionMap = buildRegionMap(regionItems);

  // Build & insert filter bar
  const filterBar = buildFilterBar(regionMap, items);
  block.appendChild(filterBar);

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

  // Wire filter interactions
  wireFilters(filterBar, regionMap, tbody, items);
}
