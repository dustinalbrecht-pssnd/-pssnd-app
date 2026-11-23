import { ATTACHMENT_BY, BY, CAT, CLASS, GAME, MODE, WM, art } from './katalog.js';
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
  siteConfig,
  state,
  storeCommunity,
  storedParts,
  toast,
  updateChangedPrivacy,
  weapon,
} from './app.js';
import { navigate } from './navigation.js';
import { attachmentEdit, attachmentLimit, knownAttachmentIds, languageButtons, renderGunsmith, standardCount } from './aufsaetze.js';
import { currentAttachmentId } from './katalog-abgleich.js';
import {
  GEAR,
  GEAR_NAMES,
  M4_OPTIONS,
  availableGear,
  gearArtwork,
  gearLabelMarkup,
  gearSecondaryMarkup,
} from './ausruestung.js';
import { avatar, redrawFeed, visibleRank } from './ranking.js';

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
  const count = WM.filter((w) => w.game === state.game && w.active !== false).length;
  modal(
    head('Waffenübersicht', GAME[state.game] + ' · ' + count + ' Waffen') +
      '<p class="arsenal-note">Waffe antippen und direkt ins Loadout übernehmen.</p>' +
      weaponPickerTools() +
      '<div id="pickResults" class="weapon-options arsenal-options"></div>',
    'weapons',
  );
  renderPicker();
}

function renderPicker() {
  const list = arsenalMode
      ? WM.filter((w) => w.game === state.game && w.active !== false)
      : candidates(picker.slot),
    classes = [...new Set(list.map((w) => w.cls))];
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
        w.name.toLocaleLowerCase('de').includes(term),
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
            html(w.name) +
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
  save();
  renderBuilder();
  navigate('builder');
  toast('Loadout übernommen ✓');
}

