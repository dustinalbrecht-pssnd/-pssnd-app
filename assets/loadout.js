import { currentParam, currentView } from './navigation.js';
import { API, communityLoaded, el, html, likeBusy, likedIds, streamerLikes } from './app.js';
import { BY, CLASS, WM, art } from './katalog.js';
import { GEAR_NAMES, gearLabel } from './ausruestung.js';
import { avatar, badge, findRankLoadout, rankPlace } from './ranking.js';
import { streamerLinks } from './creator.js';
import { attachmentLanguage, attachmentName, languageButtons } from './aufsaetze.js';
import { weaponNames } from './katalog-abgleich.js';
import { seasonLabel, weaponSeason } from './season.js';
import { weaponProfileSummary } from './waffenprofil.js';

function weaponDetail(loadout, weapon, label) {
  const name = weaponNames(weapon)[attachmentLanguage];
  const season = weaponSeason(loadout, weapon.id);
  const profile = weaponProfileSummary(loadout, weapon.id);
  const parts = (loadout.parts || loadout.attachments || {})[weapon.id] || [];
  return (
    '<section class="detail-section"><div class="detail-stage weapon-stage"><span class="stage-label">' +
    html(label + ' · ' + CLASS[weapon.cls]) +
    (season === undefined ? '' : ' · ' + seasonLabel(season)) +
    '</span>' + art(weapon) + '<strong>' + html(name) + '</strong>' +
    (profile ? '<p class="detail-weapon-profile">' + html(profile) + '</p>' : '') +
    '</div><div class="detail-section"><h2 class="eyebrow">Aufsätze</h2><div class="detail-chips">' +
    (parts.length
      ? parts.map((part) => '<span>' + html(attachmentName(part)) +
          (part.custom ? ' <small>eigene Angabe</small>' : '') + '</span>').join('')
      : '<span>Keine angegeben</span>') +
    '</div></div></section>'
  );
}

function renderCurrentDetail() {
  if (currentView() !== 'detail') return;
  const id = Number(currentParam('id'));
  const content = el('detailContent');
  const streamer = currentParam('kind') === 'creators',
    kind = streamer ? 'creators' : 'sets',
    x = findRankLoadout(id, kind);
  const back = el('view-detail').querySelector('.back-link[data-view="feed"]');
  if (back) {
    const audience = el('feedAudience');
    const onlyStreamers = audience ? audience.value === 'creators' : streamer;
    back.dataset.streamerView = onlyStreamers ? '1' : '';
    back.setAttribute('href', 'ranking/' + (onlyStreamers ? '?streamer=1' : ''));
  }
  if (!x) {
    content.innerHTML =
      '<p class="empty">' +
      (communityLoaded || !id ? 'Dieses Loadout ist gerade nicht verfügbar.' : 'Loadout wird geladen …') +
      '</p>';
    return;
  }
  const primary = BY[x.primary];
  const secondary = BY[x.secondary];
  const full = Boolean(primary && secondary);
  const requested = currentParam('weapon');
  const selected = full ? (requested === x.primary || requested === x.secondary ? BY[requested] : undefined) : primary || secondary;
  const title = selected ? weaponNames(selected)[attachmentLanguage] : x.title;
  const place = rankPlace(x.id, kind, selected?.id);
  const liked = Boolean((streamer ? streamerLikes : likedIds)[x.id]);
  const busy = likeBusy.has(kind + ':' + x.id);
  const gear = selected ? [] : Object.entries(x.gear || {})
    .filter(([key, value]) => value && GEAR_NAMES[key])
    .map(([key, value]) => GEAR_NAMES[key] + ': ' + gearLabel(key, value, x.mode));
  const weapons = selected
    ? weaponDetail(x, selected, selected.id === x.primary ? 'Primärwaffe' : 'Sekundärwaffe')
    : weaponDetail(x, primary || WM[0], 'Primärwaffe') +
      (secondary ? weaponDetail(x, secondary, 'Sekundärwaffe') : '');
  const fullButton = ' data-detail="' + x.id + '" data-detail-kind="' + kind + '"';
  const weaponAttr = selected ? ' data-loadout-weapon="' + html(selected.id) + '"' : '';
  content.innerHTML =
    '<div class="detail-language"><span>Sprache / Language</span>' +
    languageButtons() +
    '</div><div class="detail-top"><div><span class="eyebrow">' +
    badge(x) +
    '</span><h1>' +
    html(title) +
    '</h1><p class="rank-author">' +
    avatar(x) +
    '<span>von ' +
    html(x.name || 'Community') +
    '</span></p>' + (streamer ? streamerLinks(x) : '') + '</div><div class="detail-place"><b>' +
    (place ? '#' + place : '—') +
    '</b><small>PLATZIERUNG</small><span>♥ ' +
    Number(x.likes || 0).toLocaleString('de-DE') +
    '</span></div></div>' +
    (selected && full ? '<div class="detail-actions"><button class="ghost-btn"' + fullButton +
      '>Ganzes Loadout anzeigen →</button></div>' : '') +
    weapons +
    (selected ? '' : '<div class="detail-section"><span class="eyebrow">AUSRÜSTUNG</span><p>' +
      html(gear.join(' · ') || 'Keine angegeben') + '</p></div>') +
    (!selected && (x.note || x.description) ? '<p class="creator-note">' + html(x.note || x.description) + '</p>' : '') +
    '<div class="detail-actions"><button class="ghost-btn" aria-pressed="' +
    liked +
    '"' + (busy ? ' disabled' : '') + ' ' + (streamer ? 'data-like-creator' : 'data-like') + '="' +
    x.id +
    '">' +
    (liked ? '♥ Like entfernen' : '♡ Liken') +
    '</button><button class="primary-btn" data-download="' +
    x.id +
    '" data-download-kind="' + kind + '"' + weaponAttr + '>' +
    (selected ? 'Waffenbild herunterladen' : 'Als Bild herunterladen') + ' ↓</button>' +
    '<button class="ghost-btn" ' + (streamer ? 'data-copy-creator' : 'data-copy') + '="' +
    x.id + '"' + weaponAttr + '>Im Baukasten öffnen →</button></div>' +
    '<div class="comments-entry"><div><h2>Was sagt die Community?</h2><p>' +
    (API && !x.local
      ? Number(x.commentCount || 0) + ' Kommentare'
      : 'Kommentare sind nach der öffentlichen Veröffentlichung verfügbar.') +
    '</p></div><button class="ghost-btn" data-comments="' + kind + ':' +
    x.id +
    '">Kommentare öffnen →</button>' +
    (API && !x.local
      ? '<button class="text-action" data-report="' + kind + ':' + x.id + '">Inhalt melden</button>'
      : '') +
    '</div>' +
    (x.local ? '<p class="fine-print">Dieser Beitrag ist nur auf diesem Gerät gespeichert.</p>' : '');
}

export { renderCurrentDetail };
