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
 * Normalize value to array (handles string, array, null/undefined).
 */
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse a trial's locations field.
 * Handles: { locations: [...] } or string JSON.
 */
function parseTrialLocations(locations) {
  if (!locations) return [];
  let data = locations;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return []; }
  }
  // Handle nested { locations: [...] } or direct array
  return toArray(data.locations || data);
}

/**
 * Build region map from region fragment data.
 * Returns { regionName -> { countryName -> [states] } }.
 */
function buildRegionMap(regionItems) {
  const map = {};
  regionItems.forEach(({ regionName, countryStateDetails }) => {
    if (!regionName) return;
    if (!map[regionName]) map[regionName] = {};

    // Parse countryStateDetails if it's a string (JSON scalar from GraphQL)
    let details = countryStateDetails;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch { return; }
    }
    if (!details) return;

    // Handle structure: { countries: [...] } or direct array [...]
    const countries = toArray(details.countries || details);
    countries.forEach((c) => {
      const name = typeof c === 'object' ? c.name : c;
      if (!name) return;
      if (!map[regionName][name]) map[regionName][name] = [];
      const states = toArray(typeof c === 'object' ? c.states : null);
      states.forEach((s) => {
        if (!map[regionName][name].includes(s)) map[regionName][name].push(s);
      });
    });
  });
  // Sort states
  Object.values(map).forEach((countries) => {
    Object.keys(countries).forEach((c) => countries[c].sort());
  });
  return map;
}

/**
 * Check if a trial matches selected region/country/state filters.
 * When regions are selected: country/state filters are scoped to those regions.
 * When no region is selected: country/state filters apply globally.
 */
function trialMatchesLocation(item, selectedRegions, selectedCountries, selectedStates, regionMap) {
  const locs = parseTrialLocations(item.locations);

  // If no location filter is selected, show all trials
  const hasLocationFilter = selectedRegions.length || selectedCountries.length || selectedStates.length;
  if (!hasLocationFilter) return true;

  // If location filter is selected but trial has no locations, don't show
  if (!locs.length) return false;

  // Normalize for case-insensitive comparison
  const normRegions = selectedRegions.map((r) => r.toLowerCase());
  const normCountries = selectedCountries.map((c) => c.toLowerCase());
  const normStates = selectedStates.map((s) => s.toLowerCase());

  // Build lookup: which countries belong to which region (lowercase)
  const countriesByRegion = {};
  Object.entries(regionMap).forEach(([region, countryObj]) => {
    countriesByRegion[region.toLowerCase()] = Object.keys(countryObj).map((c) => c.toLowerCase());
  });

  // Build lookup: which states belong to which country (lowercase)
  const statesByCountry = {};
  Object.values(regionMap).forEach((countryObj) => {
    Object.entries(countryObj).forEach(([country, states]) => {
      statesByCountry[country.toLowerCase()] = states.map((s) => s.toLowerCase());
    });
  });

  // Case 1: No region selected - apply country/state filters globally
  if (!normRegions.length) {
    return locs.some((loc) => {
      const countries = toArray(loc.countries).map((c) => (typeof c === 'object' ? c.name : c).toLowerCase());
      const states = toArray(loc.states).map((s) => s.toLowerCase());

      const countryMatch = !normCountries.length || normCountries.some((c) => countries.includes(c));
      if (!countryMatch) return false;

      // State filter: only apply if selected states are valid for trial's countries
      const trialCountryStates = countries.flatMap((c) => statesByCountry[c] || []);
      const applicableStates = normStates.filter((s) => trialCountryStates.includes(s));
      const stateMatch = applicableStates.length === 0 || applicableStates.some((s) => states.includes(s));

      return stateMatch;
    });
  }

  // Case 2: Regions selected - scope country/state filters to selected regions
  return locs.some((loc) => {
    const region = (loc.region || '').toLowerCase();
    const countries = toArray(loc.countries).map((c) => (typeof c === 'object' ? c.name : c).toLowerCase());
    const states = toArray(loc.states).map((s) => s.toLowerCase());

    // Region must match
    if (!normRegions.includes(region)) return false;

    // Country filter: only apply if selected countries overlap with this region's countries
    const regionCountries = countriesByRegion[region] || [];
    const applicableCountries = normCountries.filter((c) => regionCountries.includes(c));
    const countryMatch = applicableCountries.length === 0 || applicableCountries.some((c) => countries.includes(c));
    if (!countryMatch) return false;

    // State filter: only apply if selected states overlap with this trial's countries' states
    const trialCountryStates = countries.flatMap((c) => statesByCountry[c] || []);
    const applicableStates = normStates.filter((s) => trialCountryStates.includes(s));
    const stateMatch = applicableStates.length === 0 || applicableStates.some((s) => states.includes(s));

    return stateMatch;
  });
}

