import { currentParam, currentView } from './navigation.js';
import { API, communityLoaded, el, html, likedIds, streamerLikes } from './app.js';
import { BY, CLASS, MODE, WM, art } from './katalog.js';
import { GEAR_NAMES, gearLabel } from './ausruestung.js';
import { avatar, badge, findRankLoadout, rankPlace } from './ranking.js';
import { streamerLinks } from './creator.js';
import { attachmentLanguage, attachmentName, languageButtons } from './aufsaetze.js';
import { weaponNames } from './katalog-abgleich.js';
import { seasonLabel, weaponSeason } from './season.js';
import { weaponProfileSummary } from './waffenprofil.js';

function renderCurrentDetail() {
  if (currentView() !== 'detail') return;
  const id = Number(currentParam('id'));
  const content = el('detailContent');
  const streamer = currentParam('kind') === 'creators',
    kind = streamer ? 'creators' : 'sets',
    x = findRankLoadout(id, kind);
  const back = el('view-detail').querySelector('.back-link[data-view="feed"]');
  if (back) {
    back.dataset.streamerView = streamer ? '1' : '';
    back.setAttribute('href', 'ranking/' + (streamer ? '?streamer=1' : ''));
  }
  if (!x) {
    content.innerHTML =
      '<p class="empty">' +
      (communityLoaded || !id ? 'Dieses Loadout ist gerade nicht verfügbar.' : 'Loadout wird geladen …') +
      '</p>';
    return;
  }
  const w = BY[x.primary] || WM[0],
    s = BY[x.secondary],
    parts = x.parts || x.attachments || {},
    mainParts = parts[w.id] || [],
    sideParts = parts[s?.id] || [],
    gear = x.gear || {};
  const gearText = Object.entries(gear)
    .filter(([k, v]) => v && GEAR_NAMES[k])
    .map(([k, v]) => GEAR_NAMES[k] + ': ' + gearLabel(k, v, x.mode));
  const place = rankPlace(x.id, kind);
  const liked = Boolean((streamer ? streamerLikes : likedIds)[x.id]);
  const primarySeason = weaponSeason(x, w.id);
  const secondarySeason = weaponSeason(x, s?.id);
  const primaryProfile = weaponProfileSummary(x, w.id);
  const secondaryProfile = weaponProfileSummary(x, s?.id);
  content.innerHTML =
    '<div class="detail-language"><span>Sprache / Language</span>' +
    languageButtons() +
    '</div><div class="detail-top"><div><span class="eyebrow">' +
    badge(x) +
    '</span><h1>' +
    html(x.title) +
    '</h1><p class="rank-author">' +
    avatar(x) +
    '<span>von ' +
    html(x.name || 'Community') +
    '</span></p>' + (streamer ? streamerLinks(x) : '') + '</div><div class="detail-place"><b>' +
    (place ? '#' + place : '—') +
    '</b><small>PLATZIERUNG</small><span>♥ ' +
    Number(x.likes || 0).toLocaleString('de-DE') +
    '</span></div></div>' +
    '<div class="detail-stage"><span class="stage-label">PRIMÄRWAFFE · ' +
    html(CLASS[w.cls]) +
    (primarySeason === undefined ? '' : ' · ' + seasonLabel(primarySeason)) +
    '</span>' +
    art(w) +
    '<strong>' +
    html(weaponNames(w)[attachmentLanguage]) +
    '</strong>' + (primaryProfile ? '<p class="detail-weapon-profile">' + html(primaryProfile) + '</p>' : '') + '</div>' +
    '<div class="detail-two"><div><small>SEKUNDÄR</small><b>' +
    html(weaponNames(s)[attachmentLanguage] || '—') +
    (secondarySeason === undefined ? '' : ' · ' + seasonLabel(secondarySeason)) +
    '</b>' + (secondaryProfile ? '<p class="detail-weapon-profile">' + html(secondaryProfile) + '</p>' : '') +
    '</div><div><small>MODUS</small><b>' +
    html(MODE[x.mode]) +
    '</b></div></div>' +
    '<div class="detail-section"><span class="eyebrow">PRIMÄR · AUFSÄTZE</span><div class="detail-chips">' +
    (mainParts.length
      ? mainParts
          .map(
            (p) =>
              '<span>' +
              html(attachmentName(p)) +
              (p.custom ? ' <small>eigene Angabe</small>' : '') +
              '</span>',
          )
          .join('')
      : '<span>Keine angegeben</span>') +
    '</div></div>' +
    (sideParts.length
      ? '<div class="detail-section"><span class="eyebrow">SEKUNDÄR · AUFSÄTZE</span><div class="detail-chips">' +
        sideParts
          .map(
            (p) =>
              '<span>' +
              html(attachmentName(p)) +
              (p.custom ? ' <small>eigene Angabe</small>' : '') +
              '</span>',
          )
          .join('') +
        '</div></div>'
      : '') +
    '<div class="detail-section"><span class="eyebrow">AUSRÜSTUNG</span><p>' +
    html(gearText.join(' · ') || 'Keine angegeben') +
    '</p></div>' +
    (x.note || x.description ? '<p class="creator-note">' + html(x.note || x.description) + '</p>' : '') +
    '<div class="detail-actions"><button class="ghost-btn" aria-pressed="' +
    liked +
    '" ' + (streamer ? 'data-like-creator' : 'data-like') + '="' +
    x.id +
    '">' +
    (liked ? '♥ Like entfernen' : '♡ Liken') +
    '</button><button class="primary-btn" data-download="' +
    x.id +
    '" data-download-kind="' + kind + '">Als Bild herunterladen ↓</button><button class="ghost-btn" ' + (streamer ? 'data-copy-creator' : 'data-copy') + '="' +
    x.id +
    '">Im Builder öffnen →</button></div>' +
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
