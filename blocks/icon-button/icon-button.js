export default async function decorate(block) {
  const picture = block.children[0].querySelector("picture");
  const paragraph = block.children[1].querySelector("p");
  const link = block.children[1].querySelector("a");
  const bgColor = block.children[2].querySelector("p")?.textContent?.trim();
  const paragraphText = paragraph ? paragraph.textContent.trim() : "";
  const href = link ? link.getAttribute("href") : "#";

  const anchor = document.createElement("a");
  const span = document.createElement("span");

  anchor.classList.add("anchor-menu__link");
  anchor.setAttribute("target", "_self");
  anchor.setAttribute("href", href);
  span.classList.add("anchor-menu__text");
  span.textContent = paragraphText;

  anchor.append(span);

  const img = picture?.querySelector("img");

  if (img?.src) {
    try {
      const resp = await fetch(img.src);
      const svgText = await resp.text();

      const temp = document.createElement("div");
      temp.innerHTML = svgText;

      const svg = temp.querySelector("svg");
      if (svg) {
        svg.classList.add("anchor-menu__icon");
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("aria-hidden", "true");

        anchor.append(svg);
      }
    } catch (err) {
      console.warn("SVG fetch failed", err);
    }
  }

  anchor.classList.remove("bg-yellow", "bg-red");

  if (bgColor === "yellow") {
    anchor.classList.add("bg-yellow");
  } else {
    anchor.classList.add("bg-red");
  }

  block.replaceChildren(anchor);
}
