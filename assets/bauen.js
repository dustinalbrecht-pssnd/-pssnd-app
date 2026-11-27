import { ATTACHMENT_BY, BY, CAT, CLASS, GAME, MODE, art } from './katalog.js';
import {
  API,
  BO7_MODES,
  MW4_MODES,
  STARTERS,
  apiPost,
  build,
  candidates,
  clearCrop,
  closeModal,
  communityBlocked,
  confirmedPrivacy,
  creatorForm,
  crop,
  croppedPhoto,
  el,
  feed,
  head,
  html,
  localPosts,
  modal,
  picker,
  privacyConfirmation,
  privacyReceipt,
  publicationRules,
  refresh,
  rememberSubmission,
  renderTips,
  save,
  serverGet,
  siteConfig,
  state,
  storeCommunity,
  storedParts,
  toast,
  updateChangedPrivacy,
  weapon,
} from './app.js';
import { navigate } from './navigation.js';
import {
  apexConflictMessage, attachmentEdit, attachmentLanguage, attachmentLimit, attachmentName, attachmentUnavailable, knownAttachmentIds,
  languageButtons, planAttachmentChange, renderGunsmith, standardCount,
} from './aufsaetze.js';
import { currentAttachmentId, weaponNames } from './katalog-abgleich.js';
import { availableInMode } from './mw4-ausruestung.js';
import {
  GEAR_NAMES,
  availableGear,
  buildGearValue,
  draftGear,
  gearArtwork,
  gearLabelMarkup,
  gearSecondaryMarkup,
  gearSlots,
} from './ausruestung.js';
import { avatar, rankPlace, redrawFeed } from './ranking.js';
import { loadoutWeaponSeasons, seasonLabel, weaponSeason } from './season.js';
import { distanceOptions, loadoutWeaponProfiles, WEAPON_DISTANCES, WEAPON_HINT_LENGTH, weaponProfile } from './waffenprofil.js';
import { weaponCheck } from './waffencheck.js';

function setGame(game) {
  if (!GAME[game]) return;
  state.game = game;
  if (game === 'mw4' && state.mode === 'zm') state.mode = 'mp';
  if (game !== 'mw4' && state.mode === 'dmz') state.mode = 'mp';
  save();
  renderBuilder();
  renderTips();
}

function setMode(mode) {
  if (!MODE[mode]) return;
  state.mode = mode;
  save();
  renderBuilder();
}

let arsenalMode = false;

function weaponPickerTools() {
  return '<div class="weapon-picker-tools"><input id="pickSearch" class="field search" type="search" aria-label="Waffe suchen" placeholder="Waffe suchen …" autocomplete="off"><div id="pickClasses" class="class-row" role="group" aria-label="Waffenklassen"></div><p id="pickResultCount" class="picker-result-count" aria-live="polite"></p></div>';
}

function openPicker(slot) {
  arsenalMode = false;
  picker.slot = slot;
  picker.category = 'all';
  modal(
    head(
      slot === 'primary' ? 'Primärwaffe wählen' : 'Zweitwaffe wählen',
      GAME[state.game] + ' · ' + MODE[state.mode],
    ) +
      weaponPickerTools() +
      '<div id="pickResults" class="weapon-options"></div>',
    'weapons',
  );
  renderPicker();
}

function openArsenal() {
  arsenalMode = true;
  picker.slot = 'primary';
  picker.category = 'all';
  modal(
    head('Waffenübersicht', MODE[state.mode]) +
      '<p class="arsenal-note">Waffe antippen und direkt ins Loadout übernehmen.</p>' +
      weaponPickerTools() +
      '<div id="pickResults" class="weapon-options arsenal-options"></div>',
    'weapons',
  );
  renderPicker();
}

