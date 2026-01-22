export default function decorate(block) {
  const accentBar = document.createElement("div");
  accentBar.className = "separator-accent-bar";

  const accentFill = document.createElement("div");
  accentFill.className = "separator-accent-fill";

  accentBar.appendChild(accentFill);
  block.appendChild(accentBar);
}
