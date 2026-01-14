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
      textContainer.className = "hero-text-container";
      textContainer.innerHTML = text;
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
  }
}
