import {
  API,
  creators,
  el,
  feed,
  html,
  likeBusy,
  likedIds,
  paintVoteButton,
  refresh,
  save,
  setupSlots,
  state,
  storeCommunity,
  streamerLikes,
  STREAMER_KEY,
  STREAMER_LIKES_KEY,
  localStreamers,
  toggleLike,
  weeklyStreamerWinnerIds,
  weeklyWinnerIds,
} from './app.js';
import { BY, CLASS, GAME, MODE, WM, art } from './katalog.js';
import { weaponNames } from './katalog-abgleich.js';
import { renderCurrentDetail } from './loadout.js';
import { currentParam, navigate, replaceViewParam } from './navigation.js';
import { loadoutWeaponSeasons, seasonLabel, weaponSeason } from './season.js';
import { streamerFilterKey, streamerLinks } from './creator.js';
import { weaponProfile, weaponProfileSummary } from './waffenprofil.js';
import { ADMIN_AUTHOR } from './admin-baukasten-kontext.js';

const advancedFilters = ['feedAudience', 'feedStreamer', 'feedSeason', 'feedGame'];
const rankingFilters = ['feedWeapon', 'feedDistance', 'feedMode', ...advancedFilters];

function rankView() {
  return el('feedSetupType')?.querySelector('input:checked')?.value || 'auto';
}

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
  if (x.authorLogo === ADMIN_AUTHOR.logo) {
    return '<img class="post-avatar eupdate-author-avatar" src="' + html(ADMIN_AUTHOR.image) + '" alt="" loading="lazy" decoding="async">';
  }
  const src = x.photo || '',
    safe =
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || /^https:\/\/[^\s"<>]+$/.test(src);
  return safe
    ? '<img class="post-avatar" src="' + html(src) + '" alt="" loading="lazy" decoding="async">'
    : '<span class="post-avatar fallback-avatar">' +
        html((x.name || 'C').slice(0, 1).toUpperCase()) +
        '</span>';
}

function postLikeButton(item, kind) {
  const streamer = kind === 'creators';
  const pending = likeBusy.has(kind + ':' + item.id);
  const vote = { liked: Boolean((streamer ? streamerLikes : likedIds)[item.id]), likes: Number(item.likes || 0) };
  return '<button type="button" class="like-btn vote-button" ' +
    (streamer ? 'data-like-creator' : 'data-like') + '="' + item.id +
    '" aria-label="Loadout liken" aria-pressed="' + vote.liked + '"' +
    (pending ? ' aria-busy="true" aria-disabled="true"' : '') +
    '><span class="vote-symbol" aria-hidden="true">' + (vote.liked ? '♥' : '♡') +
    '</span><span class="vote-count">' + vote.likes.toLocaleString('de-DE') + '</span></button>';
}

