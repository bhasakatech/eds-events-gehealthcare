/*
 * Embed Block
 * Renders videos (YouTube, Vimeo), social posts (X/Twitter) and generic third-party
 * pages/apps (e.g. meeting schedulers) in an iframe.
 * Content contract: optional placeholder image + a link (the URL to embed).
 */

const loadScript = (url) => {
  if (document.querySelector(`head > script[src="${url}"]`)) return;
  const script = document.createElement('script');
  script.src = url;
  document.head.append(script);
};

const videoFrame = (src, title) => `<div class="embed-frame embed-frame-video">
    <iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
      allowfullscreen title="${title}" loading="lazy"></iframe>
  </div>`;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  if (url.hostname.includes('youtu.be')) [, vid] = url.pathname.split('/');
  const src = vid
    ? `https://www.youtube.com/embed/${vid}?rel=0&v=${vid}${suffix}`
    : `https://www.youtube.com${url.pathname}`;
  return videoFrame(src, 'Content from YouTube');
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  return videoFrame(`https://player.vimeo.com/video/${video}${suffix}`, 'Content from Vimeo');
};

const embedTwitter = (url) => {
  const href = url.href.replace('https://x.com', 'https://twitter.com');
  loadScript('https://platform.twitter.com/widgets.js');
  return `<blockquote class="twitter-tweet"><a href="${href}"></a></blockquote>`;
};

const embedDefault = (url) => `<div class="embed-frame embed-frame-page">
    <iframe src="${url.href}" allow="encrypted-media; clipboard-write" allowfullscreen
      title="Content from ${url.hostname}" loading="lazy"></iframe>
  </div>`;

const EMBEDS_CONFIG = [
  { match: ['youtube', 'youtu.be'], type: 'youtube', embed: embedYoutube },
  { match: ['vimeo'], type: 'vimeo', embed: embedVimeo },
  { match: ['twitter', 'x.com'], type: 'twitter', embed: embedTwitter },
];

const getConfig = (url) => EMBEDS_CONFIG
  .find((c) => c.match.some((m) => url.hostname.includes(m)))
  || { type: 'page', embed: embedDefault };

const loadEmbed = (block, url, autoplay) => {
  if (block.classList.contains('embed-is-loaded')) return;
  block.innerHTML = getConfig(url).embed(url, autoplay);
  block.classList.add('embed-is-loaded');
};

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const placeholder = block.querySelector('picture');
  const anchor = block.querySelector('a[href]');
  const link = anchor ? anchor.href : block.textContent.trim().split(/\s+/).find((t) => /^https?:\/\//.test(t));
  if (!link) return;
  let url;
  try {
    url = new URL(link, window.location.href);
  } catch (e) {
    return;
  }
  // type class is set up front so CSS can reserve the frame size before lazy load (no CLS)
  block.classList.add(`embed-${getConfig(url).type}`);
  block.textContent = '';

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-placeholder';
    wrapper.innerHTML = '<div class="embed-placeholder-play"><button type="button" title="Play" aria-label="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => loadEmbed(block, url, true));
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, url);
      }
    });
    observer.observe(block);
  }
}