function renderPicker() {
  if (el('modal').hidden || !el('pickResults')) return;
  const list = candidates(arsenalMode ? 'secondary' : picker.slot),
    classes = [...new Set(list.map((w) => w.cls))];
  if (arsenalMode) {
    el('modalBody').querySelector('.dialog-head p').textContent = MODE[state.mode] + ' · ' + list.length + ' Waffen';
  }
  el('pickClasses').innerHTML = ['all', ...classes]
    .map(
      (cls) =>
        '<button type="button" data-pick-class="' +
        cls +
        '" aria-pressed="' +
        (cls === picker.category) +
        '" class="' +
        (cls === picker.category ? 'active' : '') +
        '">' +
        (cls === 'all' ? 'Alle' : CLASS[cls].split(' · ')[0]) +
        '<span>' +
        list.filter((w) => cls === 'all' || w.cls === cls).length +
        '</span></button>',
    )
    .join('');
  const term = (el('pickSearch').value || '').toLocaleLowerCase('de'),
    found = list.filter(
      (w) =>
        (picker.category === 'all' || w.cls === picker.category) &&
        Object.values(weaponNames(w)).some((name) => name.toLocaleLowerCase('de').includes(term)),
    );
  el('pickResultCount').textContent =
    found.length + ' von ' + list.length + ' Waffen' + (term ? ' · Suche: ' + el('pickSearch').value : '');
  el('pickResults').innerHTML = found.length
    ? found
        .map((w) => {
          const slot =
              arsenalMode && ['pistol', 'launcher', 'melee', 'special'].includes(w.cls)
                ? 'secondary'
                : picker.slot,
            selected = build()[slot] === w.id;
          return (
            '<button type="button" class="weapon-option' +
            (selected ? ' is-selected' : '') +
            '" aria-pressed="' +
            selected +
            '" data-weapon="' +
            w.id +
            '" data-select-slot="' +
            slot +
            '"><span class="weapon-picture">' +
            art(w) +
            '</span><span class="weapon-option-meta"><b class="weapon-name">' +
            html(weaponNames(w)[attachmentLanguage]) +
            '</b><small>' +
            html(CLASS[w.cls]) +
            (w.announcedOnly ? ' · offiziell erwähnt' : w.limited ? ' · Beta eingeschränkt' : '') +
            '</small><em>' +
            (selected
              ? 'Im Loadout ✓'
              : slot === 'primary'
                ? 'Primärwaffe wählen →'
                : 'Sekundärwaffe wählen →') +
            '</em></span></button>'
          );
        })
        .join('')
    : '<div class="picker-empty"><b>Keine Waffe gefunden.</b><p>Versuche einen anderen Namen oder eine andere Waffenklasse.</p></div>';
}

function addPart() {
  const rows = el('partRows');
  if (rows.querySelectorAll('.attach-row').length >= 12) {
    toast('Bis zu zwölf Einträge pro Waffe');
    return;
  }
  const i = rows.querySelectorAll('.attach-row').length;
  const wrap = document.createElement('div');
  wrap.className = 'attach-row';
  wrap.innerHTML =
    '<select class="field" aria-label="Aufsatztyp">' +
    CAT.filter((c) => state.game === 'mw4' || c[0] !== 'apex')
      .map((c) => '<option value="' + c[0] + '">' + c[1] + '</option>')
      .join('') +
    '</select><input class="field" maxlength="65" placeholder="Aufsatzname"><button data-del-part="' +
    i +
    '" aria-label="Aufsatz löschen">×</button>';
  rows.appendChild(wrap);
  wrap.querySelector('input').focus();
}

function saveParts() {
  const w = el('partRows')?.dataset.weapon;
  if (!w) return;
  const out = [...el('partRows').querySelectorAll('.attach-row')]
    .map((r) => ({
      slot: r.querySelector('select')?.value || r.dataset.slot || 'optic',
      name: r.querySelector('input').value.trim().slice(0, 65),
    }))
    .filter((x) => x.name);
  build().parts[w] = out;
  save();
  closeModal();
  renderBuilder();
  toast(out.length + ' Aufsätze gespeichert');
}

function renderPartRows(parts) {
  el('partRows').innerHTML = parts
    .map(
      (p, i) =>
        '<div class="attach-row" data-slot="' +
        html(p.slot) +
        '"><select class="field" aria-label="Aufsatztyp">' +
        CAT.map(
          (c) =>
            '<option value="' + c[0] + '" ' + (c[0] === p.slot ? 'selected' : '') + '>' + c[1] + '</option>',
        ).join('') +
        '</select><input class="field" maxlength="65" value="' +
        html(p.name) +
        '" placeholder="Aufsatzname"><button data-del-part="' +
        i +
        '" aria-label="Aufsatz löschen">×</button></div>',
    )
    .join('');
}

function importLoadout(x) {
  state.game = x.game;
  state.mode = x.mode;
  const b = build();
  b.primary = x.primary;
  b.secondary = x.secondary || b.secondary;
  b.dmzLoot = !!x.dmzLoot;
  b.parts = { ...b.parts, ...(x.parts || x.attachments || {}) };
  b.gear = { ...b.gear, ...(x.gear || {}) };
  b.weaponSeasons = { ...b.weaponSeasons };
  delete b.weaponSeasons[b.primary];
  delete b.weaponSeasons[b.secondary];
  Object.assign(b.weaponSeasons, Object.fromEntries(loadoutWeaponSeasons(x)));
  b.weaponProfiles = { ...b.weaponProfiles };
  delete b.weaponProfiles[b.primary];
  delete b.weaponProfiles[b.secondary];
  Object.assign(b.weaponProfiles, loadoutWeaponProfiles(x));
  save();
  renderBuilder();
  navigate('builder');
  toast('Loadout übernommen ✓');
}

