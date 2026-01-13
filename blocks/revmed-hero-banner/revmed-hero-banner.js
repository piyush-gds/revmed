export default function decorate(block) {
  const rows = Array.from(block.children);
  const picture = block.querySelector("picture");
  const img = picture
    ? picture.querySelector("img")
    : block.querySelector("img");

  let textContent = null;
  rows.forEach((row) => {
    const paragraph = row.querySelector("p");
    if (paragraph && paragraph.textContent.trim()) {
      textContent = paragraph;
    }
  });

  block.innerHTML = "";

  if (img) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "hero-image";
    imageContainer.appendChild(img);
    block.appendChild(imageContainer);
  }

  if (textContent) {
    const textContainer = document.createElement("div");
    textContainer.className = "hero-text";
    textContainer.appendChild(textContent);
    block.appendChild(textContainer);
  }
}
