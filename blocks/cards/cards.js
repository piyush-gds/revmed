import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'cards-card-header';
    
    const cardContent = document.createElement('div');
    cardContent.className = 'cards-card-content';
    
    const cardFooter = document.createElement('div');
    cardFooter.className = 'cards-card-footer';
    
    const accentBar = document.createElement('div');
    accentBar.className = 'cards-accent-bar';
    const accentFill = document.createElement('div');
    accentFill.className = 'cards-accent-fill';
    accentBar.appendChild(accentFill);
    
    while (row.firstElementChild) {
      const div = row.firstElementChild;
      if (div.children.length === 1 && div.querySelector('picture')) {
        cardFooter.append(div);
        div.className = 'cards-card-image';
      } else {
        if (cardHeader.children.length === 0) {
          cardHeader.append(div);
          div.className = 'cards-card-title';
        } else {
          cardContent.append(div);
          div.className = 'cards-card-body';
        }
      }
    }
    
    li.append(cardHeader);
    if (cardContent.children.length > 0) {
      cardContent.insertBefore(accentBar, cardContent.firstChild);
    }
    li.append(cardContent);
    li.append(cardFooter);
    
    ul.append(li);
  });
  
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.replaceChildren(ul);
}