function rankCard({ loadout: x, weaponId }, i, weekly) {
  const weapon = BY[weaponId || x.primary] || WM[0],
    title = weaponId ? weaponNames(weapon).de : x.title,
    n = weekly ? 1 : i + 1,
    isTop = weekly || i === 0,
    by = x.name || 'Community',
    streamer = x.kind === 'creators',
    weaponAttr = weaponId ? ' data-loadout-weapon="' + html(weaponId) + '"' : '',
    detailAttrs = ' data-detail="' + x.id + '" data-detail-kind="' + x.kind + '"' + weaponAttr;
  const seasons = loadoutWeaponSeasons(x)
    .filter(([id]) => !weaponId || id === weaponId)
    .map(([id, season]) => {
      const slot = id === x.primary ? 'Primär' : 'Sekundär';
      return '<span class="season-chip">' + slot + ' · ' + seasonLabel(season) + '</span>';
    })
    .join('');
  const slots = weaponId
    ? [[weaponId === x.primary ? 'Primär' : 'Sekundär', weaponId]]
    : [['Primär', x.primary], ['Sekundär', x.secondary]];
  const profiles = slots.map(([slot, id]) => {
    if (!id) return '';
    const summary = weaponProfileSummary(x, id);
    if (weaponId) return '<li><span>' + html(summary ? slot + ' · ' + summary : slot) + '</span></li>';
    const name = weaponNames(BY[id]).de;
    return '<li><strong>' + html(name || slot) + '</strong><span>' +
      html(summary ? slot + ' · ' + summary : slot) + '</span></li>';
  }).join('');
  const media =
    '<div class="rank-media weapon-stage"><span class="rank-number" aria-label="Platz ' + n + '">#' +
    n +
    '</span>' + (weekly ? '<span class="rank-heart">♥ ' + Number(x.weekLikes || 0).toLocaleString('de-DE') + ' diese Woche</span>' : '') +
    '<button class="rank-art"' + detailAttrs + ' aria-label="' +
    (weaponId ? '' : 'Loadout ') + html(title) +
    ' öffnen">' +
    art(weapon) +
    '</button></div>';
  return (
    '<article class="rank-card' +
    (isTop ? ' rank-leader' : '') +
    '">' +
    media +
    '<div class="rank-body"><div class="rank-copy"><div class="rank-tags"><span class="rank-tag">' +
    badge(x) +
    (x.local ? ' · NUR HIER' : '') +
    '</span>' +
    (streamer ? '<span class="rank-tag streamer-tag">Streamer</span>' : '') +
    seasons +
    '</div><h2><button' + detailAttrs + '>' +
    html(title) +
    '</button></h2><p class="rank-author">' +
    avatar(x) +
    '<span>von ' +
    html(by) +
    ' · ' +
    html(CLASS[weapon.cls]) +
    '</span></p>' + (profiles ? '<ul class="rank-weapon-profiles">' + profiles + '</ul>' : '') +
    (streamer ? streamerLinks(x) : '') +
    '</div><div class="rank-actions">' + postLikeButton(x, x.kind) +
    '<button class="copy-btn" data-download="' +
    x.id +
    '" data-download-kind="' + x.kind + '"' + weaponAttr + '>' +
    (weaponId ? 'Waffenbild speichern' : 'Bild speichern') + ' <span aria-hidden="true">↓</span></button>' +
    (streamer && !weaponId ? '<button class="copy-btn" data-copy-creator="' + x.id + '">Setup kopieren</button>' : '') +
    '</div></div></article>'
  );
}

function matchingWeapons(loadout, slots, gun, distance) {
  return [...new Set(slots.map((slot) => loadout[slot]))]
    .filter((id) => BY[id] && (gun === 'all' || id === gun) &&
      (distance === 'all' || weaponProfile(loadout, id).distance === distance))
    .map((weaponId) => ({ loadout, weaponId, season: weaponSeason(loadout, weaponId) }));
}

