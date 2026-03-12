import { fetchGraphQL } from '../../scripts/graphql.js';

/* ------------------------------------------------------------------ */
/*  Constants & Icons                                                  */
/* ------------------------------------------------------------------ */

const ICONS = {
  chevron: '<svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  checkbox: '<span class="trials-filter-checkbox"><svg class="trials-filter-check" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>',
  close: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

let FILTER_LABELS = {};

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                  */
/* ------------------------------------------------------------------ */

const toArray = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);
const norm = (s) => (s || '').toLowerCase();
const sortedUnique = (arr) => [...new Set(arr)].sort();
const uniqueValues = (items, field) => sortedUnique(items.map((i) => i[field]?.trim()).filter(Boolean));

const el = (tag, attrs = {}, content) => {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') elem.className = v;
    else if (k === 'dataset') Object.assign(elem.dataset, v);
    else if (k.startsWith('on')) elem.addEventListener(k.slice(2).toLowerCase(), v);
    else elem.setAttribute(k, v);
  });
  if (content !== undefined) {
    if (typeof content === 'string') elem.innerHTML = content;
    else if (content instanceof Node) elem.appendChild(content);
  }
  return elem;
};

const parseJSON = (data) => {
  if (!data) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
};

/* ------------------------------------------------------------------ */
/*  Data Fetching & Parsing                                            */
/* ------------------------------------------------------------------ */

const fetchItems = async (queryPath, dataPath) => {
  const result = await fetchGraphQL(queryPath);
  return result?.data?.[dataPath]?.items ?? [];
};

const parseTrialLocations = (locations) => {
  const data = parseJSON(locations);
  return data ? toArray(data.locations || data) : [];
};

const buildRegionMap = (regionItems) => {
  const map = {};
  regionItems.forEach(({ regionName, countryStateDetails }) => {
    if (!regionName) return;
    map[regionName] = map[regionName] || {};
    const details = parseJSON(countryStateDetails);
    if (!details) return;
    toArray(details.countries || details).forEach((c) => {
      const name = typeof c === 'object' ? c.name : c;
      if (!name) return;
      map[regionName][name] = map[regionName][name] || [];
      toArray(c?.states).forEach((s) => {
        if (!map[regionName][name].includes(s)) map[regionName][name].push(s);
      });
    });
  });
  Object.values(map).forEach((countries) => {
    Object.keys(countries).forEach((c) => countries[c].sort());
  });
  return map;
};

/* ------------------------------------------------------------------ */
/*  Filter Logic                                                       */
/* ------------------------------------------------------------------ */

const countriesFor = (rm, regions) => {
  const sources = regions?.length ? regions.map((r) => rm[r] || {}) : Object.values(rm);
  return sortedUnique(sources.flatMap(Object.keys));
};

const getStatesFor = (rm, regions, countries) => {
  if (!countries?.length) return [];
  const sources = regions?.length ? regions : Object.keys(rm);
  return sortedUnique(countries.flatMap((c) => sources.flatMap((r) => rm[r]?.[c] || [])));
};

const trialMatchesLocation = (item, selRegions, selCountries, selStates, regionMap) => {
  const locs = parseTrialLocations(item.locations);
  const hasFilter = selRegions.length || selCountries.length || selStates.length;
  if (!hasFilter) return true;
  if (!locs.length) return false;

  const normR = selRegions.map(norm), normC = selCountries.map(norm), normS = selStates.map(norm);
  
  const countriesByRegion = {}, statesByCountry = {};
  Object.entries(regionMap).forEach(([r, cObj]) => {
    countriesByRegion[norm(r)] = Object.keys(cObj).map(norm);
    Object.entries(cObj).forEach(([c, sts]) => {
      statesByCountry[norm(c)] = sts.map(norm);
    });
  });

  const matchLoc = (loc) => {
    const countries = toArray(loc.countries).map((c) => norm(typeof c === 'object' ? c.name : c));
    const states = toArray(loc.states).map(norm);
    const trialStates = countries.flatMap((c) => statesByCountry[c] || []);

    if (!normR.length) {
      const cMatch = !normC.length || normC.some((c) => countries.includes(c));
      const appStates = normS.filter((s) => trialStates.includes(s));
      return cMatch && (!appStates.length || appStates.some((s) => states.includes(s)));
    }

    const region = norm(loc.region);
    if (!normR.includes(region)) return false;
    const regCountries = countriesByRegion[region] || [];
    const appC = normC.filter((c) => regCountries.includes(c));
    if (appC.length && !appC.some((c) => countries.includes(c))) return false;
    const appS = normS.filter((s) => trialStates.includes(s));
    return !appS.length || appS.some((s) => states.includes(s));
  };

  return locs.some(matchLoc);
};

