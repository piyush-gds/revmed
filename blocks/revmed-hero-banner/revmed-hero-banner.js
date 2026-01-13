export default function decorate(block) {
  const rows = Array.from(block.children);
  
  let variation = 'image';
  let videoUrl = null;
  
  rows.forEach(row => {
    const cells = Array.from(row.children);
    cells.forEach(cell => {
      const link = cell.querySelector('a');
      if (link && link.href && (link.href.includes('.mp4') || link.href.includes('.webm') || link.href.includes('vimeo') || link.href.includes('youtube'))) {
        variation = 'video';
        videoUrl = link.href;
      }
    });
  });
  
  block.innerHTML = '';
  
  const container = document.createElement('div');
  container.className = 'hero-banner-content';
  
  if (variation === 'image') {
    block.classList.add('image');
    
    rows.forEach(row => {
      const cells = Array.from(row.children);
      cells.forEach(cell => {
        const picture = cell.querySelector('picture');
        if (picture) {
          const img = picture.querySelector('img');
          if (img) {
            const imageElement = document.createElement('img');
            imageElement.src = img.src;
            imageElement.alt = img.alt || '';
            imageElement.className = 'hero-banner-image';
            block.appendChild(imageElement);
          }
        }
        
        const textElements = cell.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        textElements.forEach(el => {
          container.appendChild(el.cloneNode(true));
        });
      });
    });
  } else {
    block.classList.add('video');
    
    if (videoUrl) {
      const videoElement = document.createElement('video');
      videoElement.className = 'hero-banner-video';
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.loop = true;
      videoElement.playsInline = true;
      
      const source = document.createElement('source');
      source.src = videoUrl;
      source.type = 'video/mp4';
      
      videoElement.appendChild(source);
      block.appendChild(videoElement);
    }
    
    rows.forEach(row => {
      const cells = Array.from(row.children);
      cells.forEach(cell => {
        const textElements = cell.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        textElements.forEach(el => {
          container.appendChild(el.cloneNode(true));
        });
      });
    });
  }
  
  if (container.children.length > 0) {
    block.appendChild(container);
  }
}