/** Sorted unique string values of a field across items. */
const uniqueValues = (items, field) => [
  ...new Set(items.map((i) => i[field]?.trim()).filter(Boolean)),
].sort();

/** Countries for a specific region or all regions. */
const countriesFor = (rm, regions) => {
  const sources = regions?.length ? regions.map((r) => rm[r] || {}) : Object.values(rm);
  return [...new Set(sources.flatMap(Object.keys))].sort();
};

/** States for selected countries within optional region constraint. */
function getStatesFor(rm, regions, countries) {
  if (!countries?.length) return [];
  return [...new Set(countries.flatMap((c) => {
    const sources = regions?.length ? regions : Object.keys(rm);
    return sources.flatMap((r) => rm[r]?.[c] || []);
  }))].sort();
}

const ICONS = {
  chevron: `<svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  checkbox: `<span class="trials-filter-checkbox"><svg class="trials-filter-check" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
  close: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

/** Build option <li> elements into a panel (multi-select with checkboxes). */
function populateDropdown(wrapper, options) {
  const panel = wrapper.querySelector('.trials-filter-panel');
  const selected = getSelectedValues(wrapper);
  panel.innerHTML = options.map((o) => {
    const isSelected = selected.includes(o);
    return `<li class="trials-filter-option${isSelected ? ' is-selected' : ''}" role="option" aria-selected="${isSelected}" data-value="${o}">
      ${ICONS.checkbox}<span class="trials-filter-option-text">${o}</span>
    </li>`;
  }).join('');
}

/** Sync panel checkbox visual state with selected values. */
function syncPanelState(wrapper, selected) {
  wrapper.querySelectorAll('.trials-filter-option').forEach((opt) => {
    const isSelected = selected.includes(opt.dataset.value);
    opt.classList.toggle('is-selected', isSelected);
    opt.setAttribute('aria-selected', String(isSelected));
  });
}

/** Get array of selected values from a dropdown. */
function getSelectedValues(wrapper) {
  try { return JSON.parse(wrapper.dataset.values || '[]'); } catch { return []; }
}

/** Set selected values for a dropdown. */
function setSelectedValues(wrapper, values) {
  if (values.length > 0) {
    wrapper.dataset.values = JSON.stringify(values);
    wrapper.classList.add('has-value');
  } else {
    delete wrapper.dataset.values;
    wrapper.classList.remove('has-value');
  }
  updateDropdownLabel(wrapper);
}

/** Update the dropdown button label to show count. */
function updateDropdownLabel(wrapper) {
  const label = wrapper.dataset.label;
  const values = getSelectedValues(wrapper);
  const btnLabel = wrapper.querySelector('.trials-filter-btn-label');
  btnLabel.textContent = values.length > 0 ? `${label} (${values.length})` : label;
}

/** Enable a dropdown. */
function enableDropdown(wrapper) {
  wrapper.classList.remove('is-disabled');
  wrapper.querySelector('.trials-filter-btn').disabled = false;
}

/** Disable a dropdown and reset it. */
function disableDropdown(wrapper) {
  resetDropdown(wrapper);
  wrapper.classList.add('is-disabled');
  wrapper.querySelector('.trials-filter-btn').disabled = true;
  populateDropdown(wrapper, []);
}

/** Create a custom multi-select dropdown (pill button + flyout list). */
function createDropdown(id, label, options, variant) {
  const wrapper = document.createElement('div');
  wrapper.className = `trials-filter-dropdown${variant ? ` trials-filter-dropdown--${variant}` : ''}`;
  Object.assign(wrapper.dataset, { filterId: id, label });

  wrapper.innerHTML = `
    <button type="button" class="trials-filter-btn" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false">
      <span class="trials-filter-btn-label">${label}</span>
      <span class="trials-filter-chevron">${ICONS.chevron}</span>
    </button>
    <ul class="trials-filter-panel" role="listbox" aria-multiselectable="true" id="${id}-panel" aria-labelledby="${id}-btn"></ul>`;

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

  // Multi-select option toggle (delegated)
  wrapper.querySelector('.trials-filter-panel').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent closing dropdown when clicking inside panel
    const li = e.target.closest('.trials-filter-option');
    if (!li) return;

    const value = li.dataset.value;
    const selected = getSelectedValues(wrapper);
    const idx = selected.indexOf(value);

    if (idx >= 0) {
      selected.splice(idx, 1);
      li.classList.remove('is-selected');
      li.setAttribute('aria-selected', 'false');
    } else {
      selected.push(value);
      li.classList.add('is-selected');
      li.setAttribute('aria-selected', 'true');
    }

    setSelectedValues(wrapper, selected);
    wrapper.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  });

  return wrapper;
}

