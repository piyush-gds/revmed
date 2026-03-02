export default function decorate(block) {
  const VIDEO_EXTENSIONS = [
    ".mp4",
    ".webm",
    ".ogg",
    ".ogv",
    ".mov",
    ".avi",
    ".wmv",
    ".flv",
    ".mkv",
    ".m4v",
    ".3gp",
    ".3g2",
    ".mpg",
    ".mpeg",
    ".m2v",
    ".m4p",
    ".divx",
    ".xvid",
    ".vob",
    ".ts",
    ".mts",
    ".m2ts",
  ];

  const IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
    ".tiff",
    ".tif",
    ".apng",
    ".avif",
    ".jfif",
    ".pjpeg",
    ".pjp",
    ".heic",
    ".heif",
  ];

  const rows = Array.from(block.children);

  const getRowText = (index) => rows[index]?.querySelector("div")?.textContent.trim() || "";
  const getRowHTML = (index) => rows[index]?.querySelector("div")?.innerHTML || "";

  const variation = getRowText(0) || "image";
  const assetPicked =
    rows[1]?.querySelector("picture") ||
    rows[1]?.querySelector("video") ||
    rows[1]?.querySelector("a");
  const text = getRowHTML(2);
  const overlayText = getRowHTML(3) || text;
  const primaryButtonLabel = getRowText(4);
  const primaryButtonLink = getRowText(5);
  const secondaryButtonLabel = getRowText(6);
  const secondaryButtonLink = getRowText(7);

  block.innerHTML = "";

  if (variation === "video") {
    const videoWrapper = document.createElement("div");
    videoWrapper.className = "hero-video-wrapper";

    const videoContainer = document.createElement("div");
    videoContainer.className = "hero-video-container";

    const video = document.createElement("video");
    const videoSrc = rows[1]?.querySelector('a')?.href;
    // test video
    // const videoSrc =
    //   "https://revmedclinicaltrials.com/videos/hero-video.webm" ||
    //   "https://www.w3schools.com/html/mov_bbb.mp4";

    // Check if the file is a video type
    const isVideo =
      videoSrc &&
      VIDEO_EXTENSIONS.some((ext) => videoSrc.toLowerCase().endsWith(ext));

    if (videoSrc && isVideo) {
      video.src = videoSrc;
      video.controls = false;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      videoContainer.appendChild(video);
    } else {
      console.error(
        "Invalid video file. Please upload a video file (.mp4, .webm, .ogg, .mov, etc.)"
      );
    }

    if (text) {
      const textContainer = document.createElement("div");
      const scrollButton = document.createElement("button");
      scrollButton.className = "hero-scroll-button";
      textContainer.className = "hero-text-container";
      textContainer.innerHTML = text;
      scrollButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down text-primary size-8"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>`;
      textContainer.appendChild(scrollButton);
      videoContainer.appendChild(textContainer);
    }

    videoWrapper.appendChild(videoContainer);
    block.appendChild(videoWrapper);
  } else if (variation === "image") {
    const imageWrapper = document.createElement("div");
    const textContainer = document.createElement("div");
    imageWrapper.className = "hero-image-wrapper";

    const imageContainer = document.createElement("div");
    imageContainer.className = "hero-image-container";

    const img = assetPicked?.querySelector("img") || assetPicked;

    // Check if the element is actually an image
    if (img && img.tagName === "IMG") {
      const imgSrc = img.src || "";
      const isImage = IMAGE_EXTENSIONS.some((ext) =>
        imgSrc.toLowerCase().includes(ext)
      );

      if (isImage) {
        imageContainer.appendChild(img);
      } else {
        console.error(
          "Invalid image file. Please upload an image file (.jpg, .png, .gif, .webp, .svg, etc.)"
        );
      }
    }

    if (text) {
      textContainer.className = "hero-text-container";
      textContainer.innerHTML = text;
    }

    imageWrapper.appendChild(imageContainer);
    imageWrapper.appendChild(textContainer);
    block.appendChild(imageWrapper);
  } else if (variation === "image-text-buttons") {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "hero-overlay-image-wrapper";

    const imageContainer = document.createElement("div");
    imageContainer.className = "hero-overlay-image-container";

    /* Use the authored image as background on the wrapper */
    const img = assetPicked?.querySelector("img") || assetPicked;

    if (img && img.tagName === "IMG") {
      const imgSrc = img.src || "";
      const wrapper = block.closest('.revmed-hero-banner-wrapper');
      if (wrapper && imgSrc) {
        wrapper.style.backgroundImage = `url('${imgSrc}')`;
      }
    }

    const overlay = document.createElement("div");
    overlay.className = "hero-overlay-content";

    if (overlayText) {
      const overlayTextContainer = document.createElement("div");
      overlayTextContainer.className = "hero-overlay-text";
      overlayTextContainer.innerHTML = overlayText;
      overlay.appendChild(overlayTextContainer);
    }

    if (primaryButtonLabel || secondaryButtonLabel) {
      const actions = document.createElement("div");
      actions.className = "hero-overlay-actions";

      if (primaryButtonLabel) {
        const primaryButton = document.createElement("a");
        primaryButton.className = "hero-overlay-button";
        primaryButton.href = primaryButtonLink || "#";
        primaryButton.textContent = primaryButtonLabel;
        actions.appendChild(primaryButton);
      }

      if (secondaryButtonLabel) {
        const secondaryButton = document.createElement("a");
        secondaryButton.className = "hero-overlay-button";
        secondaryButton.href = secondaryButtonLink || "#";
        secondaryButton.textContent = secondaryButtonLabel;
        actions.appendChild(secondaryButton);
      }

      overlay.appendChild(actions);
    }

    imageContainer.appendChild(overlay);
    imageWrapper.appendChild(imageContainer);
    block.appendChild(imageWrapper);
  }
}