/* ------------------------------------------------------------------ */
/*  Dropdown Component                                                 */
/* ------------------------------------------------------------------ */

const getSelectedValues = (w) => { try { return JSON.parse(w.dataset.values || '[]'); } catch { return []; } };

const setSelectedValues = (w, vals) => {
  vals.length ? (w.dataset.values = JSON.stringify(vals), w.classList.add('has-value')) 
              : (delete w.dataset.values, w.classList.remove('has-value'));
  w.querySelector('.trials-filter-btn-label').textContent = vals.length 
    ? `${w.dataset.label} (${vals.length})` : w.dataset.label;
};

const populateDropdown = (w, opts) => {
  const sel = getSelectedValues(w);
  w.querySelector('.trials-filter-panel').innerHTML = opts.map((o) => {
    const isSel = sel.includes(o);
    return `<li class="trials-filter-option${isSel ? ' is-selected' : ''}" role="option" aria-selected="${isSel}" data-value="${o}">${ICONS.checkbox}<span class="trials-filter-option-text">${o}</span></li>`;
  }).join('');
};

const syncPanelState = (w, sel) => {
  w.querySelectorAll('.trials-filter-option').forEach((opt) => {
    const isSel = sel.includes(opt.dataset.value);
    opt.classList.toggle('is-selected', isSel);
    opt.setAttribute('aria-selected', String(isSel));
  });
};

const resetDropdown = (w) => { delete w.dataset.values; w.classList.remove('has-value'); setSelectedValues(w, []); syncPanelState(w, []); };
const enableDropdown = (w) => { w.classList.remove('is-disabled'); w.querySelector('.trials-filter-btn').disabled = false; };
const disableDropdown = (w) => { resetDropdown(w); w.classList.add('is-disabled'); w.querySelector('.trials-filter-btn').disabled = true; populateDropdown(w, []); };

const createDropdown = (id, label, opts, variant) => {
  const wrapper = el('div', { className: `trials-filter-dropdown${variant ? ` trials-filter-dropdown--${variant}` : ''}`, dataset: { filterId: id, label } });
  wrapper.innerHTML = `<button type="button" class="trials-filter-btn" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false"><span class="trials-filter-btn-label">${label}</span><span class="trials-filter-chevron">${ICONS.chevron}</span></button><ul class="trials-filter-panel" role="listbox" aria-multiselectable="true" id="${id}-panel" aria-labelledby="${id}-btn"></ul>`;
  populateDropdown(wrapper, opts);

  const btn = wrapper.querySelector('.trials-filter-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !wrapper.classList.contains('is-open');
    document.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
    if (opening) { wrapper.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
  });

  wrapper.querySelector('.trials-filter-panel').addEventListener('click', (e) => {
    e.stopPropagation();
    const li = e.target.closest('.trials-filter-option');
    if (!li) return;
    const val = li.dataset.value, sel = getSelectedValues(wrapper), idx = sel.indexOf(val);
    idx >= 0 ? (sel.splice(idx, 1), li.classList.remove('is-selected'), li.setAttribute('aria-selected', 'false'))
             : (sel.push(val), li.classList.add('is-selected'), li.setAttribute('aria-selected', 'true'));
    setSelectedValues(wrapper, sel);
    wrapper.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  });

  return wrapper;
};