function payload() {
  const b = build();
  const seasons = loadoutWeaponSeasons(b);
  const profiles = loadoutWeaponProfiles(b);
  const gear = draftGear(b.gear, state.game, state.mode);
  const attachments = Object.fromEntries(Object.entries(b.parts || {}).map(([weaponId, parts]) => {
    const w = BY[weaponId];
    if (!w) return [weaponId, parts];
    const assigned = knownAttachmentIds(w, null);
    return [weaponId, parts.map((p) => {
      const id = currentAttachmentId(weaponId, p.id, assigned);
      return id !== p.id && !p.custom && ATTACHMENT_BY[id]
        ? { ...p, id, name: ATTACHMENT_BY[id].en }
        : p;
    })];
  }));
  return {
    game: state.game,
    mode: state.mode,
    primary: b.primary,
    secondary: b.secondary,
    attachments,
    gear,
    dmzLoot: !!b.dmzLoot,
    ...gear,
    ...(seasons.length ? { weaponSeasons: Object.fromEntries(seasons) } : {}),
    ...(Object.keys(profiles).length ? { weaponProfiles: profiles } : {}),
  };
}

function renderWeaponSeasons(b) {
  for (const field of document.querySelectorAll('#weaponSlots [data-weapon-season]')) {
    if (field !== document.activeElement) {
      field.value = weaponSeason(b, b[field.dataset.weaponSeason]) ?? '';
    }
  }
}

function updateProfileField(field, slot, key) {
  const b = build();
  const id = b[slot];
  if (!id || !BY[id]) return;
  const profile = { ...weaponProfile(b, id), [key]: field.value };
  b.weaponProfiles ??= {};
  if (profile.distance || profile.hint.trim()) b.weaponProfiles[id] = profile;
  else delete b.weaponProfiles[id];
  save();
}

function renderWeaponCards(b) {
  const container = el('weaponSlots');
  const slots = [
    ['primary', 'Primärwaffe', 'der Primärwaffe'],
    ['secondary', 'Sekundärwaffe', 'der Sekundärwaffe'],
  ];
  if (!container.querySelector('[data-build-weapon]')) {
    container.innerHTML = slots.map(([slot, label, seasonFor]) => `
      <article class="build-weapon-card" data-build-weapon="${slot}" aria-labelledby="${slot}WeaponName">
        <div class="build-weapon-heading">
          <div>
            <span class="eyebrow">${label}</span>
            <h3 id="${slot}WeaponName"></h3>
            <p class="build-weapon-meta"></p>
          </div>
          <label class="weapon-season-field">
            <span>Waffen-Season</span>
            <input type="number" data-weapon-season="${slot}" min="0" max="9007199254740991"
              step="1" inputmode="numeric" aria-label="Waffen-Season ${seasonFor}"
              aria-describedby="weaponSeasonHint" placeholder="z. B. 1">
          </label>
        </div>
        <button class="build-weapon-art" type="button" data-pick="${slot}" aria-label="${label} wählen"></button>
        <div class="build-weapon-actions">
          <button type="button" class="ghost-btn" data-pick="${slot}">Waffe ändern</button>
          <button type="button" class="ghost-btn" data-attach="${slot}">
            Aufsätze <span class="build-attachment-count"></span><span aria-hidden="true">→</span>
          </button>
        </div>
        <div class="build-weapon-profile">
          <label><span>Einsatzdistanz</span><select data-weapon-distance="${slot}" aria-label="Einsatzdistanz ${seasonFor}">
            ${distanceOptions('Distanz wählen')}
          </select></label>
          <label><span>Waffenhinweis <small>optional</small></span>
            <input data-weapon-hint="${slot}" maxlength="${WEAPON_HINT_LENGTH}" aria-label="Waffenhinweis ${seasonFor}" placeholder="z. B. Schnelles Zielen">
          </label>
          <button class="ghost-btn weapon-check-action" type="button" data-weapon-check="${slot}">Waffe prüfen</button>
        </div>
      </article>
    `).join('');
  }

  for (const [slot, label] of slots) {
    const w = weapon(slot);
    const card = container.querySelector('[data-build-weapon="' + slot + '"]');
    const artButton = card.querySelector('.build-weapon-art');
    const name = weaponNames(w)[attachmentLanguage];
    el(slot + 'WeaponName').textContent = name || 'Waffe wählen';
    const parts = storedParts(w);
    const meta = card.querySelector('.build-weapon-meta');
    const allowed = availableInMode(w, state.mode);
    const conflict = apexConflictMessage(parts);
    meta.textContent = allowed
      ? CLASS[w.cls].split(' · ').at(-1) + (conflict ? ' · ' + conflict : parts.some((p) => p.slot === 'apex') ? ' · Apex' : '')
      : (w ? 'Gesperrt in ' : 'Wähle eine freigegebene Waffe für ') + MODE[state.mode];
    meta.classList.toggle('build-weapon-restriction', !allowed || Boolean(conflict));
    const attach = card.querySelector('[data-attach]');
    attach.querySelector('.build-attachment-count').textContent = standardCount(parts) + '/' + attachmentLimit();
    attach.disabled = !w;
    const distance = card.querySelector('[data-weapon-distance]');
    const hint = card.querySelector('[data-weapon-hint]');
    const profile = weaponProfile(b, w?.id);
    distance.disabled = hint.disabled = !w;
    if (distance !== document.activeElement) distance.value = profile.distance;
    if (hint !== document.activeElement) hint.value = profile.hint;
    card.querySelector('[data-weapon-check]').disabled = !allowed;
    const picture = w ? art(w) : '';
    if (picture !== artButton.weaponArtwork) {
      artButton.innerHTML = picture;
      artButton.weaponArtwork = picture;
    }
    artButton.setAttribute('aria-label', name ? label + ' ändern · ' + name : label + ' wählen');
  }
  renderWeaponSeasons(b);
}

