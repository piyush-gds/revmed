
// const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// function isUniversalEditorMode(block) {
//   return !!block.querySelector('[data-aue-resource], [data-aue-type], [data-aue-prop], [data-aue-label]')
//     || !!document.querySelector('[data-aue-resource], [data-aue-type], [data-aue-prop], [data-aue-label]');
// }

// function extractVimeoIdFromLink(href) {
//   try {
//     const url = new URL(href);
//     const parts = url.pathname.split('/').filter(Boolean);
//     for (let i = parts.length - 1; i >= 0; i -= 1) {
//       if (/^\d+$/.test(parts[i])) return parts[i];
//     }
//     return '';
//   } catch (e) {
//     return '';
//   }
// }

// function buildVimeoEmbed(videoId, autoplay, background) {
//   const params = new URLSearchParams();
//   params.set('autoplay', autoplay ? '1' : '0');
//   params.set('background', background ? '1' : '0');

//   const wrap = document.createElement('div');
//   wrap.className = 'video-embed';
//   wrap.style.left = '0';
//   wrap.style.width = '100%';
//   wrap.style.height = '0';
//   wrap.style.position = 'relative';
//   wrap.style.paddingBottom = '56.25%';

//   const iframe = document.createElement('iframe');
//   iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?${params.toString()}`;
//   iframe.style.border = '0';
//   iframe.style.top = '0';
//   iframe.style.left = '0';
//   iframe.style.width = '100%';
//   iframe.style.height = '100%';
//   iframe.style.position = 'absolute';
//   iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
//   iframe.setAttribute('allowfullscreen', '');
//   iframe.setAttribute('loading', 'lazy');
//   iframe.setAttribute('title', 'Content from Vimeo');

//   wrap.appendChild(iframe);
//   return { wrap, iframe };
// }

// function parseItemsFromBlock(block) {
//   const rows = Array.from(block.querySelectorAll(':scope > div'));

//   return rows.map((row) => {
//     const cells = Array.from(row.querySelectorAll(':scope > div'));
//     const left = cells[0] || row;
//     const right = cells[1] || row;

//     const picture = left.querySelector('picture') || row.querySelector('picture');
//     const linkEl = right.querySelector('a') || row.querySelector('a');
//     const href = linkEl ? linkEl.href : '';

//     return { row, picture, linkEl, href };
//   }).filter((x) => x.href);
// }

// function decoratePublished(block, items) {
//   const autoplayRequested = true;

//   const decorated = document.createElement('div');
//   decorated.className = 'video-items';

//   const observer = new IntersectionObserver((entries) => {
//     entries.forEach((entry) => {
//       if (!entry.isIntersecting) return;

//       const itemEl = entry.target;
//       observer.unobserve(itemEl);
//       if (itemEl.dataset.embedLoaded === 'true') return;

//       const href = itemEl.dataset.vimeoLink || '';
//       const videoId = extractVimeoIdFromLink(href);
//       if (!videoId) return;

//       const autoplayActual = autoplayRequested && !prefersReducedMotion.matches;
//       const background = autoplayActual;

//       const { wrap, iframe } = buildVimeoEmbed(videoId, autoplayActual, background);
//       itemEl.appendChild(wrap);

//       iframe.addEventListener('load', () => {
//         itemEl.dataset.embedLoaded = 'true';
//         const ph = itemEl.querySelector('.video-placeholder');
//         if (ph) ph.remove();
//       });
//     });
//   }, { rootMargin: '200px 0px' });

//   items.forEach(({ picture, href }) => {
//     const itemEl = document.createElement('div');
//     itemEl.className = 'video-item';
//     itemEl.dataset.embedLoaded = 'false';
//     itemEl.dataset.vimeoLink = href;

//     if (picture) {
//       const placeholder = document.createElement('div');
//       placeholder.className = 'video-placeholder';
//       placeholder.appendChild(picture);
//       itemEl.appendChild(placeholder);
//     }

//     decorated.appendChild(itemEl);
//     observer.observe(itemEl);
//   });

//   block.textContent = '';
//   block.appendChild(decorated);
// }

// export default async function decorate(block) {
//   const items = parseItemsFromBlock(block);

//   if (!items.length) {
//     block.textContent = '';
//     return;
//   }

//   if (isUniversalEditorMode(block)) {
//     block.classList.add('video-ue');
//     items.forEach(({ row }) => row.classList.add('video-item-ue'));
//     return;
//   }

//   decoratePublished(block, items);
// }