/**
 * Reset a custom dropdown to its default label (multi-select).
 */
function resetDropdown(wrapper) {
  delete wrapper.dataset.values;
  wrapper.classList.remove('has-value');
  updateDropdownLabel(wrapper);
  syncPanelState(wrapper, []);
}

/** Create a removable chip for a selected filter. */
function createChip(filterId, value, onRemove) {
  const chip = document.createElement('span');
  chip.className = 'trials-filter-chip';
  chip.dataset.filterId = filterId;
  chip.dataset.value = value;
  chip.innerHTML = `<span class="trials-filter-chip-text">${value}</span><button type="button" class="trials-filter-chip-remove" aria-label="Remove ${value}">${ICONS.close}</button>`;
  chip.querySelector('.trials-filter-chip-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    onRemove(filterId, value);
  });
  return chip;
}

/** Filter ID to display label mapping (populated from authored content). */
let FILTER_LABELS = {
  'filter-region': '',
  'filter-country': '',
  'filter-state': '',
  'filter-tumor': '',
  'filter-intervention': '',
};

/** Render all selected filter chips into a container, grouped by filter. */
function renderChips(container, allDds, onRemove) {
  container.innerHTML = '';
  allDds.forEach((dd) => {
    const filterId = dd.dataset.filterId;
    const values = getSelectedValues(dd);
    if (values.length === 0) return;
    const row = document.createElement('div');
    row.className = 'trials-filter-chips-row';
    const label = document.createElement('span');
    label.className = 'trials-filter-chips-label';
    label.textContent = FILTER_LABELS[filterId] || dd.dataset.label;
    row.appendChild(label);
    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'trials-filter-chips-wrap';
    values.forEach((v) => chipsWrap.appendChild(createChip(filterId, v, onRemove)));
    row.appendChild(chipsWrap);
    container.appendChild(row);
  });
}

