import { createOptimizedPicture } from '../../scripts/aem.js';

const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const TRI_COMPLEX_ORDER = ['h1', 'h2', 'h4', 'h5'];

const TRI_COMPLEX_PRESET = {
  h1: {
    column: 'left',
    desktop: { x: (70 / 1112) * 100, y: (30 / 257) * 100 },
    mobile: { x: (350 / 1200) * 100, y: (210 / 2133) * 100 },
  },
  h2: {
    column: 'left',
    desktop: { x: (340 / 1112) * 100, y: (149 / 257) * 100 },
    mobile: { x: (590 / 1200) * 100, y: (430 / 2133) * 100 },
  },
  h4: {
    column: 'right',
    desktop: { x: (610 / 1112) * 100, y: (150 / 257) * 100 },
    mobile: { x: (590 / 1200) * 100, y: (1180 / 2133) * 100 },
  },
  h5: {
    column: 'right',
    desktop: { x: (910 / 1112) * 100, y: (195 / 257) * 100 },
    mobile: { x: (850 / 1200) * 100, y: (1900 / 2133) * 100 },
  },
};

const CONFIG_KEYS = new Set(['icon', 'title', 'image']);

const getText = (element) => element?.textContent?.trim() || '';

const getAssetValue = (cell) => {
  if (!cell) return '';
  const image = cell.querySelector('img');
  if (image?.src) return image.src;
  const anchor = cell.querySelector('a[href]');
  if (anchor?.href) return anchor.href;
  return getText(cell);
};

