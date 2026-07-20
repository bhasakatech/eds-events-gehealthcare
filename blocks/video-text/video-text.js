export default function decorate(block) {
  const wrapper = block.querySelector(':scope > div > div');

  if (!wrapper) return;

  const elements = [...wrapper.children];

  const heading = elements[0];
  const description = elements[1];
  const videoField = elements[2];
  const thumbnail = elements[3];

  const videoId = videoField ? videoField.textContent.trim() : '';

  block.innerHTML = '';

  /* Video */

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
    videoWrapper.append(thumbnail);
  }

  /* Text */

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

  textWrapper.append(content);

  block.append(textWrapper);
  block.append(videoWrapper);
}
