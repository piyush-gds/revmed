import { createOptimizedPicture } from '../../scripts/aem.js';

const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const TRI_COMPLEX_ORDER = ['h1', 'h2', 'h4', 'h5'];

const TRI_COMPLEX_PRESET = {
  h1: {
    desktop: { x: (70 / 1112) * 100, y: (30 / 257) * 100 },
    mobile: { x: (350 / 1200) * 100, y: (210 / 2133) * 100 },
  },
  h2: {
    desktop: { x: (340 / 1112) * 100, y: (149 / 257) * 100 },
    mobile: { x: (590 / 1200) * 100, y: (430 / 2133) * 100 },
  },
  h4: {
    desktop: { x: (610 / 1112) * 100, y: (150 / 257) * 100 },
    mobile: { x: (590 / 1200) * 100, y: (1180 / 2133) * 100 },
  },
  h5: {
    desktop: { x: (910 / 1112) * 100, y: (195 / 257) * 100 },
    mobile: { x: (850 / 1200) * 100, y: (1900 / 2133) * 100 },
  },
};

const FIELD_KEYS = [
  'icon',
  'title',
  'image',
  'text1',
  'richtext1',
  'text2',
  'richtext2',
  'text3',
  'richtext3',
  'text4',
  'richtext4',
];

const normalizeKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const getText = (element) => element?.textContent?.trim() || '';

const getAssetValue = (cell) => {
  if (!cell) return '';
  const image = cell.querySelector('img');
  if (image?.src) return image.src;
  const anchor = cell.querySelector('a[href]');
  if (anchor?.href) return anchor.href;
  return getText(cell);
};

const createEmptyConfig = () => Object.fromEntries(FIELD_KEYS.map((key) => [key, '']));

const readConfigFromBlock = (block) => {
  const config = createEmptyConfig();

  [...block.children].forEach((row, rowIndex) => {
    const cols = [...row.children];
    if (!cols.length) return;

    if (rowIndex === 0 && cols.length >= 3) {
      config.icon = getAssetValue(cols[0]);
      config.title = getText(cols[1]);
      config.image = getAssetValue(cols[2]);
      return;
    }

    if (cols.length < 2) return;

    const key = normalizeKey(getText(cols[0]));
    if (!FIELD_KEYS.includes(key)) return;

    const valueCell = cols[1];

    if (key === 'icon' || key === 'image') {
      config[key] = getAssetValue(valueCell);
      return;
    }

    if (key.startsWith('richtext')) {
      config[key] = valueCell.innerHTML?.trim() || '';
      return;
    }

    config[key] = getText(valueCell);
  });

  return config;
};

const buildItems = (config) => {
  const authored = [
    { label: config.text1, description: config.richtext1 },
    { label: config.text2, description: config.richtext2 },
    { label: config.text3, description: config.richtext3 },
    { label: config.text4, description: config.richtext4 },
  ];

  return TRI_COMPLEX_ORDER.map((id, index) => ({
    id,
    label: authored[index].label,
    description: authored[index].description,
    desktop: TRI_COMPLEX_PRESET[id].desktop,
    mobile: TRI_COMPLEX_PRESET[id].mobile,
  })).filter((item) => item.label || item.description);
};

const setPillPositions = (layer, items) => {
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;

  items.forEach((item) => {
    const pill = layer.querySelector(`[data-tri-complex-id="${item.id}"]`);
    if (!pill) return;

    const point = isMobile ? item.mobile : item.desktop;
    pill.style.left = `${point.x}%`;
    pill.style.top = `${point.y}%`;
    pill.style.transform = 'translate(-50%, -50%)';
  });
};

const createDescriptionPanel = () => {
  const container = document.createElement('div');
  container.className = 'tri-complex-panels';

  const render = (item) => {
    container.innerHTML = '';
    if (!item || !item.description) return;

    const card = document.createElement('div');
    card.className = 'tri-complex-panel-card';
    card.innerHTML = item.description;
    container.append(card);
  };

  return { container, render };
};

