import { ATTACHMENTS, ATTACHMENT_BY, ATTACHMENT_KNOWN, CAT, CLASS, VERIFIED, art } from './katalog.js';
import { attachmentNames, currentAttachmentId, distinctAttachmentIds } from './katalog-abgleich.js';
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

function attachmentLimit(slot) {
  return CAT.filter((c) => c[0] !== 'apex').length;
}

function standardCount(parts) {
  return parts.filter((p) => p.slot !== 'apex').length;
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
    can = w.cls !== 'melee' && w.cls !== 'launcher';
  el('attachmentHero').innerHTML =
    '<div class="gunsmith-stage"><div class="slot-row"><span>' +
    html(slot === 'primary' ? 'PRIMÄRWAFFE' : 'SEKUNDÄRWAFFE') +
    '</span><button data-pick="' +
    slot +
    '">Waffe ändern →</button></div><div class="gunsmith-gun">' +
    art(w) +
    '</div><div class="gunsmith-name"><strong>' +
    html(w.name) +
    '</strong><span>' +
    html(CLASS[w.cls]) +
    '</span></div></div>';
  el('gunsmithLanguage').innerHTML = languageButtons();
  el('attachmentCount').textContent =
    standardCount(parts) +
    ' / ' +
    attachmentLimit(slot) +
    (parts.some((p) => p.slot === 'apex') ? ' + Apex' : '');
  el('attachmentRule').textContent =
    'Die Liste zeigt die Aufsätze für deine gewählte Waffe. Pro Kategorie ist ein Aufsatz möglich.';
  const known = knownAttachmentIds(w);
  const counts = new Map();
  for (const a of ATTACHMENTS) {
    if (known.has(a.id)) counts.set(a.slot, (counts.get(a.slot) || 0) + 1);
  }
  el('attachmentSlots').innerHTML = can
    ? CAT.filter(([key]) => state.game === 'mw4' || key !== 'apex')
        .filter(([key]) => counts.has(key) || parts.some((p) => p.slot === key))
        .map(([key, de, en]) => {
          const part = parts.find((p) => p.slot === key),
            available = counts.get(key) || 0;
          return (
            '<button class="attachment-tile ' +
            (part ? 'selected' : '') +
            '" data-attach-slot="' +
            key +
            '">' +
            attachmentArtwork(key) +
            '<span><b>' +
            html(attachmentLanguage === 'en' ? en : de) +
            '</b><small>' +
            html(
              part
                ? attachmentName(part) + (part.custom ? ' · eigene Angabe' : '')
                : available + ' passende Aufsätze',
            ) +
            '</small></span><span class="attach-chevron">›</span></button>'
          );
        })
        .join('') || '<div class="empty">Für diese Waffe sind noch keine Aufsätze zugeordnet.</div>'
    : '<div class="empty">Für diese Waffe gibt es hier keine bestätigten Gunsmith-Aufsätze.</div>';
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

function knownAttachmentIds(w) {
  const assigned = [
    ...(w.catalogAssigned ? w.attachmentIds || [] : ATTACHMENT_KNOWN[w.id] || []),
    ...(w.customAttachments || []).map((a) => a.id),
  ];
  return distinctAttachmentIds(w.id, assigned.filter((id) => ATTACHMENT_BY[id]?.active !== false));
}

function pickAttachment(key, query = '') {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    cat = CAT.find((c) => c[0] === key);
  if (!cat) return;
  activeAttachSlot = key;
  modal(
    head(
      (attachmentLanguage === 'en' ? cat[2] : cat[1]) + ' · ' + w.name,
      'Antippen genügt. Dein Aufsatz wird sofort übernommen.',
    ) +
      languageButtons() +
      '<label class="field-label">Aufsatz suchen<input id="attachmentSearch" class="field" type="search" placeholder="Name, Freischaltwaffe oder Stufe" autocomplete="off" value="' + html(query) + '"></label>' +
      '<p class="fine-print" id="attachmentInfo"></p><button class="custom-attachment-entry" id="addOwnAttachment">＋ Eigenen Aufsatz hinzufügen <span>Fehlt dein Aufsatz? Trage ihn hier ein.</span></button><div id="attachmentOptions" class="attachment-options"></div>' +
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
  const options = ATTACHMENTS.filter((a) => {
    if (a.slot !== activeAttachSlot || !known.has(a.id)) return false;
    const { de, en } = attachmentNames(a);
    return [de, en, a.de, a.en, a.unlock, a.level].join(' ').toLocaleLowerCase().includes(q);
  });
  const selectedId = currentAttachmentId(w.id, selected?.id, known);
  const isSelected = (a) => selected?.custom !== true && (selectedId
    ? selectedId === a.id
    : selected && [a.name, a.en, a.de, ...Object.values(attachmentNames(a))].includes(selected.name));
  el('attachmentInfo').textContent = options.length + ' passende Aufsätze für ' + w.name;
  el('attachmentOptions').innerHTML = options.length
    ? options
        .map(
          (a) =>
            '<button class="attachment-option ' +
            (isSelected(a) ? 'selected' : '') +
            '" data-attachment-id="' +
            html(a.id) +
            '"><span><strong>' +
            html(attachmentNames(a)[attachmentLanguage]) +
            '</strong><small>Freischaltung: ' +
            html(a.unlock) +
            ' · Stufe ' +
            html(a.level || '–') +
            '</small></span><span aria-hidden="true">' +
            (isSelected(a) ? '✓' : '+') +
            '</span></button>',
        )
        .join('')
    : '<div class="empty">' + (q ? 'Keine zugeordneten Aufsätze für diese Suche.' : 'Für diese Waffe ist in dieser Kategorie kein Aufsatz zugeordnet.') + '</div>';
}

function saveCatalogAttachment(id) {
  const a = ATTACHMENT_BY[id];
  if (!a || a.slot !== activeAttachSlot) return;
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary');
  if (!knownAttachmentIds(w).has(id)) return;
  saveSlot(a.en, a.id);
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
  const parts = storedParts(w).filter((p) => p.slot !== activeAttachSlot);
  if (activeAttachSlot !== 'apex' && standardCount(parts) >= attachmentLimit(slot)) {
    toast('Alle ' + attachmentLimit(slot) + ' Aufsatzplätze belegt. Entferne zuerst einen Aufsatz.');
    return;
  }
  parts.push({
    slot: activeAttachSlot,
    name,
    ...(a ? { id: a.id } : {}),
    ...(custom ? { custom: true, de: custom.de, en: custom.en } : {}),
  });
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
    head('Eigenen Aufsatz hinzufügen', w.name + ' · ' + (attachmentLanguage === 'en' ? cat[2] : cat[1])) +
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
  ATTACHMENT_ART_SLOTS,
  attachmentEdit,
  attachmentLanguage,
  attachmentLimit,
  attachmentName,
  knownAttachmentIds,
  languageButtons,
  renderGunsmith,
  standardCount,
};
