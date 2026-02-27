import { fetchGraphQL } from '../../scripts/graphql.js';

/**
 * Fetch items from an AEM persisted query.
 * @param {string} queryPath - e.g. '/getTrialsTableData'
 * @param {string} dataPath  - dot-separated path into the response data, e.g. 'tableNctDataList'
 * @returns {Promise<Array>}
 */
async function fetchItems(queryPath, dataPath) {
  const result = await fetchGraphQL(queryPath);
  return result?.data?.[dataPath]?.items ?? [];
}

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse region data into { regionName -> { countryName -> [states] } }.
 */
function buildRegionMap(regionItems) {
  const map = {};
  regionItems.forEach(({ regionName, countryStateDetails }) => {
    if (!regionName || !countryStateDetails?.country?.name) return;
    if (!map[regionName]) map[regionName] = {};
    map[regionName][countryStateDetails.country.name] = countryStateDetails.country.states || [];
  });
  return map;
}

/** Sorted unique string values of a field across items. */
const uniqueValues = (items, field) => [
  ...new Set(items.map((i) => i[field]?.trim()).filter(Boolean)),
].sort();

/** All countries from every region. */
const allCountries = (rm) => [...new Set(
  Object.values(rm).flatMap((c) => Object.keys(c)),
)].sort();

/** All states from every region. */
const allStates = (rm) => [...new Set(
  Object.values(rm).flatMap((c) => Object.values(c).flat()),
)].sort();

/** Countries for a specific region. */
const countriesFor = (rm, region) => Object.keys(rm[region] || {}).sort();

/** States for a specific region (all countries in it). */
const statesForRegion = (rm, region) => Object.values(rm[region] || {}).flat().sort();

/** States for a specific country across all or one region. */
function statesForCountry(rm, region, country) {
  if (region) return (rm[region]?.[country] || []).sort();
  const found = Object.values(rm).find((c) => c[country]);
  return (found?.[country] || []).sort();
}