function payload() {
  const b = build();
  const attachments = Object.fromEntries(Object.entries(b.parts || {}).map(([weaponId, parts]) => {
    const w = BY[weaponId];
    if (!w) return [weaponId, parts];
    const assigned = knownAttachmentIds(w);
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
    gear: b.gear,
    dmzLoot: !!b.dmzLoot,
    ...b.gear,
  };
}

function renderBuilder() {
  if (!el('gameSelect')) return;
  document
    .querySelectorAll('[data-audience]')
    .forEach((b) => b.classList.toggle('selected', b.dataset.audience === state.publisherType));
  const g = state.game,
    mode = state.mode,
    b = build(),
    w = weapon('primary'),
    s = weapon('secondary');
  el('gameSelect').innerHTML = Object.entries(GAME)
    .map(
      ([id, name]) => '<option value="' + id + '" ' + (id === g ? 'selected' : '') + '>' + name + '</option>',
    )
    .join('');
  el('modeSelect').innerHTML = (g === 'mw4' ? MW4_MODES : BO7_MODES)
    .map(
      (id) => '<option value="' + id + '" ' + (id === mode ? 'selected' : '') + '>' + MODE[id] + '</option>',
    )
    .join('');
  el('weaponSlots').innerHTML =
    '<article class="build-primary"><div class="slot-row"><span>PRIMÄRWAFFE</span><button data-pick="primary">Ändern →</button></div><button class="build-gun" data-pick="primary">' +
    art(w) +
    '</button><div class="build-gun-meta"><div><strong>' +
    html(w.name) +
    '</strong><small>' +
    html(CLASS[w.cls]) +
    ' · ' +
    standardCount(storedParts(w)) +
    '/' +
    attachmentLimit('primary') +
    ' Aufsätze' +
    (storedParts(w).some((p) => p.slot === 'apex') ? ' + Apex' : '') +
    '</small></div><button data-attach="primary">Aufsätze →</button></div></article>' +
    '<article class="build-secondary"><button class="secondary-select" data-pick="secondary"><span class="secondary-art">' +
    art(s) +
    '</span><span><small>SEKUNDÄRWAFFE</small><strong>' +
    html(s.name) +
    '</strong><em>Ändern →</em></span></button><button class="secondary-attach" data-attach="secondary">Aufsätze →</button></article>';
  const keys =
    mode === 'zm'
      ? ['tactical', 'lethal', 'field', 'ammo', 'cola']
      : [
          'tactical',
          'lethal',
          'perk1',
          'perk2',
          'perk3',
          ...(mode === 'mp' ? ['field'] : []),
          ...(g !== 'mw4' ? ['wildcard'] : []),
        ];
  if (el('gearLanguage')) el('gearLanguage').innerHTML = languageButtons('Sprache der Ausrüstung');
  el('gearSlots').dataset.slotCount = String(keys.length);
  el('gearSlots').innerHTML = keys
    .map((key) => {
      const opts =
          key === 'wildcard'
            ? ['Keine', 'Revolverheld']
            : g === 'mw4' && M4_OPTIONS[key]
              ? availableGear(key)
              : GEAR[key] || [],
        value = Object.prototype.hasOwnProperty.call(b.gear || {}, key) ? b.gear[key] : opts[0];
      return (
        '<button class="equip-tile ' +
        (key === 'wildcard' ? 'wildcard' : '') +
        '" data-gear-pick="' +
        key +
        '"><span class="equip-icon">' +
        gearArtwork(key, value) +
        '</span><small>' +
        html(GEAR_NAMES[key]) +
        '</small><b>' +
        gearLabelMarkup(key, value) +
        '</b>' +
        gearSecondaryMarkup(key, value) +
        '</button>'
      );
    })
    .join('');
  el('gameNote').textContent =
    mode === 'dmz'
      ? 'DMZ: Vorabzugang ab 20. Oktober für digitale Vorbesteller. Gunsmith: 5 Aufsätze; gefundene Waffen: bis zu 8.'
      : mode === 'ranked'
        ? 'Ranked: zugelassene Ausrüstung im Spiel prüfen.'
        : 'Waffe wählen, Aufsätze ergänzen und dein Loadout veröffentlichen.';
  if (siteConfig[mode + 'Note']) el('gameNote').textContent = siteConfig[mode + 'Note'];
  el('arsenalCount').textContent =
    'Alle ' + WM.filter((w) => w.game === g && w.active !== false).length + ' MW4-Waffen ansehen';
  el('dmzLootPanel').hidden = !(g === 'mw4' && mode === 'dmz');
  el('dmzLootPanel').innerHTML =
    '<span class="eyebrow">DMZ · HERKUNFT DER WAFFE</span><div class="mode-tabs"><button data-dmz-loot="0" class="' +
    (!b.dmzLoot ? 'active' : '') +
    '">Gunsmith · 5</button><button data-dmz-loot="1" class="' +
    (b.dmzLoot ? 'active' : '') +
    '">Gefunden · bis 8</button></div>';
}

function pickGear(key) {
  const options =
    key === 'wildcard'
      ? ['Keine', 'Revolverheld']
      : state.game === 'mw4' && M4_OPTIONS[key]
        ? availableGear(key)
        : GEAR[key];
  if (!options) return;
  modal(
    head(
      GEAR_NAMES[key] + ' wählen',
      key === 'wildcard'
        ? 'Revolverheld: 8 statt 5 Aufsätze für die Primärwaffe.'
        : 'Wähle deine Ausrüstung. Sie wird direkt übernommen.',
    ) +
      '<div class="choice-grid">' +
      options
        .map((v) => {
          const selected = (build().gear[key] || options[0]) === v;
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
  build().gear[key] = value;
  save();
  closeModal();
  renderBuilder();
}

function publish() {
  if (API && siteConfig.communityReady !== true) {
    communityBlocked();
    return;
  }
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
      html(w.name) +
      ' · ' +
      html(mode) +
      '</h3><p>' +
      html(w.name) +
      ' + ' +
      html(s.name) +
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
  if (API && !siteConfig.legalReady) {
    toast('Betreiberangaben werden noch eingerichtet.');
    return;
  }
  const name = el('postName').value.trim().slice(0, 35),
    note = el('postNote').value.trim().slice(0, 180);
  if (!name) return;
  const photo = crop ? await croppedPhoto() : state.profilePhoto || '';
  const data = { ...payload(), name, title: weapon('primary').name + ' · ' + MODE[state.mode], note, photo };
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
    el('feedSort').value = 'new';
    redrawFeed();
    toast('Dein Loadout: Platz #' + (visibleRank.indexOf(post.id) + 1) + ' auf diesem Gerät ✓');
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
  if (e.target.dataset.gear) {
    build().gear[e.target.dataset.gear] = e.target.value;
    save();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'pickSearch') renderPicker();
});

export { addPart, importLoadout, payload, postLoadout, publish, renderBuilder, renderPartRows, saveParts };
