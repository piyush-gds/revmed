export default function decorate(block) {
  const picture = block.children[0].querySelector("picture");
  const paragraph = block.children[1].querySelector("p");
  const link = block.children[1].querySelector("a");
  const bgColor = block.children[2].querySelector("p").textContent;
  const paragraphText = paragraph ? paragraph.textContent.trim() : "";
  const href = link.getAttribute("href");

  let anchor = document.createElement("a");
  let span = document.createElement("span");

  anchor.classList.add("anchor-menu__link");
  anchor.setAttribute("target", "_self");
  anchor.setAttribute("href", href);
  picture.classList.add("anchor-menu__icon");
  span.classList.add("anchor-menu__text");
  span.textContent = paragraphText;
  anchor.append(span);
  anchor.append(picture);

  if (bgColor === "yellow") {
    anchor.classList.remove("bg-yellow", "bg-red");
    anchor.classList.add("bg-yellow");
  } else {
    anchor.classList.remove("bg-yellow", "bg-red");
    anchor.classList.add("bg-red");
  }

  block.replaceChildren(anchor);
}

/*
<a
  class="anchor-menu__link text"
  target="_self"
  data-icon="watch"
  href="#video-series"
  data-once="analytic-tags-processed anchorMenu"
  data-analytics-link='{"name":"Watch the series","position":"body","group":"body","href":"https://www.agitationinalz.com/#video-series"}'
>
  <svg class="anchor-menu__icon">
    <use xlink:href="/sites/g/files/qhldwo11956/themes/site/themes/custom/agitation_in_alzheimer/dist/icons.svg#watch"></use>
  </svg>
  <span class="anchor-menu__text">Watch the series</span>
</a>;
*/
