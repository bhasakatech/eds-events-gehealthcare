export default function decorate(block) {
  block.classList.add('hero-layout');
  // No field parsing needed — the hero model has zero fields.
  // Its only job is to lay out the hero-text and hero-media children,
  // which EDS decorates automatically since they're their own blocks.
}
