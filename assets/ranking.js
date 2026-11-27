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
  save,
  setLikeBusy,
  state,
  storeCommunity,
  streamerLikes,
  toast,
  weeklyStreamerWinnerIds,
  weeklyWinnerIds,
} from './app.js';
import { BY, CLASS, GAME, MODE, WM, art } from './katalog.js';
import { weaponNames } from './katalog-abgleich.js';
import { renderCurrentDetail } from './loadout.js';
import { currentParam, navigate, replaceViewParam } from './navigation.js';
import { loadoutWeaponSeasons, seasonLabel } from './season.js';
import { streamerFilterKey, streamerLinks } from './creator.js';
import { weaponProfile, weaponProfileSummary } from './waffenprofil.js';

function rankingLoadouts() {
  return [...feed.map((item) => ({ ...item, kind: 'sets' })), ...creators.map((item) => ({ ...item, kind: 'creators' }))];
}

function findRankLoadout(id, kind) {
  const items = kind === 'creators' ? creators : feed;
  return items.find((item) => item.id === id);
}

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

function rankCard(x, i, selectedWeapon) {
  const weekly = el('feedSort').value === 'week',
    weapon = (selectedWeapon === x.secondary && BY[x.secondary]) || BY[x.primary] || WM[0],
    n = weekly ? 1 : i + 1,
    isTop = weekly || i === 0,
    by = x.name || 'Community',
    streamer = x.kind === 'creators',
    liked = Boolean((streamer ? streamerLikes : likedIds)[x.id]),
    detailAttrs = ' data-detail="' + x.id + '" data-detail-kind="' + x.kind + '"';
  const seasons = loadoutWeaponSeasons(x)
    .map(([id, season]) => {
      const slot = id === x.primary ? 'Primär' : 'Sekundär';
      return '<span class="season-chip">' + slot + ' · ' + seasonLabel(season) + '</span>';
    })
    .join('');
  const profiles = [['Primär', x.primary], ['Sekundär', x.secondary]].map(([slot, id]) => {
    const summary = weaponProfileSummary(x, id);
    const name = BY[id] ? weaponNames(BY[id]).de : '';
    return summary ? '<li><strong>' + html(name || slot) + '</strong><span>' + html(slot + ' · ' + summary) + '</span></li>' : '';
  }).join('');
  const media =
    '<div class="rank-media"><span class="rank-number">#' +
    n +
    '</span><span class="rank-heart">♥ ' +
    Number(weekly ? x.weekLikes || 0 : x.likes || 0).toLocaleString('de-DE') +
    (weekly ? ' diese Woche' : '') +
    '</span><button class="rank-art"' + detailAttrs + ' aria-label="Loadout ' +
    html(x.title) +
    ' öffnen">' +
    art(weapon) +
    '</button></div>';
  return (
    '<article class="rank-card ' +
    (isTop ? 'featured' : 'compact') +
    '">' +
    media +
    '<div class="rank-body"><div class="rank-copy"><div class="rank-tags"><span class="rank-tag">' +
    badge(x) +
    (x.local ? ' · NUR HIER' : '') +
    '</span>' +
    (streamer ? '<span class="rank-tag streamer-tag">Streamer</span>' : '') +
    seasons +
    '</div><h2><button' + detailAttrs + '>' +
    html(x.title) +
    '</button></h2><p class="rank-author">' +
    avatar(x) +
    '<span>von ' +
    html(by) +
    ' · ' +
    html(CLASS[weapon.cls]) +
    '</span></p>' + (profiles ? '<ul class="rank-weapon-profiles">' + profiles + '</ul>' : '') +
    (streamer ? streamerLinks(x) : '') +
    '</div><div class="rank-actions"><button class="like-btn" ' + (streamer ? 'data-like-creator' : 'data-like') + '="' +
    x.id +
    '" aria-pressed="' +
    liked +
    '" aria-label="' +
    (liked ? 'Like entfernen' : 'Loadout liken') +
    '">' +
    (liked ? '♥' : '♡') +
    '</button>' +
    '<button class="comment-btn" data-comments="' + x.kind + ':' +
    x.id +
    '" aria-label="Kommentare öffnen">' +
    commentIcon() +
    '<span class="comment-label">Kommentare</span>' +
    (API && !x.local ? '<span class="comment-count">' + Number(x.commentCount || 0) + '</span>' : '') +
    '</button>' +
    '<button class="copy-btn" data-download="' +
    x.id +
    '" data-download-kind="' + x.kind + '">Als Bild herunterladen <span>↓</span></button>' +
    (streamer ? '<button class="copy-btn" data-copy-creator="' + x.id + '">Loadout kopieren →</button>' : '') +
    '</div></div></article>'
  );
}

