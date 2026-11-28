import { creators, html } from './app.js';
import { importLoadout } from './bauen.js';

function streamerFilterKey(item) {
  const name = String(item.name || item.handle || '')
    .trim()
    .replace(/\s+/g, ' ');
  return name ? 'name:' + name.normalize('NFKC').toLocaleLowerCase('de-DE') : '';
}

function streamerLinks(item) {
  const links = [['YouTube', item.youtube], ['Twitch', item.twitch], ['Instagram', item.instagram]]
    .filter(([, url]) => /^https:\/\/[^\s"<>]+$/.test(url || ''))
    .map(([name, url]) => '<a href="' + html(url) + '" target="_blank" rel="noopener noreferrer">' + name + ' ↗</a>');
  return links.length ? '<div class="social-links">' + links.join('') + '</div>' : '';
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.copyCreator) {
    const item = creators.find((value) => value.id === Number(button.dataset.copyCreator));
    if (item) importLoadout(item, button.dataset.loadoutWeapon);
  }
});

export { streamerFilterKey, streamerLinks };
