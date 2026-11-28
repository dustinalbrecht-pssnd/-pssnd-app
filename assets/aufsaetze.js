import { ATTACHMENTS, ATTACHMENT_BY, ATTACHMENT_KNOWN, CAT, CLASS, MODE, VERIFIED, art } from './katalog.js';
import { attachmentNames, currentAttachmentId, distinctAttachmentIds, weaponNames } from './katalog-abgleich.js';
import { availableInMode } from './mw4-ausruestung.js';
import { illustratedArt } from './ausruestung.js';
import { navigate } from './navigation.js';
import {
  build,
  closeModal,
  el,
  head,
  html,
  modal,
  picker,
  save,
  state,
  storedParts,
  toast,
  weapon,
} from './app.js';
import { addPart, publish, renderBuilder, renderPartRows, saveParts } from './bauen.js';
import { renderCurrentDetail } from './loadout.js';
import { apexBlockedSlots, apexConflict } from './apex-regeln.js';
import { weaponSkin } from './waffenskin-katalog.js';
import { renderWeaponSkins } from './waffenskin-renderer.js';

let attachmentLanguage = localStorage.getItem('eupdate_attachment_language') === 'en' ? 'en' : 'de';

function attachmentName(part) {
  if (!part || part.custom) return attachmentNames(part)[attachmentLanguage];
  const entry = ATTACHMENT_BY[part.id] || ATTACHMENTS.find((a) => {
    if (a.slot !== part.slot) return false;
    const { de, en } = attachmentNames(a);
    return [a.name, a.de, a.en, de, en].includes(part.name);
  });
  return attachmentNames(entry || part)[attachmentLanguage];
}

function attachmentLimit() {
  return state.mode === 'dmz' && build().dmzLoot ? 8 : 5;
}

function standardCount(parts) {
  return parts.filter((p) => p.slot !== 'apex').length;
}

function categoryNames(slots) {
  return slots.map((slot) => CAT.find(([key]) => key === slot)?.[attachmentLanguage === 'en' ? 2 : 1] || slot).join(', ');
}

function apexConflictMessage(parts) {
  const conflict = apexConflict(parts);
  if (!conflict) return '';
  return attachmentName(conflict.apex) + ' sperrt ' + categoryNames(conflict.conflicts.map(({ slot }) => slot)) + '.';
}

const ATTACHMENT_ART_SLOTS = [
  'optic',
  'muzzle',
  'barrel',
  'underbarrel',
  'magazine',
  'grip',
  'stock',
  'laser',
  'ammo',
  'bolt',
  'comb',
  'trigger',
  'guard',
  'apex',
  'cylinder',
];

function attachmentArtwork(key) {
  const index = ATTACHMENT_ART_SLOTS.indexOf(key);
  return illustratedArt('attachments', index < 0 ? 14 : index, 'attach-symbol');
}

function attachmentEdit(slot) {
  navigate('attachments', { params: slot === 'secondary' ? { slot: 'secondary' } : {} });
}

