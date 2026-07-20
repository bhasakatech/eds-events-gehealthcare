import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const children = [...block.children];
  const parentRow = children.shift(); // Parent fields (classes/variants)

  // Process parent row for classes
  if (parentRow) {
    const [classesCol] = parentRow.children;
    if (classesCol) {
      const classes = classesCol.textContent.trim().split(' ').filter(Boolean);
      block.classList.add(...classes);
    }
  }

  // Process video-text items
  children.forEach((row) => {
    const [col1] = row.children; // Only one column for video-text-item fields
    const heading = col1.querySelector('h1, h2, h3, h4, h5, h6');
    const paragraphs = col1.querySelectorAll('p');
    const ctaLink = col1.querySelector('a');
    const videoUrl = paragraphs.length > 0 ? paragraphs[paragraphs.length - 3]?.textContent.trim() : '';
    const videoThumbnail = paragraphs.length > 1 ? paragraphs[paragraphs.length - 2]?.textContent.trim() : '';
    const autoplay = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1]?.textContent.trim() : '';

    // Extract CTA text and link
    let ctaText = '';
    if (ctaLink) {
      ctaText = ctaLink.textContent.trim();
      ctaLink.textContent = '';
    }

    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-text-video-container';

    // Extract video ID and platform
    let videoId = '';
    let platform = '';
    if (videoUrl) {
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        platform = 'youtube';
        videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('youtu.be/')[1]?.split('?')[0];
      } else if (videoUrl.includes('vimeo.com')) {
        platform = 'vimeo';
        videoId = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
      }
    }

    // Create iframe or thumbnail
    if (videoId && platform) {
      const iframe = document.createElement('iframe');
      iframe.src = platform === 'youtube'
        ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay === 'true' ? 1 : 0}&mute=1&rel=0`
        : `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay === 'true' ? 1 : 0}&muted=1`;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('aria-label', 'Video player');

      if (videoThumbnail) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'video-text-thumbnail';
        thumbnail.style.backgroundImage = `url(${videoThumbnail})`;
        thumbnail.appendChild(iframe);
        videoContainer.appendChild(thumbnail);

        // Add play button
        const playButton = document.createElement('button');
        playButton.className = 'video-text-play-button';
        playButton.setAttribute('aria-label', 'Play video');
        thumbnail.appendChild(playButton);

        // Add click event to play video
        thumbnail.addEventListener('click', () => {
          thumbnail.style.display = 'none';
          iframe.style.display = 'block';
          iframe.src = iframe.src.replace('autoplay=0', 'autoplay=1');
        });
      } else {
        videoContainer.appendChild(iframe);
      }
    }

    // Create text container
    const textContainer = document.createElement('div');
    textContainer.className = 'video-text-text-container';

    // Move heading and text content
    if (heading) {
      textContainer.appendChild(heading);
    }

    // Move remaining paragraphs (excluding video metadata)
    const textParagraphs = [...paragraphs].slice(0, -3);
    textParagraphs.forEach((p) => {
      textContainer.appendChild(p);
    });

    // Move CTA
    if (ctaLink) {
      ctaLink.textContent = ctaText || 'Learn More';
      ctaLink.classList.add('button', 'primary');
      textContainer.appendChild(ctaLink);
    }

    // Create row container
    const contentRow = document.createElement('div');
    contentRow.className = 'video-text-content-row';

    // Append video and text containers
    if (block.classList.contains('video-right')) {
      contentRow.appendChild(textContainer);
      contentRow.appendChild(videoContainer);
    } else {
      contentRow.appendChild(videoContainer);
      contentRow.appendChild(textContainer);
    }

    // Replace row with new structure
    moveInstrumentation(row, contentRow);
    block.appendChild(contentRow);
    row.remove();
  });
}