let currentWeaponCheck;

function renderWeaponCheck({ panel, target, slot, source }) {
  const w = weapon(slot);
  if (panel !== el('weaponCheckResult') || el('modal').hidden || w?.id !== target.weaponId ||
      state.game !== target.game || state.mode !== target.mode || weaponProfile(build(), w.id).distance !== target.distance) return;
  const allowed = knownAttachmentIds(w);
  const current = storedParts(w);
  const normalize = (part) => {
    const id = currentAttachmentId(w.id, part?.id, allowed);
    const option = ATTACHMENT_BY[id];
    return option && allowed.has(id) && part.slot === option.slot && !part.custom
      ? { slot: option.slot, id, name: option.en }
      : undefined;
  };
  const resolveParts = (parts, entry) => {
    if (!Array.isArray(parts)) return [];
    const selected = parts.map(normalize);
    if (selected.some((part) => !part) || new Set(selected.map(({ slot }) => slot)).size !== selected.length ||
        standardCount(selected) > (entry.mode === 'dmz' && entry.dmzLoot ? 8 : 5) || apexConflictMessage(selected)) return [];
    return selected;
  };
  const result = weaponCheck(source, target, current.map(part => normalize(part) || part),
    resolveParts, part => Boolean(planAttachmentChange(current, part).parts));
  const context = MODE[target.mode] + ' · ' + seasonLabel(target.season) + ' · ' + WEAPON_DISTANCES[target.distance];
  if (!result.count) {
    panel.innerHTML = '<p class="weapon-check-context">' + html(context) + '</p><p>Für diese Waffe und Einsatzdistanz fehlen noch vergleichbare veröffentlichte Builds.</p>';
    return;
  }
  const tips = result.suggestions.map(({ part, count, current, currentCount }) => {
    const label = CAT.find(([key]) => key === part.slot)?.[1] || 'Aufsatz';
    const suggested = attachmentName(part);
    const reason = result.count === 1 ? 'Ein passender Community-Build nutzt diese Option.' :
      count > currentCount ? 'Spieler wählen diesen Aufsatz bei vergleichbaren Builds häufiger.' :
      'Diese Alternative erhält bei vergleichbaren Builds besonders viel Zuspruch.';
    const title = 'Probier ' + suggested + '.';
    const slot = current ? label + ' · Ersetzt ' + attachmentName(current) : label;
    return '<article class="weapon-check-tip"><div><small>' + html(slot) + '</small><h3>' + html(title) +
      '</h3><p>' + html(reason) + '</p></div><button type="button" class="ghost-btn" data-apply-check-part="' +
      html(part.id) + '">Aufsatz übernehmen</button></article>';
  });
  const combo = result.combination.count > 1
    ? '<p class="fine-print">Die am stärksten unterstützte Kombination wird in ' + result.combination.count + ' dieser Builds gespielt.</p>' : '';
  currentWeaponCheck.suggestions = result.suggestions;
  panel.innerHTML = '<p class="weapon-check-context">' + html(context) + '</p><p class="fine-print">' +
    (result.count === 1 ? 'Ein veröffentlichter Build passt zu deiner Auswahl.' : result.count + ' veröffentlichte Builds passen zu deiner Auswahl.') +
    '</p>' + combo +
    (tips.length ? tips.join('') : '<p>Für dein aktuelles Setup ergibt sich aus dieser Auswahl kein sinnvoller Aufsatzwechsel.</p>');
}