const CHEVRON_SVG = `<svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Build option <li> elements into a panel. */
function populateDropdown(wrapper, options) {
  const panel = wrapper.querySelector('.trials-filter-panel');
  panel.innerHTML = options.map((o) => `<li class="trials-filter-option" role="option" aria-selected="false" data-value="${o}">${o}</li>`).join('');
}

/** Create a custom dropdown (pill button + flyout list). */
function createDropdown(id, label, options, variant) {
  const wrapper = document.createElement('div');
  wrapper.className = `trials-filter-dropdown${variant ? ` trials-filter-dropdown--${variant}` : ''}`;
  Object.assign(wrapper.dataset, { filterId: id, label });

  wrapper.innerHTML = `
    <button type="button" class="trials-filter-btn" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false">
      <span class="trials-filter-btn-label">${label}</span>
      <span class="trials-filter-chevron">${CHEVRON_SVG}</span>
    </button>
    <ul class="trials-filter-panel" role="listbox" id="${id}-panel" aria-labelledby="${id}-btn"></ul>`;

  populateDropdown(wrapper, options);

  const btn = wrapper.querySelector('.trials-filter-btn');

  // Toggle open/close
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !wrapper.classList.contains('is-open');
    document.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
    if (opening) {
      wrapper.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  // Option selection (delegated)
  wrapper.querySelector('.trials-filter-panel').addEventListener('click', (e) => {
    const li = e.target.closest('.trials-filter-option');
    if (!li) return;
    wrapper.querySelectorAll('.trials-filter-option').forEach((o) => o.setAttribute('aria-selected', 'false'));
    li.setAttribute('aria-selected', 'true');
    wrapper.querySelector('.trials-filter-btn-label').textContent = li.dataset.value;
    wrapper.dataset.value = li.dataset.value;
    wrapper.classList.add('has-value');
    wrapper.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    wrapper.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  });

  return wrapper;
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

/** Build the filter bar with all five dropdowns + Clear All + status. */
function buildFilterBar(regionMap, trialItems) {
  const bar = document.createElement('div');
  bar.className = 'trials-filter-bar';

  const row = document.createElement('div');
  row.className = 'trials-filter-row';

  [
    ['filter-region', 'Region', Object.keys(regionMap).sort()],
    ['filter-country', 'Country', allCountries(regionMap)],
    ['filter-state', 'State', allStates(regionMap), 'muted'],
    ['filter-tumor', 'Tumor', uniqueValues(trialItems, 'tumour')],
    ['filter-intervention', 'Intervention', uniqueValues(trialItems, 'intervention')],
  ].forEach(([id, label, opts, variant]) => row.appendChild(createDropdown(id, label, opts, variant)));

  row.insertAdjacentHTML('beforeend', `<button type="button" class="trials-filter-clear">Clear All <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`);
  bar.appendChild(row);
  bar.insertAdjacentHTML('beforeend', '<div class="trials-filter-status">Showing all trials</div>');
  return bar;
}

/** Wire cascading filter logic and row filtering. */
function wireFilters(filterBar, regionMap, tableBody, trialItems) {
  const dd = (id) => filterBar.querySelector(`[data-filter-id="${id}"]`);
  const regionDd = dd('filter-region');
  const countryDd = dd('filter-country');
  const stateDd = dd('filter-state');
  const tumorDd = dd('filter-tumor');
  const interventionDd = dd('filter-intervention');
  const allDds = [regionDd, countryDd, stateDd, tumorDd, interventionDd];
  const clearBtn = filterBar.querySelector('.trials-filter-clear');
  const statusEl = filterBar.querySelector('.trials-filter-status');

  const resetGeoOptions = () => {
    populateDropdown(countryDd, allCountries(regionMap));
    populateDropdown(stateDd, allStates(regionMap));
  };

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    filterBar.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
  });
  filterBar.addEventListener('click', (e) => e.stopPropagation());

  // Cascading: Region → Country + State
  regionDd.addEventListener('filter-change', () => {
    const region = regionDd.dataset.value;
    if (region && regionMap[region]) {
      populateDropdown(countryDd, countriesFor(regionMap, region));
      populateDropdown(stateDd, statesForRegion(regionMap, region));
    } else {
      resetGeoOptions();
    }
    resetDropdown(countryDd);
    resetDropdown(stateDd);
    applyFilters();
  });

  // Cascading: Country → State
  countryDd.addEventListener('filter-change', () => {
    const { value: region } = regionDd.dataset;
    const { value: country } = countryDd.dataset;
    if (country) {
      populateDropdown(stateDd, statesForCountry(regionMap, region, country));
    } else {
      populateDropdown(stateDd, region
        ? statesForRegion(regionMap, region)
        : allStates(regionMap));
    }
    resetDropdown(stateDd);
    applyFilters();
  });

  [stateDd, tumorDd, interventionDd].forEach((d) => d.addEventListener('filter-change', applyFilters));

  // Clear All
  clearBtn.addEventListener('click', () => {
    allDds.forEach(resetDropdown);
    resetGeoOptions();
    applyFilters();
  });

  function applyFilters() {
    const tumorVal = (tumorDd.dataset.value || '').toLowerCase();
    const interventionVal = (interventionDd.dataset.value || '').toLowerCase();
    const hasAnyFilter = allDds.some((d) => d.dataset.value);

    let visible = 0;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const item = trialItems[idx];
      if (!item) { return; }
      const show = (!tumorVal || (item.tumour || '').toLowerCase() === tumorVal)
        && (!interventionVal || (item.intervention || '').toLowerCase() === interventionVal);
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    statusEl.textContent = hasAnyFilter
      ? `Showing ${visible} of ${rows.length} trials`
      : 'Showing all trials';
    clearBtn.style.display = hasAnyFilter ? '' : 'none';
  }

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
    fetchItems('/getTrialsTableData', 'tableNctDataList'),
    fetchItems('/getRegionCountryData', 'mapModelList'),
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
