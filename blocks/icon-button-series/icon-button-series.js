
export default async function decorate(block) {
  const rows = [...block.children];
  block.innerHTML = '';

  const ul = document.createElement('ul');
  ul.classList.add('icon-button-grid');

  for (const row of rows) {
    const [iconCol, linkCol, colorCol] = row.children;
    if (!iconCol || !linkCol) continue;

    const picture = iconCol.querySelector('picture');
    const link = linkCol.querySelector('a');
    const color = colorCol?.textContent?.trim() || 'currentColor';

    if (!picture || !link) continue;

    /* li */
    const li = document.createElement('li');
    li.classList.add('icon-button-series__item');
    li.classList.add('bg-' + color.toLowerCase());

    const a = document.createElement('a');
    a.href = link.href;
    a.title = link.title || link.textContent;
    a.classList.add('icon-button-series__link');

    const textSpan = document.createElement('span');
    textSpan.textContent = link.textContent;
    textSpan.classList.add('icon-button-series__text');
    a.append(textSpan);

    const img = picture.querySelector('img');
    if (img?.src) {
      try {
        const resp = await fetch(img.src);
        const svgMarkup = await resp.text();

        const temp = document.createElement('div');
        temp.innerHTML = svgMarkup;

        const svg = temp.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', 'currentColor');
          svg.setAttribute('aria-hidden', 'true');
          svg.classList.add('icon-button-series__icon');
          a.append(svg);
        }
      } catch (e) {
        console.warn('SVG load failed', e);
      }
    }

    li.append(a);
    ul.append(li);
  }

  block.append(ul);
}
