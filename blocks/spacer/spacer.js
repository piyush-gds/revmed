export default function decorate(block) {
  const pTags = block.querySelectorAll("p");

  const paddingStyle = pTags[0]?.textContent.trim();
  const bgColor = pTags[1]?.textContent.trim();
  const borderStyle = pTags[2]?.textContent.trim();

  const wrapper = block.closest(".spacer-wrapper");

  if (wrapper) {
    if (paddingStyle) {
      wrapper.classList.add(paddingStyle);
    }
    if (bgColor) {
      wrapper.classList.add(bgColor);
    }
    if (borderStyle) {
      wrapper.classList.add(borderStyle);
    }
  }

  block.innerHTML = "";
}
