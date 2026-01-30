import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // Auto-render trial detail content if on a trial page
  renderTrialPageContent();
}

// function fetchCfData(event) {
//   event.preventDefault();
//   const button = event.currentTarget;
//   const reqId = button.textContent.trim();
//   fetch(`https://publish-p52710-e1559444.adobeaemcloud.com/graphql/execute.json/piyush-revmed-site/getrequirementIdData;reqId=${reqId}`)
//     .then((res) => res.json())
//     .then((data) => {
//       const items = data?.data?.requirementsPageModelList?.items || [];
//       if (items.length > 0) {
//         const item = items[0];
//         const div = document.createElement('div');
//         div.className = 'cf-data-result';
//         div.innerHTML = `
//           <p><strong>Path:</strong> ${item._path || ''}</p>
//           <p><strong>Requirement ID:</strong> ${item.requirementId || ''}</p>
//           <p><strong>Headline:</strong> ${item.headline || ''}</p>
//           <p><strong>Description:</strong> ${item.description?.plaintext || ''}</p>
//         `;
//         button.insertAdjacentElement('afterend', div);
//       }
//     })
//     .catch((err) => console.error(err));
// }

/**
 * Renders clinical trial detail from CF when on a trial page
 */
function renderTrialPageContent() {
  const currentPath = window.location.pathname;
  const trialIdPattern = /clinical-trials\/(NCT[0-9]+)/i;
  const matchResult = currentPath.match(trialIdPattern);

  if (!matchResult || !matchResult[1]) return;

  const trialIdentifier = matchResult[1];
  // const pageMain = document.querySelector('main');
  const cacheBuster = Date.now();
  const apiUrl = `https://publish-p52710-e1559444.adobeaemcloud.com/graphql/execute.json/piyush-revmed-site/getrequirementIdData;reqId=${trialIdentifier.toUpperCase()}?q=${cacheBuster}`;

  fetch(apiUrl)
    .then((response) => response.json())
    .then((jsonData) => {
      const cfItems = jsonData?.data?.requirementsPageModelList?.items;
      
      if (!cfItems || cfItems.length === 0) return;

      const trialData = cfItems[0];

      // Update header (#ctHeader)
      const ctHeaderSection = document.getElementById('ctHeader');
      const ctCardSection = document.getElementById('ctCard');

      if (ctHeaderSection) {
        const contentWrapper = ctHeaderSection.querySelector('.default-content-wrapper') || ctHeaderSection;
        contentWrapper.innerHTML = '';

        // Create header container
        const headerContainer = document.createElement('div');
        headerContainer.className = 'ct-header-content';

        const headlineRow = document.createElement('div');
        headlineRow.className = 'ct-header-headline-row';

        const headlineEl = document.createElement('h1');
        headlineEl.textContent = trialData.headline || 'Clinical Trial';
        headlineRow.appendChild(headlineEl);

        const detailsRow = document.createElement('div');
        detailsRow.className = 'ct-header-details-row';

        const descriptionEl = document.createElement('p');
        descriptionEl.className = 'ct-header-description';
        descriptionEl.textContent = trialData.description?.plaintext || '';
        detailsRow.appendChild(descriptionEl);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'ct-header-buttons';

        const phaseButton = document.createElement('a');
        phaseButton.href = '#';
        phaseButton.className = 'button primary ct-phase-button';
        phaseButton.textContent = trialData.phase || 'Status';
        buttonsContainer.appendChild(phaseButton);

        const nctButton = document.createElement('a');
        nctButton.href = '#';
        nctButton.className = 'button primary ct-nct-button';
        nctButton.textContent = trialData.requirementId || trialIdentifier;
        buttonsContainer.appendChild(nctButton);

        detailsRow.appendChild(buttonsContainer);

        headerContainer.appendChild(headlineRow);
        headerContainer.appendChild(detailsRow);
        contentWrapper.appendChild(headerContainer);
      }

      // Update cards section (#ctCard)
      if (ctCardSection) {
        const cards = ctCardSection.querySelectorAll('.cards ul > li');
        const cardDataArray = [
          trialData.studyFocusCard?.html,
          trialData.eligibilityCard?.html,
        ];

        cards.forEach((card, index) => {
          const cardBody = card.querySelector('.cards-card-body');
          if (cardBody && cardDataArray[index]) {
            cardBody.innerHTML = cardDataArray[index];
          }
        });
      }
    })
    .catch((fetchError) => {
      // eslint-disable-next-line no-console
      console.error('Trial data fetch failed:', fetchError);
    });
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
  // const testButtons = document.querySelectorAll('a[title="Test Button"]');
  // testButtons.forEach((button) => {
  //   button.addEventListener('click', fetchCfData);
  // });  
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
