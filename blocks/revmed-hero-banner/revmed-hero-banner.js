const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function extractVimeoIdFromLink(href) {
  try {
    const url = new URL(href);
    const parts = url.pathname.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (/^\d+$/.test(parts[i])) return parts[i];
    }
    return '';
  } catch (e) {
    return '';
  }
}

function buildVimeoEmbed(videoId, autoplay) {
  const params = new URLSearchParams();
  params.set('autoplay', autoplay ? '1' : '0');
  params.set('controls', '1');
  if (autoplay) params.set('muted', '1');
  params.set('background', '0');

  const wrap = document.createElement('div');
  wrap.className = 'video-embed';

  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?${params.toString()}`;
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', 'Hero Banner Video');

  wrap.appendChild(iframe);
  return wrap;
}

export default function decorate(block) {
  // Check if this is a video variation
  const firstRow = block.querySelector(':scope > div');
  if (!firstRow) return;

  const cells = Array.from(firstRow.querySelectorAll(':scope > div'));
  
  // Look for video URL in the block content
  let videoLink = null;
  cells.forEach(cell => {
    const link = cell.querySelector('a');
    if (link && link.href && (link.href.includes('vimeo.com') || link.href.includes('youtube.com'))) {
      videoLink = link.href;
    }
  });

  // If we found a video link, render video variation
  if (videoLink) {
    block.classList.add('video');
    
    const videoId = extractVimeoIdFromLink(videoLink);
    if (videoId) {
      const autoplay = !prefersReducedMotion.matches;
      const videoEmbed = buildVimeoEmbed(videoId, autoplay);
      
      // Find and remove the link element
      cells.forEach(cell => {
        const link = cell.querySelector('a');
        if (link && link.href === videoLink) {
          link.remove();
        }
      });
      
      // Add video embed to the block
      block.appendChild(videoEmbed);
    }
  } else {
    // Image variation - default behavior
    block.classList.add('image');
  }
}