function weaponMatches(loadout, weapon, gun, distance) {
  return Boolean(weapon) && (gun === 'all' || weapon === gun) &&
    (distance === 'all' || weaponProfile(loadout, weapon).distance === distance);
}

function matchingWeaponSeasons(loadout, gun, season, distance) {
  return loadoutWeaponSeasons(loadout).filter(
    ([weapon, number]) => weaponMatches(loadout, weapon, gun, distance) && (season === undefined || number === season),
  );
}

function seasonMeta(loadouts, gun, season, distance) {
  const topLikes = new Map();
  return loadouts.filter((loadout) => {
    const likes = Number(loadout.likes || 0);
    if (likes <= 0) return false;
    let top = false;
    for (const [weapon] of matchingWeaponSeasons(loadout, gun, season, distance)) {
      // Loadouts are already ordered by descending likes.
      if (!topLikes.has(weapon)) topLikes.set(weapon, likes);
      if (likes === topLikes.get(weapon)) top = true;
    }
    return top;
  });
}

function weeklyLoadouts(items, onlyStreamers) {
  const streamerMax = Math.max(0, ...creators.map((item) => Number(item.weekLikes || 0)));
  const streamerIds = weeklyStreamerWinnerIds ?? creators.filter((item) => streamerMax > 0 && Number(item.weekLikes || 0) === streamerMax).map((item) => item.id);
  const winners = items.filter((item) => item.kind === 'creators' ? streamerIds.includes(item.id) : weeklyWinnerIds.includes(item.id));
  if (onlyStreamers) return winners.filter((item) => item.kind === 'creators');
  const most = Math.max(0, ...winners.map((item) => Number(item.weekLikes || 0)));
  return winners.filter((item) => Number(item.weekLikes || 0) === most);
}

function rankAudience(items) {
  const onlyStreamers = el('feedAudience')?.value === 'creators';
  return onlyStreamers ? items.filter((item) => item.kind === 'creators') : items;
}

