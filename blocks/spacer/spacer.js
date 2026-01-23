export default function decorate(block) {
  const p = block.querySelector("p");
  if (p) {
    const spacingClass = p.textContent.trim();
    if (spacingClass) {
      block.classList.add(spacingClass);
    }
  }
  block.innerHTML = "";
}