/* ------------------------------------------------------------------ */
/*  Chips & Filter Bar                                                 */
/* ------------------------------------------------------------------ */

const createChip = (filterId, value, onRemove) => {
  const chip = el('span', { className: 'trials-filter-chip', dataset: { filterId, value } },
    `<span class="trials-filter-chip-text">${value}</span><button type="button" class="trials-filter-chip-remove" aria-label="Remove ${value}">${ICONS.close}</button>`);
  chip.querySelector('.trials-filter-chip-remove').addEventListener('click', (e) => { e.stopPropagation(); onRemove(filterId, value); });
  return chip;
};

const renderChips = (container, dds, onRemove) => {
  container.innerHTML = '';
  dds.forEach((dd) => {
    const vals = getSelectedValues(dd);
    if (!vals.length) return;
    const row = el('div', { className: 'trials-filter-chips-row' });
    row.appendChild(el('span', { className: 'trials-filter-chips-label' }, FILTER_LABELS[dd.dataset.filterId] || dd.dataset.label));
    const wrap = el('div', { className: 'trials-filter-chips-wrap' });
    vals.forEach((v) => wrap.appendChild(createChip(dd.dataset.filterId, v, onRemove)));
    row.appendChild(wrap);
    container.appendChild(row);
  });
};

const buildFilterBar = (regionMap, items, labels = {}) => {
  const filterDefs = [
    ['filter-region', labels.region, Object.keys(regionMap).sort()],
    ['filter-country', labels.country, countriesFor(regionMap, null)],
    ['filter-state', labels.state, [], 'disabled'],
    ['filter-tumor', labels.tumor, uniqueValues(items, 'tumour')],
    ['filter-intervention', labels.intervention, uniqueValues(items, 'intervention')],
  ];
  filterDefs.forEach(([id, lbl]) => { FILTER_LABELS[id] = lbl || ''; });

  const bar = el('div', { className: 'trials-filter-bar' });
  const row = el('div', { className: 'trials-filter-row' });

  filterDefs.forEach(([id, lbl, opts, variant]) => {
    const dd = createDropdown(id, lbl || '', opts, variant);
    if (variant === 'disabled') { dd.classList.add('is-disabled'); dd.querySelector('.trials-filter-btn').disabled = true; }
    row.appendChild(dd);
  });

  row.insertAdjacentHTML('beforeend', `<button type="button" class="trials-filter-clear">${labels.clearAll || ''} ${ICONS.close}</button>`);
  bar.appendChild(row);
  bar.insertAdjacentHTML('beforeend', `<div class="trials-filter-status">${labels.status || ''}</div><div class="trials-filter-chips"></div>`);
  return bar;
};

/* ------------------------------------------------------------------ */
/*  Filter Wiring                                                      */
/* ------------------------------------------------------------------ */

