export default function decorate(block) {
  const item = block.querySelector(':scope > div > div');

  if (!item) return;

  const fields = [...item.children];

  const heading = fields[0];
  const description = fields[1];

  const ctaGroup = fields[2];
  const videoGroup = fields[3];

  // CTA fields
  const ctaLinkField = ctaGroup?.children[0];
  const ctaTextField = ctaGroup?.children[1];

  const ctaLink = ctaLinkField?.querySelector('a');
  const ctaText = ctaTextField?.textContent.trim();

  // Video fields
  const videoField = videoGroup?.children[0];
  const thumbnail = videoGroup?.children[1];
  const thumbnailAlt = videoGroup?.children[2];

  let videoId = videoField?.textContent.trim() || '';

  // Youtube URL parsing
  if (videoId.includes('youtube.com/watch')) {
    videoId = new URL(videoId).searchParams.get('v');
  }

  if (videoId.includes('youtu.be/')) {
    videoId = new URL(videoId).pathname.substring(1);
  }

  block.innerHTML = '';

  // Video
  const videoWrapper = document.createElement('div');
  videoWrapper.className = 'video-wrapper';

  if (videoId) {
    videoWrapper.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}"
        title="YouTube video"
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    `;
  } else if (thumbnail) {
    const img = thumbnail.querySelector('img');

    if (img && thumbnailAlt) {
      img.alt = thumbnailAlt.textContent.trim();
    }

    videoWrapper.append(thumbnail);
  }

  // Text
  const textWrapper = document.createElement('div');
  textWrapper.className = 'text-wrapper';

  const content = document.createElement('div');
  content.className = 'content';

  if (heading) {
    const h2 = document.createElement('h2');
    h2.innerHTML = heading.innerHTML;
    content.append(h2);
  }

  if (description) {
    description.classList.add('description');
    content.append(description);
  }

  if (ctaLink) {
    ctaLink.textContent = ctaText || ctaLink.textContent;
    ctaLink.classList.add('button', 'primary');
    content.append(ctaLink);
  }

  textWrapper.append(content);

  if (block.classList.contains('video-left')) {
    block.append(videoWrapper);
    block.append(textWrapper);
  } else {
    block.append(textWrapper);
    block.append(videoWrapper);
  }
}
