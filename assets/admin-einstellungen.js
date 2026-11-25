import { SETTING_PLATFORMS, settingPlatformLabel } from './mw4-inhalte.js';
import { settingsImageExport } from './einstellungen-bild.js';

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
  let catalog = null;
  let editor = null;
  let saving = false;
  let settingsRequest = 0;
  let analyticsRequest = 0;

  function sectionMessage(id, message) {
    el(id).textContent = message;
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
    const entries = catalog.entries.filter((entry) => (!select.value || entry.categoryId === select.value) &&
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
    try {
      const data = await request('/api/admin/game-settings');
      if (run !== settingsRequest) return;
      catalog = data;
      el('newSettingCategory').disabled = false;
      renderSettings();
    } catch (error) {
      if (run === settingsRequest) sectionMessage('adminSettingsStatus', error.message);
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

  function openImageExport(item) {
    const output = settingsImageExport([item], catalog.categories);
    const download = (i) => output.download(i).catch((err) => note(err.message));
    if (output.count === 1) {
      download(0);
      return;
    }
    form.hidden = true;
    el('gameSettingDialogTitle').textContent = 'Einstellung als Bild';
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
      if (item) openImageExport(item);
    }
  });

  return {
    show(view) {
      if (view === 'gamesettings') loadSettings();
      if (view === 'analytics') loadAnalytics();
    },
    reset() {
      settingsRequest += 1;
      analyticsRequest += 1;
      catalog = null;
      el('settingCategoryList').replaceChildren();
      el('settingEntryList').replaceChildren();
      el('analyticsData').replaceChildren();
      el('newSettingCategory').disabled = true;
      el('newSettingEntry').disabled = true;
      if (dialog.open) dialog.close();
    },
  };
}
