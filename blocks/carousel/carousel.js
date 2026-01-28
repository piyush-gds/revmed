import { moveInstrumentation } from "../../scripts/scripts.js";

function createCard(row) {
  const card = document.createElement("div");
  card.className = "carousel-card";
  card.setAttribute("role", "group");
  card.setAttribute("aria-roledescription", "slide");

  moveInstrumentation(row, card);

  const cols = [...row.children];
  const title = cols[0]?.textContent?.trim() || "";
  const descriptionHtml = cols[1]?.innerHTML || "";
  const status = cols[2]?.textContent?.trim() || "";
  const phase = cols[3]?.textContent?.trim() || "";
  const conditions = cols[4]?.textContent?.trim() || "";
  const linkEl = cols[5]?.querySelector("a");
  const linkHref = linkEl?.href || "#";

  const progressPhase = parseInt(cols[6]?.textContent?.trim(), 10) || 1;

  // Total dots is always 4, green dots based on progressPhase (1-4)
  const greenDots = Math.min(Math.max(progressPhase, 1), 4);
  const dots = [];
  for (let i = 0; i < 4; i += 1) {
    const isGreen = i < greenDots;
    dots.push(`<div class="dot${isGreen ? "" : " gray"}"></div>`);
  }

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-progress">
        ${dots.join("")}
      </div>
      <a href="${linkHref}" class="card-title">${title}</a>
      <div class="card-description">
        <div class="card-description-text">${descriptionHtml}</div>
      </div>
      <div class="card-divider"></div>
      <section class="card-field">
        <h4 class="field-label">Status</h4>
        <div class="field-value">${status}</div>
      </section>
      <section class="card-field">
        <h4 class="field-label">Phase</h4>
        <div class="field-value">${phase}</div>
      </section>
      <section class="card-field medical-conditions">
        <h4 class="field-label">Medical Conditions</h4>
        <div class="field-value"><span>${conditions}</span></div>
      </section>
    </div>
  `;

  return card;
}

export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length === 0) return;

  const cards = rows.map((row) => createCard(row));

  block.textContent = "";

  block.setAttribute("role", "region");
  block.setAttribute("aria-roledescription", "carousel");

  // Create prev button container
  const prevContainer = document.createElement("div");
  prevContainer.className = "carousel-nav-prev";

  const prevBtn = document.createElement("button");
  prevBtn.className = "carousel-btn carousel-prev";
  prevBtn.setAttribute("aria-label", "Previous slide");
  prevBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  `;
  prevContainer.appendChild(prevBtn);

  const track = document.createElement("div");
  track.className = "carousel-track";
  cards.forEach((card) => track.appendChild(card));

  const viewport = document.createElement("div");
  viewport.className = "carousel-viewport";
  viewport.appendChild(track);

  const nextContainer = document.createElement("div");
  nextContainer.className = "carousel-nav-next";

  const nextBtn = document.createElement("button");
  nextBtn.className = "carousel-btn carousel-next";
  nextBtn.setAttribute("aria-label", "Next slide");
  nextBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  `;
  nextContainer.appendChild(nextBtn);

  block.appendChild(prevContainer);
  block.appendChild(viewport);
  block.appendChild(nextContainer);

  let currentIndex = 0;
  const totalCards = cards.length;
  const maxIndex = Math.max(0, totalCards - 1);

  function getCardWidth() {
    const card = cards[0];
    if (card) {
      return card.offsetWidth;
    }
    return 0;
  }

  function updatePosition() {
    const cardWidth = getCardWidth();
    let offset;

    if (currentIndex === 0) {
      offset = 0;
    } else if (currentIndex >= maxIndex) {
      offset = (totalCards - 2) * cardWidth;
    } else {
      offset = currentIndex * cardWidth - cardWidth / 2;
    }

    track.style.transform = `translate3d(-${offset}px, 0px, 0px)`;
  }

  function goNext() {
    if (currentIndex < maxIndex) {
      currentIndex += 1;
      updatePosition();
      updateButtons();
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updatePosition();
      updateButtons();
    }
  }

  function updateButtons() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex;
  }

  nextBtn.addEventListener("click", goNext);
  prevBtn.addEventListener("click", goPrev);

  window.addEventListener("resize", () => {
    updatePosition();
  });

  // Intersection Observer: animate dots once when card comes into view
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target); // once: true - stop observing after first trigger
        }
      });
    },
    { threshold: 0.1 } // amount: 0.1 - trigger when 10% visible
  );

  cards.forEach((card) => observer.observe(card));

  updatePosition();
  updateButtons();
}