/** Build the filter bar with all five dropdowns + Clear All + status. */
function buildFilterBar(regionMap, trialItems, labels = {}) {
  const bar = document.createElement('div');
  bar.className = 'trials-filter-bar';

  const row = document.createElement('div');
  row.className = 'trials-filter-row';

  // Use authored labels (no fallback)
  const regionLabel = labels.region || '';
  const countryLabel = labels.country || '';
  const stateLabel = labels.state || '';
  const tumorLabel = labels.tumor || '';
  const interventionLabel = labels.intervention || '';
  const clearAllText = labels.clearAll || '';
  const statusText = labels.status || '';

  // Update FILTER_LABELS with authored values
  FILTER_LABELS['filter-region'] = regionLabel;
  FILTER_LABELS['filter-country'] = countryLabel;
  FILTER_LABELS['filter-state'] = stateLabel;
  FILTER_LABELS['filter-tumor'] = tumorLabel;
  FILTER_LABELS['filter-intervention'] = interventionLabel;

  // State starts disabled with no options
  [
    ['filter-region', regionLabel, Object.keys(regionMap).sort()],
    ['filter-country', countryLabel, countriesFor(regionMap, null)],
    ['filter-state', stateLabel, [], 'disabled'],
    ['filter-tumor', tumorLabel, uniqueValues(trialItems, 'tumour')],
    ['filter-intervention', interventionLabel, uniqueValues(trialItems, 'intervention')],
  ].forEach(([id, label, opts, variant]) => {
    const dd = createDropdown(id, label, opts, variant);
    if (variant === 'disabled') {
      dd.classList.add('is-disabled');
      dd.querySelector('.trials-filter-btn').disabled = true;
    }
    row.appendChild(dd);
  });

  row.insertAdjacentHTML('beforeend', `<button type="button" class="trials-filter-clear">${clearAllText} ${ICONS.close}</button>`);
  bar.appendChild(row);
  bar.insertAdjacentHTML('beforeend', `<div class="trials-filter-status">${statusText}</div>`);
  bar.insertAdjacentHTML('beforeend', '<div class="trials-filter-chips"></div>');
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
  // Order for chip display: Country first (matches legacy site)
  const chipOrderDds = [countryDd, regionDd, stateDd, tumorDd, interventionDd];
  const clearBtn = filterBar.querySelector('.trials-filter-clear');
  const statusEl = filterBar.querySelector('.trials-filter-status');
  const chipsContainer = filterBar.querySelector('.trials-filter-chips');

  // Store initial status text (authored)
  const initialStatusText = statusEl.textContent;

  /** Filter values to valid options and sync UI. */
  function filterAndSync(wrapper, validOptions) {
    const current = getSelectedValues(wrapper);
    const filtered = current.filter((v) => validOptions.includes(v));
    populateDropdown(wrapper, validOptions);
    setSelectedValues(wrapper, filtered);
    syncPanelState(wrapper, filtered);
    return filtered;
  }

  /** Update state dropdown based on current selections. */
  function updateStateDropdown(regions, countries) {
    const states = getStatesFor(regionMap, regions, countries);
    if (states.length) {
      filterAndSync(stateDd, states);
      enableDropdown(stateDd);
    } else {
      disableDropdown(stateDd);
    }
  }

  /** Remove a single value from a dropdown and refresh. */
  function removeChip(filterId, value) {
    const dropdown = dd(filterId);
    const selected = getSelectedValues(dropdown).filter((v) => v !== value);
    setSelectedValues(dropdown, selected);
    syncPanelState(dropdown, selected);
    dropdown.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  }

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    filterBar.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
  });
  filterBar.addEventListener('click', (e) => e.stopPropagation());

  // Cascading: Region → Country → State
  regionDd.addEventListener('filter-change', () => {
    const regions = getSelectedValues(regionDd);
    const validCountries = countriesFor(regionMap, regions.length ? regions : null);
    const filteredCountries = filterAndSync(countryDd, validCountries);
    updateStateDropdown(regions.length ? regions : null, filteredCountries);
    applyFilters();
  });

  countryDd.addEventListener('filter-change', () => {
    const regions = getSelectedValues(regionDd);
    const countries = getSelectedValues(countryDd);
    updateStateDropdown(regions.length ? regions : null, countries);
    applyFilters();
  });

  [stateDd, tumorDd, interventionDd].forEach((d) => d.addEventListener('filter-change', applyFilters));

  // Clear All
  clearBtn.addEventListener('click', () => {
    allDds.forEach(resetDropdown);
    populateDropdown(countryDd, countriesFor(regionMap, null));
    disableDropdown(stateDd);
    applyFilters();
  });

  function applyFilters() {
    const regionVals = getSelectedValues(regionDd);
    const countryVals = getSelectedValues(countryDd);
    const stateVals = getSelectedValues(stateDd);
    const tumorVals = getSelectedValues(tumorDd).map((v) => v.toLowerCase());
    const interventionVals = getSelectedValues(interventionDd).map((v) => v.toLowerCase());
    const hasAnyFilter = allDds.some((d) => getSelectedValues(d).length > 0);

    // Render chips (Country first, matches legacy site)
    renderChips(chipsContainer, chipOrderDds, removeChip);
    chipsContainer.style.display = hasAnyFilter ? '' : 'none';

    let visible = 0;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const item = trialItems[idx];
      if (!item) { return; }

      // Location filter (handles empty filter case internally)
      const locationMatch = trialMatchesLocation(item, regionVals, countryVals, stateVals, regionMap);

      // Other filters
      const tumorMatch = tumorVals.length === 0 || tumorVals.includes((item.tumour || '').toLowerCase());
      const interventionMatch = interventionVals.length === 0 || interventionVals.includes((item.intervention || '').toLowerCase());

      const show = locationMatch && tumorMatch && interventionMatch;
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    // Update tumour text visibility based on visible rows
    updateTumourGrouping(rows);

    statusEl.textContent = hasAnyFilter
      ? `Showing ${visible} trials with selected filters`
      : initialStatusText;
  }

  /**
   * Update tumour text and group borders based on visible rows.
   * Only show tumour text on first visible row of each group.
   * @param {NodeListOf<HTMLTableRowElement>} rows
   */
  function updateTumourGrouping(rows) {
    let previousVisibleTumour = null;
    rows.forEach((row) => {
      if (row.style.display === 'none') return;

      const currentTumour = (row.dataset.tumour || '').toLowerCase();
      const tumourCell = row.querySelector('.trials-table-cell--tumour');
      const isNewGroup = currentTumour !== previousVisibleTumour;

      // Show/hide tumour text
      if (tumourCell) {
        if (isNewGroup) {
          tumourCell.innerHTML = `<strong>${row.dataset.tumour || ''}</strong>`;
        } else {
          tumourCell.innerHTML = '';
        }
      }

      // Toggle group start border
      if (isNewGroup && previousVisibleTumour !== null) {
        row.classList.add('trials-table-row--group-start');
      } else {
        row.classList.remove('trials-table-row--group-start');
      }

      previousVisibleTumour = currentTumour;
    });
  }

  chipsContainer.style.display = 'none';
}

