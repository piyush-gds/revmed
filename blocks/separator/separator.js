export default function decorate(block) {
  const accentBar = document.createElement("div");
  accentBar.className = "cards-accent-bar";

  const accentFill = document.createElement("div");
  accentFill.className = "cards-accent-fill";

  accentBar.appendChild(accentFill);
  block.appendChild(accentBar);
}
