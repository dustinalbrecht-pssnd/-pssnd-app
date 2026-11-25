import {
  API,
  STREAMER_KEY,
  STREAMER_LIKES_KEY,
  apiPost,
  commentIcon,
  creators,
  el,
  html,
  likeBusy,
  localStreamers,
  save,
  setLikeBusy,
  state,
  streamerLikes,
  toast,
} from './app.js';
import { BY, CLASS, GAME, MODE, WM, art } from './katalog.js';
import { weaponNames } from './katalog-abgleich.js';
import { navigate } from './navigation.js';
import { importLoadout } from './bauen.js';

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
    renderCreators();
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

function resetStreamerFilters() {
  el('streamerName').value = 'all';
  el('streamerGame').selectedIndex = 0;
  el('streamerWeapon').value = 'all';
  el('streamerSort').value = 'popular';
  renderCreators();
  el('streamerName').focus();
}

function renderCreators() {
  if (!el('streamerGame')) return;
  const items = API ? creators : localStreamers;
  const game = el('streamerGame').value;
  const gameCreators = items.filter((x) => BY[x.primary] && (game === 'all' || x.game === game));
  const previousName = el('streamerName').value || 'all',
    names = new Map();
  for (const item of gameCreators) {
    const key = streamerFilterKey(item);
    if (key && !names.has(key))
      names.set(
        key,
        String(item.name || item.handle)
          .trim()
          .replace(/\s+/g, ' '),
      );
  }
  el('streamerName').innerHTML =
    '<option value="all">Alle Streamer</option>' +
    [...names]
      .sort((a, b) => a[1].localeCompare(b[1], 'de', { sensitivity: 'base', numeric: true }))
      .map(([key, name]) => '<option value="' + html(key) + '">' + html(name) + '</option>')
      .join('');
  el('streamerName').value = names.has(previousName) ? previousName : 'all';
  const old = el('streamerWeapon').value || 'all';
  const used = new Set(items.flatMap((x) => [x.primary, x.secondary]));
  el('streamerWeapon').innerHTML =
    '<option value="all">Alle Waffen</option>' +
    WM.filter((w) => used.has(w.id))
      .map((w) => '<option value="' + w.id + '">' + html(weaponNames(w).de) + ' · ' + w.game.toUpperCase() + '</option>')
      .join('');
  el('streamerWeapon').value = used.has(old) ? old : 'all';
  const name = el('streamerName').value,
    gun = el('streamerWeapon').value,
    sort = el('streamerSort').value;
  const list = gameCreators
    .filter(
      (x) =>
        (name === 'all' || streamerFilterKey(x) === name) &&
        (gun === 'all' || x.primary === gun || x.secondary === gun),
    )
    .sort((a, b) =>
      sort === 'new'
        ? Date.parse(b.created || 0) - Date.parse(a.created || 0)
        : Number(b.likes || 0) - Number(a.likes || 0) ||
          Date.parse(b.created || 0) - Date.parse(a.created || 0),
    );
  el('streamerResults').textContent =
    list.length +
    ' ' +
    (list.length === 1 ? 'Loadout' : 'Loadouts') +
    (names.has(name)
      ? ' von ' + names.get(name)
      : ' von ' + names.size + ' ' + (names.size === 1 ? 'Streamer' : 'Streamern'));
  el('clearStreamerFilters').hidden =
    name === 'all' && gun === 'all' && sort === 'popular' && el('streamerGame').selectedIndex === 0;
  el('creatorList').innerHTML = list.length
    ? list
        .map((x) => {
          const w = BY[x.primary],
            s = BY[x.secondary],
            links = [
              ['▶ YouTube', x.youtube],
              ['◉ Twitch', x.twitch],
              ['◎ Instagram', x.instagram],
            ]
              .filter(([_, v]) => /^https:\/\//.test(v || ''))
              .map(
                ([label, url]) =>
                  '<a href="' + html(url) + '" target="_blank" rel="noopener noreferrer">' + label + ' ↗</a>',
              )
              .join('');
          return (
            '<article class="creator-card streamer-card"><div class="creator-head">' +
            (x.photo
              ? '<img src="' + html(x.photo) + '" alt="Foto von ' + html(x.name) + '">'
              : '<div class="creator-avatar">' + html((x.name || 'S')[0]) + '</div>') +
            '<div><span class="rank-tag">' +
            html(GAME[x.game]) +
            ' · ' +
            html(MODE[x.mode]) +
            '</span><h3>' +
            html(x.name) +
            '</h3><small>' +
            html(x.handle || '') +
            '</small></div></div><div class="card-art">' +
            art(w) +
            '</div><div class="streamer-gun"><span>' +
            html(CLASS[w.cls]) +
            '</span><strong>' +
            html(weaponNames(w).de) +
            '</strong><small>+ ' +
            html(weaponNames(s).de || 'Sekundärwaffe') +
            '</small></div>' +
            (x.note ? '<p>' + html(x.note) + '</p>' : '') +
            '<div class="social-links">' +
            links +
            '</div><div class="card-actions"><button data-copy-creator="' +
            x.id +
            '">Loadout kopieren →</button><button aria-pressed="' +
            !!streamerLikes[x.id] +
            '" aria-label="' +
            (streamerLikes[x.id] ? 'Like entfernen' : 'Streamer-Loadout liken') +
            '" data-like-creator="' +
            x.id +
            '">' +
            (streamerLikes[x.id] ? '♥' : '♡') +
            ' ' +
            Number(x.likes || 0) +
            '</button>' +
            '<button class="comment-btn" data-comments="creators:' +
            x.id +
            '" aria-label="Kommentare öffnen">' +
            commentIcon() +
            '<span class="comment-label">Kommentare</span>' +
            (API ? '<span class="comment-count">' + Number(x.commentCount || 0) + '</span>' : '') +
            '</button>' +
            '</div>' +
            (!API ? '<small class="local-label">Nur auf diesem Gerät sichtbar</small>' : '') +
            '</article>'
          );
        })
        .join('')
    : gameCreators.length
      ? '<div class="empty"><strong>Keine Loadouts für diese Auswahl.</strong><p>Wähle eine andere Waffe oder setze die Filter zurück, um wieder alle Streamer zu sehen.</p></div>'
      : '<div class="empty"><strong>Hier beginnt die Streamer-Galerie.</strong><p>Baue dein Loadout und veröffentliche es mit deinem Freigabecode. Foto und Kanäle sind optional.</p><button class="primary-btn" id="creatorEmpty">Streamer-Loadout erstellen →</button></div>';
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.id === 'clearStreamerFilters') resetStreamerFilters();
  if (button.id === 'openCreator' || button.id === 'creatorEmpty') {
    state.publisherType = 'streamer';
    save();
    navigate('builder');
  }
  if (button.dataset.copyCreator) {
    const item = creators.find((v) => v.id === Number(button.dataset.copyCreator));
    if (item) importLoadout(item);
  }
  if (button.dataset.likeCreator) likeCreator(Number(button.dataset.likeCreator));
});
document.addEventListener('change', (e) => {
  if (['streamerName', 'streamerGame', 'streamerWeapon', 'streamerSort'].includes(e.target.id))
    renderCreators();
});

export { renderCreators };