/**
 * Build the NCT link pointing to the clinical trial detail page.
 * @param {string} nctId
 * @returns {HTMLAnchorElement}
 */
function createNctLink(nctId) {
  const link = document.createElement('a');
  // Use current page path as base
  const currentPath = window.location.pathname.replace(/\/$/, '');
  link.href = `${currentPath}/${nctId.toLowerCase()}`;
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
 * @param {Object} options - Row options
 * @param {boolean} options.showTumour - Whether to show tumour text (for grouping)
 * @param {boolean} options.isGroupStart - Whether this is the first row of a new group
 * @returns {HTMLTableRowElement}
 */
function buildRow(item, options = {}) {
  const { showTumour = true, isGroupStart = false } = options;
  const row = document.createElement('tr');

  // Add group start class for border-top styling
  if (isGroupStart) {
    row.classList.add('trials-table-row--group-start');
  }

  // Type of Cancer (only show text if showTumour is true)
  const tdTumour = document.createElement('td');
  tdTumour.className = 'trials-table-cell trials-table-cell--tumour';
  if (showTumour) {
    tdTumour.innerHTML = `<strong>${item.tumour || ''}</strong>`;
  }
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

  // Add status note for mobile view
  const statusNote = document.createElement('span');
  statusNote.className = 'trials-table-status-note';
  statusNote.textContent = '(Recruitment status may vary by trial site)';
  tdStatus.appendChild(statusNote);

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
 * @param {Object} labels - Authored labels for table headings
 * @returns {HTMLTableSectionElement}
 */
function buildTableHead(labels = {}) {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');

  const headers = [
    { text: labels.typeOfCancerHeading || '', className: 'trials-table-th--tumour' },
    { text: labels.trialDescriptionHeading || '', className: 'trials-table-th--description' },
    {
      html: labels.eligibilityCriteriaHeading || '',
      className: 'trials-table-th--criteria',
      isRichText: true,
    },
    {
      html: labels.statusHeading || '',
      className: 'trials-table-th--status',
      isRichText: true,
    },
    { text: labels.moreInformationHeading || '', className: 'trials-table-th--nct' },
  ];

  headers.forEach(({ text, html, className, superscript, isRichText }) => {
    const th = document.createElement('th');
    th.className = `trials-table-th ${className}`;
    th.scope = 'col';

    if (isRichText && html) {
      // Parse rich text: First <p> = heading, Second <p> = subtitle (may contain <sup>)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const paragraphs = tempDiv.querySelectorAll('p');

      if (paragraphs.length >= 1) {
        // First <p> is the heading
        const span = document.createElement('span');
        span.innerHTML = paragraphs[0].innerHTML;
        th.appendChild(span);
      }

      if (paragraphs.length >= 2) {
        // Second <p> is the subtitle (preserves <sup> inside)
        const sub = document.createElement('div');
        sub.className = 'trials-table-th-subtitle';
        sub.innerHTML = paragraphs[1].innerHTML;
        th.appendChild(sub);
      }
    } else {
      const span = document.createElement('span');
      span.textContent = text;
      if (superscript) {
        const sup = document.createElement('sup');
        sup.textContent = superscript;
        span.appendChild(sup);
      }
      th.appendChild(span);
    }

    row.appendChild(th);
  });

  thead.appendChild(row);
  return thead;
}

/**
 * Capture authored labels from block content.
 * Each row contains a single field value in order:
 * Row 0-6: Filter labels (region, country, state, tumor, intervention, clearAll, status)
 * Row 7-11: Table headings (typeOfCancerHeading, trialDescriptionHeading, eligibilityCriteriaHeading, statusHeading, moreInformationHeading)
 * @param {HTMLElement} block
 * @returns {Object} labels object
 */
function captureAuthoredLabels(block) {
  const labels = {};
  const rows = [...block.children];
  const labelKeys = [
    'region', 'country', 'state', 'tumor', 'intervention', 'clearAll', 'status',
    'typeOfCancerHeading', 'trialDescriptionHeading', 'eligibilityCriteriaHeading',
    'statusHeading', 'moreInformationHeading',
  ];

  // Fields that should capture HTML content (rich text)
  const richTextFields = ['eligibilityCriteriaHeading', 'statusHeading'];

  rows.forEach((row, index) => {
    if (labelKeys[index]) {
      const cell = row.children[0];
      if (richTextFields.includes(labelKeys[index])) {
        // Get HTML content for rich text fields
        const html = cell?.innerHTML?.trim();
        if (html) {
          labels[labelKeys[index]] = html;
        }
      } else {
        // Get text content for plain text fields
        const text = cell?.textContent?.trim();
        if (text) {
          labels[labelKeys[index]] = text;
        }
      }
    }
  });

  return labels;
}

/**
 * Main block decoration function — called automatically by EDS.
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  // Capture authored labels before clearing content
  const authoredLabels = captureAuthoredLabels(block);

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

  // Build region map from region fragment data (for dropdown options)
  const regionMap = buildRegionMap(regionItems);

  // Build & insert filter bar with authored labels
  const filterBar = buildFilterBar(regionMap, items, authoredLabels);
  block.appendChild(filterBar);

  // Build table
  const wrapper = document.createElement('div');
  wrapper.className = 'trials-table-wrapper';

  const table = document.createElement('table');
  table.className = 'trials-table-grid';

  table.appendChild(buildTableHead(authoredLabels));

  const tbody = document.createElement('tbody');

  // Sort items by tumour type to group them together
  const sortedItems = [...items].sort((a, b) => {
    const tumourA = (a.tumour || '').toLowerCase();
    const tumourB = (b.tumour || '').toLowerCase();
    return tumourA.localeCompare(tumourB);
  });

  // Build rows with grouping - only show tumour text on first row of each group
  let previousTumour = null;
  sortedItems.forEach((item) => {
    const currentTumour = (item.tumour || '').toLowerCase();
    const isNewGroup = currentTumour !== previousTumour;
    const row = buildRow(item, {
      showTumour: isNewGroup,
      isGroupStart: isNewGroup && previousTumour !== null,
    });
    // Store tumour value on row for filtering purposes
    row.dataset.tumour = item.tumour || '';
    tbody.appendChild(row);
    previousTumour = currentTumour;
  });
  table.appendChild(tbody);

  wrapper.appendChild(table);
  block.appendChild(wrapper);

  // Wire filter interactions (pass sortedItems to match row order)
  wireFilters(filterBar, regionMap, tbody, sortedItems);
}
