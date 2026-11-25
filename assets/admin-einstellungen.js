import { SETTING_PLATFORMS, settingPlatformLabel } from './mw4-inhalte.js';
import { settingsImageExport } from './einstellungen-bild.js?v=mw4-katalog-20261125';

const PAGE_LABELS = {
  feed: 'Ranking', builder: 'Bauen', attachments: 'Aufsätze', settings: 'MW4-Einstellungen',
  events: 'News', detail: 'Loadout-Details',
};
const countryNames = new Intl.DisplayNames(['de'], { type: 'region' });
const number = new Intl.NumberFormat('de-DE');
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const dateLabel = (date) => dateFormat.format(new Date(date + 'T00:00:00Z'));

export function mountAdminSettings({ request, note, esc }) {
  const el = (id) => document.getElementById(id);
  const form = el('gameSettingForm');
  const dialog = el('gameSettingDialog');
  const fields = el('gameSettingFields');
  const presetMenu = el('mw4PresetCategory');
  const presetSearch = el('mw4PresetSearch');
  const presetFields = el('mw4PresetFields');
  const presetDrafts = new Map();
  const presetValues = new Map();
  const favoriteIds = new Set();
  const pendingFavorites = new Set();
  let catalog = null;
  let editor = null;
  let saving = false;
  let publishing = false;
  let adminSession = 0;
  let settingsRequest = 0;
  let analyticsRequest = 0;

  function sectionMessage(id, message) {
    el(id).textContent = message;
  }

  function selectedMenu() {
    return catalog?.templates?.find(({ id }) => id === presetMenu.value);
  }

  function menuChanges(menu) {
    return menu.sections.flatMap(({ fields }) => fields
      .filter(({ id }) => presetDrafts.has(id))
      .map(({ id }) => ({ id, value: presetDrafts.get(id) })));
  }

  function menuEntries(menu) {
    if (menu) return menu.sections.flatMap(({ fields }) => fields.map(({ id }) => presetValues.get(id)).filter(Boolean));
    return presetMenu.value === 'favorites' ? [...presetValues.values()].filter(({ id }) => favoriteIds.has(id)) : [];
  }

  function publishMessage(message, error = false) {
    el('mw4PublishStatus').dataset.error = error;
    el('mw4PublishStatus').hidden = !message;
    sectionMessage('mw4PublishStatus', message);
  }

  function updateMenuActions() {
    const menu = selectedMenu();
    el('mw4PublishValues').disabled = publishing || !menu || !menuChanges(menu).length;
    el('mw4DownloadValues').disabled = publishing || !menuEntries(menu).length;
  }

  function filterPresetFields() {
    const query = presetSearch.value.trim().toLocaleLowerCase('de');
    let visible = 0;
    for (const section of presetFields.children) {
      let matches = 0;
      for (const row of section.querySelectorAll('[data-search]')) {
        row.hidden = !row.dataset.search.includes(query);
        if (!row.hidden) matches += 1;
      }
      section.hidden = matches === 0;
      visible += matches;
    }
    const empty = presetMenu.value === 'favorites' && !query && !favoriteIds.size
      ? 'Markiere ein Feld im Spielmenü mit dem Stern, um es hier wiederzufinden.' : 'Keine Felder gefunden.';
    sectionMessage('mw4MenuStatus', visible ? `${visible} ${visible === 1 ? 'Feld' : 'Felder'}` : empty);
  }

  function presetControl(field) {
    const value = presetDrafts.get(field.id) ?? presetValues.get(field.id)?.value ?? '';
    const attributes = `data-mw4-setting="${esc(field.id)}"`;
    if (field.kind === 'select') {
      return `<select ${attributes}><option value="">Kein Wert eingetragen</option>${field.options.map(option =>
        `<option value="${esc(option)}"${option === value ? ' selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
    }
    const hint = field.kind === 'keybind' ? 'Taste / alternative Taste' : field.step ? '0,05er-Schritte' :
      field.min !== undefined ? `${field.min}–${field.max}` : 'Wert aus dem Spiel';
    return `<input ${attributes} ${field.kind === 'number' ? 'inputmode="decimal"' : ''} maxlength="160" placeholder="${hint}" value="${esc(value)}">`;
  }

  function favoriteButton({ id, de }) {
    const selected = favoriteIds.has(id);
    return `<button type="button" class="mw4-favorite" data-mw4-favorite="${esc(id)}" aria-label="${esc(de + ' als Favorit')}"
      aria-pressed="${selected}" ${pendingFavorites.has(id) ? 'disabled' : ''}>${selected ? '★' : '☆'}</button>`;
  }

  function favoritesList() {
    return catalog.templates.map(({ de, sections }) => {
      const rows = sections.flatMap(({ name, fields }) => fields.filter(({ id }) => favoriteIds.has(id)).map((field) => {
        const query = [de, name, field.de, field.en].join(' ').toLocaleLowerCase('de');
        const value = presetValues.get(field.id)?.value;
        return `<div class="mw4-quick-row" data-search="${esc(query)}">
          <div><button type="button" data-open-mw4-field="${esc(field.id)}">${esc(field.de)} →</button>
          <small>${esc(value ? name + ' · ' + value : name)}</small></div>${favoriteButton(field)}</div>`;
      }));
      return rows.length ? `<section><h3>${esc(de)}</h3>${rows.join('')}</section>` : '';
    }).join('');
  }

  function renderPresetFields() {
    const menu = selectedMenu();
    const quick = presetMenu.value === 'favorites';
    presetFields.innerHTML = menu ? menu.sections.map(({ name, fields }) => `<section>
      <h3>${esc(name)}</h3><div class="mw4-fields-grid">${fields.map(field => {
        const search = [name, field.de, field.en].join(' ').toLocaleLowerCase('de');
        return `<div class="mw4-field" data-search="${esc(search)}"><label><span>${esc(field.de)}
          ${field.de === field.en ? '' : `<small lang="en">${esc(field.en)}</small>`}</span>${presetControl(field)}</label>
          ${favoriteButton(field)}</div>`;
      }).join('')}</div></section>`).join('') : quick ? favoritesList() : '';
    el('mw4AccountMenu').hidden = menu?.id !== 'account-network';
    if (menu || quick) filterPresetFields();
    updateMenuActions();
  }

  function renderPresetMenus() {
    const menus = catalog.templates || [];
    const previous = presetMenu.value;
    presetMenu.innerHTML = !menus.length ? '' : '<option value="favorites">Schnelleinstellungen</option>' +
      menus.map(({ id, de }) => `<option value="${esc(id)}">${esc(de)}</option>`).join('');
    presetMenu.value = previous === 'favorites' || menus.some(({ id }) => id === previous) ? previous : menus[0]?.id ?? '';
    presetMenu.disabled = publishing || !menus.length;
    presetSearch.disabled = publishing || !menus.length;
    renderPresetFields();
    if (!menus.length) sectionMessage('mw4MenuStatus', 'Der MW4-Katalog ist nach dem Worker-Update verfügbar.');
  }

  async function toggleFavorite(id, button) {
    const session = adminSession;
    pendingFavorites.add(id);
    button.disabled = true;
    try {
      const { favorite } = await request('/api/admin/game-settings/favorites', 'PUT', { id, favorite: !favoriteIds.has(id) });
      if (session !== adminSession) return;
      if (favorite) favoriteIds.add(id);
      else favoriteIds.delete(id);
    } catch (error) {
      if (session === adminSession) publishMessage(error.message, true);
    } finally {
      if (session === adminSession) {
        pendingFavorites.delete(id);
        renderPresetFields();
      }
    }
  }

  function jumpToPreset(id) {
    const menu = catalog.templates.find(({ sections }) => sections.some(({ fields }) => fields.some(field => field.id === id)));
    if (!menu) return;
    presetMenu.value = menu.id;
    presetSearch.value = '';
    renderPresetFields();
    const input = presetFields.querySelector(`[data-mw4-setting="${CSS.escape(id)}"]`);
    input?.scrollIntoView({ block: 'center' });
    input?.focus({ preventScroll: true });
  }

  async function publishPreset(event) {
    event.preventDefault();
    event.stopPropagation();
    const menu = selectedMenu();
    if (!menu || publishing) return;
    const changes = menuChanges(menu);
    if (!changes.length) return;
    publishing = true;
    const session = adminSession;
    presetMenu.disabled = true;
    presetSearch.disabled = true;
    presetFields.inert = true;
    updateMenuActions();
    publishMessage('Werte werden veröffentlicht …');
    try {
      const { entries, removed } = await request('/api/admin/game-settings/values/' + encodeURIComponent(menu.id), 'PUT', { changes });
      if (session !== adminSession) return;
      settingsRequest += 1;
      for (const { id } of changes) presetDrafts.delete(id);
      for (const id of removed) presetValues.delete(id);
      for (const entry of entries) presetValues.set(entry.id, entry);
      if (entries.length && !catalog.categories.some(({ id }) => id === menu.id)) {
        catalog.categories.push({ id: menu.id, de: menu.de, en: menu.en });
      }
      renderSettings();
      publishMessage('Änderungen veröffentlicht.');
    } catch (error) {
      if (session === adminSession) publishMessage(error.message, true);
    } finally {
      if (session === adminSession) {
        publishing = false;
        presetFields.inert = false;
        renderPresetMenus();
      }
    }
  }

  function renderSettings() {
    if (!catalog) return;
    const select = el('adminSettingCategory'), current = select.value;
    const query = el('adminSettingSearch').value.trim().toLocaleLowerCase('de');
    const categories = new Map(catalog.categories.map((category) => [category.id, category]));
    select.innerHTML = '<option value="">Alle Kategorien</option>' + catalog.categories.map((category) =>
      `<option value="${esc(category.id)}">${esc(category.de)}</option>`).join('');
    select.value = categories.has(current) ? current : '';
    el('newSettingEntry').disabled = !catalog.categories.length;
    el('settingCategoryList').innerHTML = catalog.categories.map((category) => `<article class="card settings-admin-row">
      <div><strong>${esc(category.de)}</strong> <span class="muted">· ${esc(category.en)}</span></div>
      <div class="actions"><button type="button" data-edit-setting="categories:${esc(category.id)}">Bearbeiten</button>
      <button type="button" class="danger" data-delete-setting="categories:${esc(category.id)}">Löschen</button></div>
      </article>`).join('') || '<p class="muted">Lege eine Kategorie an, um Einstellungen einzutragen.</p>';
    const entries = catalog.entries.filter((entry) => !entry.templateId && (!select.value || entry.categoryId === select.value) &&
      [entry.de, entry.en, categories.get(entry.categoryId)?.de].join(' ').toLocaleLowerCase('de').includes(query));
    el('settingEntryList').innerHTML = entries.map((entry) => `<article class="card settings-admin-row">
      <div><span class="badge">${entry.active ? 'Öffentlich' : 'Entwurf'}</span>
      <h3>${esc(entry.de)}</h3><small>${esc([entry.en, categories.get(entry.categoryId)?.de, settingPlatformLabel(entry.platforms)].filter(Boolean).join(' · '))}</small></div>
      <div class="actions"><button type="button" data-edit-setting="entries:${esc(entry.id)}">Bearbeiten</button>
      <button type="button" data-download-setting="${esc(entry.id)}">Bild ↓</button>
      <button type="button" class="danger" data-delete-setting="entries:${esc(entry.id)}">Löschen</button></div>
      </article>`).join('') || '<p class="muted">Keine Einstellungen in dieser Auswahl.</p>';
    sectionMessage('adminSettingsStatus', entries.length + (entries.length === 1 ? ' Einstellung' : ' Einstellungen'));
  }

  async function loadSettings() {
    const run = ++settingsRequest;
    sectionMessage('adminSettingsStatus', 'Einstellungen werden geladen …');
    sectionMessage('mw4MenuStatus', 'Spielmenüs werden geladen …');
    try {
      const data = await request('/api/admin/game-settings');
      if (run !== settingsRequest) return;
      catalog = data;
      presetValues.clear();
      for (const entry of data.entries) if (entry.templateId) presetValues.set(entry.id, entry);
      favoriteIds.clear();
      for (const id of data.favoriteIds || []) favoriteIds.add(id);
      el('newSettingCategory').disabled = false;
      renderPresetMenus();
      renderSettings();
    } catch (error) {
      if (run === settingsRequest) {
        sectionMessage('adminSettingsStatus', error.message);
        sectionMessage('mw4MenuStatus', error.message);
      }
    }
  }

  function openEditor(type, item) {
    if (saving) return;
    editor = { type, id: item?.id };
    form.hidden = false;
    el('gameSettingImages').hidden = true;
    const category = type === 'categories';
    el('gameSettingDialogTitle').textContent = (category ? 'Kategorie' : 'Einstellung') + (item ? ' bearbeiten' : ' hinzufügen');
    const text = (name, label) => `<label>${label}<input name="${name}" maxlength="100" value="${esc(item?.[name])}" required></label>`;
    const area = (name, label, limit) => `<label>${label}<textarea name="${name}" maxlength="${limit}" rows="2">${esc(item?.[name])}</textarea></label>`;
    fields.innerHTML = `<div class="grid">${text('de', 'Name auf Deutsch')}${text('en', 'Name auf Englisch')}
      <label>Reihenfolge<input name="sortOrder" type="number" min="0" max="9999" value="${item?.sortOrder ?? 0}"></label>
      ${category ? '' : `<label>Kategorie<select name="categoryId" required>${catalog.categories.map((value) =>
        `<option value="${esc(value.id)}" ${value.id === (item?.categoryId || el('adminSettingCategory').value) ? 'selected' : ''}>${esc(value.de)}</option>`).join('')}</select></label>`}
      </div>` + (category ? '' : `<fieldset><legend>Plattformen</legend><p class="muted">Leere Auswahl gilt für alle Plattformen.</p>
      <div class="editor-checkboxes">${Object.entries(SETTING_PLATFORMS).map(([key, label]) =>
        `<label><input type="checkbox" name="platforms" value="${key}" ${item?.platforms.includes(key) ? 'checked' : ''}>${esc(label)}</label>`).join('')}</div></fieldset>
      <label>Wert im Spiel<input name="value" maxlength="160" value="${esc(item?.value)}"></label>
      ${area('values', 'Verfügbare Werte', 750)}${area('recommendation', 'Empfehlung', 300)}${area('description', 'Beschreibung', 950)}
      <label class="editor-label"><input type="checkbox" name="active" ${item?.active ? 'checked' : ''}>Öffentlich sichtbar</label>`);
    sectionMessage('gameSettingMessage', '');
    dialog.showModal();
  }

  function findItem(type, id) {
    return catalog?.[type].find((item) => item.id === id);
  }

  async function removeSetting(type, id, button) {
    if (button.disabled) return;
    const item = findItem(type, id);
    if (!item || !window.confirm('„' + item.de + '“ endgültig löschen?')) return;
    button.disabled = true;
    try {
      await request('/api/admin/game-settings/' + type + '/' + encodeURIComponent(id), 'DELETE');
      await loadSettings();
      note('Eintrag gelöscht.');
    } catch (error) {
      sectionMessage('adminSettingsStatus', error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function saveSetting(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!editor || saving) return;
    const button = el('saveGameSetting');
    const { type, id } = editor;
    const raw = new FormData(form);
    const data = Object.fromEntries(raw);
    data.platforms = raw.getAll('platforms');
    data.active = raw.has('active');
    button.disabled = true;
    saving = true;
    sectionMessage('gameSettingMessage', 'Wird gespeichert …');
    try {
      await request('/api/admin/game-settings/' + type + (id ? '/' + encodeURIComponent(id) : ''), id ? 'PUT' : 'POST', data);
      dialog.close();
      await loadSettings();
      note('Einstellung gespeichert.');
    } catch (error) {
      sectionMessage('gameSettingMessage', error.message);
    } finally {
      button.disabled = false;
      saving = false;
    }
  }

  function openImageExport(entries) {
    const output = settingsImageExport(entries, catalog.categories);
    const download = (i) => output.download(i).catch((err) => note(err.message));
    if (output.count === 1) {
      download(0);
      return;
    }
    form.hidden = true;
    el('gameSettingDialogTitle').textContent = 'Einstellungen als Bild';
    const links = el('gameSettingImagePages');
    links.replaceChildren(...Array.from({ length: output.count }, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Bild ' + (index + 1) + ' speichern ↓';
      button.addEventListener('click', () => download(index));
      return button;
    }));
    el('gameSettingImages').hidden = false;
    dialog.showModal();
  }

  function rowTable(title, data, label, column) {
    return `<section class="panel traffic-table"><h2>${title}</h2>${data.length ? `<table>
      <thead><tr><th scope="col">${column}</th><th scope="col">Aufrufe</th></tr></thead><tbody>${data.map((item) =>
        `<tr><th scope="row">${esc(label(item.label))}</th><td>${number.format(item.views)}</td></tr>`).join('')}</tbody></table>` :
      '<p class="muted">Noch keine Aufrufe in diesem Zeitraum.</p>'}</section>`;
  }

  async function loadAnalytics() {
    const run = ++analyticsRequest;
    sectionMessage('analyticsStatus', 'Zugriffe werden geladen …');
    try {
      const stats = await request('/api/admin/analytics?days=' + el('analyticsDays').value);
      if (run !== analyticsRequest) return;
      sectionMessage('analyticsStatus', dateLabel(stats.from) + ' bis ' + dateLabel(stats.to) + ' · deutsche Zeit');
      const max = Math.max(1, ...stats.daily.map((row) => row.views));
      const chart = stats.daily.map((row) => `<span class="traffic-bar" style="--height:${100 * row.views / max}%"
        title="${esc(dateLabel(row.label))} · ${number.format(row.views)} Aufrufe"></span>`).join('');
      el('analyticsData').innerHTML = `<section class="panel traffic-summary"><div><h2>Seitenaufrufe</h2><strong>${number.format(stats.total)}</strong></div>
        <div><div class="traffic-chart" aria-hidden="true">${chart}</div><p class="muted">${dateLabel(stats.from)} – ${dateLabel(stats.to)}</p></div></section>
        <div class="traffic-tables">${rowTable('Aufgerufene Seiten', stats.pages, (key) => PAGE_LABELS[key] || key, 'Seite')}
        ${rowTable('Häufigste Zugriffsquellen', stats.sources, (source) => ({ direct: 'Direkt oder unbekannt', internal: 'Interne Navigation' })[source] || source, 'Herkunfts-Domain')}
        ${rowTable('Häufigste Länder', stats.countries, (code) => code ? countryNames.of(code) : 'Unbekannt', 'Land')}</div>
        <details class="panel traffic-table"><summary>Aufrufe pro Tag</summary>${rowTable('Tageswerte', [...stats.daily].reverse(), dateLabel, 'Datum')}</details>`;
    } catch (error) {
      if (run !== analyticsRequest) return;
      el('analyticsData').replaceChildren();
      sectionMessage('analyticsStatus', error.message);
    }
  }

  el('mw4SettingsForm').addEventListener('submit', publishPreset);
  presetMenu.addEventListener('change', () => {
    presetSearch.value = '';
    publishMessage('');
    renderPresetFields();
  });
  presetSearch.addEventListener('input', filterPresetFields);
  presetFields.addEventListener('input', (event) => {
    const id = event.target.dataset.mw4Setting;
    if (!id || publishing) return;
    const value = event.target.value.trim();
    if (value === (presetValues.get(id)?.value ?? '')) presetDrafts.delete(id);
    else presetDrafts.set(id, value);
    publishMessage('');
    updateMenuActions();
  });
  presetFields.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button?.dataset.mw4Favorite && !pendingFavorites.has(button.dataset.mw4Favorite)) {
      toggleFavorite(button.dataset.mw4Favorite, button);
    }
    if (button?.dataset.openMw4Field) jumpToPreset(button.dataset.openMw4Field);
  });
  el('mw4DownloadValues').addEventListener('click', () => openImageExport(menuEntries(selectedMenu())));
  el('adminSettingSearch').addEventListener('input', renderSettings);
  el('adminSettingCategory').addEventListener('change', renderSettings);
  el('analyticsDays').addEventListener('change', loadAnalytics);
  el('reloadAnalytics').addEventListener('click', loadAnalytics);
  el('newSettingCategory').addEventListener('click', () => openEditor('categories'));
  el('newSettingEntry').addEventListener('click', () => openEditor('entries'));
  el('cancelGameSetting').addEventListener('click', () => { if (!saving) dialog.close(); });
  el('closeSettingImages').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', saveSetting);
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  el('gamesettingsView').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.editSetting) {
      const [type, id] = button.dataset.editSetting.split(':');
      const item = findItem(type, id);
      if (item) openEditor(type, item);
    }
    if (button.dataset.deleteSetting) removeSetting(...button.dataset.deleteSetting.split(':'), button);
    if (button.dataset.downloadSetting) {
      const item = findItem('entries', button.dataset.downloadSetting);
      if (item) openImageExport([item]);
    }
  });

  return {
    show(view) {
      if (view === 'gamesettings') loadSettings();
      if (view === 'analytics') loadAnalytics();
    },
    reset() {
      adminSession += 1;
      settingsRequest += 1;
      analyticsRequest += 1;
      catalog = null;
      publishing = false;
      presetDrafts.clear();
      presetValues.clear();
      favoriteIds.clear();
      pendingFavorites.clear();
      presetMenu.replaceChildren();
      presetMenu.disabled = true;
      presetSearch.value = '';
      presetSearch.disabled = true;
      presetFields.inert = false;
      presetFields.replaceChildren();
      el('mw4AccountMenu').hidden = true;
      publishMessage('');
      updateMenuActions();
      el('settingCategoryList').replaceChildren();
      el('settingEntryList').replaceChildren();
      el('analyticsData').replaceChildren();
      el('newSettingCategory').disabled = true;
      el('newSettingEntry').disabled = true;
      if (dialog.open) dialog.close();
    },
  };
}
