import { ATTACHMENTS, ATTACHMENT_BY, ATTACHMENT_KNOWN, CAT, CLASS, VERIFIED, art } from './katalog.js';
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

let attachmentLanguage = localStorage.getItem('eupdate_attachment_language') === 'en' ? 'en' : 'de',
  attachmentScope = 'known';

function attachmentName(part) {
  if (part?.custom) return part[attachmentLanguage] || part.name || '';
  const a = ATTACHMENT_BY[part?.id] || ATTACHMENTS.find((a) => a.en === part?.name || a.de === part?.name);
  return a ? a[attachmentLanguage] : part?.name || '';
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
    'Alle verfügbaren Aufsatzkategorien sind auswählbar. Pro Kategorie ist ein Aufsatz möglich.';
  el('attachmentSlots').innerHTML = can
    ? CAT.filter((c) => state.game === 'mw4' || c[0] !== 'apex')
        .map(([key, de, en]) => {
          const part = parts.find((p) => p.slot === key),
            available = ATTACHMENTS.filter(
              (a) => a.active !== false && a.slot === key && knownAttachmentIds(w).has(a.id),
            ).length;
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
        .join('')
    : '<div class="empty">Für diese Waffe gibt es hier keine bestätigten Gunsmith-Aufsätze.</div>';
}

function languageButtons() {
  return (
    '<div class="attachment-language" aria-label="Sprache der Aufsätze"><button data-attachment-lang="de" aria-pressed="' +
    (attachmentLanguage === 'de') +
    '"><svg class="language-flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#111" d="M0 0h30v7H0z"/><path fill="#d92332" d="M0 7h30v6H0z"/><path fill="#ffce00" d="M0 13h30v7H0z"/></svg> DE</button><button data-attachment-lang="en" aria-pressed="' +
    (attachmentLanguage === 'en') +
    '"><svg class="language-flag" viewBox="0 0 30 20" aria-hidden="true"><path fill="#173c8c" d="M0 0h30v20H0z"/><path stroke="#fff" stroke-width="5" d="m0 0 30 20M30 0 0 20"/><path stroke="#ce2436" stroke-width="2" d="m0 0 30 20M30 0 0 20"/><path stroke="#fff" stroke-width="7" d="M15 0v20M0 10h30"/><path stroke="#ce2436" stroke-width="4" d="M15 0v20M0 10h30"/></svg> EN</button></div>'
  );
}

function knownAttachmentIds(w) {
  return new Set([
    ...(w.catalogAssigned ? w.attachmentIds || [] : ATTACHMENT_KNOWN[w.id] || []),
    ...(w.customAttachments || []).map((a) => a.id),
  ]);
}

function pickAttachment(key) {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    cat = CAT.find((c) => c[0] === key);
  if (!cat) return;
  activeAttachSlot = key;
  attachmentScope = 'known';
  modal(
    head(
      (attachmentLanguage === 'en' ? cat[2] : cat[1]) + ' · ' + w.name,
      'Antippen genügt. Dein Aufsatz wird sofort übernommen.',
    ) +
      languageButtons() +
      '<label class="field-label">Aufsatz suchen<input id="attachmentSearch" class="field" type="search" placeholder="Name, Freischaltwaffe oder Stufe" autocomplete="off"></label>' +
      '<div class="attachment-scope"><button data-attachment-scope="known">Zur Waffe zugeordnet</button></div>' +
      '<p class="fine-print" id="attachmentInfo"></p><button class="custom-attachment-entry" id="addOwnAttachment">＋ Eigenen Aufsatz hinzufügen <span>Fehlt dein Aufsatz? Trage ihn hier ein.</span></button><div id="attachmentOptions" class="attachment-options"></div>' +
      '<div class="dialog-actions"><button class="ghost-btn" data-close>Zurück</button>' +
      (storedParts(w).some((p) => p.slot === key)
        ? '<button class="ghost-btn" id="removeSlot">Aufsatz entfernen</button>'
        : '') +
      '</div>' +
      '<p class="fine-print attachment-source">728 Katalog-Aufsätze · 1229 belegte Zuordnungen · 15 Kategorien. <a href="https://warzoneloadout.games/de/mw4/attachments" target="_blank" rel="noopener">Namensquelle ↗</a></p>',
  );
  renderAttachmentOptions();
}

function renderAttachmentOptions() {
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary'),
    known = knownAttachmentIds(w),
    q = (el('attachmentSearch')?.value || '').trim().toLocaleLowerCase(),
    selected = storedParts(w).find((p) => p.slot === activeAttachSlot);
  const options = ATTACHMENTS.filter(
    (a) =>
      a.active !== false &&
      a.slot === activeAttachSlot &&
      known.has(a.id) &&
      [a.de, a.en, a.unlock, a.level].join(' ').toLocaleLowerCase().includes(q),
  );
  el('attachmentInfo').textContent =
    options.length +
    ' Aufsätze · ' +
    (w.catalogAssigned
      ? 'Vom Betreiber dieser Waffe zugeordnet.'
      : attachmentScope === 'known'
        ? 'Belegte Zuordnung für ' + w.name + '.'
        : 'Alle Namen dieser Kategorie. Waffen-Verfügbarkeit im Spiel prüfen.');
  document
    .querySelectorAll('[data-attachment-scope]')
    .forEach((b) => b.classList.toggle('selected', b.dataset.attachmentScope === attachmentScope));
  el('attachmentOptions').innerHTML = options.length
    ? options
        .map(
          (a) =>
            '<button class="attachment-option ' +
            (selected && (selected.id === a.id || selected.name === a.en || selected.name === a.de)
              ? 'selected'
              : '') +
            '" data-attachment-id="' +
            html(a.id) +
            '"><span><strong>' +
            html(a[attachmentLanguage]) +
            '</strong><small>Freischaltung: ' +
            html(a.unlock) +
            ' · Stufe ' +
            html(a.level || '–') +
            (known.has(a.id) ? ' · passend für ' + html(w.name) : ' · Zuordnung offen') +
            '</small></span><span aria-hidden="true">' +
            (selected && (selected.id === a.id || selected.name === a.en || selected.name === a.de)
              ? '✓'
              : '+') +
            '</span></button>',
        )
        .join('')
    : '<div class="empty">Für diese Waffe ist hier noch kein passender Aufsatz zugeordnet.</div>';
}

function saveCatalogAttachment(id) {
  const a = ATTACHMENT_BY[id];
  if (!a || a.slot !== activeAttachSlot) return;
  const w = weapon(picker.slot === 'secondary' ? 'secondary' : 'primary');
  if (!knownAttachmentIds(w).has(id)) {
    el('attachmentOptions').innerHTML =
      '<div class="catalog-confirm"><h3>' +
      html(a[attachmentLanguage]) +
      '</h3><p>Die Quelle bestätigt diese Kombination mit ' +
      html(w.name) +
      ' noch nicht. Ist der Aufsatz in deinem Spiel für diese Waffe verfügbar?</p><button class="primary-btn" data-attachment-confirm="' +
      html(id) +
      '">Ja, übernehmen</button><button class="ghost-btn" id="backAttachmentOptions">Zurück zur Liste</button></div>';
    return;
  }
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
    renderGunsmith();
    renderCurrentDetail();
    if (!el('modal').hidden) pickAttachment(activeAttachSlot);
    return;
  }
  if (button.dataset.attachmentScope) {
    attachmentScope = button.dataset.attachmentScope;
    renderAttachmentOptions();
    return;
  }
  if (button.dataset.attachmentId) {
    saveCatalogAttachment(button.dataset.attachmentId);
    return;
  }
  if (button.dataset.attachmentConfirm) {
    const part = ATTACHMENT_BY[button.dataset.attachmentConfirm];
    if (part) saveSlot(part.en, part.id);
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
  if (button.id === 'backAttachmentOptions') renderAttachmentOptions();
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
  languageButtons,
  renderGunsmith,
  standardCount,
};