async function openWeaponCheck(slot) {
  const w = weapon(slot);
  if (!availableInMode(w, state.mode)) return;
  const distance = weaponProfile(build(), w.id).distance;
  if (!distance) {
    toast('Wähle zuerst die Einsatzdistanz der Waffe.');
    document.querySelector('[data-weapon-distance="' + slot + '"]')?.focus();
    return;
  }
  modal(head('Waffencheck', weaponNames(w)[attachmentLanguage]) + '<div id="weaponCheckResult" aria-live="polite"><p>Passende Builds werden verglichen …</p></div>');
  const panel = el('weaponCheckResult');
  const target = { game: state.game, mode: state.mode, weaponId: w.id, distance };
  currentWeaponCheck = null;
  try {
    const [config, published] = await Promise.all([serverGet('/api/config'), serverGet('/api/sets')]);
    if (panel !== el('weaponCheckResult') || el('modal').hidden) return;
    if (!Number.isSafeInteger(config.weaponCheckSeason) || config.weaponCheckSeason < 0) {
      panel.textContent = 'Die aktive Season für den Waffencheck wird im Adminbereich festgelegt.';
      return;
    }
    target.season = config.weaponCheckSeason;
    const source = [...published.sets, ...published.creators];
    currentWeaponCheck = { panel, target, slot, source };
    renderWeaponCheck(currentWeaponCheck);
  } catch {
    if (panel === el('weaponCheckResult')) panel.textContent = 'Der Vergleich ist gerade nicht erreichbar. Versuche es gleich noch einmal.';
  }
}

function applyWeaponCheckPart(id) {
  const check = currentWeaponCheck;
  const selected = check?.suggestions?.find(({ part }) => part.id === id)?.part;
  if (!selected || check.panel !== el('weaponCheckResult') || el('modal').hidden) return;
  const w = weapon(check.slot);
  if (w?.id !== check.target.weaponId || state.mode !== check.target.mode ||
      weaponProfile(build(), w.id).distance !== check.target.distance || !knownAttachmentIds(w).has(id)) return;
  const change = planAttachmentChange(storedParts(w), selected);
  if (change.reason) return toast(change.reason);
  build().parts[w.id] = change.parts;
  save();
  renderBuilder();
  renderWeaponCheck(check);
  toast('Aufsatz übernommen ✓');
}

function renderBuilder() {
  if (!el('gameSelect')) return;
  for (const button of document.querySelectorAll('[data-audience]')) {
    const selected = button.dataset.audience === state.publisherType;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', selected);
  }
  const g = state.game,
    mode = state.mode,
    b = build();
  el('gameSelect').innerHTML = Object.entries(GAME)
    .map(
      ([id, name]) => '<option value="' + id + '" ' + (id === g ? 'selected' : '') + '>' + name + '</option>',
    )
    .join('');
  const modes = g === 'mw4' ? MW4_MODES : BO7_MODES;
  el('modeSelect').innerHTML = modes
    .map(
      (id) => '<option value="' + id + '" ' + (id === mode ? 'selected' : '') + '>' +
        MODE[id] + '</option>',
    )
    .join('');
  const modeButtons = el('builderModes');
  if (modeButtons) {
    const existingModes = [...modeButtons.children].map((button) => button.dataset.mode);
    if (existingModes.join() !== modes.join()) {
      modeButtons.innerHTML = modes.map((id) =>
        '<button type="button" data-mode="' + html(id) + '">' + html(MODE[id]) + '</button>',
      ).join('');
    }
    for (const button of modeButtons.children) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
  }
  renderWeaponCards(b);
  const keys = builderGearSlots(b);
  if (el('gearLanguage')) el('gearLanguage').innerHTML = languageButtons('Sprache der Ausrüstung');
  el('gearSlots').dataset.slotCount = String(keys.length);
  el('gearSlots').innerHTML = keys
    .map((key) => {
      const opts = availableGear(key, g, mode);
      const value = buildGearValue(b.gear, key, opts);
      const previous = b.gear?.[key];
      const unavailable = previous && !value && !['Keine', 'None'].includes(previous);
      return `
        <button type="button" class="equip-tile${key === 'wildcard' ? ' wildcard' : ''}" data-gear-pick="${html(key)}">
          <span class="equip-icon">${gearArtwork(key, value)}</span>
          <span class="equip-copy">
            <small>${html(key === 'tactical' ? 'Taktik' : GEAR_NAMES[key])}</small>
            <b>${gearLabelMarkup(key, value)}</b>
            ${unavailable ? '<small class="gear-original">Bisher: ' + gearLabelMarkup(key, previous) + ' · neu wählen</small>' : ''}
          </span>
        </button>`;
    })
    .join('');
  const notes = {
    wz: 'Elite-Extras und Feldaufrüstungen erhältst du im Match.',
    dmz: 'Belegte Funde und Freischaltungen. Operator-Traits verwaltest du im Spiel.',
    ranked: 'Die Auswahlliste für Ranked folgt den Freigaben im Adminbereich.',
  };
  const note = siteConfig[mode + 'Note'] || (g === 'mw4' ? notes[mode] : '');
  el('gameNote').textContent = note || '';
  el('gameNote').hidden = !note;
  el('openArsenal').title = candidates('secondary').length + ' Waffen für ' + MODE[mode] + ' ansehen';
  el('dmzLootPanel').hidden = !(g === 'mw4' && mode === 'dmz');
  el('dmzLootPanel').innerHTML =
    '<span class="eyebrow">DMZ · HERKUNFT DER WAFFE</span><div class="mode-tabs"><button data-dmz-loot="0" class="' +
    (!b.dmzLoot ? 'active' : '') +
    '">Gunsmith · 5</button><button data-dmz-loot="1" class="' +
    (b.dmzLoot ? 'active' : '') +
    '">Gefunden · bis 8</button></div>';
}

