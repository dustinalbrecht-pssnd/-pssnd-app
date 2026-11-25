import {
  API, STREAMER_KEY, STREAMER_LIKES_KEY, apiPost, creators, html, likeBusy,
  localStreamers, setLikeBusy, streamerLikes, toast,
} from './app.js';
import { importLoadout } from './bauen.js';
import { renderFeed } from './ranking.js';
import { renderCurrentDetail } from './loadout.js';

async function likeCreator(id) {
  const item = creators.find((c) => c.id === id);
  if (!item) return;
  const key = 'creators:' + id;
  if (likeBusy.has(key)) return;
  const wanted = !streamerLikes[id];
  likeBusy.add(key);
  setLikeBusy('data-like-creator', id, true);
  try {
    if (!API) {
      streamerLikes[id] = wanted;
      item.likes = Math.max(0, Number(item.likes || 0) + (wanted ? 1 : -1));
      localStorage.setItem(STREAMER_KEY, JSON.stringify(localStreamers));
    } else {
      const x = await apiPost('/api/creators/' + id + '/like', { liked: wanted });
      streamerLikes[id] = x.liked;
      item.likes = x.likes;
    }
    localStorage.setItem(STREAMER_LIKES_KEY, JSON.stringify(streamerLikes));
    renderFeed();
    renderCurrentDetail();
    toast(wanted ? 'Like hinzugefügt ♥' : 'Like entfernt');
  } catch (e) {
    toast(e.message);
  } finally {
    likeBusy.delete(key);
    setLikeBusy('data-like-creator', id, false);
  }
}

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
  if (button.dataset.likeCreator) likeCreator(Number(button.dataset.likeCreator));
  if (button.dataset.copyCreator) {
    const item = creators.find((value) => value.id === Number(button.dataset.copyCreator));
    if (item) importLoadout(item);
  }
});

export { streamerFilterKey, streamerLinks };