const wireFilters = (filterBar, regionMap, tbody, items, authoredLabels = {}) => {
  const getDd = (id) => filterBar.querySelector(`[data-filter-id="${id}"]`);
  const dds = { region: getDd('filter-region'), country: getDd('filter-country'), state: getDd('filter-state'), tumor: getDd('filter-tumor'), intervention: getDd('filter-intervention') };
  const allDds = Object.values(dds);
  const chipOrder = [dds.country, dds.region, dds.state, dds.tumor, dds.intervention];
  const clearBtn = filterBar.querySelector('.trials-filter-clear');
  const statusEl = filterBar.querySelector('.trials-filter-status');
  const chipsEl = filterBar.querySelector('.trials-filter-chips');
  const initialStatus = statusEl.textContent;
  const filteredStatusTemplate = authoredLabels.filteredStatus || 'Showing [[trial_count]] trials with selected filters';

  const filterAndSync = (w, opts) => {
    const filtered = getSelectedValues(w).filter((v) => opts.includes(v));
    populateDropdown(w, opts);
    setSelectedValues(w, filtered);
    syncPanelState(w, filtered);
    return filtered;
  };

  const updateState = (regions, countries) => {
    const states = getStatesFor(regionMap, regions, countries);
    states.length ? (filterAndSync(dds.state, states), enableDropdown(dds.state)) : disableDropdown(dds.state);
  };

  const removeChip = (filterId, value) => {
    const dd = getDd(filterId);
    setSelectedValues(dd, getSelectedValues(dd).filter((v) => v !== value));
    syncPanelState(dd, getSelectedValues(dd));
    dd.dispatchEvent(new CustomEvent('filter-change', { bubbles: true }));
  };

  const updateTumourGrouping = (rows) => {
    let prev = null;
    rows.forEach((row) => {
      if (row.style.display === 'none') return;
      const curr = norm(row.dataset.tumour);
      const isNew = curr !== prev;
      row.classList.toggle('trials-table-row--group-start', isNew && prev !== null);
      prev = curr;
    });
  };

  const applyFilters = () => {
    const vals = { r: getSelectedValues(dds.region), c: getSelectedValues(dds.country), s: getSelectedValues(dds.state), 
                   t: getSelectedValues(dds.tumor).map(norm), i: getSelectedValues(dds.intervention).map(norm) };
    const hasFilter = allDds.some((d) => getSelectedValues(d).length);
    renderChips(chipsEl, chipOrder, removeChip);
    chipsEl.style.display = hasFilter ? '' : 'none';

    let visible = 0;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
      const item = items[idx];
      if (!item) return;
      const match = trialMatchesLocation(item, vals.r, vals.c, vals.s, regionMap)
        && (!vals.t.length || vals.t.includes(norm(item.tumour)))
        && (!vals.i.length || vals.i.includes(norm(item.intervention)));
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    updateTumourGrouping(rows);
    statusEl.textContent = hasFilter ? filteredStatusTemplate.replace('[[trial_count]]', visible) : initialStatus;
  };

  document.addEventListener('click', () => {
    filterBar.querySelectorAll('.trials-filter-dropdown.is-open').forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.trials-filter-btn').setAttribute('aria-expanded', 'false');
    });
  });
  filterBar.addEventListener('click', (e) => e.stopPropagation());

  dds.region.addEventListener('filter-change', () => {
    const regions = getSelectedValues(dds.region);
    const countries = filterAndSync(dds.country, countriesFor(regionMap, regions.length ? regions : null));
    updateState(regions.length ? regions : null, countries);
    applyFilters();
  });

  dds.country.addEventListener('filter-change', () => {
    updateState(getSelectedValues(dds.region).length ? getSelectedValues(dds.region) : null, getSelectedValues(dds.country));
    applyFilters();
  });

  [dds.state, dds.tumor, dds.intervention].forEach((d) => d.addEventListener('filter-change', applyFilters));

  clearBtn.addEventListener('click', () => {
    allDds.forEach(resetDropdown);
    populateDropdown(dds.country, countriesFor(regionMap, null));
    disableDropdown(dds.state);
    applyFilters();
  });

  chipsEl.style.display = 'none';
};

/* ------------------------------------------------------------------ */
/*  Table Building                                                     */
/* ------------------------------------------------------------------ */

const createNctLink = (nctId) => el('a', { className: 'trials-table-nct-link', href: `${window.location.pathname.replace(/\/$/, '')}/${nctId.toLowerCase()}` }, nctId);
const createStatusBadge = (status) => el('span', { className: 'trials-table-status-badge' }, status);

const buildRow = (item, { showTumour = true, isGroupStart = false } = {}) => {
  const row = el('tr');
  if (isGroupStart) row.classList.add('trials-table-row--group-start');

  const cells = [
    { cls: 'tumour', html: showTumour ? `<strong>${item.tumour || ''}</strong>` : '' },
    { cls: 'description', html: item.trialDescription?.html || '' },
    { cls: 'criteria', html: item.selectEligibilityCriteria?.html || '' },
  ];

  cells.forEach(({ cls, html }) => {
    row.appendChild(el('td', { className: `trials-table-cell trials-table-cell--${cls}` }, html));
  });

  const tdStatus = el('td', { className: 'trials-table-cell trials-table-cell--status' });
  tdStatus.appendChild(el('span', { className: 'trials-table-status-note' }, '(Recruitment status may vary by trial site)'));
  tdStatus.appendChild(createStatusBadge(item.status || ''));
  row.appendChild(tdStatus);

  const tdNct = el('td', { className: 'trials-table-cell trials-table-cell--nct' });
  if (item.nctId) tdNct.appendChild(createNctLink(item.nctId));
  row.appendChild(tdNct);

  return row;
};

