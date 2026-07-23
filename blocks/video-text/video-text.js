export default function decorate(block) {
  const wrapper = block.querySelector(":scope > div > div");

  if (!wrapper) return;

  const fields = [...wrapper.children];

  const heading = fields[0];
  const description = fields[1];
  const ctaLinkField = fields[2];
  const ctaTextField = fields[3];
  const videoField = fields[4];
  const thumbnail = fields[5];
  const thumbnailAlt = fields[6];

  // CTA
  const ctaLink = ctaLinkField?.querySelector("a");
  const ctaText = ctaTextField?.textContent.trim();

  // Video
  let videoId = videoField?.textContent.trim() || "";

  // Support full YouTube URL
  if (videoId.includes("youtube.com/watch")) {
    videoId = new URL(videoId).searchParams.get("v");
  }

  if (videoId.includes("youtu.be/")) {
    const url = new URL(videoId);
    videoId = url.pathname.substring(1);
  }

  block.innerHTML = "";

  const videoWrapper = document.createElement("div");
  videoWrapper.className = "video-wrapper";

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
    const img = thumbnail.querySelector("img");
    if (img && thumbnailAlt) {
      img.alt = thumbnailAlt.textContent.trim();
    }
    videoWrapper.append(thumbnail);
  }

  /* ---------------- Text ---------------- */

  const textWrapper = document.createElement("div");
  textWrapper.className = "text-wrapper";

  const content = document.createElement("div");
  content.className = "content";

  if (heading) {
    const h2 = document.createElement("h2");
    h2.innerHTML = heading.innerHTML;
    content.append(h2);
  }

  if (description) {
    description.classList.add("description");
    content.append(description);
  }

  if (ctaLink) {
    ctaLink.textContent = ctaText || ctaLink.textContent;
    ctaLink.classList.add("button", "primary");
    content.append(ctaLink);
  }

  textWrapper.append(content);

  // Layout class from block
  if (block.classList.contains("video-left")) {
    block.append(videoWrapper);
    block.append(textWrapper);
  } else {
    block.append(textWrapper);
    block.append(videoWrapper);
  }
}