function builderGearSlots(b) {
  const slots = gearSlots(state.game, state.mode);
  const saved = Object.keys(GEAR_NAMES).filter((key) => b.gear?.[key] && !['Keine', 'None'].includes(b.gear[key]));
  return [...new Set([...slots, ...saved])];
}

function pickGear(key) {
  if (!builderGearSlots(build()).includes(key)) return;
  const options = availableGear(key);
  const current = buildGearValue(build().gear, key, options);
  modal(
    head(
      GEAR_NAMES[key] + ' wählen',
      key === 'wildcard'
        ? 'Revolverheld: 8 statt 5 Aufsätze für die Primärwaffe.'
        : 'Freigegebene Ausrüstung für ' + MODE[state.mode] + '. Deine Auswahl wird direkt übernommen.',
    ) +
      '<div class="choice-grid"' + (options.length >= 8 ? ' data-wide' : '') + '>' +
      (options.includes('Keine') ? options : [...options, ''])
        .map((v) => {
          const selected = current === v;
          return (
            '<button type="button" data-gear-option="' +
            html(key) +
            '" data-gear-value="' +
            html(v) +
            '" aria-pressed="' +
            selected +
            '" class="' +
            (selected ? 'selected' : '') +
            '"><span class="equipment-art-stage">' +
            gearArtwork(key, v) +
            '</span><b class="gear-choice-name">' +
            gearLabelMarkup(key, v) +
            '</b>' +
            gearSecondaryMarkup(key, v) +
            '</button>'
          );
        })
        .join('') +
      '</div>',
    'equipment',
  );
}

function chooseGear(key, value) {
  if (value && !availableGear(key).includes(value)) return;
  build().gear[key] = value;
  save();
  closeModal();
  renderBuilder();
  el('gearSlots').querySelector('[data-gear-pick="' + CSS.escape(key) + '"]')?.focus({ preventScroll: true });
}

function validateDraft() {
  for (const slot of ['primary', 'secondary']) {
    const w = weapon(slot);
    if (!w || !candidates(slot).includes(w)) {
      toast('Wähle eine freigegebene ' + (slot === 'primary' ? 'Primärwaffe' : 'Sekundärwaffe') + ' für ' + MODE[state.mode] + '.');
      return false;
    }
    const parts = storedParts(w);
    const conflict = apexConflictMessage(parts);
    if (conflict || standardCount(parts) > attachmentLimit()) {
      toast((conflict || 'Zu viele reguläre Aufsätze.') + ' Prüfe ' + weaponNames(w)[attachmentLanguage] + '.');
      return false;
    }
    const allowed = knownAttachmentIds(w);
    const blocked = parts.find((part) => attachmentUnavailable(w, part, allowed));
    if (blocked) {
      toast(attachmentName(blocked) + ' ist gesperrt. Ändere die Aufsätze bei ' + weaponNames(w)[attachmentLanguage] + '.');
      return false;
    }
  }
  const gear = build().gear || {};
  for (const key of builderGearSlots(build())) {
    if (gear[key] && !['Keine', 'None'].includes(gear[key]) && !availableGear(key).includes(gear[key])) {
      toast('Ändere „' + GEAR_NAMES[key] + '“. Die bisherige Auswahl ist hier gesperrt.');
      return false;
    }
  }
  return true;
}

