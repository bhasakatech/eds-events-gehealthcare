import config from '../../scripts/config.js';

export default async function decorate(block) {
  const aemHost = config.host;

  const xfPath = block.querySelector('a')?.textContent.trim();
  if (!xfPath) return;

  const response = await fetch(`${aemHost}${xfPath}/master.plain.html`, {
    credentials: 'include',
  });

  if (!response.ok) return;

  block.innerHTML = await response.text();
}