const createTriComplexPill = (item, onClick) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tri-complex-pill tri-complex-pill--${item.id}`;
  button.dataset.triComplexId = item.id;
  button.setAttribute('aria-label', `Show details for ${item.title || item.id}`);

  const label = document.createElement('span');
  label.className = 'tri-complex-pill-label';
  label.textContent = item.title;
  button.append(label);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick(item.id, button);
  });

  return button;
};

const normalizeConfigKey = (text) => text.toLowerCase().replace(/[^a-z]/g, '');

const parseBlockRows = (block) => {
  const config = {
    icon: '',
    title: '',
    image: '',
  };

  const authoredRows = [];

  [...block.children].forEach((row, rowIndex) => {
    const cols = [...row.children];
    if (!cols.length) return;

    if (rowIndex === 0 && cols.length >= 3) {
      config.icon = getAssetValue(cols[0]);
      config.title = getText(cols[1]);
      config.image = getAssetValue(cols[2]);
      return;
    }

    if (cols.length === 2) {
      const key = normalizeConfigKey(getText(cols[0]));
      if (CONFIG_KEYS.has(key)) {
        if (key === 'icon') config.icon = getAssetValue(cols[1]);
        if (key === 'title') config.title = getText(cols[1]);
        if (key === 'image') config.image = getAssetValue(cols[1]);
        return;
      }

      authoredRows.push({
        title: getText(cols[0]) || '',
        description: cols[1].innerHTML?.trim() || '',
      });
      return;
    }

    if (cols.length >= 3) {
      authoredRows.push({
        title: getText(cols[1]) || '',
      description: cols[2].innerHTML?.trim() || '',
      });
    }
  });

  const triComplexItems = TRI_COMPLEX_ORDER
    .map((id, index) => {
      const authored = authoredRows[index];
      if (!authored?.description) return null;

      const preset = TRI_COMPLEX_PRESET[id];
      return {
        id,
        title: authored.title || '',
        description: authored.description,
        column: preset.column,
        desktop: preset.desktop,
        mobile: preset.mobile,
      };
    })
    .filter(Boolean);

  return { config, triComplexItems };
};

const setPillPositions = (container, triComplexItems) => {
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  triComplexItems.forEach((item) => {
    const pill = container.querySelector(`.tri-complex-pill[data-tri-complex-id="${item.id}"]`);
    if (!pill) return;

    const position = isMobile ? item.mobile : item.desktop;
    pill.style.left = `${position.x}%`;
    pill.style.top = `${position.y}%`;
    pill.style.transform = 'translate(-50%, -50%)';
  });
};

const setActivePill = (container, activeTriComplexId) => {
  container.querySelectorAll('.tri-complex-pill').forEach((pill) => {
    const isActive = pill.dataset.triComplexId === activeTriComplexId;
    pill.classList.toggle('is-active', isActive);
  });
};

const getTriComplexItemById = (triComplexItems, id) => triComplexItems.find((item) => item.id === id) || null;

const renderDesktopPanels = (panelsContainer, item) => {
  const leftColumn = panelsContainer.querySelector('.tri-complex-panel-left');
  const rightColumn = panelsContainer.querySelector('.tri-complex-panel-right');

  leftColumn.innerHTML = '';
  rightColumn.innerHTML = '';

  if (!item) return;

  const panel = document.createElement('div');
  panel.className = 'tri-complex-panel-card';
  panel.innerHTML = item.description;

  if (item.column === 'left') {
    leftColumn.append(panel);
  } else if (item.column === 'right') {
    rightColumn.append(panel);
  }
};

const createModal = () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'tri-complex-modal';

  const closeButton = document.createElement('button');
  closeButton.className = 'tri-complex-modal-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close modal');
  closeButton.innerHTML = '&times;';

  const title = document.createElement('h3');
  title.className = 'tri-complex-modal-title';

  const body = document.createElement('div');
  body.className = 'tri-complex-modal-body';

  closeButton.addEventListener('click', () => dialog.close());

  dialog.append(closeButton, title, body);

  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = rect.top <= event.clientY
      && event.clientY <= rect.top + rect.height
      && rect.left <= event.clientX
      && event.clientX <= rect.left + rect.width;

    if (!isInDialog) dialog.close();
  });

  return { dialog, title, body };
};

export default function decorate(block) {
  const { config, triComplexItems } = parseBlockRows(block);

  if (!triComplexItems.length) {
    block.textContent = 'No Tri Complex content found. Add item rows (h1, h2, h4, h5) with description content.';
    return;
  }

  block.textContent = '';

  const root = document.createElement('div');
  root.className = 'tri-complex-shell';

  const header = document.createElement('div');
  header.className = 'tri-complex-header';

  if (config.icon) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'tri-complex-icon-wrap';
    const icon = createOptimizedPicture(config.icon, 'Tri Complex Icon', false, [{ width: '64' }]);
    icon.classList.add('tri-complex-icon');
    iconWrap.append(icon);
    header.append(iconWrap);
  }

  const title = document.createElement('p');
  title.className = 'tri-complex-instruction';
  title.textContent = config.title;
  header.append(title);

  const stage = document.createElement('div');
  stage.className = 'tri-complex-stage';

  const image = document.createElement('img');
  image.src = config.image;
  image.alt = config.title || '';

  const optimizedPicture = createOptimizedPicture(image.src, image.alt, false, [{ width: '2000' }]);
  optimizedPicture.classList.add('tri-complex-picture');

  const pillsLayer = document.createElement('div');
  pillsLayer.className = 'tri-complex-pills-layer';

  const panels = document.createElement('div');
  panels.className = 'tri-complex-panels';
  panels.innerHTML = `
    <div class="tri-complex-panel-column tri-complex-panel-left"></div>
    <div class="tri-complex-panel-column tri-complex-panel-right"></div>
  `;

  const { dialog, title: modalTitle, body: modalBody } = createModal();
  let lastTrigger = null;
  let activeTriComplexId = '';

  const updateImageByViewport = () => {
    const pictureImg = optimizedPicture.querySelector('img');
    if (!pictureImg) return;
    pictureImg.src = config.image;
  };

  const clearActive = () => {
    activeTriComplexId = '';
    setActivePill(pillsLayer, activeTriComplexId);
    renderDesktopPanels(panels, null);
    if (dialog.open) dialog.close();
  };

  const openMobileModal = (item) => {
    modalTitle.textContent = item.title;
    modalBody.innerHTML = item.description;
    if (!dialog.open) dialog.showModal();
  };

  const handleTriComplexActivate = (triComplexId, trigger) => {
    if (activeTriComplexId === triComplexId) {
      clearActive();
      return;
    }

    activeTriComplexId = triComplexId;
    lastTrigger = trigger;

    const item = getTriComplexItemById(triComplexItems, activeTriComplexId);
    if (!item) return;

    setActivePill(pillsLayer, activeTriComplexId);

    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      openMobileModal(item);
      return;
    }

    renderDesktopPanels(panels, item);
  };

  const pills = triComplexItems.map((item) => createTriComplexPill(item, handleTriComplexActivate));
  pills.forEach((pill) => pillsLayer.append(pill));

  stage.addEventListener('click', (event) => {
    if (event.target.closest('.tri-complex-pill')) return;
    clearActive();
  });

  dialog.addEventListener('close', () => {
    if (lastTrigger instanceof HTMLElement) {
      lastTrigger.focus();
    }
  });

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  const handleViewportChange = () => {
    updateImageByViewport();
    setPillPositions(pillsLayer, triComplexItems);

    if (!mediaQuery.matches && dialog.open) {
      dialog.close();
    }

    const activeItem = getTriComplexItemById(triComplexItems, activeTriComplexId);
    if (!mediaQuery.matches) {
      renderDesktopPanels(panels, activeItem);
    } else {
      renderDesktopPanels(panels, null);
    }
  };

  mediaQuery.addEventListener('change', handleViewportChange);

  stage.append(optimizedPicture, pillsLayer);
  root.append(header, stage, panels, dialog);
  block.append(root);

  setPillPositions(pillsLayer, triComplexItems);

  block.addEventListener('remove', () => {
    mediaQuery.removeEventListener('change', handleViewportChange);
  });
}
