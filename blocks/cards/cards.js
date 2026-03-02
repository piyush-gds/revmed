import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const cardImage = document.createElement('div');
    cardImage.className = 'cards-card-image-wrapper';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'cards-card-header';

    const cardContent = document.createElement('div');
    cardContent.className = 'cards-card-content';

    /* Accent bar — always rendered inside header, under the title */
    const accentBar = document.createElement('div');
    accentBar.className = 'cards-accent-bar';
    const accentFill = document.createElement('div');
    accentFill.className = 'cards-accent-fill';
    accentBar.appendChild(accentFill);

    /* Defaults */
    let layout = 'text-top';
    let showAccentBar = false;

    while (row.firstElementChild) {
      const div = row.firstElementChild;
      const text = div.textContent.trim().toLowerCase();

      /* Detect the layout field value */
      if (text === 'image-top' || text === 'text-top') {
        layout = text;
        div.remove();
      /* Detect the showAccentBar boolean field */
      } else if (text === 'true' || text === 'false') {
        showAccentBar = text === 'true';
        div.remove();
      } else if (div.children.length === 1 && div.querySelector('picture')) {
        cardImage.append(div);
        div.className = 'cards-card-image';
      } else if (cardHeader.children.length === 0) {
        cardHeader.append(div);
        div.className = 'cards-card-title';
      } else {
        cardContent.append(div);
        div.className = 'cards-card-body';
      }
    }

    /* Apply layout class to the card li */
    li.classList.add(layout);

    /* Accent bar goes into header only if toggled on */
    if (showAccentBar) {
      cardHeader.append(accentBar);
    }

    /* Header (title + separator) is always first */
    li.append(cardHeader);

    /* Assemble image & text in order based on layout */
    if (layout === 'image-top') {
      li.append(cardImage);
      li.append(cardContent);
    } else {
      /* Default: text-top — text body, then image at bottom */
      li.append(cardContent);
      li.append(cardImage);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.replaceChildren(ul);
}
