export default function decorate(block) {
  // Fetch all p tags from the block
  const pTags = block.querySelectorAll("p");
  
  // Get padding style from first p tag
  const paddingStyle = pTags[0]?.textContent.trim();
  // Get bgcolor (style) from second p tag
  const bgColor = pTags[1]?.textContent.trim();
  // Get border style from third p tag
  const borderStyle = pTags[2]?.textContent.trim();
  
  // Get the parent wrapper element
  const wrapper = block.closest(".spacer-wrapper");
  
  // Add classes to wrapper instead of block
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
  
  // Clear inner content
  block.innerHTML = "";
}