function redrawFeed() {
  if (!el('feedGame')) return;
  const game = el('feedGame').value,
    mode = el('feedMode').value,
    gun = el('feedWeapon').value,
    distance = el('feedDistance')?.value || 'all',
    sort = el('feedSort').value,
    seasonFilter = el('feedSeason'),
    streamer = el('feedStreamer')?.value || 'all',
    onlyStreamers = el('feedAudience')?.value === 'creators';
  const meta = sort === 'meta',
    weekly = sort === 'week';
  let season = seasonFilter?.value && seasonFilter.value !== 'all' ? Number(seasonFilter.value) : undefined;
  const items = rankingLoadouts();
  const sources = weekly ? weeklyLoadouts(items, onlyStreamers) : items;
  let shown = rankAudience(sources).filter(
    (x) =>
      (game === 'all' || x.game === game) &&
      (mode === 'all' || x.mode === mode) &&
      (gun === 'all' && distance === 'all' ||
        [x.primary, x.secondary].some(weapon => weaponMatches(x, weapon, gun, distance))) &&
      (streamer === 'all' || streamerFilterKey(x) === streamer),
  );
  if (seasonFilter) seasonFilter.options[0].textContent = meta ? 'Neueste Season' : 'Alle Seasons';
  if (meta && season === undefined) {
    for (const loadout of shown) {
      for (const [, number] of matchingWeaponSeasons(loadout, gun, undefined, distance)) {
        if (season === undefined || number > season) season = number;
      }
    }
  }
  if (season !== undefined) shown = shown.filter((x) => matchingWeaponSeasons(x, gun, season, distance).length > 0);
  shown.sort(
    sort === 'new' ? (a, b) => Date.parse(b.created || 0) - Date.parse(a.created || 0) : compareRank,
  );
  if (meta) shown = season === undefined ? [] : seasonMeta(shown, gun, season, distance);
  const hint = el('rankingHint');
  if (hint) {
    hint.hidden = !weekly && !meta;
    hint.textContent = weekly
      ? 'Die meisten Likes seit Montag, 00:00 Uhr (deutsche Zeit). Bei Gleichstand teilen sich alle Gewinner Platz 1. Entfernte Likes zählen nicht.'
      : meta && season !== undefined
        ? seasonLabel(season) + ' · Die Loadouts mit den meisten Likes je Waffe.'
        : '';
    if (!hint.textContent) hint.hidden = true;
  }
  const emptyTitle = weekly
    ? 'Noch kein Wochengewinner für diese Auswahl.'
    : meta
      ? 'Für diese Auswahl gibt es noch keine Season-META.'
      : season !== undefined
        ? 'Keine Loadouts für ' + seasonLabel(season) + '.'
        : 'Hier ist noch kein Loadout veröffentlicht.';
  const emptyMessage = weekly
    ? 'Es zählen nur Likes aus der laufenden Woche. Setze die Filter zurück, um die Wochengewinner zu sehen.'
    : meta
      ? 'Für die Season-META braucht ein Loadout eine Waffen-Season und mindestens einen Like.'
      : 'Wähle einen anderen Filter oder veröffentliche dein Loadout.';
  visibleRank = shown;
  el('loadoutList').innerHTML = shown.length
    ? shown.map((loadout, index) => rankCard(loadout, index, gun)).join('')
    : '<div class="empty"><strong>' +
      emptyTitle +
      '</strong><p>' +
      emptyMessage +
      '</p>' + (onlyStreamers
        ? '<button type="button" class="primary-btn" id="startStreamerLoadout">Streamer-Loadout bauen →</button>'
        : '<button type="button" class="primary-btn" data-view="builder">Loadout bauen →</button>') + '</div>';
  const reset = el('resetRankFilters');
  if (reset) reset.hidden = !onlyStreamers && mode === 'all' && gun === 'all' && distance === 'all' && sort === 'popular' &&
    (!seasonFilter || seasonFilter.value === 'all');
}

let visibleRank = [],
  communityConnection = '',
  feedStatusText = '';
function renderFeed() {
  if (!el('communityStats')) return;
  el('communityStats').hidden = !API;
  updateCommunityConnection(communityConnection);
  setFeedStatus(feedStatusText);
  const all = rankingLoadouts();
  el('loadoutCount').textContent = all.length.toLocaleString('de-DE');
  el('likesCount').textContent = all.reduce((n, x) => n + Number(x.likes || 0), 0).toLocaleString('de-DE');
  el('creatorCount').textContent = new Set(creators.map(streamerFilterKey).filter(Boolean)).size.toLocaleString('de-DE');
  const audience = rankAudience(all);
  const name = el('feedStreamer');
  const onlyStreamers = el('feedAudience')?.value === 'creators';
  if (name) {
    name.closest('label').hidden = !onlyStreamers;
    const selectedStreamer = onlyStreamers ? name.value : 'all';
    const names = onlyStreamers ? new Map(audience.map((item) => [streamerFilterKey(item), item.name || item.handle]).filter(([key]) => key)) : new Map();
    name.innerHTML = '<option value="all">Alle Streamer</option>' + [...names]
      .sort((a, b) => a[1].localeCompare(b[1], 'de'))
      .map(([id, label]) => '<option value="' + html(id) + '">' + html(label) + '</option>').join('');
    name.value = names.has(selectedStreamer) ? selectedStreamer : 'all';
  }
  updateRankOptions(audience);
  redrawFeed();
}

