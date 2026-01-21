export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // Check if parent section has data-expandable="true"
  const section = block.closest('.section');
  if (section && section.dataset.expandable === 'true') {
    block.classList.add('collapse');
  }

  // If section has data-expandable="true", transform children into accordion items
  if (section && section.dataset.accordion === 'true') {
    [...block.children].forEach((row) => {
      const innerWrapper = row.children[0];
      if (innerWrapper && innerWrapper.children.length >= 2) {
        // decorate accordion item label
        const label = innerWrapper.children[0];
        const summary = document.createElement('summary');
        summary.className = 'accordion-item-label';
        summary.append(...label.childNodes);

        // decorate accordion item body
        const body = innerWrapper.children[1];
        body.className = 'accordion-item-body';

        // decorate accordion item
        const details = document.createElement('details');
        details.className = 'accordion-item';
        details.append(summary, body);

        // replace inner wrapper content with details
        innerWrapper.innerHTML = '';
        innerWrapper.append(details);
      }
    });
    return;
  }

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });
}
