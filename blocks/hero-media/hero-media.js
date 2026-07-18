export default function decorate(block) {
  const [mediaTypeRow, mediaRow, altRow, captionRow] = [...block.children];

  const mediaType = mediaTypeRow?.textContent.trim().toLowerCase();
  const mediaLink = mediaRow.querySelector('a');
  const mediaSrc = mediaLink?.href;
  const altText = altRow?.textContent.trim();
  const captionText = captionRow?.textContent.trim();

  const wrapper = document.createElement('div');
  wrapper.className = 'hero-media-wrapper';

  if (mediaType === 'video' && mediaSrc) {
    const video = document.createElement('video');
    video.src = mediaSrc;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    if (altText) video.setAttribute('aria-label', altText);

    const muteBtn = document.createElement('button');
    muteBtn.className = 'hero-media-mute';
    muteBtn.setAttribute('aria-label', 'Toggle mute');
    muteBtn.textContent = '🔇';
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? '🔇' : '🔊';
    });

    wrapper.append(video, muteBtn);
  } else {
    wrapper.append(...mediaRow.children);
  }

  if (captionText) {
    const caption = document.createElement('div');
    caption.className = 'hero-caption';
    caption.textContent = captionText;
    wrapper.append(caption);
  }

  block.textContent = '';
  block.append(wrapper);
}