function updateRankOptions(audience) {
  const game = el('feedGame').value,
    mode = el('feedMode').value,
    streamer = el('feedStreamer')?.value || 'all';
  const scope = audience.filter((item) => (game === 'all' || item.game === game) &&
    (mode === 'all' || item.mode === mode) && (streamer === 'all' || streamerFilterKey(item) === streamer));
  const old = el('feedWeapon').value || 'all',
    present = new Set(scope.flatMap((x) => [x.primary, x.secondary]));
  el('feedWeapon').innerHTML =
    '<option value="all">Alle Waffen</option>' +
    WM.filter((w) => present.has(w.id))
      .map((w) => '<option value="' + w.id + '">' + html(weaponNames(w).de) + ' (' + w.game.toUpperCase() + ')</option>')
      .join('');
  el('feedWeapon').value = present.has(old) ? old : 'all';
  const seasonFilter = el('feedSeason');
  if (seasonFilter) {
    const selected = seasonFilter.value,
      seasons = [...new Set(scope.flatMap((x) => loadoutWeaponSeasons(x).map(([, number]) => number)))];
    seasonFilter.innerHTML =
      '<option value="all">Alle Seasons</option>' +
      seasons
        .sort((a, b) => b - a)
        .map((number) => '<option value="' + number + '">' + seasonLabel(number) + '</option>')
        .join('');
    seasonFilter.value = seasons.includes(Number(selected)) ? selected : 'all';
  }
}

function activateRanking() {
  if (el('feedAudience')) el('feedAudience').value = currentParam('streamer') === '1' ? 'creators' : 'all';
  renderFeed();
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

function rankPlace(id, kind = 'sets') {
  const matches = (item) => item.id === id && item.kind === kind;
  const sort = el('feedSort');
  if (!sort) return rankingLoadouts().sort(compareRank).findIndex(matches) + 1;
  const index = visibleRank.findIndex(matches);
  return index < 0 ? 0 : sort.value === 'week' ? 1 : index + 1;
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.detail !== undefined) navigate('detail', { params: { id: button.dataset.detail,
    ...(button.dataset.detailKind === 'creators' ? { kind: 'creators' } : {}),
  } });
  if (button.dataset.like) like(Number(button.dataset.like));
  if (button.id === 'refreshFeed') refresh();
  if (button.id === 'startStreamerLoadout') {
    state.publisherType = 'streamer';
    save();
    navigate('builder');
  }
  if (button.id === 'resetRankFilters') {
    for (const id of ['feedAudience', 'feedGame', 'feedMode', 'feedStreamer', 'feedWeapon', 'feedDistance', 'feedSeason', 'feedSort'])
      if (el(id)) el(id).selectedIndex = 0;
    replaceViewParam('streamer', '');
    renderFeed();
    el('feedAudience')?.focus();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'feedAudience') replaceViewParam('streamer', e.target.value === 'creators' ? '1' : '');
  if (['feedAudience', 'feedGame', 'feedMode', 'feedStreamer'].includes(e.target.id)) renderFeed();
  if (['feedWeapon', 'feedDistance', 'feedSeason', 'feedSort'].includes(e.target.id)) redrawFeed();
});

export {
  activateRanking,
  avatar,
  badge,
  findRankLoadout,
  rankPlace,
  redrawFeed,
  renderFeed,
  setFeedStatus,
  updateCommunityConnection,
};