function renderGunsmith() {
  if (!el('attachmentHero')) return;
  const slot = picker.slot === 'secondary' ? 'secondary' : 'primary',
    w = weapon(slot),
    parts = storedParts(w),
    can = availableInMode(w, state.mode) && w.cls !== 'melee' && w.cls !== 'launcher';
  el('attachmentHero').innerHTML =
    '<div class="gunsmith-stage weapon-stage"><div class="slot-row"><span>' +
    html(slot === 'primary' ? 'PRIMÄRWAFFE' : 'SEKUNDÄRWAFFE') +
    '</span><button data-pick="' +
    slot +
    '">Waffe ändern →</button></div><div class="gunsmith-gun">' +
    (w ? art(w, weaponSkin(build(), slot)) : '') +
    '</div><div class="gunsmith-name"><strong>' +
    html(weaponNames(w)[attachmentLanguage] || 'Waffe wählen') +
    '</strong><span>' +
    html(CLASS[w?.cls]) +
    '</span></div></div>';
  renderWeaponSkins(el('attachmentHero'));
  el('gunsmithLanguage').innerHTML = languageButtons();
  el('attachmentCount').textContent =
    standardCount(parts) +
    ' / ' +
    attachmentLimit() +
    (parts.some((p) => p.slot === 'apex') ? ' + Apex' : '');
  el('attachmentRule').textContent =
    'Freigegebene Aufsätze für diese Waffe in ' + MODE[state.mode] +
    '. Apex hat einen eigenen Aufsatzplatz.' + (apexConflictMessage(parts) ? ' ' + apexConflictMessage(parts) : '');
  const known = knownAttachmentIds(w);
  const apex = parts.find((part) => part.slot === 'apex'),
    locked = apexBlockedSlots(apex);
  const counts = new Map();
  for (const a of ATTACHMENTS) {
    if (known.has(a.id)) counts.set(a.slot, (counts.get(a.slot) || 0) + 1);
  }
  el('attachmentSlots').innerHTML = can || parts.length
    ? CAT.filter(([key]) => state.game === 'mw4' || key !== 'apex')
        .filter(([key]) => counts.has(key) || parts.some((p) => p.slot === key))
        .map(([key, de, en]) => {
          const part = parts.find((p) => p.slot === key),
            available = counts.get(key) || 0,
            lockedByApex = locked.includes(key);
          return (
            '<button type="button" class="attachment-tile ' +
            (part ? 'selected' : '') +
            (lockedByApex ? ' apex-locked' : '') +
            '" data-attach-slot="' +
            key +
            '"' + (lockedByApex && !part ? ' disabled' : '') + '>' +
            attachmentArtwork(key) +
            '<span><b>' +
            html(attachmentLanguage === 'en' ? en : de) +
            '</b><small>' +
            html(
              part
                ? attachmentName(part) + (part.custom ? ' · eigene Angabe' : '') +
                  (lockedByApex ? ' · mit Apex gesperrt' : attachmentUnavailable(w, part, known) ? ' · gesperrt' : '')
                : lockedByApex ? 'Gesperrt durch ' + attachmentName(apex) : available + ' passende Aufsätze',
            ) +
            '</small></span><span class="attach-chevron">›</span></button>'
          );
        })
        .join('') || '<div class="empty">Für diese Waffe sind in diesem Modus keine Aufsätze freigegeben.</div>'
    : '<div class="empty">' + (w && availableInMode(w, state.mode)
      ? 'Für diese Waffe gibt es keine Gunsmith-Aufsätze.'
      : 'Wähle eine freigegebene Waffe für diesen Modus.') + '</div>';
}

function languageButtons(label = 'Sprache für Aufsätze und Ausrüstung') {
  return (
    '<div class="attachment-language" role="group" aria-label="' + html(label) + '"><button type="button" data-attachment-lang="de" aria-pressed="' +
    (attachmentLanguage === 'de') +
    '"><svg class="language-flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#111" d="M0 0h30v7H0z"/><path fill="#d92332" d="M0 7h30v6H0z"/><path fill="#ffce00" d="M0 13h30v7H0z"/></svg> DE</button><button data-attachment-lang="en" aria-pressed="' +
    (attachmentLanguage === 'en') +
    '"><svg class="language-flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#173c8c" d="M0 0h30v20H0z"/><path stroke="#fff" stroke-width="5" d="m0 0 30 20M30 0 0 20"/><path stroke="#ce2436" stroke-width="2" d="m0 0 30 20M30 0 0 20"/><path stroke="#fff" stroke-width="7" d="M15 0v20M0 10h30"/><path stroke="#ce2436" stroke-width="4" d="M15 0v20M0 10h30"/></svg> EN</button></div>'
  );
}

function knownAttachmentIds(w, mode = state.mode) {
  if (!w || (mode && !availableInMode(w, mode))) return new Set();
  const assigned = [
    ...(w.catalogAssigned ? w.attachmentIds || [] : ATTACHMENT_KNOWN[w.id] || []),
    ...(w.customAttachments || []).map((a) => a.id),
  ];
  const distinct = distinctAttachmentIds(w.id, assigned);
  return mode ? new Set([...distinct].filter((id) => availableInMode(ATTACHMENT_BY[id], mode))) : distinct;
}

function attachmentUnavailable(w, part, allowed = knownAttachmentIds(w)) {
  if (!part.id || part.custom) return false;
  const id = currentAttachmentId(w.id, part.id, knownAttachmentIds(w, null));
  return !allowed.has(id);
}

