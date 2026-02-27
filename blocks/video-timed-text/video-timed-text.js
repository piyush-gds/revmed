const CONFIG_KEYS = {
  videourl: 'videoUrl',
  poster: 'poster',
  posteralt: 'posterAlt',
  buttontext: 'buttonText',
  disclaimertext: 'disclaimerText',
  timedentries: 'timedEntries',
};

const RICHTEXT_FIELDS = new Set(['buttonText', 'disclaimerText']);

const getText = (el) => el?.textContent?.trim() || '';
const getRichText = (el) => el?.innerHTML?.trim() || '';
const normalizeKey = (val) => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getAssetValue = (cell) => {
  if (!cell) return '';
  const pic = cell.querySelector('picture source[srcset], picture img');
  if (pic) return pic.srcset || pic.src;
  const img = cell.querySelector('img');
  if (img?.src) return img.src;
  const anchor = cell.querySelector('a[href]');
  if (anchor?.href) return anchor.href;
  return getText(cell);
};

const parseTimeValue = (val) => {
  const n = Number.parseFloat(String(val || '').trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const parseTimedEntries = (cell) => {
  if (!cell) return [];

  const blockEls = cell.querySelectorAll('p, li, div');
  const lines = blockEls.length
    ? [...blockEls].map((el) => el.textContent.trim()).filter(Boolean)
    : (cell.textContent || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const entries = [];
  lines.forEach((line) => {
    const idx = line.indexOf('|');
    if (idx === -1) return;
    const time = parseTimeValue(line.slice(0, idx));
    const text = line.slice(idx + 1).trim();
    if (time !== null && text) entries.push({ time, text });
  });

  return entries.sort((a, b) => a.time - b.time);
};

const looksLikeTimedEntries = (cell) => {
  const paraEls = cell.querySelectorAll('p, li');
  const elLines = paraEls.length
    ? [...paraEls].map((p) => p.textContent.trim())
    : (cell.textContent || '').split(/\r?\n/).map((l) => l.trim());
  const pipeLines = elLines.filter((l) => /^\s*[\d.]+\s*\|/.test(l));
  return pipeLines.length >= 2;
};

const parseRows = (block) => {
  const rows = [...block.children]
    .map((row) => [...row.children])
    .filter((cols) => cols.length);

  const config = {
    videoUrl: '',
    poster: '',
    posterAlt: '',
    buttonText: '',
    disclaimerText: '',
  };
  let timedData = [];

  if (!rows.length) return { config, timedData };

  const isKeyValue = rows.some(
    (cells) => cells.length >= 2 && CONFIG_KEYS[normalizeKey(getText(cells[0]))],
  );

  if (isKeyValue) {
    let timedEntriesCell = null;

    rows.forEach((cells) => {
      if (cells.length < 2) return;
      const key = CONFIG_KEYS[normalizeKey(getText(cells[0]))];
      if (!key) return;

      if (key === 'timedEntries') {
        timedEntriesCell = cells[1];
      } else if (RICHTEXT_FIELDS.has(key)) {
        config[key] = getRichText(cells[1]);
      } else if (key === 'videoUrl' || key === 'poster') {
        config[key] = getAssetValue(cells[1]);
      } else {
        config[key] = getText(cells[1]);
      }
    });

    timedData = parseTimedEntries(timedEntriesCell);
    return { config, timedData };
  }

  const richtextCells = [];

  rows.forEach((cells) => {
    const cell = cells[0];
    if (!cell || !cell.innerHTML?.trim()) return;

    if (cell.querySelector('picture') || cell.querySelector('img')) {
      if (!config.poster) {
        const imgEl = cell.querySelector('img');
        config.poster = imgEl?.src || '';
        config.posterAlt = imgEl?.alt || '';
      }
      return;
    }

    const anchor = cell.querySelector('a[href]');
    if (anchor && !config.videoUrl) {
      const cellText = getText(cell);
      const anchorText = anchor.textContent.trim();
      const href = anchor.href || '';
      if (cellText === anchorText || /\.(mp4|webm|ogg|mov|m3u8)([?#]|$)/i.test(href)) {
        config.videoUrl = href;
        return;
      }
    }

    if (looksLikeTimedEntries(cell)) {
      if (timedData.length === 0) {
        timedData = parseTimedEntries(cell);
      }
      return;
    }

    richtextCells.push(cell);
  });

  if (richtextCells.length >= 1) config.buttonText = getRichText(richtextCells[0]);
  if (richtextCells.length >= 2) config.disclaimerText = getRichText(richtextCells[1]);

  return { config, timedData };
};

const createListItem = (point) => {
  const li = document.createElement('li');
  li.className = 'video-timed-text__item';
  li.dataset.time = point.time;
  li.textContent = point.text;
  requestAnimationFrame(() => li.classList.add('is-visible'));
  return li;
};

const toPhrasingHTML = (html) => {
  if (!html) return '';
  let result = html.replace(/<\/p>\s*<p[^>]*>/gi, '<br>');
  result = result.replace(/<\/?p[^>]*>/gi, '');
  return result.trim();
};

export default function decorate(block) {
  const { config, timedData } = parseRows(block);

  block.textContent = '';

  const shell = document.createElement('div');
  shell.className = 'video-timed-text__shell';

  const videoCol = document.createElement('div');
  videoCol.className = 'video-timed-text__video-column';

  const videoWrap = document.createElement('div');
  videoWrap.className = 'video-timed-text__video-wrapper';

  const video = document.createElement('video');
  video.className = 'video-timed-text__video';
  video.controls = false;
  video.muted = true;
  video.playsInline = true;

  if (config.videoUrl && config.videoUrl.includes('/content/dam/')) {
    const filename = config.videoUrl.split('/').pop();
    config.videoUrl = `https://revmedclinicaltrials.com/videos/${filename}`;
  }

  if (config.videoUrl) {
    const sourceEl = document.createElement('source');
    sourceEl.src = config.videoUrl;
    const ext = config.videoUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
    sourceEl.type = `video/${ext || 'mp4'}`;
    video.append(sourceEl);
  }

  const overlay = document.createElement('div');
  overlay.className = 'video-timed-text__overlay';

  const watchAgainBtn = document.createElement('button');
  watchAgainBtn.type = 'button';
  watchAgainBtn.className = 'video-timed-text__watch-again';
  watchAgainBtn.textContent = 'Watch again?';
  watchAgainBtn.hidden = true;

  const posterImg = document.createElement('img');
  posterImg.className = 'video-timed-text__poster';
  posterImg.src = config.poster || '/images/placeholder_video_poster.jpg';
  posterImg.alt = config.posterAlt || '';

  overlay.append(watchAgainBtn, posterImg);
  videoWrap.append(video, overlay);

  const disclaimer = document.createElement('div');
  disclaimer.className = 'video-timed-text__disclaimer';
  if (config.disclaimerText) {
    disclaimer.innerHTML = config.disclaimerText;
  }

  videoCol.append(videoWrap, disclaimer);

  const panel = document.createElement('div');
  panel.className = 'video-timed-text__panel';

  const scrollArea = document.createElement('div');
  scrollArea.className = 'video-timed-text__scroll';

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'video-timed-text__cta-wrap';

  const ctaBtn = document.createElement('button');
  ctaBtn.type = 'button';
  ctaBtn.className = 'video-timed-text__cta';
  if (config.buttonText) {
    ctaBtn.innerHTML = toPhrasingHTML(config.buttonText);
  }
  ctaWrap.append(ctaBtn);

  const list = document.createElement('ul');
  list.className = 'video-timed-text__list';

  scrollArea.append(ctaWrap, list);
  panel.append(scrollArea);

  shell.append(videoCol, panel);
  block.append(shell);

  const revealedSet = new Set();
  const renderedSet = new Set();

  const renderNewItems = () => {
    let added = false;

    timedData.forEach((point) => {
      if (revealedSet.has(point.time) && !renderedSet.has(point.time)) {
        renderedSet.add(point.time);
        list.append(createListItem(point));
        added = true;
      }
    });

    if (!added) return;

    ctaWrap.hidden = true;
    panel.classList.add('has-revealed');

    requestAnimationFrame(() => {
      const hasListOverflow = list.scrollHeight > scrollArea.clientHeight + 1;
      if (!hasListOverflow) return;

      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: 'smooth',
      });
    });
  };

  const startPlayback = () => {
    overlay.classList.add('is-hidden');
    if (video.ended) video.currentTime = 0;
    video.play();
  };

  const resetAndPlay = () => {
    revealedSet.clear();
    renderedSet.clear();
    list.textContent = '';
    ctaWrap.hidden = false;
    panel.classList.remove('has-revealed');
    scrollArea.scrollTop = 0;
    video.currentTime = 0;
    overlay.classList.add('is-hidden');
    video.play();
  };

  video.addEventListener('timeupdate', () => {
    let hasNew = false;
    timedData.forEach((point) => {
      if (point.time <= video.currentTime && !revealedSet.has(point.time)) {
        revealedSet.add(point.time);
        hasNew = true;
      }
    });
    if (hasNew) renderNewItems();
  });

  video.addEventListener('ended', () => {
    overlay.classList.remove('is-hidden');
    watchAgainBtn.hidden = revealedSet.size === 0;
  });

  overlay.addEventListener('click', (e) => {
    if (e.target.closest('.video-timed-text__watch-again')) return;
    if (video.ended && revealedSet.size > 0) {
      resetAndPlay();
    } else {
      startPlayback();
    }
  });

  ctaBtn.addEventListener('click', startPlayback);

  watchAgainBtn.addEventListener('click', resetAndPlay);
}