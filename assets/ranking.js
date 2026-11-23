import {
  API,
  apiPost,
  commentIcon,
  creators,
  el,
  feed,
  html,
  likeBusy,
  likedIds,
  refresh,
  setLikeBusy,
  storeCommunity,
  toast,
  weeklyWinnerIds,
} from './app.js';
import { BY, CLASS, GAME, MODE, WM, art } from './katalog.js';
import { renderCurrentDetail } from './loadout.js';
import { navigate } from './navigation.js';

function badge(x) {
  return html((GAME[x.game] || 'COD') + ' · ' + (MODE[x.mode] || ''));
}

function avatar(x) {
  const src = x.photo || '',
    safe =
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || /^https:\/\/[^\s"<>]+$/.test(src);
  return safe
    ? '<img class="post-avatar" src="' + html(src) + '" alt="Profilbild">'
    : '<span class="post-avatar fallback-avatar">' +
        html((x.name || 'C').slice(0, 1).toUpperCase()) +
        '</span>';
}

function rankCard(x, i) {
  const weekly = el('feedSort').value === 'week',
    w = BY[x.primary] || WM[0],
    n = weekly ? 1 : i + 1,
    isTop = weekly || i === 0,
    by = x.name || 'Community';
  const media =
    '<div class="rank-media"><span class="rank-number">#' +
    n +
    '</span><span class="rank-heart">♥ ' +
    Number(weekly ? x.weekLikes || 0 : x.likes || 0).toLocaleString('de-DE') +
    (weekly ? ' diese Woche' : '') +
    '</span><button class="rank-art" data-detail="' +
    x.id +
    '" aria-label="Loadout ' +
    html(x.title) +
    ' öffnen">' +
    art(w) +
    '</button></div>';
  return (
    '<article class="rank-card ' +
    (isTop ? 'featured' : 'compact') +
    '">' +
    media +
    '<div class="rank-body"><div class="rank-copy"><span class="rank-tag">' +
    badge(x) +
    (x.local ? ' · NUR HIER' : '') +
    '</span><h2><button data-detail="' +
    x.id +
    '">' +
    html(x.title) +
    '</button></h2><p class="rank-author">' +
    avatar(x) +
    '<span>von ' +
    html(by) +
    ' · ' +
    html(CLASS[w.cls]) +
    '</span></p></div><div class="rank-actions"><button class="like-btn" data-like="' +
    x.id +
    '" aria-pressed="' +
    !!likedIds[x.id] +
    '" aria-label="' +
    (likedIds[x.id] ? 'Like entfernen' : 'Loadout liken') +
    '">' +
    (likedIds[x.id] ? '♥' : '♡') +
    '</button>' +
    '<button class="comment-btn" data-comments="sets:' +
    x.id +
    '" aria-label="Kommentare öffnen">' +
    commentIcon() +
    '<span class="comment-label">Kommentare</span>' +
    (API && !x.local ? '<span class="comment-count">' + Number(x.commentCount || 0) + '</span>' : '') +
    '</button>' +
    '<button class="copy-btn" data-download="' +
    x.id +
    '">Als Bild herunterladen <span>↓</span></button></div></div></article>'
  );
}

function redrawFeed() {
  if (!el('feedGame')) return;
  const game = el('feedGame').value,
    mode = el('feedMode').value,
    gun = el('feedWeapon').value,
    sort = el('feedSort').value;
  let shown = feed.filter(
    (x) =>
      (game === 'all' || x.game === game) &&
      (mode === 'all' || x.mode === mode) &&
      (gun === 'all' || x.primary === gun || x.secondary === gun) &&
      (sort !== 'week' || weeklyWinnerIds.includes(x.id)),
  );
  let hint = el('weeklyHint');
  if (!hint) {
    hint = document.createElement('p');
    hint.id = 'weeklyHint';
    hint.className = 'local-hint';
    document.querySelector('.rank-filters').after(hint);
  }
  hint.hidden = sort !== 'week';
  hint.textContent =
    'Die meisten Likes seit Montag, 00:00 Uhr (deutsche Zeit). Bei Gleichstand teilen sich alle Gewinner Platz 1. Entfernte Likes zählen nicht.';
  shown.sort(
    sort === 'new' ? (a, b) => Date.parse(b.created || 0) - Date.parse(a.created || 0) : compareRank,
  );
  visibleRank = shown.map((x) => x.id);
  el('loadoutList').innerHTML = shown.length
    ? shown.map(rankCard).join('')
    : '<div class="empty"><strong>' +
      (sort === 'week'
        ? 'Noch kein Wochengewinner für diese Auswahl.'
        : 'Hier ist noch kein Loadout veröffentlicht.') +
      '</strong><p>' +
      (sort === 'week'
        ? 'Es zählen nur Likes aus der laufenden Woche. Wähle alle Modi und Waffen, um die Wochengewinner zu sehen.'
        : 'Wähle einen anderen Filter oder veröffentliche dein Loadout.') +
      '</p><button class="primary-btn" data-view="builder">Loadout bauen →</button></div>';
}

let visibleRank = [],
  communityConnection = '',
  feedStatusText = '';
function renderFeed() {
  if (!el('communityStats')) return;
  el('communityStats').hidden = !API;
  updateCommunityConnection(communityConnection);
  setFeedStatus(feedStatusText);
  el('loadoutCount').textContent = feed.length.toLocaleString('de-DE');
  el('likesCount').textContent = feed.reduce((n, x) => n + Number(x.likes || 0), 0).toLocaleString('de-DE');
  el('creatorCount').textContent = creators.length.toLocaleString('de-DE');
  const old = el('feedWeapon').value || 'all',
    present = new Set(feed.flatMap((x) => [x.primary, x.secondary]));
  el('feedWeapon').innerHTML =
    '<option value="all">Alle Waffen</option>' +
    WM.filter((w) => present.has(w.id))
      .map((w) => '<option value="' + w.id + '">' + html(w.name) + ' (' + w.game.toUpperCase() + ')</option>')
      .join('');
  el('feedWeapon').value = present.has(old) ? old : 'all';
  redrawFeed();
}

async function like(id) {
  const item = feed.find((v) => v.id === id);
  if (!item) return;
  const key = 'sets:' + id;
  if (likeBusy.has(key)) return;
  const wanted = !likedIds[id];
  likeBusy.add(key);
  setLikeBusy('data-like', id, true);
  try {
    if (!API || item.local) {
      likedIds[id] = wanted;
      item.likes = Math.max(0, Number(item.likes || 0) + (wanted ? 1 : -1));
    } else {
      const x = await apiPost('/api/sets/' + id + '/like', { liked: wanted });
      likedIds[id] = x.liked;
      item.likes = x.likes;
    }
    storeCommunity();
    if (API && !item.local) await refresh();
    else renderFeed();
    renderCurrentDetail();
    toast(wanted ? 'Like hinzugefügt ♥' : 'Like entfernt');
  } catch (err) {
    toast(err.message);
  } finally {
    likeBusy.delete(key);
    setLikeBusy('data-like', id, false);
  }
}

function updateCommunityConnection(status) {
  communityConnection = status;
  const box = el('communityConnection');
  if (!box) return;
  box.hidden = !status;
  box.innerHTML =
    status === 'setup'
      ? '<strong>Die Community wird gerade eingerichtet.</strong><p>Öffentliche Loadouts und Kommentare sind danach verfügbar. Du kannst schon Waffen ansehen und dein Loadout bauen.</p>'
      : status === 'offline'
        ? '<strong>Die Community ist gerade nicht erreichbar.</strong><p>Deine Daten bleiben erhalten. Versuche es über „Neu laden“ erneut.</p>'
        : '';
}

function setFeedStatus(message) {
  feedStatusText = message;
  const status = el('feedStatus');
  if (status) status.textContent = message;
}

function compareRank(a, b) {
  return (
    Number(b.likes || 0) - Number(a.likes || 0) ||
    Number(Boolean(a.demo)) - Number(Boolean(b.demo)) ||
    a.id - b.id
  );
}

function rankPlace(id) {
  const sort = el('feedSort');
  if (!sort) return [...feed].sort(compareRank).findIndex((item) => item.id === id) + 1;
  if (sort.value === 'week' && weeklyWinnerIds.includes(id)) return 1;
  return visibleRank.indexOf(id) + 1;
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.detail !== undefined) navigate('detail', { params: { id: button.dataset.detail } });
  if (button.dataset.like) like(Number(button.dataset.like));
  if (button.id === 'refreshFeed') refresh();
});
document.addEventListener('change', (e) => {
  if (['feedGame', 'feedMode', 'feedWeapon', 'feedSort'].includes(e.target.id)) redrawFeed();
});

export {
  avatar,
  badge,
  rankPlace,
  redrawFeed,
  renderFeed,
  setFeedStatus,
  updateCommunityConnection,
  visibleRank,
};