const createModal = () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'tri-complex-modal';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'tri-complex-modal-close';
  close.setAttribute('aria-label', 'Close details');
  close.innerHTML = '&times;';

  const heading = document.createElement('h3');
  heading.className = 'tri-complex-modal-title';

  const body = document.createElement('div');
  body.className = 'tri-complex-modal-body';

  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = rect.top <= event.clientY
      && event.clientY <= rect.top + rect.height
      && rect.left <= event.clientX
      && event.clientX <= rect.left + rect.width;

    if (!inside) dialog.close();
  });

  dialog.append(close, heading, body);

  const render = (item) => {
    if (!item) {
      if (dialog.open) dialog.close();
      return;
    }

    heading.textContent = item.label;
    body.innerHTML = item.description || '';
    if (!dialog.open) dialog.showModal();
  };

  return { dialog, render };
};

const createPill = (item, onClick) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tri-complex-pill tri-complex-pill--${item.id}`;
  button.dataset.triComplexId = item.id;
  button.setAttribute('aria-label', `Show details for ${item.label || item.id}`);

  const label = document.createElement('span');
  label.className = 'tri-complex-pill-label';
  label.textContent = item.label || '';
  button.append(label);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick(item.id, button);
  });

  return button;
};

const setActivePill = (layer, activeId) => {
  layer.querySelectorAll('.tri-complex-pill').forEach((pill) => {
    pill.classList.toggle('is-active', pill.dataset.triComplexId === activeId);
  });
};

export default function decorate(block) {
  const config = readConfigFromBlock(block);
  const items = buildItems(config);

  if (!config.image || !items.length) {
    block.textContent = 'Tri Complex requires image + text/description fields.';
    return;
  }

  block.textContent = '';

  const shell = document.createElement('div');
  shell.className = 'tri-complex-shell';

  const header = document.createElement('div');
  header.className = 'tri-complex-header';

  if (config.icon) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'tri-complex-icon-wrap';

    const iconPicture = createOptimizedPicture(config.icon, 'Tri Complex icon', false, [{ width: '64' }]);
    iconPicture.classList.add('tri-complex-icon');

    iconWrap.append(iconPicture);
    header.append(iconWrap);
  }

  const title = document.createElement('p');
  title.className = 'tri-complex-instruction';
  title.textContent = config.title || '';
  header.append(title);

  const stage = document.createElement('div');
  stage.className = 'tri-complex-stage';

  const picture = createOptimizedPicture(config.image, config.title || 'Tri Complex', false, [{ width: '2000' }]);
  picture.classList.add('tri-complex-picture');

  const layer = document.createElement('div');
  layer.className = 'tri-complex-pills-layer';

  const { container: descriptionContainer, render: renderDescription } = createDescriptionPanel();
  const { dialog, render: renderModal } = createModal();

  let activeId = '';
  let lastTrigger = null;

  const getItemById = (id) => items.find((item) => item.id === id) || null;

  const clearSelection = () => {
    activeId = '';
    setActivePill(layer, activeId);
    renderDescription(null);
    renderModal(null);
  };

  const activate = (id, trigger) => {
    if (activeId === id) {
      clearSelection();
      return;
    }

    activeId = id;
    lastTrigger = trigger;

    const item = getItemById(id);
    setActivePill(layer, activeId);

    if (!item) {
      clearSelection();
      return;
    }

    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      renderDescription(null);
      renderModal(item);
      return;
    }

    renderModal(null);
    renderDescription(item);
  };

  items.forEach((item) => {
    const pill = createPill(item, activate);
    layer.append(pill);
  });

  stage.addEventListener('click', (event) => {
    if (event.target.closest('.tri-complex-pill')) return;
    clearSelection();
  });

  dialog.addEventListener('close', () => {
    if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
  });

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  const handleViewportChange = () => {
    setPillPositions(layer, items);

    const activeItem = getItemById(activeId);
    if (!activeItem) return;

    if (mediaQuery.matches) {
      renderDescription(null);
      renderModal(activeItem);
    } else {
      renderModal(null);
      renderDescription(activeItem);
    }
  };

  mediaQuery.addEventListener('change', handleViewportChange);

  stage.append(picture, layer);
  shell.append(header, stage, descriptionContainer, dialog);
  block.append(shell);

  setPillPositions(layer, items);

  block.addEventListener('remove', () => {
    mediaQuery.removeEventListener('change', handleViewportChange);
  });
}