function publish() {
  for (const field of document.querySelectorAll('#weaponSlots [data-weapon-season]')) {
    if (!field.reportValidity()) return;
  }
  if (API && siteConfig.communityReady !== true) {
    communityBlocked();
    return;
  }
  if (!validateDraft()) return;
  if (!['player', 'streamer'].includes(state.publisherType)) {
    toast('Wähle zuerst Spieler oder Streamer.');
    navigate('builder');
    return;
  }
  if (state.publisherType === 'streamer') {
    creatorForm();
    return;
  }
  const w = weapon('primary'),
    s = weapon('secondary'),
    primaryName = weaponNames(w)[attachmentLanguage],
    secondaryName = weaponNames(s)[attachmentLanguage],
    mode = MODE[state.mode],
    local = !API;
  clearCrop();
  modal(
    head('Veröffentlichen', 'Dein Loadout auf einen Blick') +
      '<div class="publish-preview"><div class="preview-image">' +
      art(w) +
      '</div><span class="rank-tag">' +
      html(GAME[state.game]) +
      ' · ' +
      html(mode) +
      '</span><h3>' +
      html(primaryName) +
      ' · ' +
      html(mode) +
      '</h3><p>' +
      html(primaryName) +
      ' + ' +
      html(secondaryName) +
      ' · ' +
      storedParts(w).length +
      ' Aufsätze</p></div>' +
      '<form id="postForm" class="form-grid"><label class="wide">Dein Name<input id="postName" class="field" maxlength="35" required placeholder="Spielername" value="' +
      html(state.lastName || '') +
      '"></label><label class="wide">Profilbild · optional<input id="postPhoto" class="field" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
      (state.profilePhoto
        ? '<div class="wide saved-avatar">' +
          avatar({ photo: state.profilePhoto, name: state.lastName }) +
          '<span>Dein bisheriges Foto · neues Bild zum Ändern wählen</span></div>'
        : '') +
      '<div class="wide" id="cropArea" hidden><div class="crop-box" id="cropBox"><img id="cropImage" alt="Dein Fotoausschnitt"></div><div class="crop-controls"><span>−</span><input type="range" id="cropZoom" min="1" max="3" step=".02" value="1" aria-label="Profilbild zoomen"><span>＋</span></div><p class="fine-print">Mit dem Finger verschieben und mit dem Regler zoomen.</p></div>' +
      '<label class="wide">Dein kurzer Tipp<textarea id="postNote" class="field" maxlength="180" placeholder="Wann spielst du dieses Loadout?"></textarea></label>' +
      privacyConfirmation() +
      (local ? '' : publicationRules()) +
      (local
        ? ''
        : '<label class="wide consent"><input type="checkbox" name="consent" required><span>Ich willige in die öffentliche Veröffentlichung meines Spielernamens, Loadouts, Tipps und optionalen Fotos ein. Widerruf und Löschung sind jederzeit über „Meine Beiträge“ oder den Betreiberkontakt möglich.</span></label>') +
      '<button class="primary-btn wide" type="submit">' +
      (local ? 'Auf diesem Gerät veröffentlichen' : 'Ohne Konto zur Prüfung senden') +
      ' →</button></form>' +
      '<p class="fine-print">' +
      (local
        ? 'Ein öffentlicher Beitrag für alle benötigt den Community-Server. Dieser Beitrag bleibt auf diesem Gerät.'
        : 'Nach Prüfung erscheint dein Beitrag in der Rangliste.') +
      '</p>',
  );
}

