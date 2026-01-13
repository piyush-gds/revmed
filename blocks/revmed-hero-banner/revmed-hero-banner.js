export default function decorate(block) {
  const rows = Array.from(block.children);

  const variation =
    rows[0]?.querySelector("div")?.textContent.trim() || "image";
  const assetPicked =
    rows[1]?.querySelector("picture") ||
    rows[1]?.querySelector("video") ||
    rows[1]?.querySelector("a");
  const text = rows[2]?.querySelector("div")?.innerHTML || "";

  block.innerHTML = "";

  if (variation === "video") {
    const videoWrapper = document.createElement("div");
    videoWrapper.className = "hero-video-wrapper";

    const videoContainer = document.createElement("div");
    videoContainer.className = "hero-video-container";

    const video = document.createElement("video");
    // const videoSrc = rows[1]?.querySelector('a')?.href;
    // test video
    const videoSrc =
      "https://revmedclinicaltrials.com/videos/hero-video.webm" ||
      "https://www.w3schools.com/html/mov_bbb.mp4";

    if (videoSrc) {
      video.src = videoSrc;
      video.controls = false;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
    }

    videoContainer.appendChild(video);

    if (text) {
      const textContainer = document.createElement("div");
      textContainer.className = "hero-text-container";
      textContainer.innerHTML = text;
      videoContainer.appendChild(textContainer);
    }

    videoWrapper.appendChild(videoContainer);
    block.appendChild(videoWrapper);
  } else if (variation === "image") {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "hero-image-wrapper";

    const imageContainer = document.createElement("div");
    imageContainer.className = "hero-image-container";

    const img = assetPicked?.querySelector("img") || assetPicked;
    if (img) {
      imageContainer.appendChild(img);
    }

    if (text) {
      const textContainer = document.createElement("div");
      textContainer.className = "hero-text-container";
      textContainer.innerHTML = text;
      imageContainer.appendChild(textContainer);
    }

    imageWrapper.appendChild(imageContainer);
    block.appendChild(imageWrapper);
  }
}