const buildTableHead = (labels = {}) => {
  const thead = el('thead');
  const row = el('tr');
  const headers = [
    { text: labels.typeOfCancerHeading, cls: 'tumour' },
    { text: labels.trialDescriptionHeading, cls: 'description' },
    { html: labels.eligibilityCriteriaHeading, cls: 'criteria', rich: true },
    { html: labels.statusHeading, cls: 'status', rich: true },
    { text: labels.moreInformationHeading, cls: 'nct' },
  ];

  headers.forEach(({ text, html, cls, rich }) => {
    const th = el('th', { className: `trials-table-th trials-table-th--${cls}`, scope: 'col' });
    if (rich && html) {
      const div = el('div');
      div.innerHTML = html;
      const ps = div.querySelectorAll('p');
      if (ps[0]) th.appendChild(el('span', {}, ps[0].innerHTML));
      if (ps[1]) th.appendChild(el('div', { className: 'trials-table-th-subtitle' }, ps[1].innerHTML));
    } else {
      th.appendChild(el('span', {}, text || ''));
    }
    row.appendChild(th);
  });

  thead.appendChild(row);
  return thead;
};

/* ------------------------------------------------------------------ */
/*  Block Entry Point                                                  */
/* ------------------------------------------------------------------ */

const captureAuthoredLabels = (block) => {
  const keys = ['region', 'country', 'state', 'tumor', 'intervention', 'clearAll', 'status', 'filteredStatus',
    'typeOfCancerHeading', 'trialDescriptionHeading', 'eligibilityCriteriaHeading', 'statusHeading', 'moreInformationHeading'];
  const richFields = ['eligibilityCriteriaHeading', 'statusHeading'];
  const labels = {};
  [...block.children].forEach((row, i) => {
    if (!keys[i]) return;
    const cell = row.children[0];
    labels[keys[i]] = richFields.includes(keys[i]) ? cell?.innerHTML?.trim() : cell?.textContent?.trim();
  });
  return labels;
};

export default async function decorate(block) {
  const authoredLabels = captureAuthoredLabels(block);
  block.textContent = '';

  const loader = el('div', { className: 'trials-table-loader' }, 'Loading clinical trials…');
  block.appendChild(loader);

  const [items, regionItems] = await Promise.all([
    fetchItems('/getTrialsTableData', 'tableNctDataList'),
    fetchItems('/getRegionCountryData', 'mapModelList'),
  ]);

  loader.remove();

  if (!items.length) {
    block.appendChild(el('p', { className: 'trials-table-empty' }, 'No clinical trial data available at this time.'));
    return;
  }

  const regionMap = buildRegionMap(regionItems);
  block.appendChild(buildFilterBar(regionMap, items, authoredLabels));

  const wrapper = el('div', { className: 'trials-table-wrapper' });
  const table = el('table', { className: 'trials-table-grid' });
  table.appendChild(buildTableHead(authoredLabels));

  const tbody = el('tbody');
  const sortedItems = [...items].sort((a, b) => norm(a.tumour).localeCompare(norm(b.tumour)));

  let prevTumour = null;
  sortedItems.forEach((item) => {
    const curr = norm(item.tumour);
    const isNew = curr !== prevTumour;
    const row = buildRow(item, { showTumour: true, isGroupStart: isNew && prevTumour !== null });
    row.dataset.tumour = item.tumour || '';
    tbody.appendChild(row);
    prevTumour = curr;
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);
  block.appendChild(wrapper);
  wireFilters(block.querySelector('.trials-filter-bar'), regionMap, tbody, sortedItems, authoredLabels);
}