async function postLoadout(e) {
  e.preventDefault();
  if (!confirmedPrivacy(e.target, !!API)) return;
  if (!validateDraft()) return;
  if (API && !siteConfig.legalReady) {
    toast('Betreiberangaben werden noch eingerichtet.');
    return;
  }
  const name = el('postName').value.trim().slice(0, 35),
    note = el('postNote').value.trim().slice(0, 180);
  if (!name) return;
  const photo = crop ? await croppedPhoto() : state.profilePhoto || '';
  const data = {
    ...payload(), name,
    title: weaponNames(weapon('primary'))[attachmentLanguage] + ' · ' + MODE[state.mode],
    note, photo,
  };
  state.lastName = name;
  state.profilePhoto = photo;
  save();
  if (!API) {
    const post = { ...data, id: Date.now(), likes: 0, created: new Date().toISOString(), local: true };
    localPosts.unshift(post);
    storeCommunity();
    closeModal();
    await refresh();
    if (!(await navigate('feed'))) return;
    el('feedGame').value = state.game;
    el('feedMode').value = state.mode;
    el('feedWeapon').value = 'all';
    if (el('feedDistance')) el('feedDistance').value = 'all';
    if (el('feedSeason')) el('feedSeason').value = 'all';
    el('feedSort').value = 'new';
    redrawFeed();
    const place = rankPlace(post.id);
    toast(place ? 'Dein Loadout: Platz #' + place + ' auf diesem Gerät ✓' : 'Loadout auf diesem Gerät gespeichert ✓');
    return;
  }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Wird gesendet …';
  try {
    rememberSubmission('sets', await apiPost('/api/sets', { ...data, ...privacyReceipt(e.target) }));
    closeModal();
    toast('Eingereicht · nach Prüfung sichtbar ✓');
    navigate('feed');
    refresh();
  } catch (err) {
    await updateChangedPrivacy(e.target, err);
    btn.disabled = false;
    btn.textContent = 'Erneut senden';
    toast(err.message);
  }
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;
  if (button.dataset.audience) {
    state.publisherType = button.dataset.audience;
    save();
    renderBuilder();
    return;
  }
  if (button.dataset.game) {
    setGame(button.dataset.game);
    return;
  }
  if (button.dataset.mode) {
    setMode(button.dataset.mode);
    return;
  }
  if (button.dataset.pick) {
    openPicker(button.dataset.pick);
    return;
  }
  if (button.dataset.pickClass) {
    picker.category = button.dataset.pickClass;
    renderPicker();
    return;
  }
  if (button.dataset.weapon) {
    if (['primary', 'secondary'].includes(button.dataset.selectSlot)) picker.slot = button.dataset.selectSlot;
    if (!candidates(picker.slot).some((w) => w.id === button.dataset.weapon)) return;
    build()[picker.slot] = button.dataset.weapon;
    save();
    closeModal();
    renderBuilder();
    renderGunsmith();
    return;
  }
  if (button.dataset.attach) {
    attachmentEdit(button.dataset.attach);
    return;
  }
  if (button.dataset.weaponCheck) {
    openWeaponCheck(button.dataset.weaponCheck);
    return;
  }
  if (button.dataset.applyCheckPart) {
    applyWeaponCheckPart(button.dataset.applyCheckPart);
    return;
  }
  if (button.dataset.gearPick) {
    pickGear(button.dataset.gearPick);
    return;
  }
  if (button.dataset.gearOption) {
    chooseGear(button.dataset.gearOption, button.dataset.gearValue);
    return;
  }
  if (button.dataset.copy) {
    const item = feed.find((v) => v.id === Number(button.dataset.copy));
    if (item) importLoadout(item);
    return;
  }
  if (button.dataset.starter !== undefined) {
    importLoadout(STARTERS[Number(button.dataset.starter)]);
    return;
  }
  if (button.dataset.dmzLoot !== undefined) {
    const loot = button.dataset.dmzLoot === '1';
    if (!loot && ['primary', 'secondary'].some((slot) => standardCount(storedParts(weapon(slot))) > 5)) {
      toast('Entferne zuerst Aufsätze auf maximal 5.');
      return;
    }
    build().dmzLoot = loot;
    save();
    renderBuilder();
    return;
  }
  if (button.id === 'openArsenal') openArsenal();
  if (button.id === 'publishLoadout') publish();
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'gameSelect') setGame(e.target.value);
  if (e.target.id === 'modeSelect') setMode(e.target.value);
  if (e.target.dataset.weaponDistance) updateProfileField(e.target, e.target.dataset.weaponDistance, 'distance');
  if (e.target.dataset.gear) {
    build().gear[e.target.dataset.gear] = e.target.value;
    save();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'pickSearch') renderPicker();
  if (e.target.dataset.weaponHint) updateProfileField(e.target, e.target.dataset.weaponHint, 'hint');
  const slot = e.target.dataset.weaponSeason;
  if (!slot || !e.target.validity.valid) return;
  const b = build();
  const weaponId = b[slot];
  if (!weaponId) return;
  b.weaponSeasons ??= {};
  if (e.target.value === '') delete b.weaponSeasons[weaponId];
  else b.weaponSeasons[weaponId] = e.target.valueAsNumber;
  renderWeaponSeasons(b);
  save();
});

export { addPart, importLoadout, payload, postLoadout, publish, renderBuilder, renderPartRows, renderPicker, saveParts, validateDraft };
