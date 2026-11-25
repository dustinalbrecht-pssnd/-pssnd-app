import { currentParam, currentView } from './navigation.js';
import { API, communityLoaded, el, feed, html, likedIds } from './app.js';
import { BY, CLASS, MODE, WM, art } from './katalog.js';
import { GEAR_NAMES, gearLabel } from './ausruestung.js';
import { avatar, badge, rankPlace } from './ranking.js';
import { attachmentLanguage, attachmentName, languageButtons } from './aufsaetze.js';
import { weaponNames } from './katalog-abgleich.js';
import { seasonLabel, weaponSeason } from './season.js';

function renderCurrentDetail() {
  if (currentView() !== 'detail') return;
  const id = Number(currentParam('id'));
  const content = el('detailContent');
  const x = feed.find((v) => v.id === Number(id));
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
  const place = rankPlace(x.id);
  const primarySeason = weaponSeason(x, w.id);
  const secondarySeason = weaponSeason(x, s?.id);
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
    '</span></p></div><div class="detail-place"><b>' +
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
    '</strong></div>' +
    '<div class="detail-two"><div><small>SEKUNDÄR</small><b>' +
    html(weaponNames(s)[attachmentLanguage] || '—') +
    (secondarySeason === undefined ? '' : ' · ' + seasonLabel(secondarySeason)) +
    '</b></div><div><small>MODUS</small><b>' +
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
    !!likedIds[x.id] +
    '" data-like="' +
    x.id +
    '">' +
    (likedIds[x.id] ? '♥ Like entfernen' : '♡ Liken') +
    '</button><button class="primary-btn" data-download="' +
    x.id +
    '">Als Bild herunterladen ↓</button><button class="ghost-btn" data-copy="' +
    x.id +
    '">Im Builder öffnen →</button></div>' +
    '<div class="comments-entry"><div><h2>Was sagt die Community?</h2><p>' +
    (API && !x.local
      ? Number(x.commentCount || 0) + ' Kommentare'
      : 'Kommentare sind nach der öffentlichen Veröffentlichung verfügbar.') +
    '</p></div><button class="ghost-btn" data-comments="sets:' +
    x.id +
    '">Kommentare öffnen →</button>' +
    (API && !x.local
      ? '<button class="text-action" data-report="sets:' + x.id + '">Inhalt melden</button>'
      : '') +
    '</div>' +
    (x.local ? '<p class="fine-print">Dieser Beitrag ist nur auf diesem Gerät gespeichert.</p>' : '');
}

export { renderCurrentDetail };