function seasonMeta(results) {
  const topLikes = new Map();
  return results.filter(({ loadout, weaponId }) => {
    const likes = Number(loadout.likes || 0);
    if (likes <= 0) return false;
    // Results are already ordered by descending loadout likes.
    if (!topLikes.has(weaponId)) topLikes.set(weaponId, likes);
    return likes === topLikes.get(weaponId);
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

function rankScope(items) {
  const game = el('feedGame').value,
    mode = el('feedMode').value,
    streamer = el('feedStreamer')?.value || 'all',
    fullOnly = rankView() === 'full';
  return rankAudience(items).filter((loadout) =>
    (game === 'all' || loadout.game === game) &&
    (mode === 'all' || loadout.mode === mode) &&
    (!fullOnly || (loadout.primary && loadout.secondary)) &&
    (streamer === 'all' || streamerFilterKey(loadout) === streamer)
  );
}

function redrawFeed() {
  if (!el('feedGame')) return;
  const mode = el('feedMode').value,
    setupType = rankView(),
    gun = el('feedWeapon').value,
    distance = el('feedDistance')?.value || 'all',
    sort = el('feedSort').value,
    seasonFilter = el('feedSeason'),
    onlyStreamers = el('feedAudience')?.value === 'creators';
  const meta = sort === 'meta',
    weekly = sort === 'week';
  let season = seasonFilter?.value && seasonFilter.value !== 'all' ? Number(seasonFilter.value) : undefined;
  const slots = setupSlots(setupType);
  const matchWeapons = slots.length === 1 || gun !== 'all' || distance !== 'all' || season !== undefined || meta;
  const showWeapons = matchWeapons && setupType !== 'full';
  const items = rankingLoadouts();
  const loadouts = rankScope(weekly ? weeklyLoadouts(items, onlyStreamers) : items).sort(
    sort === 'new'
      ? (a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0)
      : compareRank,
  );
  let shown = matchWeapons
    ? loadouts.flatMap((loadout) => matchingWeapons(loadout, slots, gun, distance))
    : loadouts.map((loadout) => ({
      loadout,
      weaponId: loadout.primary && loadout.secondary ? undefined : loadout.primary || loadout.secondary,
    }));
  if (seasonFilter) seasonFilter.options[0].textContent = meta ? 'Neueste Season' : 'Alle Seasons';
  if (meta && season === undefined) {
    for (const result of shown) {
      if (result.season !== undefined && (season === undefined || result.season > season)) season = result.season;
    }
  }
  if (season !== undefined) shown = shown.filter((result) => result.season === season);
  if (meta) shown = season === undefined ? [] : seasonMeta(shown);
  if (setupType === 'full' && matchWeapons) {
    shown = [...new Set(shown.map(({ loadout }) => loadout))].map((loadout) => ({ loadout }));
  }
  const hint = el('rankingHint');
  if (hint) {
    hint.hidden = !weekly && !meta;
    hint.textContent = weekly
      ? 'Die meisten Likes seit Montag, 00:00 Uhr (deutsche Zeit). Bei Gleichstand teilen sich alle Gewinner Platz 1. Entfernte Likes zählen nicht.'
      : meta && season !== undefined
        ? seasonLabel(season) + ' · Je Waffe siehst du die Setups aus den Loadouts mit den meisten Likes.'
        : '';
    if (!hint.textContent) hint.hidden = true;
  }
  const emptyTitle = weekly
    ? 'Noch kein Wochengewinner für diese Auswahl.'
    : meta
      ? 'Für diese Auswahl gibt es noch keine Season-META.'
      : showWeapons
        ? 'Keine Waffen für diese Filter.'
        : items.length ? 'Keine Loadouts für diese Filter.' : 'Hier ist noch kein Loadout veröffentlicht.';
  const emptyMessage = weekly
    ? 'Es zählen nur Likes aus der laufenden Woche. Setze die Filter zurück, um die Wochengewinner zu sehen.'
    : meta
      ? 'Für die Season-META braucht ein Loadout eine Waffen-Season und mindestens einen Like.'
      : showWeapons
        ? 'Ändere einen Filter oder setze die Filter zurück.'
        : 'Wähle einen anderen Filter oder veröffentliche dein Loadout.';
  visibleRank = shown;
  updateRankStats(shown, showWeapons, weekly);
  el('loadoutList').innerHTML = shown.length
    ? shown.map((result, index) => rankCard(result, index, weekly)).join('')
    : '<div class="empty"><strong>' +
      emptyTitle +
      '</strong><p>' +
      emptyMessage +
      '</p>' + (onlyStreamers
        ? '<button type="button" class="primary-btn" id="startStreamerLoadout">Streamer-Loadout bauen →</button>'
        : '<button type="button" class="primary-btn" data-view="builder">Loadout bauen →</button>') + '</div>';
  updateFilterChips(setupType, sort);
}

function updateFilterChips(setupType, sort) {
  const row = el('rankSelectedFilters');
  if (!row) return;
  const chips = el('rankFilterChips');
  const active = rankingFilters.map(el).filter((field) =>
    field?.selectedIndex > 0 && !field.closest('label').hidden
  );
  chips.innerHTML = active.map((field) => {
    const label = html(field.selectedOptions[0].textContent);
    return '<button type="button" data-clear-rank-filter="' + field.id +
      '" aria-label="' + label + ' entfernen">' + label + '<span aria-hidden="true">×</span></button>';
  }).join('');
  chips.hidden = !active.length;
  row.hidden = !active.length && setupType === 'auto' && sort === 'popular';
  const count = el('rankExtraCount');
  const extraCount = active.filter((field) => advancedFilters.includes(field.id)).length;
  count.hidden = !extraCount;
  count.textContent = extraCount;
}

function updateRankStats(results, showWeapons, weekly) {
  const count = el('loadoutCount');
  const label = showWeapons || results.some(({ weaponId }) => weaponId)
    ? 'Treffer'
    : results.length === 1 ? 'Loadout' : 'Loadouts';
  count.textContent = results.length.toLocaleString('de-DE');
  count.parentElement.replaceChildren(count, ' ' + label);
  const loadouts = [...new Set(results.map(({ loadout }) => loadout))];
  el('likesCount').textContent = loadouts.reduce((sum, loadout) =>
    sum + Number((weekly ? loadout.weekLikes : loadout.likes) || 0), 0).toLocaleString('de-DE');
  const streamers = loadouts.filter((loadout) => loadout.kind === 'creators');
  el('creatorCount').textContent = new Set(streamers.map(streamerFilterKey).filter(Boolean)).size.toLocaleString('de-DE');
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
  const audience = rankAudience(all);
  const name = el('feedStreamer');
  const onlyStreamers = el('feedAudience')?.value === 'creators';
  if (name) {
    name.closest('label').hidden = !onlyStreamers;
    const selectedStreamer = onlyStreamers ? name.value || 'all' : 'all';
    const names = onlyStreamers ? new Map(audience.map((item) => [streamerFilterKey(item), item.name || item.handle]).filter(([key]) => key)) : new Map();
    if (selectedStreamer !== 'all' && !names.has(selectedStreamer)) {
      names.set(selectedStreamer, name.selectedOptions[0].textContent);
    }
    name.innerHTML = '<option value="all">Alle Streamer</option>' + [...names]
      .sort((a, b) => a[1].localeCompare(b[1], 'de'))
      .map(([id, label]) => '<option value="' + html(id) + '">' + html(label) + '</option>').join('');
    name.value = selectedStreamer;
  }
  updateRankOptions(rankScope(all));
  redrawFeed();
}

function updateRankOptions(scope) {
  const slots = setupSlots(rankView());
  const weaponFilter = el('feedWeapon'),
    old = weaponFilter.value || 'all',
    present = new Set(scope.flatMap((x) => slots.map((slot) => x[slot])));
  if (BY[old]) present.add(old);
  weaponFilter.innerHTML =
    '<option value="all">Alle Waffen</option>' +
    WM.filter((w) => present.has(w.id))
      .map((w) => '<option value="' + html(w.id) + '">' + html(weaponNames(w).de) + '</option>')
      .join('');
  weaponFilter.value = BY[old] ? old : 'all';
  const seasonFilter = el('feedSeason');
  if (seasonFilter) {
    const selected = seasonFilter.value || 'all',
      seasons = new Set(scope.flatMap((x) => slots.map((slot) => weaponSeason(x, x[slot]))).filter(number => number !== undefined));
    if (selected !== 'all') seasons.add(Number(selected));
    seasonFilter.innerHTML =
      '<option value="all">Alle Seasons</option>' +
      [...seasons]
        .sort((a, b) => b - a)
        .map((number) => '<option value="' + number + '">' + seasonLabel(number) + '</option>')
        .join('');
    seasonFilter.value = selected;
  }
}

function activateRanking() {
  if (el('feedAudience')) el('feedAudience').value = currentParam('streamer') === '1' ? 'creators' : 'all';
  renderFeed();
}

async function likePost(id, kind) {
  const key = kind + ':' + id;
  const item = findRankLoadout(id, kind);
  if (!item || likeBusy.has(key)) return;
  const streamer = kind === 'creators';
  const likes = streamer ? streamerLikes : likedIds;
  const selector = '[' + (streamer ? 'data-like-creator' : 'data-like') + '="' + id + '"]';
  const vote = { liked: Boolean(likes[id]), likes: Number(item.likes || 0) };
  const path = API && !item.local ? '/api/' + kind + '/' + id + '/like' : null;
  const paint = (value, busy) => {
    for (const button of document.querySelectorAll(selector)) paintVoteButton(button, value, busy);
  };
  const saved = await toggleLike(key, path, vote, paint);
  const current = findRankLoadout(id, kind);
  if (!saved || !current) {
    paint({ liked: Boolean(likes[id]), likes: Number(current?.likes ?? vote.likes) }, false);
    return;
  }
  likes[id] = saved.liked;
  current.liked = saved.liked;
  current.likes = saved.likes;
  if (streamer) {
    try {
      if (!API) localStorage.setItem(STREAMER_KEY, JSON.stringify(localStreamers));
      localStorage.setItem(STREAMER_LIKES_KEY, JSON.stringify(likes));
    } catch {}
  } else {
    storeCommunity();
  }
  const focused = document.activeElement?.matches(selector);
  redrawFeed();
  renderCurrentDetail();
  if (focused) document.querySelector('.view.active ' + selector)?.focus({ preventScroll: true });
  if (path && el('feedSort')?.value === 'week') refresh({ background: true, includeCatalog: false });
}

function updateCommunityConnection(status) {
  communityConnection = status;
  const box = el('communityConnection');
  if (!box) return;
  box.hidden = !status;
  box.innerHTML =
    status === 'setup'
      ? '<strong>Die Community wird gerade eingerichtet.</strong><p>Öffentliche Loadouts und Likes sind danach verfügbar. Du kannst schon Waffen ansehen und dein Loadout bauen.</p>'
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

function rankPlace(id, kind = 'sets', weaponId) {
  const matches = (item) => item.id === id && item.kind === kind;
  const sort = el('feedSort');
  if (!sort) return rankingLoadouts().sort(compareRank).findIndex(matches) + 1;
  const index = visibleRank.findIndex((result) =>
    matches(result.loadout) && (!weaponId || !result.weaponId || result.weaponId === weaponId)
  );
  return index < 0 ? 0 : sort.value === 'week' ? 1 : index + 1;
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.detail !== undefined) navigate('detail', { params: { id: button.dataset.detail,
    ...(button.dataset.detailKind === 'creators' ? { kind: 'creators' } : {}),
    ...(button.dataset.loadoutWeapon ? { weapon: button.dataset.loadoutWeapon } : {}),
  } });
  if (button.dataset.like) likePost(Number(button.dataset.like), 'sets');
  if (button.dataset.likeCreator) likePost(Number(button.dataset.likeCreator), 'creators');
  if (button.id === 'refreshFeed') refresh();
  if (button.id === 'startStreamerLoadout') {
    state.publisherType = 'streamer';
    save();
    navigate('builder');
  }
  if (button.id === 'resetRankFilters') {
    for (const id of [...rankingFilters, 'feedSort']) el(id).selectedIndex = 0;
    el('rankViewAll').checked = true;
    replaceViewParam('streamer', '');
    renderFeed();
    el('rankViewAll').focus();
  }
  if (button.dataset.clearRankFilter) {
    const field = el(button.dataset.clearRankFilter);
    field.selectedIndex = 0;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    const disclosure = field.closest('details');
    if (disclosure && !disclosure.open) disclosure.querySelector('summary').focus();
    else field.focus();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'feedAudience') replaceViewParam('streamer', e.target.value === 'creators' ? '1' : '');
  if (e.target.name === 'rankView' || ['feedAudience', 'feedGame', 'feedMode', 'feedStreamer'].includes(e.target.id)) renderFeed();
  if (['feedWeapon', 'feedDistance', 'feedSeason', 'feedSort'].includes(e.target.id)) redrawFeed();
});

export {
  activateRanking,
  avatar,
  badge,
  findRankLoadout,
  postLikeButton,
  rankPlace,
  redrawFeed,
  renderFeed,
  setFeedStatus,
  updateCommunityConnection,
};
