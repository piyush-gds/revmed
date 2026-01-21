const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Determines the video source type from a link
 * @param {string} link - The video link URL
 * @returns {string} - 'youtube', 'vimeo', or 'video'
 */
function getVideoSource(link) {
  if (link.includes('youtube') || link.includes('youtu.be')) return 'youtube';
  if (link.includes('vimeo')) return 'vimeo';
  return 'video';
}

/**
 * Gets a human-readable video type label
 * @param {string} source - The video source type ('youtube', 'vimeo', or 'video')
 * @returns {string} - Human-readable label
 */
function getVideoTypeLabel(source) {
  const labels = {
    youtube: 'YouTube video',
    vimeo: 'Vimeo video',
    video: 'MP4 video',
  };
  return labels[source] || 'video';
}

/**
 * Formats time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Creates SVG icons for video controls (Lucide style)
 */
function getPlayIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>`;
}

function getPauseIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
  </svg>`;
}

function getVolumeIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
    <path d="M16 9a5 5 0 0 1 0 6"></path>
    <path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>
  </svg>`;
}

function getVolumeMuteIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path>
    <line x1="22" y1="9" x2="16" y2="15"></line>
    <line x1="16" y1="9" x2="22" y2="15"></line>
  </svg>`;
}

/**
 * Creates custom video controls HTML
 */
function createCustomControls() {
  const controls = document.createElement('div');
  controls.className = 'custom-controls';
  controls.innerHTML = `
    <div class="controls-progress">
      <span class="time-display time-current">0:00</span>
      <div class="progress-bar">
        <div class="progress-filled"></div>
      </div>
      <span class="time-display time-duration">0:00</span>
    </div>
    <div class="controls-row">
      <div class="controls-left">
        <button class="control-btn play-btn" type="button" aria-label="Play">
          ${getPlayIcon()}
        </button>
        <div class="volume-controls">
          <button class="control-btn volume-btn" type="button" aria-label="Mute">
            ${getVolumeIcon()}
          </button>
          <div class="volume-slider-container">
            <div class="volume-slider-fill"></div>
          </div>
        </div>
      </div>
      <div class="controls-right">
        <button class="speed-btn" type="button" data-speed="0.5">0.5x</button>
        <button class="speed-btn active" type="button" data-speed="1">1x</button>
        <button class="speed-btn" type="button" data-speed="1.5">1.5x</button>
        <button class="speed-btn" type="button" data-speed="2">2x</button>
      </div>
    </div>
  `;
  return controls;
}

/**
 * Initializes custom controls functionality
 * @param {HTMLElement} wrapper - The video wrapper element
 * @param {HTMLVideoElement} video - The video element
 */
function initCustomControls(wrapper, video) {
  const controls = wrapper.querySelector('.custom-controls');
  const playBtn = controls.querySelector('.play-btn');
  const volumeBtn = controls.querySelector('.volume-btn');
  const volumeSlider = controls.querySelector('.volume-slider-container');
  const volumeFill = controls.querySelector('.volume-slider-fill');
  const progressBar = controls.querySelector('.progress-bar');
  const progressFilled = controls.querySelector('.progress-filled');
  const timeCurrent = controls.querySelector('.time-current');
  const timeDuration = controls.querySelector('.time-duration');
  const speedBtns = controls.querySelectorAll('.speed-btn');

  let savedVolume = 1;

  // Play/Pause
  playBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  video.addEventListener('play', () => {
    playBtn.innerHTML = getPauseIcon();
    playBtn.setAttribute('aria-label', 'Pause');
  });

  video.addEventListener('pause', () => {
    playBtn.innerHTML = getPlayIcon();
    playBtn.setAttribute('aria-label', 'Play');
  });

  // Click on video to play/pause
  video.addEventListener('click', () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });

  // Volume button (mute/unmute)
  volumeBtn.addEventListener('click', () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = savedVolume || 1;
      volumeBtn.innerHTML = getVolumeIcon();
      volumeFill.style.width = `${video.volume * 100}%`;
    } else {
      savedVolume = video.volume;
      video.muted = true;
      volumeBtn.innerHTML = getVolumeMuteIcon();
      volumeFill.style.width = '0%';
    }
  });

  // Volume slider click
  volumeSlider.addEventListener('click', (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.volume = percent;
    video.muted = percent === 0;
    savedVolume = percent > 0 ? percent : savedVolume;
    volumeFill.style.width = `${percent * 100}%`;
    volumeBtn.innerHTML = percent === 0 ? getVolumeMuteIcon() : getVolumeIcon();
  });

  // Progress bar
  video.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    const percent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${percent}%`;
    timeCurrent.textContent = formatTime(video.currentTime);
  });

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  });

  // Speed controls
  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      speedBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      video.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  // Initialize volume fill
  volumeFill.style.width = '100%';
}

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      background: background ? '1' : '0',
    };
    suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.addEventListener('canplay', () => {
      video.muted = true;
      if (autoplay) video.play();
    });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);
  video.append(sourceEl);

  // Wrap video in a container with custom controls
  const wrapper = document.createElement('div');
  wrapper.className = 'video-wrapper';
  wrapper.append(video);

  // Add custom controls for non-background videos
  if (!background) {
    const customControls = createCustomControls();
    wrapper.append(customControls);

    video.addEventListener('loadedmetadata', () => {
      initCustomControls(wrapper, video);
    });

    // Fallback if metadata already loaded
    if (video.readyState >= 1) {
      initCustomControls(wrapper, video);
    }
  }

  return wrapper;
}

function loadVideoEmbed(block, link, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;

  const url = new URL(link);
  const source = getVideoSource(link);

  if (source === 'youtube') {
    const embedWrapper = embedYoutube(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (source === 'vimeo') {
    const embedWrapper = embedVimeo(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoWrapper = getVideoElement(link, autoplay, background);
    block.append(videoWrapper);
    const videoEl = videoWrapper.querySelector('video');
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
}

export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const link = block.querySelector('a').href;
  block.textContent = '';
  block.dataset.embedLoaded = false;

  const autoplay = block.classList.contains('autoplay');
  if (placeholder) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    if (!autoplay) {
      const source = getVideoSource(link);
      const videoType = getVideoTypeLabel(source);
      const ariaLabel = `Play ${videoType}`;

      wrapper.insertAdjacentHTML(
        'beforeend',
        `<div class="video-placeholder-play"><button type="button" title="${ariaLabel}" aria-label="${ariaLabel}"></button></div>`,
      );
      wrapper.addEventListener('click', () => {
        wrapper.remove();
        loadVideoEmbed(block, link, true, false);
      });
    }
    block.append(wrapper);
  }

  if (!placeholder || autoplay) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        const playOnLoad = autoplay && !prefersReducedMotion.matches;
        loadVideoEmbed(block, link, playOnLoad, autoplay);
      }
    });
    observer.observe(block);
  }
}