function pickAttachment(key, query = '') {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    cat = CAT.find((c) => c[0] === key);
  if (!cat || !w) return;
  activeAttachSlot = key;
  modal(
    head(
      (attachmentLanguage === 'en' ? cat[2] : cat[1]) + ' · ' + weaponNames(w)[attachmentLanguage],
      'Antippen genügt. Dein Aufsatz wird sofort übernommen.',
    ) +
      languageButtons() +
      '<label class="field-label">Aufsatz suchen<input id="attachmentSearch" class="field" type="search" placeholder="Name, Freischaltwaffe oder Stufe" autocomplete="off" value="' + html(query) + '"></label>' +
      '<p class="fine-print" id="attachmentInfo"></p>' +
      (availableInMode(w, state.mode) ? '<button class="custom-attachment-entry" id="addOwnAttachment">＋ Eigenen Aufsatz hinzufügen <span>Fehlt dein Aufsatz? Trage ihn hier ein.</span></button>' : '') +
      '<div id="attachmentOptions" class="attachment-options"></div>' +
      '<div class="dialog-actions"><button class="ghost-btn" data-close>Zurück</button>' +
      (storedParts(w).some((p) => p.slot === key)
        ? '<button class="ghost-btn" id="removeSlot">Aufsatz entfernen</button>'
        : '') +
      '</div>' +
      '<p class="fine-print attachment-source"><a href="https://warzoneloadout.games/de/mw4/attachments" target="_blank" rel="noopener">Aufsatzkatalog ↗</a> · <a href="https://ggranked.com/games/call-of-duty-modern-warfare-4/meta/weapons" target="_blank" rel="noopener">Waffenlisten ↗</a></p>',
  );
  renderAttachmentOptions();
}

function renderAttachmentOptions() {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    known = knownAttachmentIds(w),
    q = (el('attachmentSearch')?.value || '').trim().toLocaleLowerCase(),
    selected = storedParts(w).find((p) => p.slot === activeAttachSlot);
  const parts = storedParts(w).filter((part) => part.slot !== activeAttachSlot);
  const options = ATTACHMENTS.filter((a) => {
    if (a.slot !== activeAttachSlot || !known.has(a.id)) return false;
    const { de, en } = attachmentNames(a);
    return [de, en, a.de, a.en, a.unlock, a.level].join(' ').toLocaleLowerCase().includes(q);
  });
  const selectedId = currentAttachmentId(w.id, selected?.id, known);
  const isSelected = (a) => selected?.custom !== true && (selectedId
    ? selectedId === a.id
    : selected && [a.name, a.en, a.de, ...Object.values(attachmentNames(a))].includes(selected.name));
  el('attachmentInfo').textContent = options.length + ' freigegebene Aufsätze für ' +
    weaponNames(w)[attachmentLanguage] + ' · ' + MODE[state.mode];
  el('attachmentOptions').innerHTML = options.length
    ? options
        .map((a) => {
          const blocked = apexBlockedSlots(a);
          const conflict = apexConflict([...parts, a]);
          return (
            '<button class="attachment-option ' +
            (isSelected(a) ? 'selected' : '') +
            (conflict ? ' apex-locked' : '') +
            '" data-attachment-id="' +
            html(a.id) +
            '"><span><strong>' +
            html(attachmentNames(a)[attachmentLanguage]) +
            '</strong><small>Freischaltung: ' +
            html(a.unlock) +
            ' · Stufe ' +
            html(a.level || '–') +
            (blocked.length ? '<br>Sperrt ' + html(categoryNames(blocked)) : '') +
            (conflict ? '<br>Entferne zuerst die inkompatiblen Aufsätze.' : '') +
            '</small></span><span aria-hidden="true">' +
            (isSelected(a) ? '✓' : '+') +
            '</span></button>'
          );
        })
        .join('')
    : '<div class="empty">' + (q ? 'Keine freigegebenen Aufsätze für diese Suche.' : 'Für diese Kategorie ist in diesem Modus kein Aufsatz freigegeben.') + '</div>';
}

function saveCatalogAttachment(id) {
  const a = ATTACHMENT_BY[id];
  if (!a || a.slot !== activeAttachSlot) return;
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary');
  if (!knownAttachmentIds(w).has(id)) return;
  saveSlot(a.en, a.id);
}

function planAttachmentChange(current, entry, limit = attachmentLimit()) {
  const parts = current.filter((part) => part.slot !== entry.slot);
  if (entry.slot !== 'apex' && standardCount(parts) >= limit) {
    return { reason: 'Alle ' + limit + ' Aufsatzplätze belegt. Entferne zuerst einen Aufsatz.' };
  }
  parts.push(entry);
  const conflict = apexConflictMessage(parts);
  return conflict ? { reason: conflict + ' Entferne zuerst die inkompatiblen Aufsätze.' } : { parts };
}

function saveSlot(value, id, custom = null) {
  const slot = picker.slot === 'secondary' ? 'secondary' : 'primary',
    w = weapon(slot),
    a = ATTACHMENT_BY[id],
    name = String(a?.en || value || '')
      .trim()
      .slice(0, 80);
  if (!name) {
    toast('Wähle einen Aufsatz aus der Liste');
    return;
  }
  if (!availableInMode(w, state.mode)) return;
  const { parts, reason } = planAttachmentChange(storedParts(w), {
    slot: activeAttachSlot,
    name,
    ...(a ? { id: a.id } : {}),
    ...(custom ? { custom: true, de: custom.de, en: custom.en } : {}),
  });
  if (reason) {
    toast(reason);
    return;
  }
  build().parts[w.id] = parts;
  save();
  closeModal();
  renderGunsmith();
  renderBuilder();
  toast('Aufsatz übernommen ✓');
}

function removeSlot() {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary');
  build().parts[w.id] = storedParts(w).filter((p) => p.slot !== activeAttachSlot);
  save();
  closeModal();
  renderGunsmith();
  renderBuilder();
}

function ownAttachmentForm() {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    cat = CAT.find((c) => c[0] === activeAttachSlot),
    part = storedParts(w).find((p) => p.slot === activeAttachSlot && p.custom);
  modal(
    head('Eigenen Aufsatz hinzufügen', weaponNames(w)[attachmentLanguage] + ' · ' + (attachmentLanguage === 'en' ? cat[2] : cat[1])) +
      '<form id="ownAttachmentForm" class="form-grid"><label class="wide">Name · Deutsch<input class="field" name="de" maxlength="80" required value="' +
      html(part?.de || '') +
      '" placeholder="Name wie im Spiel"></label><label class="wide">Name · Englisch (optional)<input class="field" name="en" maxlength="80" value="' +
      html(part?.en || '') +
      '" placeholder="Falls bekannt"></label><p class="wide own-part-note">Dieser Aufsatz gilt nur für dein Loadout. Er wird als eigene Angabe angezeigt. Prüfe die Verfügbarkeit und Kategorie im Spiel.</p><div class="dialog-actions wide"><button type="submit" class="primary-btn">Aufsatz übernehmen ✓</button><button type="button" class="ghost-btn" id="backOwnAttachment">Zurück</button></div></form>',
  );
}

function saveOwnAttachment(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target)),
    de = String(data.de || '')
      .trim()
      .slice(0, 80),
    en =
      String(data.en || '')
        .trim()
        .slice(0, 80) || de;
  if (!de) return;
  saveSlot(en, null, { de, en });
}

let activeAttachSlot = 'optic';

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.attachmentLang) {
    attachmentLanguage = button.dataset.attachmentLang;
    localStorage.setItem('eupdate_attachment_language', attachmentLanguage);
    const openSearch = el('attachmentSearch');
    renderBuilder();
    renderGunsmith();
    renderCurrentDetail();
    if (openSearch) pickAttachment(activeAttachSlot, openSearch.value);
    return;
  }
  if (button.dataset.attachmentId) {
    saveCatalogAttachment(button.dataset.attachmentId);
    return;
  }
  if (button.dataset.attachSlot) {
    pickAttachment(button.dataset.attachSlot);
    return;
  }
  if (button.dataset.delPart !== undefined) {
    button.closest('.attach-row')?.remove();
    return;
  }
  if (button.dataset.slotChoice !== undefined) {
    saveSlot(button.dataset.slotChoice);
    return;
  }
  if (button.id === 'addPart') addPart();
  if (button.id === 'loadExample')
    renderPartRows(VERIFIED[el('partRows').dataset.weapon].map(([slot, name]) => ({ slot, name })));
  if (button.id === 'saveParts') saveParts();
  if (button.id === 'addOwnAttachment') ownAttachmentForm();
  if (button.id === 'backOwnAttachment') pickAttachment(activeAttachSlot);
  if (button.id === 'nextAttachments') attachmentEdit('primary');
  if (button.id === 'finishAttachments') navigate('builder');
  if (button.id === 'publishFromAttachments') publish();
  if (button.id === 'saveSlot') saveSlot();
  if (button.id === 'removeSlot') removeSlot();
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'attachmentSearch') renderAttachmentOptions();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'ownAttachmentForm') saveOwnAttachment(e);
});

export {
  apexConflictMessage,
  ATTACHMENT_ART_SLOTS,
  attachmentEdit,
  attachmentLanguage,
  attachmentLimit,
  attachmentName,
  attachmentUnavailable,
  knownAttachmentIds,
  languageButtons,
  planAttachmentChange,
  renderGunsmith,
  standardCount,
};
